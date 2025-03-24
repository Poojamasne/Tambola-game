const express = require("express");
const router = express.Router();
const { addTransfer, getTransfers } = require("../controllers/TransferController");
const verifyToken = require('../middleware/auth'); // Ensure the path is correct

router.post("/add/transfers", verifyToken, addTransfer);  // Add a new transfer
router.get("/transfers", verifyToken, getTransfers);     // Get all transfers

module.exports = router;
