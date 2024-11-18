// models/Game.js
const mongoose = require('mongoose');

// Player schema with socketId for real-time notifications
const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: {
    type: String,
    enum: ['Detective 1', 'Detective 2', 'Detective 3', 'Detective 4', 'Detective 5', 'Mr. X'],
    required: true, // Role must be specified
  },
  position: { type: Number, default: 1 }, // Default starting position
  socketId: { type: String }, // For real-time communication
});

// Mr. X schema to track positions and transports
const mrXSchema = new mongoose.Schema({
  position: { type: Number, required: true }, // Current position
  transports: { type: [String], default: [] }, // History of transports used
  caught: { type: Boolean, default: false }, // Indicates if Mr. X is caught
  hasWon: { type: Boolean, default: false }, // Indicates if Mr. X has won
});

// Game schema
const gameSchema = new mongoose.Schema({
  gameId: { type: String, unique: true, required: true },
  host: { type: String, required: true },
  players: [playerSchema],
  mrX: mrXSchema,
  status: { type: String, default: 'waiting', enum: ['waiting', 'in-progress', 'completed'] },
  currentTurn: { type: Number, default: 0 }, // Index of the current player
  maxPlayers: { type: Number, default: 6 },
  winner: { type: String, default: null }, // Store the winner's name when game ends
  createdAt: { type: Date, default: Date.now }, // Game creation timestamp
});

// Export the Game model
module.exports = mongoose.model('Game', gameSchema);
