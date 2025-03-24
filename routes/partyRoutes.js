const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyController');
const verifyToken = require('../middleware/auth');

// Define routes
router.post('/party', verifyToken, partyController.addpartyEntry);
router.get('/party', verifyToken, partyController.getAllpartys);
router.put('/party/:id', verifyToken, partyController.updatepartyEntry);
router.delete('/party/:id', verifyToken, partyController.deletepartyEntry);

router.get('/book/:bookId/grade', verifyToken, partyController.getGradeByBook);

module.exports = router;
