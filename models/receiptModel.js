const db = require('../db');

class Receipt {
    static async generateReceiptNo() {
        const [rows] = await db.execute("SELECT receipt_no FROM receipts ORDER BY id DESC LIMIT 1");
        if (rows.length > 0) {
            let lastNo = parseInt(rows[0].receipt_no.replace(/\D/g, "")) || 1000;
            return `RCPT${lastNo + 1}`;
        }
        return "RCPT1001";
    }

    static async addReceipt(data) {
        const { payment_by, payment_mode, toggle_status, date, time, amount, party, remark, category_split, custom_field } = data;
        const receipt_no = await this.generateReceiptNo();

        const [result] = await db.execute(
            `INSERT INTO receipts 
             (receipt_no, payment_by, payment_mode, toggle_status, date, time, amount, party, remark, category_split, custom_field) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

            [receipt_no, payment_by, payment_mode, toggle_status, date, time, amount, party, remark, category_split, custom_field]
        );
        return { receiptId: result.insertId, receipt_no };
    }

    static async getAllReceipts() {
        const [rows] = await db.execute("SELECT * FROM receipts ORDER BY id DESC");
        return rows;
    }

    static async toggleReceiptStatus(id, toggle_status) {
        const [result] = await db.execute(
            "UPDATE receipts SET toggle_status = ? WHERE id = ?",
            [toggle_status, id]
        );
        return result.affectedRows;
    }
}

module.exports = Receipt;
