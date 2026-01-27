const Coupon = require('../models/Coupon');

exports.crearCupon = async (req, res) => {
  try {
    req.body.creadoPor = req.usuario.id;
    const cupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      cupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerCupones = async (req, res) => {
  try {
    const { activo, tipo, vigente } = req.query;

    const query = {};

    if (activo !== undefined) query.activo = activo === 'true';
    if (tipo) query.tipo = tipo;

    if (vigente === 'true') {
      const ahora = new Date();
      query['vigencia.fechaInicio'] = { $lte: ahora };
      query['vigencia.fechaFin'] = { $gte: ahora };
    }

    const cupones = await Coupon.find(query)
      .populate('restricciones.productos', 'nombre slug')
      .populate('restricciones.categorias', 'nombre slug')
      .populate('restricciones.colecciones', 'nombre slug')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: cupones.length,
      cupones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerCupon = async (req, res) => {
  try {
    const cupon = await Coupon.findOne({ codigo: req.params.codigo.toUpperCase() })
      .populate('restricciones.productos', 'nombre slug precio')
      .populate('restricciones.categorias', 'nombre slug')
      .populate('restricciones.colecciones', 'nombre slug');

    if (!cupon) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cupón no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      cupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.validarCupon = async (req, res) => {
  try {
    const { codigo, subtotal, items } = req.body;

    const cupon = await Coupon.findOne({ 
      codigo: codigo.toUpperCase(), 
      activo: true 
    });

    if (!cupon) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cupón no encontrado'
      });
    }

    const validacion = await cupon.validarCupon(
      subtotal, 
      req.usuario.id, 
      items
    );

    if (!validacion.valido) {
      return res.status(400).json({
        success: false,
        mensaje: validacion.mensaje
      });
    }

    const descuento = cupon.calcularDescuento(subtotal);

    res.status(200).json({
      success: true,
      mensaje: 'Cupón válido',
      cupon: {
        codigo: cupon.codigo,
        descripcion: cupon.descripcion,
        tipo: cupon.tipo,
        descuento: cupon.descuento,
        montoDescuento: descuento
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarCupon = async (req, res) => {
  try {
    const cupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!cupon) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cupón no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      cupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarCupon = async (req, res) => {
  try {
    const cupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!cupon) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cupón no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Cupón desactivado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.generarCodigoAleatorio = async (req, res) => {
  try {
    const longitud = req.query.longitud || 8;
    const codigo = Coupon.generarCodigoAleatorio(longitud);

    res.status(200).json({
      success: true,
      codigo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerHistorialUsos = async (req, res) => {
  try {
    const cupon = await Coupon.findById(req.params.id)
      .populate('historialUsos.usuario', 'nombres apellidos email')
      .populate('historialUsos.orden', 'numeroOrden montos.total');

    if (!cupon) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cupón no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      historial: cupon.historialUsos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};