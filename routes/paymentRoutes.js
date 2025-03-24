const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const verifyToken = require('../middleware/auth');


// Define routes
router.post('/payment', verifyToken, paymentController.addpaymentEntry);
router.get('/payment', verifyToken, paymentController.getAllpayments);
router.delete('/payment/:id', verifyToken, paymentController.deletepaymentEntry);
router.put('/payment/:id', verifyToken, paymentController.updatepaymentEntry);

// Add a new payment mode
router.post('/payment-mode', verifyToken, paymentController.addPaymentMode);

// Get payment modes for a specific book
router.get('/book/:bookId/payment-modes', verifyToken, paymentController.getPaymentModesByBook);

// Get a book with linked payment modes
router.get('/book/:bookId/payments', verifyToken, paymentController.getPaymentsByBook);

module.exports = router;
