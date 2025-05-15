const db = require('../db');
const { generateUniqueTicket } = require('../models/ticketGenerator');

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
    const prefix = 'Game ID:P';
    const gameNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit number
    const gameId = `${prefix}${gameNumber}`;
    return { gameId, gameNumber };
}

// Function to create a new game with a specific time slot and get the game_id
async function createGame(req, res) {
    let connection;
    try {
        const { gameName, timeSlot } = req.body;

        if (!gameName || !timeSlot) {
            return res.status(400).json({ message: "Invalid input data" });
        }

        const mysqlTimeSlot = convertToMySQLDateTime(timeSlot);
        const currentDate = getCurrentDate();

        connection = await db.getConnection();

        const [countResult] = await connection.execute(
            "SELECT count FROM daily_game_count WHERE date = ?",
            [currentDate]
        );

        let gameNumber;
        if (countResult.length === 0) {
            await connection.execute(
                "INSERT INTO daily_game_count (date, count) VALUES (?, 1)",
                [currentDate]
            );
            gameNumber = 1;
        } else {
            const currentCount = countResult[0].count;
            gameNumber = currentCount + 1;
            await connection.execute(
                "UPDATE daily_game_count SET count = ? WHERE date = ?",
                [gameNumber, currentDate]
            );
        }

        const { gameId } = generateGameId();

        await connection.execute(
            "INSERT INTO games (game_id, game_name, time_slot) VALUES (?, ?, ?)",
            [gameId, gameName, mysqlTimeSlot]
        );

        return res.status(201).json({
            message: "Game created successfully",
            gameId,
            gameNumber
        });

    } catch (error) {
        console.error("Error creating game:", error);
        return res.status(500).json({ 
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Function to generate tickets for a game
async function buildTickets(req, res) {
    let connection;
    try {
        const { playerName, emailId, totalTickets, gameId } = req.body;

        // Validate input
        if (!playerName || !emailId || typeof totalTickets !== 'number' || totalTickets < 1 || !gameId) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid input data. Please provide playerName, emailId, totalTickets (number > 0), and gameId"
            });
        }

        connection = await db.getConnection();

        // Verify game exists
        const [game] = await connection.execute(
            "SELECT game_id FROM games WHERE game_id = ?",
            [gameId]
        );

        if (game.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Game not found. Please create the game first."
            });
        }

        // Generate tickets
        const tickets = [];
        for (let i = 0; i < totalTickets; i++) {
            const ticket = await generateUniqueTicket(playerName, emailId);
            
            const [result] = await connection.execute(
                "INSERT INTO tickets (playerName, emailId, ticket, game_id) VALUES (?, ?, ?, ?)",
                [playerName, emailId, JSON.stringify(ticket), gameId]
            );

            tickets.push({
                ticketId: result.insertId,
                ticket: ticket,
                gameId: gameId
            });
        }

        return res.status(201).json({
            success: true,
            message: `${totalTickets} ticket(s) generated successfully`,
            data: {
                playerName,
                emailId,
                gameId: gameId,
                tickets
            }
        });

    } catch (error) {
        console.error("Error generating tickets:", error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Duplicate ticket error. Please check your database constraints.",
                suggestion: "You may need to remove the unique constraint on game_id in the tickets table"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            errorDetails: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage
            } : undefined
        });
    } finally {
        if (connection) {
            await connection.release();
        }
    }
}

// Function to get a ticket by ID
async function getTicketById(req, res) {
    let connection;
    try {
        const { ticketId } = req.params;
        connection = await db.getConnection();

        const [rows] = await connection.execute(
            "SELECT id, playerName, emailId, ticket, game_id FROM tickets WHERE id = ?",
            [ticketId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error fetching ticket:", error);
        return res.status(500).json({ message: "Server error" });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}


// async function getGamePlayers(req, res) {
//     let connection;
//     try {
//         const { gameId } = req.params;

//         if (!gameId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Game ID is required"
//             });
//         }

//         connection = await db.getConnection();

//         // Verify game exists
//         const [gameExists] = await connection.execute(
//             "SELECT 1 FROM games WHERE game_id = ? LIMIT 1",
//             [`Game ID:${gameId}`]
//         );

//         if (gameExists.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Game not found"
//             });
//         }

//         // Get all unique players with their ticket counts
//         const [players] = await connection.execute(
//             `SELECT 
//                 playerName, 
//                 emailId,
//                 COUNT(id) as totalTickets,
//                 MIN(created_at) as firstTicketTime,
//                 MAX(created_at) as lastTicketTime
//              FROM tickets 
//              WHERE game_id = ?
//              GROUP BY playerName, emailId
//              ORDER BY playerName`,
//             [`Game ID:${gameId}`]
//         );

//         // Get total player count
//         const totalPlayers = players.length;

//         return res.status(200).json({
//             success: true,
//             data: {
//                 gameId: `Game ID:${gameId}`,
//                 totalPlayers,
//                 players
//             }
//         });

//     } catch (error) {
//         console.error("Error fetching game players:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error",
//             error: process.env.NODE_ENV === 'development' ? error.message : undefined
//         });
//     } finally {
//         if (connection) {
//             connection.release();
//         }
//     }
// }
async function getGamePlayers(req, res) {
    let connection;
    try {
        const { gameId } = req.params;

        if (!gameId) {
            return res.status(400).json({
                success: false,
                message: "Game ID is required"
            });
        }

        connection = await db.getConnection();

        // Verify game exists
        const [gameExists] = await connection.execute(
            "SELECT 1 FROM games WHERE game_id = ? LIMIT 1",
            [`Game ID:${gameId}`]
        );

        if (gameExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Game not found"
            });
        }

        // Get all unique players with their details
        const [players] = await connection.execute(
            `SELECT 
                playerName, 
                emailId,
                COUNT(id) as totalTickets,
                MIN(id) as firstTicketId,
                MIN(created_at) as firstTicketTime,
                MAX(created_at) as lastTicketTime,
                GROUP_CONCAT(id ORDER BY created_at) as allTicketIds
             FROM tickets 
             WHERE game_id = ?
             GROUP BY playerName, emailId
             ORDER BY MIN(created_at)`,  // Order by first registration time
            [`Game ID:${gameId}`]
        );

        // Add player numbers and format ticket IDs
        const playersWithNumbers = players.map((player, index) => ({
            playerNumber: index + 1,  // Sequential player number
            playerId: `P-${gameId}-${String(index + 1).padStart(3, '0')}`, // Custom player ID
            ...player,
            allTicketIds: player.allTicketIds.split(',').map(Number) // Convert to array of numbers
        }));

        return res.status(200).json({
            success: true,
            data: {
                gameId: `Game ID:${gameId}`,
                totalPlayers: playersWithNumbers.length,
                players: playersWithNumbers
            }
        });

    } catch (error) {
        console.error("Error fetching game players:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = { buildTickets, getTicketById, createGame , getGamePlayers };