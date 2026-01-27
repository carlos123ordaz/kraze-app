const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { proteger } = require('../middleware/auth');

router.post('/registrar', authController.registrar);
router.post('/login', authController.login);
router.post('/verificar-email', proteger, authController.verificarEmail);
router.post('/reenviar-codigo', proteger, authController.reenviarCodigo);

router.get('/perfil', proteger, authController.obtenerPerfil);
router.put('/perfil', proteger, authController.actualizarPerfil);
router.put('/cambiar-password', proteger, authController.cambiarPassword);

router.post('/direcciones', proteger, authController.agregarDireccion);
router.put('/direcciones/:direccionId', proteger, authController.actualizarDireccion);
router.delete('/direcciones/:direccionId', proteger, authController.eliminarDireccion);
router.put('/direcciones/:direccionId/default', proteger, authController.establecerDireccionDefault);

router.post('/wishlist/:productoId', proteger, authController.agregarAWishlist);
router.delete('/wishlist/:productoId', proteger, authController.removerDeWishlist);
router.get('/wishlist', proteger, authController.obtenerWishlist);

module.exports = router;