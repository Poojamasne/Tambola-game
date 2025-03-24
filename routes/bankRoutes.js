const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const verifyToken = require('../middleware/auth'); // Ensure the path is correct

// API Endpoints
router.post('/bank', verifyToken, bankController.addBankAccount);
router.get('/bank', verifyToken, bankController.getBankAccounts);
router.put('/bank/:id', verifyToken, bankController.updateBankAccount);
router.delete('/bank/:id', verifyToken, bankController.deleteBankAccount);

module.exports = router;
