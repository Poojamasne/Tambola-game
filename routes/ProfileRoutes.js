const express = require("express");
const router = express.Router();
const ProfileController = require("../controllers/ProfileController");
const upload = require("../middleware/upload");
const verifyToken = require('../middleware/auth');

// Profile Routes
router.post("/profiles", upload.single("image"), verifyToken, ProfileController.createProfile);
router.get("/profiles", verifyToken, ProfileController.getProfiles);
router.get("/profiles/:id", verifyToken, ProfileController.getProfileById);
router.put("/profiles/:id", upload.single("image"), verifyToken, ProfileController.updateProfile);
router.delete("/profiles/:id", verifyToken, ProfileController.deleteProfile);

module.exports = router;