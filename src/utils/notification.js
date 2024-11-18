const io = require('socket.io')(yourServerInstance); // Adjust with your actual server instance

// Emit a notification to the player whose turn it is
function notifyTurn(player) {
  io.to(player.socketId).emit('turnNotification', { playerName: player.name });
}

// Notify a player about their available tickets at the start of their turn
function notifyAvailableTickets(player, tickets) {
  io.to(player.socketId).emit('availableTickets', tickets);
}

// Notify the current player about their possible moves based on their current position
function notifyPossibleMoves(player, moves) {
  io.to(player.socketId).emit('possibleMoves', moves);
}

// Notify all players of the current positions of all detectives
function notifyPlayerPositions(game) {
  const positions = game.players
    .filter(p => p.role !== 'Mr. X') // Exclude Mr. X from the list
    .map(p => ({ name: p.name, position: p.position }));

  io.emit('playerPositions', positions);
}

// Notify all players about Mr. X's transports used
function notifyMrXTransports(game) {
  const mrXTransports = game.mrX.transports; // Example: array of transports used by Mr. X
  io.emit('mrXTransports', mrXTransports);
}

// Notify all players about Mr. X's current position
function notifyMrXPosition(game) {
  const mrXPosition = game.mrX.position; // Assuming this holds Mr. X's current position
  io.emit('mrXPosition', mrXPosition);
}

// Notify all players when Mr. X is caught or has won
function notifyCatchOrWin(game) {
  if (game.mrX.caught) {
    io.emit('gameEnd', { winner: 'Detectives', message: 'Mr. X has been caught!' });
  } else if (game.mrX.hasWon) {
    io.emit('gameEnd', { winner: 'Mr. X', message: 'Mr. X has escaped!' });
  }
}

module.exports = {
  notifyTurn,
  notifyAvailableTickets,
  notifyPossibleMoves,
  notifyPlayerPositions,
  notifyMrXTransports,
  notifyMrXPosition,
  notifyCatchOrWin,
};
