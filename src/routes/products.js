const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { proteger, autorizarRoles } = require('../middleware/auth');

router.get('/', productController.obtenerProductos);
router.get('/tallas', productController.obtenerTallasDisponibles);
router.get('/colores', productController.obtenerColoresDisponibles);
router.get('/rango-precio', productController.obtenerRangoPrecio);
router.get('/:slug', productController.obtenerProducto);

router.post('/', proteger, autorizarRoles('administrador', 'vendedor'), productController.crearProducto);
router.put('/:id', proteger, autorizarRoles('administrador', 'vendedor'), productController.actualizarProducto);
router.delete('/:id', proteger, autorizarRoles('administrador', 'vendedor'), productController.eliminarProducto);

router.post('/:id/variantes', proteger, autorizarRoles('administrador', 'vendedor'), productController.agregarVariante);
router.put('/:id/variantes/:varianteId', proteger, autorizarRoles('administrador', 'vendedor'), productController.actualizarVariante);
router.delete('/:id/variantes/:varianteId', proteger, autorizarRoles('administrador', 'vendedor'), productController.eliminarVariante);

router.put('/:id/stock', proteger, autorizarRoles('administrador', 'vendedor'), productController.actualizarStock);

module.exports = router;