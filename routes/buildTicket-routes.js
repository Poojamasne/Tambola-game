const express = require('express');
const router = express.Router();
const { buildTickets, getTicketById, createGame, getGamePlayers, getAllTicketsByGameId} = require('../controllers/buildTicket-controller');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/auth');

// Route to create a new game with a specific time slot
router.post('/create-game', verifyToken, createGame);

router.post('/build-tickets', verifyToken, buildTickets);
router.get('/ticket/:ticketId', verifyToken, getTicketById);
router.get('/game-players/:gameId', verifyToken, getGamePlayers);
router.get('/games/:gameId/tickets', verifyToken, getAllTicketsByGameId);

module.exports = router;
