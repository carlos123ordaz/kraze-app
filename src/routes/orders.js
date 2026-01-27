const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { proteger, autorizarRoles } = require('../middleware/auth');

// Ruta para invitados (sin autenticación)
router.post('/invitado', orderController.crearOrdenInvitado);

// Rutas protegidas (requieren autenticación)
router.post('/', proteger, orderController.crearOrden);
router.get('/mis-ordenes', proteger, orderController.obtenerMisOrdenes);
router.get('/numero/:numeroOrden', proteger, orderController.obtenerOrdenPorNumero);
router.get('/:id', proteger, orderController.obtenerOrden);
router.put('/:id/cancelar', proteger, orderController.cancelarOrden);
router.post('/:id/calificar', proteger, orderController.calificarServicio);

// Rutas de administración
router.get('/', proteger, autorizarRoles('administrador', 'vendedor'), orderController.obtenerTodasOrdenes);
router.put('/:id/estado', proteger, autorizarRoles('administrador', 'vendedor'), orderController.actualizarEstadoOrden);
router.post('/:id/confirmar-pago', proteger, autorizarRoles('administrador', 'vendedor'), orderController.confirmarPago);
router.get('/estadisticas/ventas', proteger, autorizarRoles('administrador'), orderController.obtenerEstadisticas);

module.exports = router;