const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const { proteger, autorizarRoles } = require('../middleware/auth');

router.post('/calcular', shippingController.calcularCostoEnvio);
router.get('/', shippingController.obtenerZonas);
router.get('/:id', shippingController.obtenerZona);

router.post('/inicializar', proteger, autorizarRoles('administrador'), shippingController.inicializarZonasDefault);
router.post('/', proteger, autorizarRoles('administrador'), shippingController.crearZona);
router.put('/:id', proteger, autorizarRoles('administrador'), shippingController.actualizarZona);
router.delete('/:id', proteger, autorizarRoles('administrador'), shippingController.eliminarZona);

module.exports = router;