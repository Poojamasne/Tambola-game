const db = require("../db");
const bcrypt = require('bcryptjs');

// 📌 Create a Profile
exports.createProfile = async (req, res) => {
    try {
        const { full_name, mobile_number, email } = req.body;
        const image_url = req.file ? "http://localhost:3000/uploads/" + req.file.filename : null;

        if (!full_name || !mobile_number || !email) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const [result] = await db.query(
            "INSERT INTO profiles (full_name, mobile_number, email, image_url) VALUES (?, ?, ?, ?)",
            [full_name, mobile_number, email, image_url]
        );

        res.status(201).json({ message: "Profile created successfully", profile_id: result.insertId });
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
exports.getProfileById = async (req, res) => {
    try {
        const { id } = req.params;
        const [profile] = await db.query("SELECT * FROM profiles WHERE id=?", [id]);

        if (profile.length === 0) {
            return res.status(404).json({ message: "Profile not found" });
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
        const { full_name, mobile_number, email } = req.body;
        const image_url = req.file ? "http://localhost:3000/uploads/" + req.file.filename : null;

        if (!full_name || !mobile_number || !email) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const [result] = await db.query(
            "UPDATE profiles SET full_name=?, mobile_number=?, email=?, image_url=? WHERE id=?",
            [full_name, mobile_number, email, image_url, id]
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

// 📌 Delete a Profilenpm install multer
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