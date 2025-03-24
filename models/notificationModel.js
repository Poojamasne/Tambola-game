const db = require('../db');

const Notification = {
    createNotification: async (type, message, phone) => {
        try {
            const [result] = await db.execute(
                "INSERT INTO notifications (type, message, phone, timestamp) VALUES (?, ?, ?, NOW())",
                [type, message, phone]
            );
            return result.insertId;
        } catch (error) {
            console.error("Database Error:", error);
            throw error;
        }
    },

    getNotificationsByType: async (type) => {
        try {
            const query = type === 'all' ? 
                "SELECT * FROM notifications ORDER BY timestamp DESC" : 
                "SELECT * FROM notifications WHERE type = ? ORDER BY timestamp DESC";

            const [rows] = await db.execute(query, type === 'all' ? [] : [type]);
            return rows;
        } catch (error) {
            console.error("Database Error:", error);
            throw error;
        }
    },

    deleteNotification: async (id) => {
        try {
            const [result] = await db.execute("DELETE FROM notifications WHERE id = ?", [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Database Error:", error);
            throw error;
        }
    }
};

module.exports = Notification;
