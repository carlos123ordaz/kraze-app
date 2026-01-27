const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { proteger, autorizarRoles } = require('../middleware/auth');

router.get('/', proteger, cartController.obtenerCarrito);
router.post('/items', proteger, cartController.agregarItem);
router.put('/items/:itemId', proteger, cartController.actualizarCantidad);
router.delete('/items/:itemId', proteger, cartController.removerItem);
router.delete('/', proteger, cartController.limpiarCarrito);

router.post('/cupon', proteger, cartController.aplicarCupon);
router.delete('/cupon', proteger, cartController.removerCupon);

router.get('/verificar-disponibilidad', proteger, cartController.verificarDisponibilidad);
router.put('/actualizar-precios', proteger, cartController.actualizarPrecios);

router.get('/abandonados', proteger, autorizarRoles('administrador'), cartController.obtenerCarritosAbandonados);

module.exports = router;