const express = require('express');
const router = express.Router();
const { buildTickets, getTicketById } = require('../controllers/buildTicket-controller');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/auth');

router.post('/build-tickets', verifyToken, buildTickets);
router.get('/ticket/:ticketId', verifyToken, getTicketById);

module.exports = router;
