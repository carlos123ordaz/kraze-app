const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { proteger, autorizarRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/imagen', 
  proteger, 
  upload.uploadSingle, 
  upload.handleMulterError, 
  uploadController.subirImagen
);

router.post('/imagenes', 
  proteger, 
  upload.uploadImages, 
  upload.handleMulterError, 
  uploadController.subirImagenes
);

router.post('/producto/imagen', 
  proteger, 
  autorizarRoles('administrador', 'vendedor'),
  upload.uploadSingle, 
  upload.handleMulterError, 
  uploadController.subirImagenProducto
);

router.post('/producto/imagenes', 
  proteger, 
  autorizarRoles('administrador', 'vendedor'),
  upload.uploadProductImages, 
  upload.handleMulterError, 
  uploadController.subirImagenesProducto
);

router.post('/review/imagenes', 
  proteger, 
  upload.uploadReviewImages, 
  upload.handleMulterError, 
  uploadController.subirImagenReview
);

router.post('/comprobante', 
  proteger, 
  upload.uploadComprobante, 
  upload.handleMulterError, 
  uploadController.subirComprobante
);

router.delete('/archivo', 
  proteger, 
  autorizarRoles('administrador'), 
  uploadController.eliminarArchivo
);

router.get('/listar', 
  proteger, 
  autorizarRoles('administrador'), 
  uploadController.listarArchivos
);

module.exports = router;