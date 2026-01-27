const ShippingZone = require('../models/ShippingZone');

exports.crearZona = async (req, res) => {
  try {
    const zona = await ShippingZone.create(req.body);

    res.status(201).json({
      success: true,
      zona
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerZonas = async (req, res) => {
  try {
    const { tipo, activo } = req.query;

    const query = {};

    if (tipo) query.tipo = tipo;
    if (activo !== undefined) query.activo = activo === 'true';

    const zonas = await ShippingZone.find(query).sort({ orden: 1 });

    res.status(200).json({
      success: true,
      total: zonas.length,
      zonas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerZona = async (req, res) => {
  try {
    const zona = await ShippingZone.findById(req.params.id);

    if (!zona) {
      return res.status(404).json({
        success: false,
        mensaje: 'Zona no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      zona
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.calcularCostoEnvio = async (req, res) => {
  try {
    const { departamento, provincia, distrito, subtotal, peso, dimensiones } = req.body;

    const zona = await ShippingZone.obtenerZonaPorUbicacion(
      departamento,
      provincia,
      distrito
    );

    if (!zona) {
      return res.status(404).json({
        success: false,
        mensaje: 'No hay envío disponible para esta ubicación'
      });
    }

    const resultado = zona.calcularCosto(subtotal, peso, dimensiones);

    if (resultado.error) {
      return res.status(400).json({
        success: false,
        mensaje: resultado.mensaje
      });
    }

    res.status(200).json({
      success: true,
      zona: {
        nombre: zona.nombre,
        tipo: zona.tipo
      },
      ...resultado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarZona = async (req, res) => {
  try {
    const zona = await ShippingZone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!zona) {
      return res.status(404).json({
        success: false,
        mensaje: 'Zona no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      zona
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarZona = async (req, res) => {
  try {
    const zona = await ShippingZone.findByIdAndDelete(req.params.id);

    if (!zona) {
      return res.status(404).json({
        success: false,
        mensaje: 'Zona no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Zona eliminada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.inicializarZonasDefault = async (req, res) => {
  try {
    await ShippingZone.crearZonasPorDefecto();

    const zonas = await ShippingZone.find({});

    res.status(200).json({
      success: true,
      mensaje: 'Zonas por defecto creadas',
      zonas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};