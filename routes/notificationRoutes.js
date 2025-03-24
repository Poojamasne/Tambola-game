const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/notifications', notificationController.createNotification);
router.get('/notifications', notificationController.getNotifications);
router.delete('/notifications/:id', notificationController.deleteNotification);

module.exports = router;
