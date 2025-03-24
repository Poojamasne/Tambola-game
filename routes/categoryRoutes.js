const express = require("express");
const router = express.Router();

const categoryController = require("../controllers/categoryController");

const verifyToken = require('../middleware/auth'); 

// console.log("Category Controller:", categoryController); // Debugging

router.get("/categories", verifyToken, categoryController.getAllCategories);
router.get("/category-groups", verifyToken, categoryController.getCategoryGroups);
router.post("/category-groups", verifyToken, categoryController.addCategoryGroup);
router.post("/categories", verifyToken, categoryController.createCategory);
router.put("/categories/:id", verifyToken, categoryController.updateCategoryAmount);
router.delete("/categories/:id", verifyToken, categoryController.deleteCategory);
router.get("/categories/:category_group", verifyToken, categoryController.getCategoriesByGroup);


module.exports = router;
