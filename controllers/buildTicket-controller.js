const db = require('../db');
const { generateUniqueTicket } = require('../models/ticketGenerator');
const upload = require('../middleware/upload');


async function buildTickets(req, res) {
    try {
        const { playerName, emailId, totalTickets } = req.body;

        if (!playerName || !emailId || !totalTickets || totalTickets < 1) {
            return res.status(400).json({ message: "Invalid input data" });
        }

        let connection = await db.getConnection();
        let tickets = [];

        for (let i = 0; i < totalTickets; i++) {
            let ticket = await generateUniqueTicket(playerName, emailId);

            // Insert ticket into database and get inserted ID
            const [result] = await connection.execute(
                "INSERT INTO tickets (playerName, emailId, ticket) VALUES (?, ?, ?)",
                [playerName, emailId, JSON.stringify(ticket)]
            );

            tickets.push({ ticketId: result.insertId, ticket });
        }

        connection.release(); // Release DB connection

        return res.status(201).json({
            message: "Tickets generated successfully",
            tickets
        });

    } catch (error) {
        console.error("Error generating tickets:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

async function getTicketById(req, res) {
    try {
        const { ticketId } = req.params;
        let connection = await db.getConnection();

        const [rows] = await connection.execute(
            "SELECT id, playerName, emailId, ticket FROM tickets WHERE id = ?",
            [ticketId]
        );

        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error fetching ticket:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

module.exports = { buildTickets, getTicketById };

