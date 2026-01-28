const Product = require('../models/Product');
const Category = require('../models/Category');

exports.crearProducto = async (req, res) => {
  try {
    req.body.creadoPor = req.usuario.id;
    const producto = await Product.create(req.body);

    res.status(201).json({
      success: true,
      producto
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};
exports.obtenerProductoPorId = async (req, res) => {
  try {
    const producto = await Product.findById(req.params.id)
      .populate('categoria', 'nombre slug')
      .populate('colecciones', 'nombre slug')
      .populate('productosRelacionados', 'nombre precio slug imagenesPrincipales rating');

    if (!producto) {
      return res.status(404).json({
        success: false,
        mensaje: 'Producto no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      producto
    });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};
exports.obtenerProductos = async (req, res) => {
  try {
    const {
      categoria,
      genero,
      precioMin,
      precioMax,
      talla,
      color,
      marca,
      tags,
      conDescuento,
      nuevo,
      destacado,
      disponible,
      ordenarPor,
      limite = 20,
      pagina = 1,
      buscar
    } = req.query;

    const query = { estado: 'activo' };

    if (disponible !== undefined) {
      query.disponible = disponible === 'true';
    }

    if (categoria) query.categoria = categoria;
    if (genero) query.genero = genero;
    if (marca) query.marca = new RegExp(marca, 'i');
    if (nuevo !== undefined) query.nuevo = nuevo === 'true';
    if (destacado !== undefined) query.destacado = destacado === 'true';
    if (conDescuento === 'true') query['descuento.activo'] = true;

    if (precioMin || precioMax) {
      query.precio = {};
      if (precioMin) query.precio.$gte = Number(precioMin);
      if (precioMax) query.precio.$lte = Number(precioMax);
    }

    if (talla) {
      query['variantes.talla'] = talla.toUpperCase();
    }

    if (color) {
      query['variantes.color.nombre'] = new RegExp(color, 'i');
    }

    if (tags) {
      const tagsArray = tags.split(',');
      query.tags = { $in: tagsArray };
    }

    if (buscar) {
      query.$text = { $search: buscar };
    }

    let sort = {};
    switch (ordenarPor) {
      case 'precio_bajo':
        sort = { precio: 1 };
        break;
      case 'precio_alto':
        sort = { precio: -1 };
        break;
      case 'mas_vendidos':
        sort = { 'estadisticas.ventasTotales': -1 };
        break;
      case 'mejor_valorados':
        sort = { 'rating.promedio': -1 };
        break;
      case 'mas_recientes':
        sort = { createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (Number(pagina) - 1) * Number(limite);
    
    const productos = await Product.find(query)
      .populate('categoria', 'nombre slug')
      .populate('colecciones', 'nombre slug')
      .sort(sort)
      .limit(Number(limite))
      .skip(skip);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      resultados: productos.length,
      total,
      paginas: Math.ceil(total / Number(limite)),
      paginaActual: Number(pagina),
      productos
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerProducto = async (req, res) => {
  try {
    const producto = await Product.findOne({ 
      slug: req.params.slug, 
      estado: 'activo' 
    })
      .populate('categoria', 'nombre slug')
      .populate('colecciones', 'nombre slug')
      .populate('productosRelacionados', 'nombre precio slug imagenesPrincipales rating')
      .populate({
        path: 'reviews',
        match: { aprobado: true, activo: true },
        options: { sort: { createdAt: -1 }, limit: 10 },
        populate: { path: 'usuario', select: 'nombres apellidos avatar' }
      });

    if (!producto) {
      return res.status(404).json({
        success: false,
        mensaje: 'Producto no encontrado'
      });
    }

    producto.estadisticas.vistas += 1;
    await producto.save();

    res.status(200).json({
      success: true,
      producto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    req.body.modificadoPor = req.usuario.id;

    const producto = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!producto) {
      return res.status(404).json({
        success: false,
        mensaje: 'Producto no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      producto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    const producto = await Product.findByIdAndUpdate(
      req.params.id,
      { estado: 'descontinuado', disponible: false },
      { new: true }
    );

    if (!producto) {
      return res.status(404).json({
        success: false,
        mensaje: 'Producto no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Producto eliminado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.agregarVariante = async (req, res) => {
  try {
    const producto = await Product.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        mensaje: 'Producto no encontrado'
      });
    }

    producto.variantes.push(req.body);
    await producto.save();

    res.status(200).json({
      success: true,
      producto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarVariante = async (req, res) => {
  try {
    const producto = await Product.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        mensaje: 'Producto no encontrado'
      });
    }

    const variante = producto.variantes.id(req.params.varianteId);

    if (!variante) {
      return res.status(404).json({
        success: false,
        mensaje: 'Variante no encontrada'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id') {
        variante[key] = req.body[key];
      }
    });

    await producto.save();

    res.status(200).json({
      success: true,
      producto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarVariante = async (req, res) => {
  try {
    const producto = await Product.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        mensaje: 'Producto no encontrado'
      });
    }

    producto.variantes.pull(req.params.varianteId);
    await producto.save();

    res.status(200).json({
      success: true,
      producto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerTallasDisponibles = async (req, res) => {
  try {
    const tallas = await Product.distinct('variantes.talla', {
      estado: 'activo',
      'variantes.activo': true,
      'variantes.stock': { $gt: 0 }
    });

    res.status(200).json({
      success: true,
      tallas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerColoresDisponibles = async (req, res) => {
  try {
    const productos = await Product.find({
      estado: 'activo',
      'variantes.activo': true,
      'variantes.stock': { $gt: 0 }
    });

    const coloresSet = new Set();
    productos.forEach(producto => {
      producto.variantes.forEach(variante => {
        if (variante.activo && variante.stock > 0) {
          coloresSet.add(JSON.stringify({
            nombre: variante.color.nombre,
            codigoHex: variante.color.codigoHex
          }));
        }
      });
    });

    const colores = Array.from(coloresSet).map(color => JSON.parse(color));

    res.status(200).json({
      success: true,
      colores
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerRangoPrecio = async (req, res) => {
  try {
    const resultado = await Product.aggregate([
      { $match: { estado: 'activo', disponible: true } },
      {
        $group: {
          _id: null,
          min: { $min: '$precio' },
          max: { $max: '$precio' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      rango: resultado[0] || { min: 0, max: 0 }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarStock = async (req, res) => {
  try {
    const { varianteId, cantidad } = req.body;

    const producto = await Product.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        mensaje: 'Producto no encontrado'
      });
    }

    const variante = producto.variantes.id(varianteId);

    if (!variante) {
      return res.status(404).json({
        success: false,
        mensaje: 'Variante no encontrada'
      });
    }

    variante.stock = cantidad;
    await producto.save();

    res.status(200).json({
      success: true,
      producto
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};