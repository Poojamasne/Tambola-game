const express = require('express');
const { sendnotification, getnotifications } = require('../controllers/notificationController');
const verifyToken = require('../middleware/auth');


const router = express.Router();

// Route to send a notification
router.post('/notifications/send', verifyToken, sendnotification);

// Route to get all notifications
router.get('/notifications', verifyToken, getnotifications);

module.exports = router;
