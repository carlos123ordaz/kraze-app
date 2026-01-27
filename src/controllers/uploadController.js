const gcs = require('../utils/googleCloudStorage');
const StoreConfig = require('../models/StoreConfig');

exports.subirImagen = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se proporcionó ningún archivo'
      });
    }

    const folder = req.query.folder || 'general';
    const resultado = await gcs.uploadFile(req.file, folder);

    res.status(200).json({
      success: true,
      archivo: resultado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.subirImagenes = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se proporcionaron archivos'
      });
    }

    const folder = req.query.folder || 'general';
    const resultados = await gcs.uploadMultipleFiles(req.files, folder);

    res.status(200).json({
      success: true,
      archivos: resultados
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.subirImagenProducto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se proporcionó ningún archivo'
      });
    }

    const config = await StoreConfig.obtenerConfig();
    const folder = config.storage.carpetaProductos || 'productos';
    
    const resultado = await gcs.uploadFile(req.file, folder);

    res.status(200).json({
      success: true,
      imagen: resultado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.subirImagenesProducto = async (req, res) => {
  try {
    const archivos = [];

    if (req.files.imagenesPrincipales) {
      archivos.push(...req.files.imagenesPrincipales);
    }

    if (req.files.imagenesVariantes) {
      archivos.push(...req.files.imagenesVariantes);
    }

    if (archivos.length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se proporcionaron archivos'
      });
    }

    const config = await StoreConfig.obtenerConfig();
    const folder = config.storage.carpetaProductos || 'productos';
    
    const resultados = await gcs.uploadMultipleFiles(archivos, folder);

    res.status(200).json({
      success: true,
      imagenes: resultados
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.subirImagenReview = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se proporcionaron archivos'
      });
    }

    const config = await StoreConfig.obtenerConfig();
    const folder = config.storage.carpetaReviews || 'reviews';
    
    const resultados = await gcs.uploadMultipleFiles(req.files, folder);

    res.status(200).json({
      success: true,
      imagenes: resultados
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.subirComprobante = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se proporcionó ningún archivo'
      });
    }

    const config = await StoreConfig.obtenerConfig();
    const folder = config.storage.carpetaComprobantes || 'comprobantes';
    
    const resultado = await gcs.uploadFile(req.file, folder);

    res.status(200).json({
      success: true,
      comprobante: resultado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.eliminarArchivo = async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        mensaje: 'filePath es requerido'
      });
    }

    await gcs.deleteFile(filePath);

    res.status(200).json({
      success: true,
      mensaje: 'Archivo eliminado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};

exports.listarArchivos = async (req, res) => {
  try {
    const { prefix } = req.query;

    const archivos = await gcs.listFiles(prefix);

    res.status(200).json({
      success: true,
      total: archivos.length,
      archivos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: error.message
    });
  }
};