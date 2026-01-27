const Category = require('../models/Category');

exports.crearCategoria = async (req, res) => {
  try {
    // El slug se genera automáticamente en el middleware del modelo
    const categoria = await Category.create(req.body);

    res.status(201).json({
      success: true,
      categoria
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    
    // Manejar error de duplicado
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        mensaje: `Ya existe una categoría con ese ${campo}`
      });
    }
    
    // Manejar error de validación
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        mensaje: mensajes.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      mensaje: 'Error al crear la categoría'
    });
  }
};

exports.obtenerCategorias = async (req, res) => {
  try {
    const { padre, nivel, activo } = req.query;

    const query = {};

    if (padre !== undefined) {
      query.padre = padre === 'null' ? null : padre;
    }

    if (nivel !== undefined) {
      query.nivel = Number(nivel);
    }

    if (activo !== undefined) {
      query.activo = activo === 'true';
    }

    const categorias = await Category.find(query)
      .populate('padre', 'nombre slug')
      .sort({ orden: 1 });

    res.status(200).json({
      success: true,
      total: categorias.length,
      categorias
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener las categorías'
    });
  }
};

exports.obtenerArbolCategorias = async (req, res) => {
  try {
    const categoriasPrincipales = await Category.find({ 
      padre: null, 
      activo: true 
    }).sort({ orden: 1 });

    const arbol = [];

    for (const categoria of categoriasPrincipales) {
      const subcategorias = await Category.find({ 
        padre: categoria._id, 
        activo: true 
      }).sort({ orden: 1 });

      arbol.push({
        ...categoria.toObject(),
        subcategorias
      });
    }

    res.status(200).json({
      success: true,
      arbol
    });
  } catch (error) {
    console.error('Error al obtener árbol de categorías:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener el árbol de categorías'
    });
  }
};

exports.obtenerCategoria = async (req, res) => {
  try {
    const categoria = await Category.findOne({ slug: req.params.slug })
      .populate('padre', 'nombre slug')
      .populate('subcategorias');

    if (!categoria) {
      return res.status(404).json({
        success: false,
        mensaje: 'Categoría no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      categoria
    });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener la categoría'
    });
  }
};

exports.actualizarCategoria = async (req, res) => {
  try {
    // Si se actualiza el nombre, el slug se regenerará automáticamente
    const categoria = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!categoria) {
      return res.status(404).json({
        success: false,
        mensaje: 'Categoría no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      categoria
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    
    // Manejar error de duplicado
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        mensaje: `Ya existe una categoría con ese ${campo}`
      });
    }

    res.status(500).json({
      success: false,
      mensaje: 'Error al actualizar la categoría'
    });
  }
};

exports.eliminarCategoria = async (req, res) => {
  try {
    const categoria = await Category.findById(req.params.id);

    if (!categoria) {
      return res.status(404).json({
        success: false,
        mensaje: 'Categoría no encontrada'
      });
    }

    // Verificar si tiene subcategorías
    const subcategorias = await Category.find({ padre: categoria._id });

    if (subcategorias.length > 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se puede eliminar una categoría con subcategorías'
      });
    }

    // Usar deleteOne en lugar de remove (deprecado)
    await categoria.deleteOne();

    res.status(200).json({
      success: true,
      mensaje: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al eliminar la categoría'
    });
  }
};

exports.obtenerRutaCategoria = async (req, res) => {
  try {
    const categoria = await Category.findById(req.params.id);

    if (!categoria) {
      return res.status(404).json({
        success: false,
        mensaje: 'Categoría no encontrada'
      });
    }

    const ruta = await categoria.obtenerRuta();

    res.status(200).json({
      success: true,
      ruta
    });
  } catch (error) {
    console.error('Error al obtener ruta de categoría:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener la ruta de la categoría'
    });
  }
};