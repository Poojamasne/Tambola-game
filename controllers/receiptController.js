const db = require('../db');

// Function to generate a unique receipt number
const generateReceiptNo = () => {
    return `RECPT-${Date.now().toString().slice(-6)}`;
};

// 📌 Add a new receipt entry (ASYNC/AWAIT)
exports.addReceiptEntry = async (req, res) => {
    try {
        const {
            receipt_type,
            amount,
            party,
            remark,
            category_split,
            customer_field,
            payment_mode,
            selected_bank
        } = req.body;

        if (!receipt_type || !amount || !party || !payment_mode) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Generate a unique receipt number
        const receipt_no = `RECPT-${Date.now().toString().slice(-6)}`;

        // SQL Query to insert a new receipt
        const sql = `INSERT INTO receipt_entries 
            (receipt_no, receipt_type, amount, party, remark, category_split, customer_field, payment_mode, selected_bank, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

        // Execute SQL Query
        const [result] = await db.execute(sql, [
            receipt_no, receipt_type, amount, party, remark, category_split, customer_field, payment_mode, selected_bank
        ]);

        res.json({ 
            message: "Receipt entry added successfully",
            receipt_id: result.insertId,
            receipt_no: receipt_no,  // Include the generated receipt number
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), // e.g., "Mar 17, 2025"
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) // e.g., "05:16 PM"
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// 📌 Get all receipt entries (ASYNC/AWAIT)
exports.getAllReceipts = async (req, res) => {
    try {
        const [results] = await db.execute("SELECT *, DATE_FORMAT(created_at, '%d %b %Y') AS date, DATE_FORMAT(created_at, '%h:%i %p') AS time FROM receipt_entries");
        res.json({ receipts: results });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Delete a receipt entry (ASYNC/AWAIT)
exports.deleteReceiptEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute("DELETE FROM receipt_entries WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Receipt entry not found" });
        }

        res.json({ message: "Receipt entry deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Update a receipt entry
exports.updateReceiptEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            receipt_type, 
            amount, 
            party, 
            remark, 
            category_split, 
            customer_field, 
            payment_mode, 
            selected_bank
        } = req.body;

        if (!receipt_type || !amount || !party || !payment_mode) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const sql = `UPDATE receipt_entries 
            SET receipt_type = ?, amount = ?, party = ?, remark = ?, category_split = ?, customer_field = ?, payment_mode = ?, selected_bank = ?
            WHERE id = ?`;

        const [result] = await db.execute(sql, [
            receipt_type, amount, party, remark, category_split, customer_field, payment_mode, selected_bank, id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Receipt entry not found" });
        }

        res.json({ message: "Receipt entry updated successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
