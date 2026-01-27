const express = require('express');
const router = express.Router();
const storeConfigController = require('../controllers/storeConfigController');
const { proteger, autorizarRoles } = require('../middleware/auth');

router.get('/publica', storeConfigController.obtenerConfiguracionPublica);

router.use(proteger);
router.use(autorizarRoles('administrador'));

router.get('/', storeConfigController.obtenerConfiguracion);
router.put('/', storeConfigController.actualizarConfiguracion);
router.put('/tienda', storeConfigController.actualizarTienda);
router.put('/metodos-pago', storeConfigController.actualizarMetodosPago);
router.put('/redes-sociales', storeConfigController.actualizarRedesSociales);
router.put('/seo', storeConfigController.actualizarSEO);
router.put('/horario', storeConfigController.actualizarHorarioAtencion);
router.put('/politica', storeConfigController.actualizarPolitica);

router.post('/banners', storeConfigController.agregarBanner);
router.put('/banners/:bannerId', storeConfigController.actualizarBanner);
router.delete('/banners/:bannerId', storeConfigController.eliminarBanner);

router.post('/mantenimiento/activar', storeConfigController.activarMantenimiento);
router.post('/mantenimiento/desactivar', storeConfigController.desactivarMantenimiento);

module.exports = router;