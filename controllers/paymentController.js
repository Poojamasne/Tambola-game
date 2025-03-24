const db = require('../db');

// Function to generate a unique payment number
const generatePaymentNo = () => {
    return `PAY-${Date.now().toString().slice(-6)}`;
};

// 📌 Add a new payment entry
exports.addpaymentEntry = async (req, res) => {
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

        const payment_no = generatePaymentNo();  // ✅ Correct function call
        const sql = `INSERT INTO payment_entries 
            (payment_no, receipt_type, amount, party, remark, category_split, customer_field, payment_mode, selected_bank)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.execute(sql, [
            payment_no, receipt_type, amount, party, remark, category_split, customer_field, payment_mode, selected_bank
        ]);

        res.json({ message: "Payment entry added successfully", payment_id: result.insertId });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// 📌 Get all payment entries (ASYNC/AWAIT)
exports.getAllpayments = async (req, res) => {
    try {
        const [results] = await db.execute("SELECT * FROM payment_entries");
        res.json({ payments: results });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Delete a payment entry (ASYNC/AWAIT)
exports.deletepaymentEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute("DELETE FROM payment_entries WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Payment entry not found" });
        }

        res.json({ message: "Payment entry deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📌 Update a payment entry
exports.updatepaymentEntry = async (req, res) => {
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

        const sql = `UPDATE payment_entries 
                     SET receipt_type = ?, amount = ?, party = ?, remark = ?, 
                         category_split = ?, customer_field = ?, payment_mode = ?, selected_bank = ?
                     WHERE id = ?`;

        const [result] = await db.execute(sql, [
            receipt_type, amount, party, remark, category_split, customer_field, payment_mode, selected_bank, id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Payment entry not found" });
        }

        res.json({ message: "Payment entry updated successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add a new payment mode
exports.addPaymentMode = async (req, res) => {
    const {
        payment_no,
        receipt_type,
        amount,
        party,
        remark,
        category_split,
        customer_field,
        payment_mode,
        selected_bank,
        book_id
    } = req.body;

    try {
        // Ensure the book exists before inserting payment mode
        const bookQuery = 'SELECT * FROM books WHERE book_id = ?';
        const [bookResult] = await db.query(bookQuery, [book_id]);

        if (bookResult.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Insert payment mode entry
        const insertQuery = `
            INSERT INTO payment_entries 
            (payment_no, receipt_type, amount, party, remark, category_split, 
            customer_field, payment_mode, selected_bank, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

        const [insertResult] = await db.query(insertQuery, [
            payment_no, receipt_type, amount, party, remark, category_split,
            customer_field, payment_mode, selected_bank
        ]);

        res.status(201).json({
            message: 'Payment mode added successfully',
            payment_id: insertResult.insertId
        });
    } catch (error) {
        console.error('Error adding payment mode:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Get payment modes for a book
exports.getPaymentModesByBook = async (req, res) => {
    const bookId = parseInt(req.params.bookId, 10);

    try {
        // ✅ Step 1: Get the `party_id` of the book
        const bookQuery = 'SELECT party_id FROM books WHERE book_id = ?';
        const [bookResult] = await db.query(bookQuery, [bookId]);

        if (bookResult.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const partyId = bookResult[0].party_id;

        if (!partyId) {
            return res.json({ message: 'No payment modes found for this book', payments: [] });
        }

        // ✅ Step 2: Get the `party` name using `party_id`
        const partyQuery = 'SELECT party FROM parties WHERE id = ?';
        const [partyResult] = await db.query(partyQuery, [partyId]);

        if (partyResult.length === 0) {
            return res.json({ message: 'Party not found', payments: [] });
        }

        const partyName = partyResult[0].party;

        console.log(`Party ID: ${partyId}`);
        console.log(`Party Name: ${partyName}`);

        // ✅ Step 3: Fetch payment entries for the correct `party`
        const paymentQuery = 'SELECT * FROM payment_entries WHERE TRIM(party) = TRIM(?)';
        const [paymentResults] = await db.query(paymentQuery, [partyName]);

        console.log(`Payment Results:`, paymentResults);

        if (paymentResults.length === 0) {
            return res.json({ message: 'No payment modes found for this book', payments: [] });
        }

        res.json({ payments: paymentResults });
    } catch (error) {
        console.error('Error fetching payment modes:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



// Get book with linked payment modes

// exports.getPaymentsByBook = async (req, res) => {
//     const bookId = parseInt(req.params.bookId);

//     try {
//         // Fetch the book details
//         const bookQuery = 'SELECT * FROM books WHERE book_id = ?';
//         const bookResult = await db.query(bookQuery, [bookId]);

//         if (bookResult.length === 0) {
//             return res.status(404).json({ message: 'Book not found' });
//         }

//         const book = bookResult[0];
//         console.log('Book details:', book);

//         // Fetch the payment entries associated with the book
//         const paymentsQuery = 'SELECT * FROM payment_entries WHERE book_id = ?';
//         const paymentsResult = await db.query(paymentsQuery, [bookId]);

//         console.log('Payments query result:', paymentsResult);

//         if (paymentsResult.length === 0) {
//             return res.status(404).json({ message: 'No payments found for this book' });
//         }

//         const payments = paymentsResult;

//         res.json({
//             book,
//             payments
//         });
//     } catch (error) {
//         console.error('Error fetching payments for book:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };

exports.getPaymentsByBook = async (req, res) => {
    const bookId = parseInt(req.params.bookId);

    try {
        // Fetch the book details
        const bookQuery = 'SELECT * FROM books WHERE book_id = ?';
        const [bookResult] = await db.query(bookQuery, [bookId]);

        if (!bookResult || bookResult.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const book = bookResult[0];

        // Fetch the payment entries associated with the book
        const paymentsQuery = 'SELECT * FROM payment_entries WHERE book_id = ?';
        const [paymentsResult] = await db.query(paymentsQuery, [bookId]);

        if (!paymentsResult || paymentsResult.length === 0) {
            return res.status(404).json({ message: 'No payments found for this book' });
        }

        // Convert buffer fields to string
        const payments = paymentsResult.map(payment => ({
            ...payment,
            category_split: payment.category_split ? payment.category_split.toString() : null,
            amount: payment.amount ? payment.amount.toString() : null
        }));

        res.json({
            book,
            payments
        });
    } catch (error) {
        console.error('Error fetching payments for book:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

