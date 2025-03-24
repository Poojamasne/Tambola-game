const express = require('express');
const { sendNotification, getNotifications } = require('../controllers/NotificationController');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Route to send a notification
router.post('/notifications/send', verifyToken, sendNotification);

// Route to get all notifications
router.get('/notifications', verifyToken, getNotifications);

module.exports = router;
