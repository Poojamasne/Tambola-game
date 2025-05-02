const db = require("../db");
const upload = require('../middleware/upload');

// 📌 Create a Profile
exports.createProfile = async (req, res) => {
    try {
        const { user_id, full_name, mobile_number, email, win_price, remaining_price, buy_ticket } = req.body;
        const image_url = req.file ? "https://tambola-game-hd19.onrender.com/uploads/" + req.file.filename : null;

        if (!user_id || !full_name || !mobile_number || !email) {
            return res.status(400).json({ message: "User ID, full name, mobile number, and email are required" });
        }

        const [result] = await db.query(
            "INSERT INTO profiles (user_id, full_name, mobile_number, email, image_url, win_price, remaining_price, buy_ticket) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [user_id, full_name, mobile_number, email, image_url, win_price, remaining_price, buy_ticket]
        );

        res.status(201).json({ success: true, message: "Profile created successfully", profile_id: result.insertId });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 📌 Get All Profiles
exports.getProfiles = async (req, res) => {
    try {
        const [profiles] = await db.query("SELECT * FROM profiles");
        res.status(200).json(profiles);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 📌 Get Profile By ID
exports.getProfileByUserId = async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ message: "user_id is required as a query parameter" });
        }

        const [profile] = await db.query(
            "SELECT * FROM profiles WHERE user_id = ?",
            [user_id]
        );

        if (profile.length === 0) {
            return res.status(404).json({ message: "Profile not found for this user" });
        }

        res.status(200).json(profile[0]);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



// 📌 Update a Profile
exports.updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, mobile_number, email, win_price, buy_ticket } = req.body;
        const image_url = req.file ? "http://localhost:3000/uploads/" + req.file.filename : null;

        if (!full_name || !mobile_number || !email) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const [result] = await db.query(
            "UPDATE profiles SET full_name=?, mobile_number=?, email=?, image_url=?, win_price=?, remaining_price=?, buy_ticket=? WHERE id=?",
            [full_name, mobile_number, email, image_url, win_price, buy_ticket, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Profile not found" });
        }

        res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 📌 Delete a Profile
exports.deleteProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query("DELETE FROM profiles WHERE id=?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Profile not found" });
        }

        res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


