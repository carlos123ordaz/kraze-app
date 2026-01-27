const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { proteger, autorizarRoles } = require('../middleware/auth');

router.use(proteger);
router.use(autorizarRoles('administrador'));

router.get('/dashboard', adminController.obtenerDashboard);
router.get('/estadisticas/ventas', adminController.obtenerEstadisticasVentas);
router.get('/productos/bajo-stock', adminController.obtenerProductosBajoStock);
router.get('/usuarios/activos', adminController.obtenerUsuariosActivos);
router.get('/productos/top', adminController.obtenerTopProductos);
router.get('/inventario/reporte', adminController.obtenerReporteInventario);

module.exports = router;