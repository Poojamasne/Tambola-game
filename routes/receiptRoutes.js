const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const verifyToken = require('../middleware/auth');

// Define routes
router.post('/receipt', verifyToken, receiptController.addReceiptEntry);
router.get('/receipt', verifyToken, receiptController.getAllReceipts);
router.delete('/receipt/:id', verifyToken, receiptController.deleteReceiptEntry);
router.put('/receipt/:id', verifyToken, receiptController.updateReceiptEntry);

module.exports = router;
