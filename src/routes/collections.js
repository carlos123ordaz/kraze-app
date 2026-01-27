const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { proteger, autorizarRoles } = require('../middleware/auth');

router.get('/', collectionController.obtenerColecciones);
router.get('/:slug', collectionController.obtenerColeccion);
router.get('/:slug/productos', collectionController.obtenerProductosColeccion);
router.post('/:id/vistas', collectionController.incrementarVistas);

router.post('/', proteger, autorizarRoles('administrador', 'vendedor'), collectionController.crearColeccion);
router.put('/:id', proteger, autorizarRoles('administrador', 'vendedor'), collectionController.actualizarColeccion);
router.delete('/:id', proteger, autorizarRoles('administrador', 'vendedor'), collectionController.eliminarColeccion);

router.post('/:id/productos', proteger, autorizarRoles('administrador', 'vendedor'), collectionController.agregarProducto);
router.delete('/:id/productos/:productoId', proteger, autorizarRoles('administrador', 'vendedor'), collectionController.removerProducto);

module.exports = router;