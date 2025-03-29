require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path'); 

const userAuthRoutes = require('./routes/user-auth-routes');
const profileRoutes = require('./routes/profile-routes');
const buildTicketRoutes = require('./routes/buildTicket-routes');
const buyTicketRoutes = require('./routes/buyTicket-routes');
const gameRoutes = require("./routes/gameRoutes");
const clubRoutes = require("./routes/clubRoutes");
// const WinningLogicRoutes = require("./routes/WinningLogic-routes");

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());


const connectedClients = new Set();

app.get("/", (req, res) => {
    res.send("Receipt Management API is Running...");
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    connectedClients.add(socket);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedClients.delete(socket);
    });
});

// Attach `io` to app for real-time updates
app.set("io", io);


// Function to send real-time notifications
const sendNotification = (notification) => {
    connectedClients.forEach((socket) => {
        socket.emit('newNotification', notification);
    });
};

app.set('sendNotification', sendNotification);



// API Routes
app.use('/api', userAuthRoutes);
app.use('/api', profileRoutes);
app.use('/api', buildTicketRoutes);
app.use('/api', buyTicketRoutes);
app.use("/api/game", gameRoutes);
app.use("/api", clubRoutes);

// app.use('/api', WinningLogicRoutes);


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
