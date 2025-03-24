const db = require('../db');

// ✅ Add a New Bank Account
exports.addBankAccount = async (req, res) => {
    try {
        const { bank_name, account_number, ifsc_code, head_account, upi_id } = req.body;

        if (!bank_name || !account_number || !ifsc_code) {
            return res.status(400).json({ error: "Bank name, Account number, and IFSC code are required." });
        }

        const sql = `INSERT INTO bank_accounts (bank_name, account_number, ifsc_code, head_account, upi_id)
                     VALUES (?, ?, ?, ?, ?)`;

        const [result] = await db.execute(sql, [bank_name, account_number, ifsc_code, head_account, upi_id]);

        res.json({ message: "Bank account added successfully", bankId: result.insertId });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get All Bank Accounts
exports.getBankAccounts = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM bank_accounts ORDER BY created_at DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Update Bank Account
exports.updateBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { bank_name, account_number, ifsc_code, head_account, upi_id } = req.body;

        const sql = `UPDATE bank_accounts 
                     SET bank_name = ?, account_number = ?, ifsc_code = ?, head_account = ?, upi_id = ? 
                     WHERE id = ?`;

        const [result] = await db.execute(sql, [bank_name, account_number, ifsc_code, head_account, upi_id, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Bank account not found" });
        }

        res.json({ message: "Bank account updated successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Delete Bank Account
exports.deleteBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute("DELETE FROM bank_accounts WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Bank account not found" });
        }

        res.json({ message: "Bank account deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
