const db = require('../db');

class notification {
    static async createnotification(message) {
        const [result] = await db.execute(
            'INSERT INTO notifications (message) VALUES (?)',
            [message]
        );
        return result.insertId;
    }

    static async getnotifications() {
        const [notifications] = await db.execute(
            'SELECT * FROM notifications ORDER BY created_at DESC'
        );
        return notifications;
    }
}

module.exports = notification;






