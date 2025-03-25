const express = require('express');

const verifyToken = require('../middleware/auth');
const { sendNotification, getNotifications } = require('../controllers/notificationController');

const router = express.Router();

// Route to send a notification
router.post('/notifications/send', verifyToken, sendNotification);

// Route to get all notifications
router.get('/notifications', verifyToken, getNotifications);

module.exports = router;
