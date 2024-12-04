// socket.js

const socketIo = require('socket.io');

let io;

const setupSocketIO = (server) => {
  io = socketIo(server,{
    cors: {
        origin: 'http://192.168.39.208:8081',  // Allow only this origin to connect
        credentials: true,  // Allow credentials (cookies, headers, etc.)
      }
  }); // Bind Socket.IO to the server

  io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle specific events from the client
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
};

const getIoInstance = () => {
  return io;
};

module.exports = { setupSocketIO, getIoInstance };
