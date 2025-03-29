const express = require('express');
const router = express.Router();
const { buyTicket, getAllTickets, getTicketById } = require('../controllers/buyTicket-controller');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/auth');

router.post('/buy-ticket', verifyToken, buyTicket);
router.get('/buy-tickets', verifyToken, getAllTickets);
router.get('/buy-ticket/:id', verifyToken, getTicketById);

module.exports = router;
