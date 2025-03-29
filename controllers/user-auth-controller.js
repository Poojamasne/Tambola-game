const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');  
const { sendOTP, verifyOTP } = require('../utils/otp');
require('dotenv').config();

exports.signup = async (req, res) => {
    try {
        const { firstName, lastName, mobileNumber, emailId, password, confirmPassword } = req.body;

        if (!firstName || !lastName || !mobileNumber || !emailId || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        // Generate user_name from first_name and last_name
        const userName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;

        const [existingUser] = await db.query('SELECT * FROM users WHERE mobile_number = ? OR email_id = ? OR user_name = ?', [mobileNumber, emailId, userName]);
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (first_name, last_name, mobile_number, email_id, user_name, password) VALUES (?, ?, ?, ?, ?, ?)',
            [firstName, lastName, mobileNumber, emailId, userName, hashedPassword]
        );

        const userId = result.insertId;  // Get the newly inserted user's ID

        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ success: true, message: "User registered successfully", token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { userName, password } = req.body;

        if (!userName || !password) {
            return res.status(400).json({ success: false, message: "User Name and password are required" });
        }

        const [user] = await db.query('SELECT * FROM users WHERE user_name = ?', [userName]);
        if (user.length === 0) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user[0].password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }

        const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ success: true, message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};



exports.forgotPassword = async (req, res) => {
    try {
        const { phone_number } = req.body;
        if (!phone_number) return res.status(400).json({ success: false, message: "Phone number is required" });

        const [user] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
        if (user.length === 0) return res.status(400).json({ success: false, message: "User not found" });

        const sessionId = await sendOTP(phone_number);
        if (!sessionId) return res.status(500).json({ success: false, message: "Failed to send OTP" });

        res.json({ success: true, message: "OTP sent successfully", sessionId });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

