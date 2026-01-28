const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { proteger, autorizarRoles } = require('../middleware/auth');

// Rutas públicas
router.get('/producto/:productoId', reviewController.obtenerReviewsProducto);

// Rutas protegidas - requieren autenticación
router.get('/puede-revisar/:productoId', proteger, reviewController.verificarPuedeRevisar);
router.post('/producto/:productoId', proteger, reviewController.crearReview);
router.get('/mis-reviews', proteger, reviewController.obtenerMisReviews);
router.put('/:id', proteger, reviewController.actualizarReview);
router.delete('/:id', proteger, reviewController.eliminarReview);
router.post('/:id/votar', proteger, reviewController.votarUtilidad);
router.post('/:id/reportar', proteger, reviewController.reportarReview);

// Rutas de administración - requieren roles específicos
router.get('/pendientes', proteger, autorizarRoles('administrador', 'vendedor'), reviewController.obtenerReviewsPendientes);
router.get('/reportadas', proteger, autorizarRoles('administrador'), reviewController.obtenerReviewsReportadas);
router.post('/:id/aprobar', proteger, autorizarRoles('administrador', 'vendedor'), reviewController.aprobarReview);
router.post('/:id/rechazar', proteger, autorizarRoles('administrador', 'vendedor'), reviewController.rechazarReview);
router.post('/:id/responder', proteger, autorizarRoles('administrador', 'vendedor'), reviewController.responderReview);

module.exports = router;