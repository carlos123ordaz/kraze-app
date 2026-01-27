const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.crearOrden = async (req, res) => {
  try {
    const { 
      cliente, 
      direccionEnvio, 
      items, 
      montos, 
      metodoPago, 
      envio, 
      notasCliente,
      facturacion 
    } = req.body;

    // Validaciones básicas
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El pedido debe tener al menos un producto'
      });
    }

    if (!cliente || !direccionEnvio || !montos || !metodoPago || !envio) {
      return res.status(400).json({
        success: false,
        mensaje: 'Faltan datos requeridos'
      });
    }

    // Verificar disponibilidad de todos los items
    for (const item of items) {
      const producto = await Product.findById(item.producto);
      
      if (!producto || !producto.disponible) {
        return res.status(400).json({
          success: false,
          mensaje: `El producto ${item.nombre} no está disponible`
        });
      }

      const variante = producto.variantes.id(item.variante);
      if (!variante || !variante.activo) {
        return res.status(400).json({
          success: false,
          mensaje: `La variante seleccionada de ${item.nombre} no está disponible`
        });
      }

      const verificacion = producto.verificarDisponibilidad(item.variante, item.cantidad);
      if (!verificacion.disponible) {
        return res.status(400).json({
          success: false,
          mensaje: `${item.nombre}: ${verificacion.mensaje}`
        });
      }
    }

    // Crear la orden
    const ordenData = {
      usuario: req.usuario.id,
      esGuest: false,
      cliente: {
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        email: cliente.email,
        telefono: cliente.telefono,
        dni: cliente.dni
      },
      direccionEnvio: {
        direccion: direccionEnvio.direccion,
        referencia: direccionEnvio.referencia || '',
        distrito: direccionEnvio.distrito,
        provincia: direccionEnvio.provincia,
        departamento: direccionEnvio.departamento,
        codigoPostal: direccionEnvio.codigoPostal || '',
        ubicacion: direccionEnvio.ubicacion || {}
      },
      items: items,
      montos: {
        subtotal: montos.subtotal,
        descuentos: montos.descuentos || 0,
        costoEnvio: montos.costoEnvio,
        total: montos.total
      },
      metodoPago: {
        tipo: metodoPago.tipo,
        estado: metodoPago.tipo === 'contra_entrega' ? 'pendiente' : 'pendiente'
      },
      envio: {
        zona: envio.zona,
        costo: envio.costo,
        tiempoEstimado: envio.tiempoEstimado || '3-5 días hábiles'
      },
      notasCliente: notasCliente || '',
      facturacion: facturacion || {},
      estado: 'pendiente_pago',
      seguimiento: {
        ordenCreada: new Date()
      },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      origen: 'web'
    };

    const orden = await Order.create(ordenData);

    // Reducir stock de productos
    for (const item of items) {
      const producto = await Product.findById(item.producto);
      if (producto) {
        await producto.reducirStock(item.variante, item.cantidad);
      }
    }

    res.status(201).json({
      success: true,
      orden
    });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({
      success: false,
      mensaje: error.message || 'Error al crear la orden'
    });
  }
};

// Crear orden como invitado (sin autenticación)
exports.crearOrdenInvitado = async (req, res) => {
  try {
    const { 
      cliente, 
      direccionEnvio, 
      items, 
      montos, 
      metodoPago, 
      envio, 
      notasCliente 
    } = req.body;

    // Validaciones básicas
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El pedido debe tener al menos un producto'
      });
    }

    if (!cliente || !direccionEnvio || !montos || !metodoPago || !envio) {
      return res.status(400).json({
        success: false,
        mensaje: 'Faltan datos requeridos'
      });
    }

    // Verificar disponibilidad
    for (const item of items) {
      const producto = await Product.findById(item.producto);
      
      if (!producto || !producto.disponible) {
        return res.status(400).json({
          success: false,
          mensaje: `El producto ${item.nombre} no está disponible`
        });
      }

      const variante = producto.variantes.id(item.variante);
      if (!variante || !variante.activo) {
        return res.status(400).json({
          success: false,
          mensaje: `La variante seleccionada de ${item.nombre} no está disponible`
        });
      }

      const verificacion = producto.verificarDisponibilidad(item.variante, item.cantidad);
      if (!verificacion.disponible) {
        return res.status(400).json({
          success: false,
          mensaje: `${item.nombre}: ${verificacion.mensaje}`
        });
      }
    }

    // Crear usuario invitado temporal
    const User = require('../models/User');
    
    // Verificar si ya existe un usuario con este email
    let usuario = await User.findOne({ email: cliente.email });
    
    if (!usuario) {
      // Crear usuario invitado
      usuario = await User.create({
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        email: cliente.email,
        telefono: cliente.telefono,
        dni: cliente.dni,
        isGuest: true,
        password: Math.random().toString(36).slice(-8) // Password temporal
      });
    }

    // Crear la orden
    const ordenData = {
      usuario: usuario._id,
      esGuest: true,
      cliente: {
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        email: cliente.email,
        telefono: cliente.telefono,
        dni: cliente.dni
      },
      direccionEnvio: {
        direccion: direccionEnvio.direccion,
        referencia: direccionEnvio.referencia || '',
        distrito: direccionEnvio.distrito,
        provincia: direccionEnvio.provincia,
        departamento: direccionEnvio.departamento,
        codigoPostal: direccionEnvio.codigoPostal || ''
      },
      items: items,
      montos: {
        subtotal: montos.subtotal,
        descuentos: montos.descuentos || 0,
        costoEnvio: montos.costoEnvio,
        total: montos.total
      },
      metodoPago: {
        tipo: metodoPago.tipo,
        estado: 'pendiente'
      },
      envio: {
        zona: envio.zona,
        costo: envio.costo,
        tiempoEstimado: envio.tiempoEstimado || '3-5 días hábiles'
      },
      notasCliente: notasCliente || '',
      estado: 'pendiente_pago',
      seguimiento: {
        ordenCreada: new Date()
      },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      origen: 'web'
    };

    const orden = await Order.create(ordenData);

    // Reducir stock
    for (const item of items) {
      const producto = await Product.findById(item.producto);
      if (producto) {
        await producto.reducirStock(item.variante, item.cantidad);
      }
    }

    res.status(201).json({
      success: true,
      orden
    });
  } catch (error) {
    console.error('Error al crear orden invitado:', error);
    res.status(500).json({
      success: false,
      mensaje: error.message || 'Error al crear la orden'
    });
  }
};

exports.obtenerMisOrdenes = async (req, res) => {
  try {
    const ordenes = await Order.find({ usuario: req.usuario.id })
      .sort({ createdAt: -1 })
      .select('-notasInternas')
      .populate('items.producto', 'nombre slug imagenesPrincipales');

    res.status(200).json({
      success: true,
      total: ordenes.length,
      ordenes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerOrden = async (req, res) => {
  try {
    const orden = await Order.findOne({
      _id: req.params.id,
      usuario: req.usuario.id
    }).populate('items.producto', 'nombre slug imagenesPrincipales');

    if (!orden) {
      return res.status(404).json({
        success: false,
        mensaje: 'Orden no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      orden
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerOrdenPorNumero = async (req, res) => {
  try {
    const orden = await Order.findOne({
      numeroOrden: req.params.numeroOrden,
      usuario: req.usuario.id
    }).populate('items.producto', 'nombre slug imagenesPrincipales');

    if (!orden) {
      return res.status(404).json({
        success: false,
        mensaje: 'Orden no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      orden
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.cancelarOrden = async (req, res) => {
  try {
    const orden = await Order.findOne({
      _id: req.params.id,
      usuario: req.usuario.id
    });

    if (!orden) {
      return res.status(404).json({
        success: false,
        mensaje: 'Orden no encontrada'
      });
    }

    await orden.cancelar(req.body.razon, req.usuario.id);

    res.status(200).json({
      success: true,
      mensaje: 'Orden cancelada',
      orden
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.calificarServicio = async (req, res) => {
  try {
    const { calificacion, comentario } = req.body;

    const orden = await Order.findOne({
      _id: req.params.id,
      usuario: req.usuario.id,
      estado: 'entregado'
    });

    if (!orden) {
      return res.status(404).json({
        success: false,
        mensaje: 'Orden no encontrada o no ha sido entregada'
      });
    }

    orden.calificacionServicio = {
      calificacion,
      comentario,
      fecha: new Date()
    };

    await orden.save();

    res.status(200).json({
      success: true,
      mensaje: 'Calificación registrada',
      orden
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerTodasOrdenes = async (req, res) => {
  try {
    const {
      estado,
      metodoPago,
      fechaInicio,
      fechaFin,
      buscar,
      pagina = 1,
      limite = 20
    } = req.query;

    const query = {};

    if (estado) query.estado = estado;
    if (metodoPago) query['metodoPago.tipo'] = metodoPago;

    if (fechaInicio || fechaFin) {
      query.createdAt = {};
      if (fechaInicio) query.createdAt.$gte = new Date(fechaInicio);
      if (fechaFin) query.createdAt.$lte = new Date(fechaFin);
    }

    if (buscar) {
      query.$or = [
        { numeroOrden: new RegExp(buscar, 'i') },
        { 'cliente.email': new RegExp(buscar, 'i') },
        { 'cliente.nombres': new RegExp(buscar, 'i') },
        { 'cliente.apellidos': new RegExp(buscar, 'i') }
      ];
    }

    const skip = (Number(pagina) - 1) * Number(limite);

    const ordenes = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limite))
      .skip(skip);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      resultados: ordenes.length,
      total,
      paginas: Math.ceil(total / Number(limite)),
      paginaActual: Number(pagina),
      ordenes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarEstadoOrden = async (req, res) => {
  try {
    const { estado, comentario } = req.body;

    const orden = await Order.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({
        success: false,
        mensaje: 'Orden no encontrada'
      });
    }

    await orden.cambiarEstado(estado, comentario, req.usuario.id);

    res.status(200).json({
      success: true,
      mensaje: 'Estado actualizado',
      orden
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.confirmarPago = async (req, res) => {
  try {
    const orden = await Order.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({
        success: false,
        mensaje: 'Orden no encontrada'
      });
    }

    await orden.confirmarPago(req.body);

    res.status(200).json({
      success: true,
      mensaje: 'Pago confirmado',
      orden
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerEstadisticas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const inicio = fechaInicio ? new Date(fechaInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    const estadisticas = await Order.obtenerEstadisticas(inicio, fin);

    res.status(200).json({
      success: true,
      periodo: { inicio, fin },
      estadisticas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};