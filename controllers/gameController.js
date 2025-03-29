const db = require('../db');  
const upload = require('../middleware/upload');

// Helper function to validate 3×9 ticket structure
const validateTicket = (ticket) => {
    if (!Array.isArray(ticket) || ticket.length !== 3) return false;
    return ticket.every(row => Array.isArray(row) && row.length === 9);
};

// Generate a 3×9 Tambola ticket
exports.generateTicket = async (req, res) => {
    try {
        const { playerName, emailId, userId } = req.body;
        
        const numberPool = [
            [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
            [50, 59], [60, 69], [70, 79], [80, 90]
        ];

        let ticket = [
            [null, '%', null, null, '%', null, '%', null, '%'],
            ['%', null, '%', null, '%', null, '%', null, null],
            [null, '%', null, '%', null, '%', null, '%', null]
        ];

        let usedNumbers = new Set();

        // Generate numbers for each column
        for (let col = 0; col < 9; col++) {
            let range = numberPool[col];
            let numbers = [];

            while (numbers.length < 3) {
                let num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
                if (!usedNumbers.has(num)) {
                    numbers.push(num);
                    usedNumbers.add(num);
                }
            }

            numbers.sort((a, b) => a - b);

            // Find empty positions in this column
            let positions = [];
            for (let row = 0; row < 3; row++) {
                if (ticket[row][col] === null) {
                    positions.push(row);
                }
            }

            // Place numbers in empty positions
            positions.forEach((row, index) => {
                ticket[row][col] = numbers[index];
            });
        }

        // Fill remaining nulls with '%'
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                if (ticket[row][col] === null) {
                    ticket[row][col] = '%';
                }
            }
        }

        // Check for duplicates in recent tickets
        const [rows] = await db.query(
            "SELECT ticket FROM tickets ORDER BY id DESC LIMIT 250"
        );
        const isDuplicate = rows.some(row => 
            JSON.stringify(row.ticket) === JSON.stringify(ticket)
        );

        if (isDuplicate) {
            return res.status(400).json({ error: 'Duplicate ticket generated' });
        }

        // Insert the ticket
        const [result] = await db.query(
            "INSERT INTO tickets (playerName, emailId, ticket, user_id) VALUES (?, ?, ?, ?)",
            [playerName, emailId, JSON.stringify(ticket), userId || null]
        );

        res.status(201).json({
            ticketId: result.insertId,
            ticket,
            message: 'Ticket generated successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Draw a random number
exports.drawNumber = async (req, res) => {
    try {
        const io = req.app.get('io');
        
        // Check game state
        const [[gameState]] = await db.query('SELECT * FROM game_state WHERE id = 1');
        if (!gameState.is_active) {
            return res.status(400).json({ error: 'Game is not active' });
        }
        
        // Get drawn numbers
        const [drawn] = await db.query('SELECT number FROM tambola_numbers');
        const drawnNumbers = new Set(drawn.map(row => row.number));
        
        if (drawnNumbers.size >= 90) {
            return res.status(400).json({ error: 'All numbers have been drawn' });
        }
        
        // Draw new number
        let newNumber;
        do {
            newNumber = Math.floor(Math.random() * 90) + 1;
        } while (drawnNumbers.has(newNumber));
        
        // Save to database
        await db.query('INSERT INTO tambola_numbers (number) VALUES (?)', [newNumber]);
        await db.query('UPDATE game_state SET last_number = ? WHERE id = 1', [newNumber]);
        
        // Broadcast to all clients
        io.emit('number_drawn', { 
            number: newNumber,
            totalDrawn: drawnNumbers.size + 1
        });
        
        res.json({ 
            number: newNumber,
            totalDrawn: drawnNumbers.size + 1
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Check for winners
exports.checkWinners = async (req, res) => {
    try {
        const io = req.app.get('io');
        
        // 1. Get drawn numbers
        const [drawnRows] = await db.query('SELECT number FROM tambola_numbers ORDER BY number');
        const drawnNumbers = new Set(drawnRows.map(row => row.number));
        const totalDrawn = drawnNumbers.size;
        console.log('Drawn Numbers:', [...drawnNumbers].sort((a,b) => a-b));

        // 2. Get all active tickets with improved query
        const [tickets] = await db.query(`
            SELECT 
                t.id, 
                t.user_id, 
                t.playerName, 
                CASE 
                    WHEN JSON_TYPE(t.ticket) = 'STRING' THEN JSON_EXTRACT(t.ticket, '$')
                    ELSE t.ticket 
                END AS ticket
            FROM tickets t
            LEFT JOIN ticket_winners tw ON t.id = tw.ticket_id
            WHERE tw.ticket_id IS NULL
        `);
        console.log(`Checking ${tickets.length} tickets for winners`);

        let winners = [];
        let debugInfo = [];

        for (const ticket of tickets) {
            const ticketDebug = {
                ticketId: ticket.id,
                playerName: ticket.playerName,
                issues: [],
                visualization: []
            };

            try {
                // 3. Parse and validate ticket with robust handling
                let ticketData;
                try {
                    if (typeof ticket.ticket === 'string') {
                        const cleanedTicket = ticket.ticket.trim();
                        ticketData = JSON.parse(cleanedTicket);
                    } else {
                        ticketData = ticket.ticket;
                    }
                    
                    if (typeof ticketData === 'string') {
                        ticketData = JSON.parse(ticketData);
                    }
                } catch (parseError) {
                    throw new Error(`Ticket JSON parse failed: ${parseError.message}`);
                }

                if (!validateTambolaTicket(ticketData)) {
                    throw new Error('Invalid ticket structure');
                }

                // Generate visualization for debugging
                ticketDebug.visualization = ticketData.map(row => 
                    row.map(cell => cell === '%' ? '  ' : drawnNumbers.has(cell) ? `[${cell}]` : ` ${cell}`)
                );

                // 4. Extract all numbers and positions
                const ticketNumbers = [];
                const positions = [];
                
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 9; col++) {
                        if (ticketData[row][col] !== '%') {
                            ticketNumbers.push(ticketData[row][col]);
                            positions.push({row, col, num: ticketData[row][col]});
                        }
                    }
                }

                const matchedNumbers = ticketNumbers.filter(num => drawnNumbers.has(num));
                ticketDebug.matchedNumbers = matchedNumbers;
                ticketDebug.matchCount = matchedNumbers.length;

                // 5. Check winning patterns with progressive unlocking
                let patterns = [];

                // Quick Wins (anywhere on ticket)
                if (matchedNumbers.length >= 5) patterns.push('Quick Five');
                if (matchedNumbers.length >= 7) patterns.push('Quick Seven');

                // Line Patterns
                const fullRows = [];
                for (let row = 0; row < 3; row++) {
                    const rowNumbers = ticketData[row].filter(cell => cell !== '%');
                    const matchedInRow = rowNumbers.filter(num => drawnNumbers.has(num)).length;
                    
                    if (matchedInRow === rowNumbers.length) {
                        patterns.push(`Full Row ${row+1}`);
                        fullRows.push(row);
                    } 
                    // Partial row completion (only show if no full row yet)
                    else if (matchedInRow >= 3 && !patterns.some(p => p.startsWith('Full Row'))) {
                        patterns.push(`Row ${row+1} (${matchedInRow}/${rowNumbers.length})`);
                    }
                }

                // Corner Patterns
                const corners = [
                    ticketData[0][0], ticketData[0][8], // Top corners
                    ticketData[2][0], ticketData[2][8]  // Bottom corners
                ].filter(cell => cell !== '%');
                
                const matchedCorners = corners.filter(num => drawnNumbers.has(num));
                if (totalDrawn < 15 && matchedCorners.length >= 3) {
                    patterns.push(`${matchedCorners.length} Corners`);
                } 
                else if (matchedCorners.length === 4) {
                    patterns.push('Four Corners');
                }

                // Column Patterns (only check after 10 numbers drawn)
                if (totalDrawn >= 10) {
                    for (let col = 0; col < 9; col++) {
                        const colNumbers = [
                            ticketData[0][col],
                            ticketData[1][col],
                            ticketData[2][col]
                        ].filter(cell => cell !== '%');

                        if (colNumbers.length > 0 && colNumbers.every(num => drawnNumbers.has(num))) {
                            patterns.push(`Full Column ${col+1}`);
                        }
                    }
                }

                // Full Game Patterns
                if (matchedNumbers.length === ticketNumbers.length) {
                    patterns = ['Full House']; // Override all other patterns
                } 
                else if (totalDrawn >= 20 && fullRows.length >= 2) {
                    patterns.push(`Double Line (Rows ${fullRows.map(r => r+1).join('+')})`);
                }

                // 6. Prioritize the most significant pattern
                const prioritizedPatterns = [
                    'Full House',
                    'Double Line',
                    /^Full Row/,
                    'Four Corners',
                    /^Full Column/,
                    'Quick Seven',
                    'Quick Five',
                    /^Row \d+ \(\d+\/\d+\)/
                ];

                let winningPattern = [];
                for (const pattern of prioritizedPatterns) {
                    const found = patterns.find(p => 
                        typeof pattern === 'string' ? p === pattern : pattern.test(p)
                    );
                    if (found) {
                        winningPattern = [found];
                        break;
                    }
                }

                // 7. Record winners if any patterns matched
                if (winningPattern.length > 0) {
                    await db.query(`
                        INSERT INTO ticket_winners 
                        (ticket_id, user_id, playerName, patterns) 
                        VALUES (?, ?, ?, ?)
                    `, [ticket.id, ticket.user_id, ticket.playerName, JSON.stringify(winningPattern)]);

                    winners.push({
                        ticketId: ticket.id,
                        playerName: ticket.playerName,
                        patterns: winningPattern,
                        matchedNumbers,
                        matchCount: matchedNumbers.length,
                        visualization: ticketDebug.visualization
                    });

                    ticketDebug.isWinner = true;
                    ticketDebug.winningPatterns = winningPattern;
                } else {
                    ticketDebug.isWinner = false;
                    ticketDebug.reason = 'No winning patterns matched';
                }

            } catch (error) {
                ticketDebug.issues.push(error.message);
                console.error(`Error processing ticket ${ticket.id}:`, error);
            }

            debugInfo.push(ticketDebug);
        }

        // 8. Prepare response
        const response = { winners };
        if (process.env.NODE_ENV !== 'production') {
            response.debug = {
                drawnNumbers: [...drawnNumbers].sort((a,b) => a-b),
                totalDrawn: totalDrawn,
                totalTicketsChecked: tickets.length,
                ticketDetails: debugInfo
            };
        }

        if (winners.length > 0) {
            io.emit('winners_announced', { winners });
        }

        res.json(response);

    } catch (error) {
        console.error("Error in checkWinners:", error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
};

// Ticket Validation Function
function validateTambolaTicket(ticket) {
    // Structure validation
    if (!Array.isArray(ticket) || ticket.length !== 3) return false;
    if (ticket.some(row => !Array.isArray(row) || row.length !== 9)) return false;
    
    // Column rules validation
    for (let col = 0; col < 9; col++) {
        const column = [ticket[0][col], ticket[1][col], ticket[2][col]].filter(x => x !== '%');
        const min = col === 0 ? 1 : col * 10;
        const max = col === 8 ? 90 : (col + 1) * 10 - 1;
        
        // Check numbers are in valid range
        if (column.some(num => num < min || num > max)) return false;
    }
    
    // Row rules validation
    const numbers = new Set();
    for (const row of ticket) {
        const rowNumbers = row.filter(x => x !== '%');
        
        // Each row should have exactly 5 numbers
        if (rowNumbers.length !== 5) return false;
        
        // Check for duplicates
        for (const num of rowNumbers) {
            if (numbers.has(num)) return false;
            numbers.add(num);
        }
    }
    
    return true;
}

// Start the game
exports.startGame = async (req, res) => {
    try {
        await db.query('UPDATE game_state SET is_active = true WHERE id = 1');
        req.app.get('io').emit('game_started');
        res.json({ message: 'Game started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Reset the game
exports.resetGame = async (req, res) => {
    try {
        const io = req.app.get('io');
        await db.query('TRUNCATE TABLE tambola_numbers');
        await db.query('TRUNCATE TABLE ticket_winners');
        await db.query('UPDATE game_state SET is_active = false, last_number = NULL WHERE id = 1');
        io.emit('game_reset');
        res.json({ message: 'Game reset succesfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get current game state
exports.getGameState = async (req, res) => {
    try {
        const [[gameState]] = await db.query('SELECT * FROM game_state WHERE id = 1');
        const [drawn] = await db.query('SELECT number FROM tambola_numbers ORDER BY number');
        res.json({
            isActive: gameState.is_active,
            lastNumber: gameState.last_number,
            drawnNumbers: drawn.map(row => row.number)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Get live results
exports.getLiveResults = async (req, res) => {
    try {
        // Get game state
        const [[gameState]] = await db.query('SELECT * FROM game_state WHERE id = 1');
        
        // Get drawn numbers
        const [drawnNumbers] = await db.query('SELECT number FROM tambola_numbers ORDER BY number');
        
        // Get recent winners (last 10)
        const [winners] = await db.query(`
            SELECT 
                tw.*,
                t.game_id,
                t.playerName
            FROM ticket_winners tw
            JOIN tickets t ON tw.ticket_id = t.id
            ORDER BY tw.created_at DESC
            LIMIT 10
        `);
        
        res.json({
            gameActive: gameState.is_active,
            lastNumber: gameState.last_number,
            totalNumbersDrawn: drawnNumbers.length,
            drawnNumbers: drawnNumbers.map(row => row.number),
            recentWinners: winners.map(winner => ({
                gameId: winner.game_id,
                playerName: winner.playerName,
                patterns: JSON.parse(winner.patterns),
                wonAt: winner.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Get player details by Game ID
exports.getPlayerDetails = async (req, res) => {
    try {
        const { gameId } = req.params;
        
        // Get ticket details
        const [[ticket]] = await db.query(`
            SELECT 
                t.id,
                t.game_id,
                t.playerName,
                t.emailId,
                t.ticket,
                COALESCE(tw.patterns, '[]') AS winning_patterns,
                COALESCE(tw.created_at, '') AS won_at
            FROM tickets t
            LEFT JOIN ticket_winners tw ON t.id = tw.ticket_id
            WHERE t.game_id = ?
        `, [gameId]);
        
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        // Parse ticket data
        const ticketData = typeof ticket.ticket === 'string' ? 
            JSON.parse(ticket.ticket) : ticket.ticket;
        
        // Get drawn numbers for highlighting
        const [drawnNumbers] = await db.query('SELECT number FROM tambola_numbers');

        res.json({
            gameId: ticket.game_id || '',
            playerName: ticket.playerName || 'Unknown Player',
            emailId: ticket.emailId || 'N/A',
            ticket: ticketData || [],
            winningPatterns: JSON.parse(ticket.winning_patterns) || [],
            wonAt: ticket.won_at || 'Not Yet Won',
            drawnNumbers: drawnNumbers.length ? drawnNumbers.map(row => row.number) : []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Get all reward configurations
exports.getRewardConfigs = async (req, res) => {
    try {
        const [configs] = await db.query('SELECT * FROM reward_config ORDER BY id');
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update reward configuration
exports.updateRewardConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, is_active } = req.body;
        
        await db.query(
            'UPDATE reward_config SET amount = ?, is_active = ? WHERE id = ?',
            [amount, is_active, id]
        );
        
        res.json({ message: 'Reward configuration updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Distribute rewards to winners
exports.distributeRewards = async (req, res) => {
    try {
        // Get all unpaid winners
        const [winners] = await db.query(`
            SELECT 
                tw.id AS winner_id,
                tw.ticket_id,
                tw.patterns,
                t.game_id,  -- ✅ Ensure game_id is correctly selected
                t.playerName,
                t.emailId,
                t.user_id
            FROM ticket_winners tw
            JOIN tickets t ON tw.ticket_id = t.id
            WHERE COALESCE(tw.reward_paid, 0) = 0
            ORDER BY tw.created_at
        `);

        if (winners.length === 0) {
            return res.json({ message: "No rewards to distribute" });
        }

        // Get reward configurations
        const [rewardConfigs] = await db.query(`
            SELECT * FROM reward_config WHERE is_active = true
        `);

        let rewardsDistributed = [];
        let fullHouseCount = 0;

        for (const winner of winners) {
            if (!winner.game_id) {
                console.error("Missing game_id for ticket:", winner.ticket_id);
                continue; // Skip if game_id is null
            }

            let patterns;
            try {
                patterns = Array.isArray(winner.patterns) 
                    ? winner.patterns 
                    : JSON.parse(winner.patterns);
            } catch (err) {
                console.error("JSON Parsing Error:", err.message);
                return res.status(500).json({ error: "Invalid patterns format" });
            }

            for (const pattern of patterns) {
                // Find matching reward config
                const config = rewardConfigs.find(c => 
                    new RegExp(c.pattern_regex).test(pattern)
                );

                if (config) {
                    let amount = config.amount;

                    // Special handling for Full House (First = 500, Subsequent = 300)
                    if (pattern === 'Full House') {
                        fullHouseCount++;
                        if (fullHouseCount > 1) {
                            const secondPrize = rewardConfigs.find(c => 
                                c.pattern_name === 'Second Full House'
                            );
                            if (secondPrize) amount = secondPrize.amount;
                        }
                    }

                    // Insert reward payment record
                    await db.query(`
                        INSERT INTO reward_payments (
                            ticket_id, 
                            user_id,  -- ✅ Include user_id from tickets table
                            game_id, 
                            playerName,
                            pattern, 
                            amount, 
                            payment_status
                        ) VALUES (?, ?, ?, ?, ?, ?, 'processed')
                    `, [
                        winner.ticket_id,
                        winner.user_id,  // ✅ Ensure user_id is passed
                        winner.game_id,  // ✅ Now it can't be NULL
                        winner.playerName,
                        pattern,
                        amount
                    ]);

                    // Mark as paid in ticket_winners
                    await db.query(`
                        UPDATE ticket_winners 
                        SET reward_paid = 1 
                        WHERE id = ?
                    `, [winner.winner_id]);

                    rewardsDistributed.push({
                        gameId: winner.game_id,
                        playerName: winner.playerName,
                        pattern,
                        amount,
                        date: new Date()
                    });

                    break; // Only pay for the highest priority pattern
                }
            }
        }

        res.json({
            message: "Rewards distributed successfully",
            count: rewardsDistributed.length,
            rewards: rewardsDistributed
        });

    } catch (error) {
        console.error("Error in distributeRewards:", error);
        res.status(500).json({ error: error.message });
    }
};


// Get rewards for a specific player
exports.getPlayerRewards = async (req, res) => {
    try {
        const { gameId } = req.params;
        
        const [rewards] = await db.query(`
            SELECT 
                rp.*,
                t.game_id
            FROM reward_payments rp
            JOIN tickets t ON rp.ticket_id = t.id
            WHERE t.game_id = ?
            ORDER BY rp.payment_date DESC
        `, [gameId]);
        
        res.json(rewards);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

