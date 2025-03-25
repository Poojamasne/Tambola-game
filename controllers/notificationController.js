const notification = require('../models/notificationModel');

let io; // To store socket instance

const setSocket = (socketIo) => {
    io = socketIo;
};

const sendnotification = async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
    }

    try {
        const id = await notification.createnotification(message);
        const notification = { id, message, timestamp: new Date() };

        // Send the notification to all connected clients
        if (io) {
            io.emit('newnotification', notification);
        }

        res.status(201).json({ success: true, message: "notification sent", notification });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to send notification", error: error.message });
    }
};

const getnotifications = async (req, res) => {
    try {
        const notifications = await notification.getnotifications();
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch notifications", error: error.message });
    }
};

module.exports = { sendnotification, getnotifications, setSocket };
