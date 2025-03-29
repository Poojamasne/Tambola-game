const db = require('../db');
const upload = require('../middleware/upload');

// POST API: Buy Ticket

exports.buyTicket = async (req, res) => {
    let connection;

    try {
        const { userId, timeSlotId, totalTickets, ticketPrice, totalAmount, prize, jackpotPrice, bookingDate, isAutomatic } = req.body;
        connection = await db.getConnection();

        // Check if user exists and has enough balance
        const [userRows] = await connection.execute("SELECT balance FROM users WHERE id = ?", [userId]);

        if (userRows.length === 0) {
            connection.release();  // ✅ Use release() instead of end()
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        let userBalance = userRows[0].balance;

        if (userBalance < totalAmount) {
            connection.release();  // ✅ Use release()
            return res.status(400).json({ status: "error", message: "Insufficient balance" });
        }

        // ✅ Convert `bookingDate` to MySQL DATETIME format
        const formattedBookingDate = new Date(bookingDate).toISOString().slice(0, 19).replace("T", " ");

        // Deduct ticket price from user balance
        const newBalance = userBalance - totalAmount;
        await connection.execute("UPDATE users SET balance = ? WHERE id = ?", [newBalance, userId]);

        // Insert ticket booking record
        const [result] = await connection.execute(
            "INSERT INTO buyTicket (user_id, time_slot_id, total_tickets, ticket_price, total_amount, prize, jackpot_price, booking_date, is_automatic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [userId, timeSlotId, totalTickets, ticketPrice, totalAmount, prize, jackpotPrice, formattedBookingDate, isAutomatic]
        );

        connection.release();  // ✅ Use release()

        res.status(201).json({
            status: "success",
            message: "Ticket booked successfully",
            ticketDetails: { userId, timeSlotId, totalTickets, ticketPrice, totalAmount, prize, jackpotPrice, bookingDate: formattedBookingDate, isAutomatic },
            userBalance: newBalance
        });

    } catch (error) {
        if (connection) connection.release();  // ✅ Ensure release() is called on error
        console.error("Error:", error);
        res.status(500).json({ status: "error", message: "Server error", error: error.message });
    }
};



exports.getAllTickets = async (req, res) => {
    try {
        const connection = await db.getConnection();
        const [tickets] = await connection.execute("SELECT * FROM buyTicket");
        
        connection.release(); // ✅ Use release()

        res.status(200).json({ status: "success", tickets });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ status: "error", message: "Server error", error: error.message });
    }
};


// GET API: Fetch Ticket by ID
exports.getTicketById = async (req, res) => {
    let connection; 
    try {
        const { id } = req.params;
        connection = await db.getConnection();

        // Fetch ticket details from buyTicket table
        const [tickets] = await connection.execute(
            "SELECT * FROM buyTicket WHERE id = ?", 
            [id]
        );

        if (tickets.length === 0) {
            return res.status(404).json({ status: "error", message: "Ticket not found" });
        }

        // Fetch associated ticket details from tickets table
        const [ticketDetails] = await connection.execute(
            "SELECT id, playerName, emailId, ticket FROM tickets WHERE buy_ticket_id = ?", 
            [id]
        );

        // ✅ Handle JSON parsing errors
        const purchasedTickets = ticketDetails.map(ticket => {
            try {
                return {
                    id: ticket.id,
                    playerName: ticket.playerName,
                    emailId: ticket.emailId,
                    ticket: JSON.parse(ticket.ticket)  // ✅ Ensure JSON is parsed correctly
                };
            } catch (err) {
                console.error("Invalid JSON in ticket:", ticket.ticket);
                return {
                    id: ticket.id,
                    playerName: ticket.playerName,
                    emailId: ticket.emailId,
                    ticket: ticket.ticket  // Return raw data if JSON parsing fails
                };
            }
        });

        res.status(200).json({
            status: "success",
            ticket: {
                id: tickets[0].id,
                userId: tickets[0].user_id,
                timeSlotId: tickets[0].time_slot_id,
                totalTickets: tickets[0].total_tickets,
                ticketPrice: tickets[0].ticket_price,
                totalAmount: tickets[0].total_amount,
                prize: tickets[0].prize,
                jackpotPrice: tickets[0].jackpot_price,
                bookingDate: tickets[0].booking_date,
                isAutomatic: tickets[0].is_automatic,
                createdAt: tickets[0].created_at,
                purchasedTickets
            }
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ status: "error", message: "Server error", error: error.message });
    } finally {
        if (connection) await connection.release();
    }
};



