const express = require('express');
const router = express.Router();
const userAuthController = require('../controllers/user-auth-controller');

router.post('/signup', userAuthController.signup);
router.post('/login', userAuthController.login);
router.post('/forgot-password', userAuthController.forgotPassword);
router.post('/verify-otp', userAuthController.verifyOTP);
router.post('/reset-password', userAuthController.resetPassword);

module.exports = router;
