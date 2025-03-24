const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const verifyToken = require('../middleware/auth'); 

// Define routes
router.post('/customer-fields', verifyToken, customerController.addCustomerField);
router.get('/books/:book_id/customer-field', verifyToken, customerController.getCustomerFieldByBook);

module.exports = router; 

