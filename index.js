const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const http = require('http'); // Import http module
const { setupSocketIO, getIoInstance } = require('./src/utils/socket');  // Import the socket setup
const gameRoutes = require('./src/routes/game');
const authRoutes = require('./src/routes/auth');


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app); // Create HTTP server
// Set up Socket.IO
setupSocketIO(server);
const io = getIoInstance();
mongoose.connect('mongodb://localhost:27017/scotland_yard', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log(err));

// Pass the io instance to the routes
app.use('/api/v1/auth', authRoutes);  // Pass io to authRoutes
app.use('/api/v1/game', gameRoutes);  // Pass io to gameRoutes

// Listen for Socket.io connections
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
