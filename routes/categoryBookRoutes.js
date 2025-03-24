const express = require("express");
const router = express.Router();
const categoryBookController = require("../controllers/categoryBookController"); // New import
const verifyToken = require('../middleware/auth'); // Ensure the path is correct

// // Route to add a category
// router.post("/books/:book_id/category", categoryBookController.addCategory);

// Route to get categories linked to a book
router.get("/books/:book_id/categories", verifyToken, categoryBookController.getCategoriesByBook);


// // 1️⃣ Add a new category
// router.post("/category/book", categoryBookController.addCategory);

// 2️⃣ Add a new category group
router.post("/category/group", verifyToken, categoryBookController.addCategoryGroup);

// 3️⃣ Get all categories of a group in a specific book
router.get("/books/:book_id/categories-group", verifyToken, categoryBookController.getCategoriesByGroup);

module.exports = router;
