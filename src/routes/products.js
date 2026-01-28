const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { proteger, autorizarRoles } = require('../middleware/auth');

// Rutas públicas - rutas específicas PRIMERO
router.get('/tallas', productController.obtenerTallasDisponibles);
router.get('/colores', productController.obtenerColoresDisponibles);
router.get('/rango-precio', productController.obtenerRangoPrecio);

// Ruta para listar productos (con filtros)
router.get('/', productController.obtenerProductos);

// Rutas protegidas - crear producto
router.post('/', proteger, autorizarRoles('administrador', 'vendedor'), productController.crearProducto);

// Rutas de variantes (por ID)
router.post('/:id/variantes', proteger, autorizarRoles('administrador', 'vendedor'), productController.agregarVariante);
router.put('/:id/variantes/:varianteId', proteger, autorizarRoles('administrador', 'vendedor'), productController.actualizarVariante);
router.delete('/:id/variantes/:varianteId', proteger, autorizarRoles('administrador', 'vendedor'), productController.eliminarVariante);

// Ruta para actualizar stock
router.put('/:id/stock', proteger, autorizarRoles('administrador', 'vendedor'), productController.actualizarStock);

// Rutas protegidas - actualizar y eliminar por ID
router.put('/:id', proteger, autorizarRoles('administrador', 'vendedor'), productController.actualizarProducto);
router.delete('/:id', proteger, autorizarRoles('administrador', 'vendedor'), productController.eliminarProducto);

// Ruta para obtener producto por ID (para el panel admin)
router.get('/id/:id', productController.obtenerProductoPorId);

// Ruta para obtener producto por slug (para la tienda pública) - DEBE IR AL FINAL
router.get('/slug/:slug', productController.obtenerProducto);

module.exports = router;