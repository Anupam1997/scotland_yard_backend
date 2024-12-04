// routes/game.js

const express = require("express");
const { getIoInstance } = require('../utils/socket'); // Access the io instance
const router = express.Router();
const Game = require("../models/Game");
const { v4: uuidv4 } = require("uuid");

let currentPlayerIndex = 0;
const io = getIoInstance();
// Function to emit turn notifications
function notifyTurn(player) {
  io.emit("turnNotification", { playerName: player.name });
}

// Function to proceed to the next turn
function nextTurn(game) {
  currentPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
  const currentPlayer = game.players[currentPlayerIndex];
  notifyTurn(currentPlayer);
}

// Host a new game
router.post("/host", async (req, res) => {
  const { host, role } = req.body;
  const gameId = uuidv4();

  try {
    const mrX =
      role === "Mr. X"
        ? { position: 1, transports: [], caught: false, hasWon: false }
        : null;

    const newGame = new Game({
      gameId,
      host,
      players: [{ name: host, role, socketId: "" }], // Host is Mr. X
      mrX,
      status: "waiting",
    });
    await newGame.save();
    res.json({ gameId, inviteLink: `https://yourapp.com/join/${gameId}` });
  } catch (error) {
    res.status(500).json({ message: "Failed to create game", error });
  }
});

// join and assign roles
router.post("/join-game/:gameId", async (req, res) => {
  const { gameId } = req.params;
  const { playerName, socketId, role } = req.body; // Include role and socketId

  try {
    const game = await Game.findOne({ gameId });

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ message: "Game is full" });
    }

    if (game.status !== "waiting") {
      return res
        .status(400)
        .json({ message: "Cannot join game in progress or completed" });
    }

    // If no role is specified, automatically assign a detective role
    let assignedRole = role;
    if (!assignedRole) {
      // If no role provided, assign them as the next available detective
      assignedRole = `Detective ${game.players.length + 1}`;
    }

    const validRoles = [
      "Detective 1",
      "Detective 2",
      "Detective 3",
      "Detective 4",
      "Detective 5",
      "Detective 6",
      "Mr. X",
    ];

    if (!validRoles.includes(assignedRole)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Check if the role is already taken
    const existingRole = game.players.find(
      (player) => player.role === assignedRole
    );
    if (existingRole) {
      return res
        .status(400)
        .json({
          message: `${assignedRole} is already assigned to another player`,
        });
    }

    // Add the player to the game with the assigned role
    game.players.push({ name: playerName, role: assignedRole, socketId });

    // If the role is Mr. X, ensure only one "Mr. X" exists
    if (assignedRole === "Mr. X") {
      if (game.players.some((player) => player.role === "Mr. X")) {
        return res
          .status(400)
          .json({ message: "Mr. X has already been assigned" });
      }
    }

    // Save the game state
    await game.save();

    // Calculate the available roles after the player joins
    const assignedRoles = game.players.map(player => player.role);
    const availableRoles = validRoles.filter(role => !assignedRoles.includes(role));

    // Emit the updated player count, names, and available roles to all clients
    const playerNames = game.players.map((player) => player.name);
    io.emit("playerUpdate", { 
      playerCount: game.players.length, 
      playerNames,
      availableRoles // Send available roles to the frontend
    });

    // Return the response with available roles
    res.json({
      message: `${playerName} joined the game as ${assignedRole}`,
      playerCount: game.players.length,
      assignedRole,
      availableRoles, // Add available roles to the response
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to join game", error });
  }
});


// leave game
router.post("/leave-game/:gameId", async (req, res) => {
  const { gameId } = req.params;
  const { playerName, socketId } = req.body; // Include playerName and socketId to identify the player

  try {
    const game = await Game.findOne({ gameId });

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (game.status !== "waiting") {
      return res
        .status(400)
        .json({
          message: "Cannot leave a game that is in progress or completed",
        });
    }

    // Find the player in the game by matching the playerName or socketId
    const playerIndex = game.players.findIndex(
      (player) => player.name === playerName || player.socketId === socketId
    );

    if (playerIndex === -1) {
      return res.status(404).json({ message: "Player not found in the game" });
    }

    // Remove the player from the game
    const removedPlayer = game.players.splice(playerIndex, 1)[0];

    // Save the updated game state
    await game.save();

    // Emit the updated player count and names after the player leaves
    const playerNames = game.players.map((player) => player.name);
    io.emit("playerUpdate", { playerCount: game.players.length, playerNames });

    // Return the response
    res.json({
      message: `${removedPlayer.name} left the game`,
      playerCount: game.players.length,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to leave the game", error });
  }
});

// Allowed initial positions for players (example: positions for Scotland Yard)
const allowedInitialPositions = [
  13, 26, 29, 34, 50, 53, 91, 94, 103, 112, 117, 132, 138, 141, 155, 174, 197,
  198,
]; // Replace with actual game positions

// API to assign initial position to players
router.post("/assign-initial-position/:gameId", async (req, res) => {
  const { gameId } = req.params;
  const { playerName, initialPosition } = req.body; // Receive player name and selected initial position

  try {
    const game = await Game.findOne({ gameId });

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Check if the game status is waiting
    if (game.status !== "waiting") {
      return res
        .status(400)
        .json({
          message: "Cannot assign positions after the game has started",
        });
    }

    // Validate the initial position
    if (!allowedInitialPositions.includes(initialPosition)) {
      return res
        .status(400)
        .json({ message: "Invalid initial position specified" });
    }

    // Check if the position is already taken
    const positionTaken = game.players.find(
      (player) => player.initialPosition === initialPosition
    );
    if (positionTaken) {
      return res
        .status(400)
        .json({ message: "Initial position already taken by another player" });
    }

    // Assign the initial position to the player
    const playerIndex = game.players.findIndex(
      (player) => player.name === playerName
    );
    if (playerIndex === -1) {
      return res.status(404).json({ message: "Player not found in the game" });
    }

    game.players[playerIndex].initialPosition = initialPosition; // Assign the initial position
    await game.save();

    // Emit the updated players and their initial positions
    io.emit("initialPositionUpdate", { players: game.players });

    res.json({
      message: `Initial position ${initialPosition} assigned to ${playerName}`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to assign initial position", error });
  }
});

// Start the game (only the host can start it)
router.post("/start/:gameId", async (req, res) => {
  const { gameId } = req.params;
  const { playerName } = req.body; // Assume the client sends the host's name for verification

  try {
    const game = await Game.findOne({ gameId });

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Only allow the host to start the game
    if (game.host !== playerName) {
      return res
        .status(403)
        .json({ message: "Only the host can start the game" });
    }

    // Check if the game is already in-progress or completed
    if (game.status !== "waiting") {
      return res
        .status(400)
        .json({ message: "Game has already started or is completed" });
    }

    // Update game status to in-progress
    game.status = "in-progress";
    await game.save();
    nextTurn(game); // Proceed to the next turn
    res.json({ message: "Game started", gameId });
  } catch (error) {
    res.status(500).json({ message: "Failed to start game", error });
  }
});

// Handle player movement (e.g., Mr. X moving)
router.post("/move/:gameId", async (req, res) => {
  const { gameId } = req.params;
  const { playerName, newPosition, transportUsed } = req.body;

  try {
    const game = await Game.findOne({ gameId });

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    const player = game.players.find((p) => p.name === playerName);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Check if the player is Mr. X
    if (player.role === "Mr. X") {
      // Update Mr. X's position and record the transport
      game.mrX.position = newPosition;
      game.mrX.transports.push(transportUsed);
      await game.save();

      // Notify all players about Mr. X's move and the transport used
      io.emit("mrXMove", {
        playerName,
        newPosition,
        transportUsed,
        transports: game.mrX.transports,
      });
      nextTurn(game); // Proceed to the next player's turn
      res.json({ message: `Mr. X moved to position ${newPosition}` });
    } else {
      // Logic for detectives moving can be added here
      res.status(400).json({ message: "Only Mr. X can move at this time" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to move", error });
  }
});

// Mark Mr. X as caught
router.post("/catch/:gameId", async (req, res) => {
  const { gameId } = req.params;
  const { playerName } = req.body;

  try {
    const game = await Game.findOne({ gameId });

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Only allow detectives to mark Mr. X as caught
    if (
      game.players.find(
        (player) =>
          player.name === playerName && player.role.startsWith("Detective")
      )
    ) {
      game.mrX.caught = true;
      game.mrX.hasWon = false; // Mr. X loses
      game.status = "completed";
      game.winner = playerName; // The detective who caught Mr. X
      await game.save();

      io.emit("gameEnd", { winner: playerName });
      res.json({ message: `Mr. X caught by ${playerName}` });
    } else {
      res.status(403).json({ message: "Only detectives can catch Mr. X" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to catch Mr. X", error });
  }
});

module.exports = router;
