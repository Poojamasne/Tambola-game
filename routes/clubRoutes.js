const express = require('express');
const router = express.Router();
const clubController = require('../controllers/clubController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/auth');

// Create new club
router.post('/club', verifyToken, clubController.createClub);

// Get club details
router.get('/club/:clubId', verifyToken, clubController.getClubDetails);

// List all clubs (with optional filtering)
router.get('/club', verifyToken, clubController.listClubs);

// Add players to club
router.post('/club/:clubId/players', verifyToken, clubController.addPlayers);

// Distribute prizes
router.post('/club/:clubId/distribute-prizes', verifyToken, clubController.distributePrizes);

module.exports = router;