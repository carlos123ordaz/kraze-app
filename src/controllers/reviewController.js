const Review = require('../models/Review');
const Product = require('../models/Product');

exports.crearReview = async (req, res) => {
  try {
    const { productoId } = req.params;
    
    // Verificar que el usuario esté autenticado
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Debes iniciar sesión para dejar una reseña'
      });
    }

    const verificacion = await Review.puedeDejarReview(req.usuario.id, productoId);

    if (!verificacion.puede) {
      return res.status(400).json({
        success: false,
        mensaje: verificacion.razon
      });
    }

    const review = await Review.create({
      producto: productoId,
      usuario: req.usuario.id,
      pedido: verificacion.pedidoId,
      calificacion: req.body.calificacion,
      titulo: req.body.titulo,
      comentario: req.body.comentario,
      aspectos: req.body.aspectos,
      tallaComprada: req.body.tallaComprada,
      alturaUsuario: req.body.alturaUsuario,
      pesoUsuario: req.body.pesoUsuario,
      imagenes: req.body.imagenes || [],
      aprobado: false,
      compraVerificada: true
    });

    res.status(201).json({
      success: true,
      mensaje: 'Reseña enviada. Será revisada antes de publicarse.',
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

// Verificar si el usuario puede dejar reseña
exports.verificarPuedeRevisar = async (req, res) => {
  try {
    const { productoId } = req.params;
    
    if (!req.usuario) {
      return res.status(200).json({
        success: true,
        puede: false,
        razon: 'Debes iniciar sesión'
      });
    }

    const verificacion = await Review.puedeDejarReview(req.usuario.id, productoId);

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

exports.obtenerReviewsProducto = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { 
      calificacion, 
      ordenarPor = 'recientes',
      pagina = 1,
      limite = 10
    } = req.query;

    const query = {
      producto: productoId,
      aprobado: true,
      activo: true
    };

    if (calificacion) {
      query.calificacion = Number(calificacion);
    }

    let sort = {};
    switch (ordenarPor) {
      case 'recientes':
        sort = { createdAt: -1 };
        break;
      case 'antiguos':
        sort = { createdAt: 1 };
        break;
      case 'mejor_valorados':
        sort = { calificacion: -1 };
        break;
      case 'peor_valorados':
        sort = { calificacion: 1 };
        break;
      case 'mas_utiles':
        sort = { 'utilidad.util': -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (Number(pagina) - 1) * Number(limite);

    const reviews = await Review.find(query)
      .populate('usuario', 'nombres apellidos avatar')
      .sort(sort)
      .limit(Number(limite))
      .skip(skip);

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      resultados: reviews.length,
      total,
      paginas: Math.ceil(total / Number(limite)),
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerMisReviews = async (req, res) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Debes iniciar sesión'
      });
    }

    const reviews = await Review.find({ usuario: req.usuario.id })
      .populate('producto', 'nombre slug imagenesPrincipales')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: reviews.length,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarReview = async (req, res) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Debes iniciar sesión'
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      usuario: req.usuario.id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        mensaje: 'Review no encontrada o no tienes permiso para editarla'
      });
    }

    const camposPermitidos = [
      'calificacion',
      'titulo',
      'comentario',
      'aspectos',
      'imagenes'
    ];

    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        review[campo] = req.body[campo];
      }
    });

    review.aprobado = false;
    await review.save();

    res.status(200).json({
      success: true,
      mensaje: 'Review actualizada. Será revisada nuevamente.',
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarReview = async (req, res) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Debes iniciar sesión'
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      usuario: req.usuario.id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        mensaje: 'Review no encontrada o no tienes permiso para eliminarla'
      });
    }

    review.activo = false;
    await review.save();

    const producto = await Product.findById(review.producto);
    if (producto) {
      await producto.actualizarRating();
    }

    res.status(200).json({
      success: true,
      mensaje: 'Review eliminada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.votarUtilidad = async (req, res) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Debes iniciar sesión para votar'
      });
    }

    const { voto } = req.body;

    if (!['util', 'no_util'].includes(voto)) {
      return res.status(400).json({
        success: false,
        mensaje: 'Voto inválido'
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        mensaje: 'Review no encontrada'
      });
    }

    await review.votarUtilidad(req.usuario.id, voto);

    res.status(200).json({
      success: true,
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.reportarReview = async (req, res) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'Debes iniciar sesión para reportar'
      });
    }

    const { razon } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        mensaje: 'Review no encontrada'
      });
    }

    await review.reportar(req.usuario.id, razon);

    res.status(200).json({
      success: true,
      mensaje: 'Review reportada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.aprobarReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        mensaje: 'Review no encontrada'
      });
    }

    review.aprobado = true;
    review.revisadoPor = req.usuario.id;
    review.fechaRevision = new Date();
    await review.save();

    const producto = await Product.findById(review.producto);
    if (producto) {
      await producto.actualizarRating();
    }

    res.status(200).json({
      success: true,
      mensaje: 'Review aprobada',
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.rechazarReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        mensaje: 'Review no encontrada'
      });
    }

    review.activo = false;
    review.revisadoPor = req.usuario.id;
    review.fechaRevision = new Date();
    await review.save();

    res.status(200).json({
      success: true,
      mensaje: 'Review rechazada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.responderReview = async (req, res) => {
  try {
    const { comentario } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        mensaje: 'Review no encontrada'
      });
    }

    review.respuestaVendedor = {
      comentario,
      fecha: new Date(),
      usuario: req.usuario.id
    };

    await review.save();

    res.status(200).json({
      success: true,
      mensaje: 'Respuesta agregada',
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerReviewsPendientes = async (req, res) => {
  try {
    const reviews = await Review.find({ aprobado: false, activo: true })
      .populate('producto', 'nombre slug imagenesPrincipales')
      .populate('usuario', 'nombres apellidos email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: reviews.length,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerReviewsReportadas = async (req, res) => {
  try {
    const reviews = await Review.find({ reportado: true, activo: true })
      .populate('producto', 'nombre slug')
      .populate('usuario', 'nombres apellidos email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: reviews.length,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};