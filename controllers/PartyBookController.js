const db = require('../db'); // Database connection

// Link a party to a book
exports.linkPartyToBook = async (req, res) => {
    const { book_id, party_id } = req.body;

    try {
        // Ensure party exists before updating
        const partyCheckQuery = 'SELECT * FROM parties WHERE id = ?';
        const [partyCheckResult] = await db.query(partyCheckQuery, [party_id]);

        if (partyCheckResult.length === 0) {
            return res.status(404).json({ message: 'Party not found' });
        }

        // Update book record to link to a party
        const updateQuery = 'UPDATE books SET party_id = ? WHERE book_id = ?';
        const [updateResult] = await db.query(updateQuery, [party_id, book_id]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.status(200).json({ message: 'Party linked to book successfully' });
    } catch (error) {
        console.error('Error linking party to book:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getPartyByBook = async (req, res) => {
    const bookId = parseInt(req.params.bookId, 10);

    try {
        // Fetch book details
        const bookQuery = 'SELECT * FROM books WHERE book_id = ?';
        const [bookResult] = await db.query(bookQuery, [bookId]);

        if (bookResult.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const book = bookResult[0];

        // If no party is linked, return book only
        if (!book.party_id) {
            return res.json({ book, message: 'No party linked to this book' });
        }

        // Fetch party details
        const partyQuery = 'SELECT * FROM parties WHERE id = ?';
        const [partyResult] = await db.query(partyQuery, [book.party_id]);

        if (partyResult.length === 0) {
            return res.status(404).json({ message: 'Party not found' });
        }

        const party = partyResult[0];

        res.json({ book, party });
    } catch (error) {
        console.error('Error fetching party for book:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

