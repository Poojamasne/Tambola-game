const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/auth');

router.post('/generate-tickets',gameController.generateTicket);

// Game operations
router.post('/draw',verifyToken, gameController.drawNumber);
router.get('/winners', verifyToken, gameController.checkWinners);
router.post('/start', verifyToken, gameController.startGame);
router.post('/reset', verifyToken, gameController.resetGame);
router.get('/state', verifyToken, gameController.getGameState);

// Live results
router.get('/results/live', gameController.getLiveResults); 

// Player selection
router.get('/player/:gameId', gameController.getPlayerDetails);

// Rewards
router.get('/rewards/config', gameController.getRewardConfigs);
router.put('/rewards/config/:id', gameController.updateRewardConfig);
router.post('/rewards/distribute', gameController.distributeRewards);
router.get('/rewards/player/:gameId', gameController.getPlayerRewards);



module.exports = router;