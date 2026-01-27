const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { proteger, autorizarRoles } = require('../middleware/auth');

router.post('/validar', proteger, couponController.validarCupon);
router.get('/generar-codigo', proteger, autorizarRoles('administrador'), couponController.generarCodigoAleatorio);

router.get('/', proteger, autorizarRoles('administrador', 'vendedor'), couponController.obtenerCupones);
router.get('/:codigo', proteger, autorizarRoles('administrador', 'vendedor'), couponController.obtenerCupon);
router.get('/:id/historial', proteger, autorizarRoles('administrador'), couponController.obtenerHistorialUsos);

router.post('/', proteger, autorizarRoles('administrador'), couponController.crearCupon);
router.put('/:id', proteger, autorizarRoles('administrador'), couponController.actualizarCupon);
router.delete('/:id', proteger, autorizarRoles('administrador'), couponController.eliminarCupon);

module.exports = router;