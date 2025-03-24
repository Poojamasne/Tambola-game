const db = require('../db');

class Notification {
    static async createNotification(message) {
        const [result] = await db.execute(
            'INSERT INTO notifications (message) VALUES (?)',
            [message]
        );
        return result.insertId;
    }

    static async getNotifications() {
        const [notifications] = await db.execute(
            'SELECT * FROM notifications ORDER BY created_at DESC'
        );
        return notifications;
    }
}

module.exports = Notification;
