const db = require('../db');
const upload = require('../middleware/upload');



// Function to convert ISO string to MySQL datetime format
function convertToMySQLDateTime(isoString) {
    const date = new Date(isoString);
    return date.toISOString().replace('T', ' ').substring(0, 19);
}

// Function to get the current date in YYYY-MM-DD format
function getCurrentDate() {
    const date = new Date();
    return date.toISOString().split('T')[0];
}

// Function to generate a custom game_id in the format Game ID:P167532
function generateGameId() {
    const prefix = 'P';
    const gameNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit number
    const gameId = `${prefix}${gameNumber}`;
    return { gameId, gameNumber };
}

exports.buyTicket = async (req, res) => {
    let connection;

    try {
        // Destructure the request body to extract necessary fields
        const { userId, timeSlot, totalTickets, ticketPrice, totalAmount, prize, jackpotPrice, bookingDate, isAutomatic, isPremium, playerId } = req.body;
        connection = await db.getConnection();

        // Check if user exists and has enough balance
        const [userRows] = await connection.execute("SELECT balance FROM users WHERE id = ?", [userId]);

        if (userRows.length === 0) {
            connection.release();
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        let userBalance = userRows[0].balance;

        if (userBalance < totalAmount) {
            connection.release();
            return res.status(400).json({ status: "error", message: "Insufficient balance" });
        }

        // Convert `bookingDate` to MySQL DATETIME format
        const formattedBookingDate = convertToMySQLDateTime(bookingDate);

        // Generate a custom game_id
        const { gameId } = generateGameId();

        // Deduct ticket price from user balance
        const newBalance = userBalance - totalAmount;
        await connection.execute("UPDATE users SET balance = ? WHERE id = ?", [newBalance, userId]);

        // Insert ticket booking record
        const [result] = await connection.execute(
            "INSERT INTO buyticket (user_id, time_slot, total_tickets, ticket_price, total_amount, prize, jackpot_price, booking_date, is_automatic, is_premium, player_id, game_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [userId, timeSlot, totalTickets, ticketPrice, totalAmount, prize, jackpotPrice, formattedBookingDate, isAutomatic, isPremium, playerId, gameId]
        );

        connection.release();

        // Send success response with ticket details, game_id, and updated user balance
        res.status(201).json({
            status: "success",
            message: "Ticket booked successfully",
            ticketDetails: { 
                userId, 
                timeSlot,    
                totalTickets, 
                ticketPrice, 
                totalAmount, 
                prize, 
                jackpotPrice, 
                bookingDate: formattedBookingDate, 
                isAutomatic,
                isPremium,
                playerId,
                gameId // Include game_id in the response
            },
            userBalance: newBalance
        });

    } catch (error) {
        if (connection) connection.release();
        console.error("Error:", error);
        res.status(500).json({ status: "error", message: "Server error", error: error.message });
    }
};

exports.getAllTickets = async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        const [rows] = await connection.execute("SELECT * FROM buyticket");
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: "error", message: "No tickets found" });
        }

        res.status(200).json({ status: "success", tickets: rows });
    } catch (error) {
        if (connection) connection.release();
        console.error("Error:", error);
        res.status(500).json({ status: "error", message: "Server error", error: error.message });
    }
}

exports.getTicketById = async (req, res) => {
    let connection;

    try {
        const ticketId = req.params.id;
        connection = await db.getConnection();
        const [rows] = await connection.execute("SELECT * FROM buyticket WHERE id = ?", [ticketId]);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Ticket not found" });
        }

        res.status(200).json({ status: "success", ticket: rows[0] });
    } catch (error) {
        if (connection) connection.release();
        console.error("Error:", error);
        res.status(500).json({ status: "error", message: "Server error", error: error.message });
    }
};