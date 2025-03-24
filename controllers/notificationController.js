const axios = require('axios');
const Notification = require('../models/notificationModel');

exports.createNotification = async (req, res) => {
    const { type, message, phone } = req.body;

    if (!type || !message || !phone) {
        return res.status(400).json({ success: false, message: "Type, message, and phone number are required" });
    }

    try {
        const id = await Notification.createNotification(type, message, phone);

        // ✅ Send SMS via 2Factor API (General SMS API)
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        const smsURL = `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/PSMS`;

        const smsPayload = {
            From: "TXTLCL",   // Sender ID (Get from 2Factor)
            To: phone,
            Msg: message,
            MsgType: "TEXT"   // Plain text message
        };

        console.log("🔍 Sending SMS to:", phone);
        console.log("🔗 API URL:", smsURL);

        const response = await axios.post(smsURL, smsPayload);
        console.log("✅ SMS API Response:", response.data);

        if (response.data.Status !== "Success") {
            return res.status(400).json({ 
                success: false, 
                message: "Failed to send SMS", 
                error: response.data 
            });
        }

        const notification = { id, type, message, phone, timestamp: new Date() };
        req.app.get('sendNotification')(notification);

        res.status(201).json({ success: true, message: "Notification sent successfully", notificationId: id });

    } catch (error) {
        console.error("❌ Error Sending Notification:", error.response ? error.response.data : error.message);
        res.status(500).json({ 
            success: false, 
            message: "Failed to send notification", 
            error: error.response ? error.response.data : error.message 
        });
    }
};



exports.getNotifications = async (req, res) => {
  const { type } = req.query;

  try {
    const query = type === 'all' || !type 
      ? 'SELECT * FROM notifications ORDER BY timestamp DESC'
      : 'SELECT * FROM notifications WHERE type = ? ORDER BY timestamp DESC';

    const values = type === 'all' || !type ? [] : [type];
    const [notifications] = await db.execute(query, values);

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch notifications", error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute('DELETE FROM notifications WHERE id = ?', [id]);

    if (result.affectedRows > 0) {
      res.status(200).json({ success: true, message: "Notification deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: "Notification not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete notification", error: error.message });
  }
};
