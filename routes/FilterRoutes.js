const express = require('express');
const router = express.Router();
const FilterController = require('../controllers/FilterController');

// Route to apply filters
router.get('/apply-filters', FilterController.applyFilters);

module.exports = router;