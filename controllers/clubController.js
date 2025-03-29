const db = require('../db');
const upload = require('../middleware/upload');

// Create a new club

exports.createClub = async (req, res) => {
    try {
        const { party_name, organizer_id, ticket_price, total_tickets, total_prize } = req.body;

        // Validate required inputs
        if (!party_name || !organizer_id) {
            return res.status(400).json({
                error: 'Party name and organizer ID are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // 1️⃣ Verify that the organizer exists
        const [[organizer]] = await db.query(
            'SELECT id FROM users WHERE id = ?', 
            [organizer_id]
        );

        if (!organizer) {
            return res.status(400).json({
                error: 'Specified organizer does not exist',
                code: 'ORGANIZER_NOT_FOUND'
            });
        }

        // 2️⃣ Validate the ticket limits
        if (total_tickets > 200) {
            return res.status(400).json({ 
                error: 'Maximum 200 tickets allowed per club',
                code: 'MAX_TICKETS_EXCEEDED'
            });
        }

        // 3️⃣ Insert new club into the database
        const [result] = await db.query(
            `INSERT INTO clubs 
            (party_name, organizer_id, ticket_price, total_tickets, total_prize)
            VALUES (?, ?, ?, ?, ?)`,
            [party_name, organizer_id, ticket_price, total_tickets, total_prize]
        );

        // 4️⃣ Fetch and return the created club details
        const [[newClub]] = await db.query(
            `SELECT 
                c.id,
                c.party_name,
                c.ticket_price,
                c.total_tickets,
                c.total_prize,
                CONCAT(u.first_name, ' ', u.last_name) AS organizer_name  -- ✅ FIXED COLUMN NAME
            FROM clubs c
            JOIN users u ON c.organizer_id = u.id
            WHERE c.id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            club: newClub,
            message: 'Club created successfully'
        });

    } catch (error) {
        console.error('❌ Club creation failed:', error);
        
        // Handle foreign key constraint error
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                error: 'Invalid organizer reference',
                code: 'INVALID_ORGANIZER'
            });
        }

        return res.status(500).json({ 
            error: 'Failed to create club',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Add players to club
exports.addPlayers = async (req, res) => {
    const { clubId } = req.params;
    const { game_ids } = req.body;

    if (!game_ids || !Array.isArray(game_ids)) {
        return res.status(400).json({ 
            error: 'Invalid game IDs provided',
            code: 'INVALID_GAME_IDS'
        });
    }

    try {
        await db.query('START TRANSACTION');

        // 1️⃣ Verify club exists and has capacity
        const [[club]] = await db.query(
            `SELECT id, total_tickets, tickets_sold 
             FROM clubs WHERE id = ? FOR UPDATE`,
            [clubId]
        );

        if (!club) {
            await db.query('ROLLBACK');
            return res.status(404).json({ 
                error: 'Club not found',
                code: 'CLUB_NOT_FOUND'
            });
        }

        const remainingTickets = club.total_tickets - club.tickets_sold;
        if (game_ids.length > remainingTickets) {
            await db.query('ROLLBACK');
            return res.status(400).json({ 
                error: `Only ${remainingTickets} tickets remaining`,
                code: 'INSUFFICIENT_TICKETS'
            });
        }

        // 2️⃣ Process each ticket
        const results = {
            added: [],
            failed: []
        };

        for (const gameId of game_ids) {
            try {
                // ✅ Check if ticket already exists in the club
                const [[existingTicket]] = await db.query(
                    `SELECT game_id FROM club_tickets 
                     WHERE club_id = ? AND game_id = ?`,
                    [clubId, gameId]
                );

                if (existingTicket) {
                    results.failed.push({
                        gameId,
                        reason: 'Ticket already assigned to club'
                    });
                    continue;
                }

                // ✅ Verify ticket exists in `tickets` table
                const [[ticket]] = await db.query(
                    `SELECT playerName FROM tickets WHERE game_id = ?`,
                    [gameId]
                );

                if (!ticket) {
                    results.failed.push({
                        gameId,
                        reason: 'Ticket not found'
                    });
                    continue;
                }

                // ✅ Insert into `club_tickets`
                await db.query(
                    `INSERT INTO club_tickets (club_id, game_id, player_name, purchased_at)
                     VALUES (?, ?, ?, NOW())`,
                    [clubId, gameId, ticket.playerName]
                );

                results.added.push(gameId);
            } catch (err) {
                results.failed.push({
                    gameId,
                    reason: err.message
                });
            }
        }

        // 3️⃣ Update club ticket count
        if (results.added.length > 0) {
            await db.query(
                `UPDATE clubs SET tickets_sold = tickets_sold + ? 
                 WHERE id = ?`,
                [results.added.length, clubId]
            );
        }

        await db.query('COMMIT');

        // 4️⃣ Prepare response
        const [[updatedClub]] = await db.query(
            `SELECT tickets_sold, total_tickets FROM clubs WHERE id = ?`,
            [clubId]
        );

        res.json({
            successCount: results.added.length,
            failedCount: results.failed.length,
            ticketsSold: updatedClub.tickets_sold,
            remainingTickets: updatedClub.total_tickets - updatedClub.tickets_sold,
            failedEntries: results.failed
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Failed to add players:', error);
        res.status(500).json({ 
            error: 'Failed to process players',
            details: error.message 
        });
    }
};


// Distribute prizes
exports.distributePrizes = async (req, res) => {
    const { clubId } = req.params;
    const { force } = req.query;

    try {
        // 1️⃣ Start transaction
        await db.query('START TRANSACTION');

        // 2️⃣ Check club status with lock
        const [[club]] = await db.query(
            `SELECT id, total_tickets, tickets_sold, prize_distributed, total_prize 
             FROM clubs WHERE id = ? FOR UPDATE`,
            [clubId]
        );

        if (!club) {
            await db.query('ROLLBACK');
            return res.status(404).json({
                error: "Club not found",
                code: "CLUB_NOT_FOUND"
            });
        }

        // 3️⃣ Verify tickets are all sold
        if (club.tickets_sold < club.total_tickets) {
            await db.query('ROLLBACK');
            return res.status(400).json({
                error: "All tickets must be sold before distributing prizes",
                code: "TICKETS_NOT_SOLD"
            });
        }

        // 4️⃣ Check if prizes were already distributed
        if (club.prize_distributed) {
            // Verify if prizes were actually paid
            const [[{ paid_count, total_distributed }]] = await db.query(
                `SELECT 
                    COUNT(*) as paid_count,
                    SUM(prize_amount) as total_distributed
                 FROM ticket_winners 
                 WHERE ticket_id IN (
                     SELECT id FROM club_tickets WHERE club_id = ?
                 ) AND reward_paid = 1`,
                [clubId]
            );

            if (paid_count > 0 && !force) {
                await db.query('ROLLBACK');
                return res.status(400).json({
                    error: "Prizes already distributed for this club",
                    code: "PRIZES_ALREADY_DISTRIBUTED",
                    distributedAmount: total_distributed
                });
            }

            // If forcing redistribution, reset payment status
            if (force) {
                await db.query(
                    `UPDATE ticket_winners SET reward_paid = 0 
                     WHERE ticket_id IN (
                         SELECT id FROM club_tickets WHERE club_id = ?
                     )`,
                    [clubId]
                );
            }
        }

        // 5️⃣ Fetch all winning tickets with details
        const [winners] = await db.query(
            `SELECT 
                w.id,
                w.ticket_id,
                w.playerName,
                w.patterns,
                w.prize_amount AS amount,
                w.created_at AS wonAt,
                ct.game_id
             FROM ticket_winners w
             JOIN club_tickets ct ON w.ticket_id = ct.id
             WHERE ct.club_id = ? AND w.reward_paid = 0`,
            [clubId]
        );

        if (!Array.isArray(winners) || winners.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({
                error: "No unpaid winners found for this club",
                code: "NO_UNPAID_WINNERS"
            });
        }

        // 6️⃣ Calculate prize distribution
        const totalWinners = winners.length;
        const totalPrizeDistributed = winners.reduce((sum, winner) => sum + (winner.amount || 0), 0);
        const remainingPrize = club.total_prize - totalPrizeDistributed;

        // 7️⃣ Mark rewards as paid
        await db.query(
            `UPDATE ticket_winners 
             SET reward_paid = 1 
             WHERE id IN (?)`,
            [winners.map(w => w.id)]
        );

        // 8️⃣ Update club status
        await db.query(
            `UPDATE clubs 
             SET prize_distributed = TRUE 
             WHERE id = ?`,
            [clubId]
        );

        // 9️⃣ Commit transaction
        await db.query('COMMIT');

        // 🔟 Format response
        res.json({
            success: true,
            totalWinners,
            totalPrizeDistributed,
            remainingPrize,
            winners: winners.map(winner => ({
                gameId: winner.game_id,
                playerName: winner.playerName,
                pattern: winner.patterns,
                amount: winner.amount,
                wonAt: winner.wonAt
            }))
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Prize distribution failed:", error);
        res.status(500).json({
            error: "Failed to distribute prizes",
            details: error.message,
            code: "DISTRIBUTION_FAILED"
        });
    }
};


// Get club details
exports.getClubDetails = async (req, res) => {
    try {
        const { clubId } = req.params;
      

        const [[club]] = await db.query(
            `SELECT c.*, 
            CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, '')) AS organizer_name 
            FROM clubs c 
            LEFT JOIN users u ON c.organizer_id = u.id 
            WHERE c.id = ?`,
            [clubId]
        );

        console.log("Query result:", club); // Debugging

        if (!club || Object.keys(club).length === 0) {
            return res.status(404).json({
                success: false,
                message: "Club not found"
            });
        }

        res.status(200).json({
            success: true,
            club
        });

    } catch (error) {
        console.error("Failed to fetch club details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch club details",
            error: error.message
        });
    }
};


// List all clubs
exports.listClubs = async (req, res) => {
    try {
        const { organizer_id, status = 'active' } = req.query;
        
        let query = `
            SELECT 
                c.id,
                c.party_name,
                c.ticket_price,
                c.tickets_sold,
                c.total_tickets,
                c.total_prize,
                c.created_at,
                CONCAT(u.first_name, ' ', u.last_name) AS organizer_name, -- ✅ Fixed column name
                CASE
                    WHEN c.prize_distributed THEN 'completed'
                    WHEN c.tickets_sold = c.total_tickets THEN 'ready'
                    ELSE 'active'
                END AS status
            FROM clubs c
            JOIN users u ON c.organizer_id = u.id
        `;

        const params = [];

        if (organizer_id) {
            query += ' WHERE c.organizer_id = ?';
            params.push(organizer_id);
        }

        if (status === 'active') {
            query += organizer_id ? ' AND' : ' WHERE';
            query += ' c.prize_distributed = FALSE';
        } else if (status === 'completed') {
            query += organizer_id ? ' AND' : ' WHERE';
            query += ' c.prize_distributed = TRUE';
        }

        query += ' ORDER BY c.created_at DESC';

        const [clubs] = await db.query(query, params);

        res.json({
            success: true,
            clubs,
            message: 'Clubs fetched successfully'
        });

    } catch (error) {
        console.error('❌ Failed to list clubs:', error);
        res.status(500).json({ 
            error: 'Failed to fetch clubs',
            details: error.message 
        });
    }
};

