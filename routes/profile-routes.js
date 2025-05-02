const express = require('express');
const router = express.Router();
const { createProfile, getProfiles, getProfileByUserId, updateProfile, deleteProfile } = require('../controllers/profile-controller');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/auth');

// Create profile
router.post('/profile', verifyToken, upload.single('profileImg'), createProfile);

// Get all profiles
router.get('/profiles', verifyToken, getProfiles);

// Get profile by ID
router.get('/profile-user', verifyToken, getProfileByUserId);

// Update profile
router.put('/profile/:id', verifyToken, upload.single('profileImg'), updateProfile);

// Delete profile
router.delete('/profile/:id', verifyToken, deleteProfile);

module.exports = router;

