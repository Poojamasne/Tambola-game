const db = require('../db');

// Add new party
exports.addpartyEntry = async (req, res) => {
    const { party, gst_number, address, state, contact_number, alt_contact_number, reference_name, customer_field, grade } = req.body;

    if (!party || !gst_number || !address || !state || !contact_number || !customer_field || !grade) {
        return res.status(400).json({ message: "All required fields must be provided" });
    }

    try {
        const query = `
            INSERT INTO parties (party, gst_number, address, state, contact_number, alt_contact_number, reference_name, customer_field, grade) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.execute(query, [party, gst_number, address, state, contact_number, alt_contact_number, reference_name, customer_field, grade]);

        res.status(201).json({ message: "Party added successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all parties
exports.getAllpartys = async (req, res) => {
    try {
        const [results] = await db.execute("SELECT * FROM parties");
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update a party
exports.updatepartyEntry = async (req, res) => {
    const { id } = req.params;
    const { party, gst_number, address, state, contact_number, alt_contact_number, reference_name, customer_field, grade } = req.body;

    try {
        const query = `
            UPDATE parties 
            SET party = ?, gst_number = ?, address = ?, state = ?, contact_number = ?, alt_contact_number = ?, reference_name = ?, customer_field = ?, grade = ? 
            WHERE id = ?
        `;
        const [result] = await db.execute(query, [party, gst_number, address, state, contact_number, alt_contact_number, reference_name, customer_field, grade, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Party not found" });
        }

        res.json({ message: "Party updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a party
exports.deletepartyEntry = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.execute("DELETE FROM parties WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Party not found" });
        }

        res.json({ message: "Party deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// get grades by book 
exports.getGradeByBook = async (req, res) => {
    const bookId = parseInt(req.params.bookId);

    try {
        // Fetch the book details along with grade from the parties table
        const query = `
            SELECT 
                b.book_id, 
                b.book_name, 
                b.inventory_status, 
                b.business_id, 
                b.net_balance, 
                b.created_at, 
                p.party, 
                p.gst_number, 
                p.address, 
                p.state, 
                p.contact_number, 
                p.alt_contact_number, 
                p.reference_name, 
                p.customer_field, 
                p.grade 
            FROM books b
            LEFT JOIN parties p ON b.party_id = p.id  -- Corrected table & column name
            WHERE b.book_id = ?`;

        const [result] = await db.query(query, [bookId]);

        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'Book not found or no grade available' });
        }

        const bookWithGrade = result[0];

        res.json(bookWithGrade);
    } catch (error) {
        console.error('Error fetching book grade:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


