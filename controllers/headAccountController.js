const db = require('../db');

// ✅ Add a New Head Account
exports.addHeadAccount = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Head account name is required." });
        }

        const sql = `INSERT INTO head_accounts (name) VALUES (?)`;
        const [result] = await db.execute(sql, [name]);

        res.json({ message: "Head account added successfully", headAccountId: result.insertId });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get All Head Accounts
exports.getHeadAccounts = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM head_accounts ORDER BY created_at DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get Book with Head Account Details
exports.getBookWithHeadAccount = async (req, res) => {
    const bookId = parseInt(req.params.bookId);

    try {
        const query = `
            SELECT 
                b.book_id, 
                b.book_name, 
                b.inventory_status, 
                b.business_id, 
                b.net_balance, 
                b.receipt, 
                b.payment, 
                b.recent_entries_date, 
                b.party_id, 
                b.income_tax_challan, 
                b.entry_by, 
                b.entry_time, 
                b.balance, 
                b.created_at, 
                b.referencer, 
                b.category_id, 
                b.head_account_id,
                ha.name AS head_account_name, 
                ha.created_at AS head_account_created_at
            FROM books b
            LEFT JOIN head_accounts ha ON b.head_account_id = ha.id
            WHERE b.book_id = ?`;

        const [result] = await db.query(query, [bookId]);

        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const bookData = {
            ...result[0],
            Head_Account: {
                head_account_name: result[0].head_account_name,
                head_account_created_at: result[0].head_account_created_at
            }
        };

        delete bookData.head_account_name;
        delete bookData.head_account_created_at;

        res.json(bookData);
    } catch (error) {
        console.error('Error fetching book with head account:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

