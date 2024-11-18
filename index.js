const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors")
const http = require('http'); // Import http module
const socketIo = require('socket.io'); // Import socket.io
const gameRoutes = require('./src/routes/game');
const authRoutes = require('./src/routes/auth');


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app); // Create HTTP server
const io = socketIo(server); // Initialize Socket.io

mongoose.connect('mongodb://localhost:27017/scotland_yard', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log(err));
// auth routes
app.use('/api/v1/auth', authRoutes);
// Register the game routes
app.use('/api/v1/game', gameRoutes);

// Listen for Socket.io connections
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});


const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
