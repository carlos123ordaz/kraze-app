const StoreConfig = require('../models/StoreConfig');

exports.obtenerConfiguracion = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    res.status(200).json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarConfiguracion = async (req, res) => {
  try {
    const config = await StoreConfig.actualizarConfig(req.body);

    res.status(200).json({
      success: true,
      mensaje: 'Configuración actualizada',
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarTienda = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    if (req.body.nombre) config.tienda.nombre = req.body.nombre;
    if (req.body.slogan) config.tienda.slogan = req.body.slogan;
    if (req.body.descripcion) config.tienda.descripcion = req.body.descripcion;
    if (req.body.logo) config.tienda.logo = req.body.logo;
    if (req.body.email) config.tienda.email = req.body.email;
    if (req.body.telefono) config.tienda.telefono = req.body.telefono;
    if (req.body.whatsapp) config.tienda.whatsapp = req.body.whatsapp;
    if (req.body.direccion) config.tienda.direccion = req.body.direccion;

    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Información de tienda actualizada',
      tienda: config.tienda
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarMetodosPago = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    if (req.body.contraEntrega) {
      config.metodosPago.contraEntrega = {
        ...config.metodosPago.contraEntrega,
        ...req.body.contraEntrega
      };
    }

    if (req.body.yape) {
      config.metodosPago.yape = {
        ...config.metodosPago.yape,
        ...req.body.yape
      };
    }

    if (req.body.mercadoPago) {
      config.metodosPago.mercadoPago = {
        ...config.metodosPago.mercadoPago,
        ...req.body.mercadoPago
      };
    }

    if (req.body.transferencia) {
      config.metodosPago.transferencia = {
        ...config.metodosPago.transferencia,
        ...req.body.transferencia
      };
    }

    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Métodos de pago actualizados',
      metodosPago: config.metodosPago
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarRedesSociales = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    config.redesSociales = {
      ...config.redesSociales,
      ...req.body
    };

    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Redes sociales actualizadas',
      redesSociales: config.redesSociales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarSEO = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    config.seo = {
      ...config.seo,
      ...req.body
    };

    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Configuración SEO actualizada',
      seo: config.seo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.agregarBanner = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    config.banners.push({
      titulo: req.body.titulo,
      descripcion: req.body.descripcion,
      imagen: req.body.imagen,
      enlace: req.body.enlace,
      activo: req.body.activo !== undefined ? req.body.activo : true,
      orden: config.banners.length
    });

    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Banner agregado',
      banners: config.banners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarBanner = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();
    const banner = config.banners.id(req.params.bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        mensaje: 'Banner no encontrado'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id') {
        banner[key] = req.body[key];
      }
    });

    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Banner actualizado',
      banners: config.banners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarBanner = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();
    config.banners.pull(req.params.bannerId);
    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Banner eliminado',
      banners: config.banners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarHorarioAtencion = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    config.horarioAtencion = {
      ...config.horarioAtencion,
      ...req.body
    };

    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Horario de atención actualizado',
      horarioAtencion: config.horarioAtencion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarPolitica = async (req, res) => {
  try {
    const { tipo, contenido } = req.body;

    const tiposValidos = [
      'terminosCondiciones',
      'politicaPrivacidad',
      'politicaDevolucion',
      'politicaEnvio',
      'politicaCookies'
    ];

    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        mensaje: 'Tipo de política inválido'
      });
    }

    const config = await StoreConfig.obtenerConfig();
    config.legal[tipo] = contenido;
    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Política actualizada',
      legal: config.legal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.activarMantenimiento = async (req, res) => {
  try {
    const { mensaje, ipPermitidas } = req.body;

    const config = await StoreConfig.obtenerConfig();

    config.mantenimiento = {
      activo: true,
      mensaje: mensaje || 'Sitio en mantenimiento. Volveremos pronto.',
      ipPermitidas: ipPermitidas || []
    };

    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Modo mantenimiento activado',
      mantenimiento: config.mantenimiento
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.desactivarMantenimiento = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    config.mantenimiento.activo = false;
    await config.save();

    res.status(200).json({
      success: true,
      mensaje: 'Modo mantenimiento desactivado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerConfiguracionPublica = async (req, res) => {
  try {
    const config = await StoreConfig.obtenerConfig();

    const configPublica = {
      tienda: config.tienda,
      redesSociales: config.redesSociales,
      moneda: config.moneda,
      metodosPago: {
        contraEntrega: { habilitado: config.metodosPago.contraEntrega.habilitado },
        yape: { habilitado: config.metodosPago.yape.habilitado },
        mercadoPago: { habilitado: config.metodosPago.mercadoPago.habilitado },
        transferencia: { habilitado: config.metodosPago.transferencia.habilitado }
      },
      envio: config.envio,
      seo: config.seo,
      banners: config.banners.filter(b => b.activo),
      horarioAtencion: config.horarioAtencion,
      legal: config.legal
    };

    res.status(200).json({
      success: true,
      config: configPublica
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};