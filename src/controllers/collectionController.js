const Collection = require('../models/Collection');

exports.crearColeccion = async (req, res) => {
  try {
    const coleccion = await Collection.create(req.body);

    res.status(201).json({
      success: true,
      coleccion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerColecciones = async (req, res) => {
  try {
    const { tipo, activo, mostrarEnHome } = req.query;

    const query = {};

    if (tipo) query.tipo = tipo;
    if (activo !== undefined) query.activo = activo === 'true';
    if (mostrarEnHome !== undefined) {
      query['configuracion.mostrarEnHome'] = mostrarEnHome === 'true';
    }

    const colecciones = await Collection.find(query).sort({ orden: 1 });

    res.status(200).json({
      success: true,
      total: colecciones.length,
      colecciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerColeccion = async (req, res) => {
  try {
    const coleccion = await Collection.findOne({ 
      slug: req.params.slug,
      activo: true
    });

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Colección no encontrada'
      });
    }

    if (!coleccion.vigente) {
      return res.status(400).json({
        success: false,
        mensaje: 'Esta colección no está vigente'
      });
    }

    const productos = await coleccion.obtenerProductos();

    res.status(200).json({
      success: true,
      coleccion,
      productos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.obtenerProductosColeccion = async (req, res) => {
  try {
    const coleccion = await Collection.findOne({ 
      slug: req.params.slug,
      activo: true
    });

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Colección no encontrada'
      });
    }

    const productos = await coleccion.obtenerProductos();

    res.status(200).json({
      success: true,
      total: productos.length,
      productos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.actualizarColeccion = async (req, res) => {
  try {
    const coleccion = await Collection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Colección no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      coleccion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarColeccion = async (req, res) => {
  try {
    const coleccion = await Collection.findByIdAndDelete(req.params.id);

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Colección no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Colección eliminada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.agregarProducto = async (req, res) => {
  try {
    const { productoId, orden } = req.body;

    const coleccion = await Collection.findById(req.params.id);

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Colección no encontrada'
      });
    }

    await coleccion.agregarProducto(productoId, orden);

    res.status(200).json({
      success: true,
      coleccion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.removerProducto = async (req, res) => {
  try {
    const coleccion = await Collection.findById(req.params.id);

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Colección no encontrada'
      });
    }

    await coleccion.removerProducto(req.params.productoId);

    res.status(200).json({
      success: true,
      coleccion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.incrementarVistas = async (req, res) => {
  try {
    const coleccion = await Collection.findById(req.params.id);

    if (!coleccion) {
      return res.status(404).json({
        success: false,
        mensaje: 'Colección no encontrada'
      });
    }

    coleccion.estadisticas.vistas += 1;
    await coleccion.save();

    res.status(200).json({
      success: true,
      estadisticas: coleccion.estadisticas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};