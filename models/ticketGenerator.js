const db = require('../db');

async function generateUniqueTicket(playerName, emailId) {
    let connection = await db.getConnection();

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

        let positions = [];
        for (let row = 0; row < 3; row++) {
            if (ticket[row][col] === null) {
                positions.push(row);
            }
        }

        positions.forEach((row, index) => {
            ticket[row][col] = numbers[index];
        });
    }

    // Fetch last 250 tickets to ensure uniqueness
    let [rows] = await connection.execute("SELECT ticket FROM tickets ORDER BY id DESC LIMIT 250");
    let last250Tickets = rows.map(row => row.ticket);

    if (last250Tickets.includes(JSON.stringify(ticket))) {
        connection.release(); // Release the connection back to the pool
        return generateUniqueTicket(playerName, emailId); // Regenerate if duplicate
    }

    await connection.execute(
        "INSERT INTO tickets (playerName, emailId, ticket) VALUES (?, ?, ?)",
        [playerName, emailId, JSON.stringify(ticket)]
    );

    connection.release(); // Release the connection back to the pool
    return ticket;
}

module.exports = { generateUniqueTicket };
