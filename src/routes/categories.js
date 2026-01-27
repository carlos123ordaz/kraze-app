const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { proteger, autorizarRoles } = require('../middleware/auth');

router.get('/', categoryController.obtenerCategorias);
router.get('/arbol', categoryController.obtenerArbolCategorias);
router.get('/:slug', categoryController.obtenerCategoria);
router.get('/:id/ruta', categoryController.obtenerRutaCategoria);

router.post('/', proteger, autorizarRoles('administrador'), categoryController.crearCategoria);
router.put('/:id', proteger, autorizarRoles('administrador'), categoryController.actualizarCategoria);
router.delete('/:id', proteger, autorizarRoles('administrador'), categoryController.eliminarCategoria);

module.exports = router;