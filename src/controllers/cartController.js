const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.obtenerCarrito = async (req, res) => {
  try {
    let carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    }).populate('items.producto', 'nombre slug precio imagenesPrincipales');

    if (!carrito) {
      carrito = await Cart.create({
        usuario: req.usuario.id,
        items: []
      });
    }

    res.status(200).json({
      success: true,
      carrito
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.agregarItem = async (req, res) => {
  try {
    const { productoId, varianteId, cantidad } = req.body;

    let carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    });

    if (!carrito) {
      carrito = await Cart.create({
        usuario: req.usuario.id,
        items: []
      });
    }

    await carrito.agregarItem(productoId, varianteId, cantidad || 1);
    await carrito.populate('items.producto', 'nombre slug precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      carrito
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarCantidad = async (req, res) => {
  try {
    const { cantidad } = req.body;

    const carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    });

    if (!carrito) {
      return res.status(404).json({
        success: false,
        mensaje: 'Carrito no encontrado'
      });
    }

    await carrito.actualizarCantidad(req.params.itemId, cantidad);
    await carrito.populate('items.producto', 'nombre slug precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      carrito
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.removerItem = async (req, res) => {
  try {
    const carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    });

    if (!carrito) {
      return res.status(404).json({
        success: false,
        mensaje: 'Carrito no encontrado'
      });
    }

    await carrito.removerItem(req.params.itemId);
    await carrito.populate('items.producto', 'nombre slug precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      carrito
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.limpiarCarrito = async (req, res) => {
  try {
    const carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    });

    if (!carrito) {
      return res.status(404).json({
        success: false,
        mensaje: 'Carrito no encontrado'
      });
    }

    await carrito.limpiar();

    res.status(200).json({
      success: true,
      mensaje: 'Carrito limpiado',
      carrito
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.aplicarCupon = async (req, res) => {
  try {
    const { codigo } = req.body;

    const carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    }).populate('items.producto');

    if (!carrito) {
      return res.status(404).json({
        success: false,
        mensaje: 'Carrito no encontrado'
      });
    }

    await carrito.aplicarCupon(codigo);
    await carrito.populate('items.producto', 'nombre slug precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      mensaje: 'Cupón aplicado',
      carrito
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.removerCupon = async (req, res) => {
  try {
    const carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    });

    if (!carrito) {
      return res.status(404).json({
        success: false,
        mensaje: 'Carrito no encontrado'
      });
    }

    await carrito.removerCupon();
    await carrito.populate('items.producto', 'nombre slug precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      mensaje: 'Cupón removido',
      carrito
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.verificarDisponibilidad = async (req, res) => {
  try {
    const carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    }).populate('items.producto');

    if (!carrito) {
      return res.status(404).json({
        success: false,
        mensaje: 'Carrito no encontrado'
      });
    }

    const verificacion = await carrito.verificarDisponibilidadItems();

    res.status(200).json({
      success: true,
      ...verificacion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarPrecios = async (req, res) => {
  try {
    const carrito = await Cart.findOne({ 
      usuario: req.usuario.id, 
      activo: true 
    });

    if (!carrito) {
      return res.status(404).json({
        success: false,
        mensaje: 'Carrito no encontrado'
      });
    }

    await carrito.actualizarPrecios();
    await carrito.populate('items.producto', 'nombre slug precio imagenesPrincipales');

    res.status(200).json({
      success: true,
      carrito
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerCarritosAbandonados = async (req, res) => {
  try {
    const horas = req.query.horas || 24;
    const carritos = await Cart.obtenerCarritosAbandonados(horas);

    res.status(200).json({
      success: true,
      total: carritos.length,
      carritos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};