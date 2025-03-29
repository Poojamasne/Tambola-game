const express = require('express');
const router = express.Router();
const userAuthController = require('../controllers/user-auth-controller');

router.post('/signup', userAuthController.signup);
router.post('/login', userAuthController.login);
router.post('/forgot-password', userAuthController.forgotPassword);

module.exports = router;
