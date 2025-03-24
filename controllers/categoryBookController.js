const db = require("../db");

// Add a new category and link it to a book
// exports.addCategory = async (req, res) => {
//     const { category_name, book_id } = req.body;

//     if (!category_name) {
//         return res.status(400).json({ success: false, message: "Category name is required" });
//     }

//     try {
//         // ✅ Insert new category
//         const [result] = await db.query(
//             "INSERT INTO categories (category_name) VALUES (?)",
//             [category_name]
//         );

//         const categoryId = result.insertId;

//         let updatedBook = null;

//         // ✅ If book_id is provided, update the book with the new category
//         if (book_id) {
//             await db.query("UPDATE books SET category_id = ? WHERE book_id = ?", [categoryId, book_id]);

//             // Fetch the updated book details
//             const [bookResult] = await db.query(
//                 "SELECT book_id, book_name, category_id FROM books WHERE book_id = ?",
//                 [book_id]
//             );

//             if (bookResult.length > 0) {
//                 updatedBook = bookResult[0];
//             }
//         }

//         res.status(201).json({
//             success: true,
//             message: "Category added successfully",
//             category: { id: categoryId, category_name },
//             book_updated: updatedBook || "No book linked"
//         });

//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to add category", error: err.message });
//     }
// };

// ✅ 2️⃣ Add a new category **group** and link it to books
// exports.addCategoryGroup = async (req, res) => {
//     const { category_group, books_id } = req.body;

//     if (!category_group) {
//         return res.status(400).json({ success: false, message: "Category group is required" });
//     }

//     try {
//         const [result] = await db.query(
//             "INSERT INTO category_groups (category_group) VALUES (?)",
//             [category_group]
//         );

//         const categoryGroupId = result.insertId;

//         // ✅ If books_id is provided, link the category group to the book
//         if (books_id) {
//             await db.query("UPDATE books SET category_group_id = ? WHERE book_id = ?", [categoryGroupId, books_id]);
//         }

//         res.status(201).json({
//             success: true,
//             message: "Category group added successfully",
//             category_group: { id: categoryGroupId, category_group },
//             book_updated: books_id ? books_id : "No book linked"
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to add category group", error: err.message });
//     }
// };

// exports.addCategoryGroup = async (req, res) => {
//     const { category_group } = req.body;

//     if (!category_group) {
//         return res.status(400).json({ success: false, message: "Category group is required" });
//     }

//     try {
//         const [result] = await db.query(
//             "INSERT INTO categories (category_group) VALUES (?)",
//             [category_group]
//         );

//         res.status(201).json({
//             success: true,
//             message: "Category group added successfully",
//             category_group: { id: result.insertId, category_group }
//         });
//     } catch (err) {
//         res.status(500).json({
//             success: false,
//             message: "Failed to add category group",
//             error: err.message
//         });
//     }
// };

exports.addCategoryGroup = async (req, res) => {
    const { category_group } = req.body;

    if (!category_group) {
        return res.status(400).json({ success: false, message: "Category group is required" });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO categories (category_group) VALUES (?)",
            [category_group]
        );

        res.status(201).json({
            success: true,
            message: "Category group added successfully",
            category_group: { id: result.insertId, category_group }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to add category group",
            error: err.message
        });
    }
};


// ✅ 3️⃣ Get categories by group in a specific book
exports.getCategoriesByGroup = async (req, res) => {
    const { book_id } = req.params;

    try {
        const [result] = await db.query(`
            SELECT 
                b.book_id, 
                b.book_name, 
                c.id AS category_id,
                c.category_name, 
                cg.id AS category_group_id,
                cg.category_group
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN category_groups cg ON b.category_group_id = cg.id
            WHERE b.book_id = ?;
        `, [book_id]);

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "No categories found for this book" });
        }

        res.status(200).json({ success: true, book: result[0], categories: result });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch categories", error: err.message });
    }
};

// Get categories linked to a specific book
exports.getCategoriesByBook = async (req, res) => {
    const { book_id } = req.params;

    try {
        const [result] = await db.query(`
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
                c.id AS category_id,
                c.category_name, 
                c.amount, 
                c.category_group
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.book_id = ?;
        `, [book_id]);

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Book not found or no category linked" });
        }

        res.status(200).json({ success: true, book: result[0], categories: result });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch categories for this book", error: err.message });
    }
};
