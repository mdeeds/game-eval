//@ts-check

/** @typedef {import('./engine.js').GameContext} GameContext */
/** @typedef {import('./engine.js').GameState} GameState */

// --- Shared Helpers ---
// Winning combinations indices
const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * State: Start Game
 * Initializes the board and starts the game loop.
 */
/** @implements {GameState} */
export class StartState {
  /**
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(context) {
    return [];
  }

  /**
   * @param {string} input
   * @param {GameContext} context
   * @returns {GameState}
   */
  processOption(input, context) {

    // Initialize empty board (null = empty, 1 = X, 2 = O)
    context.set('board', Array(9).fill(null));

    // Player 1 starts
    context.setActivePlayer(1);
    context.log("Welcome to Tic-Tac-Toe.");
    context.log("Player 1 is X. Player 2 is O.");
    context.log("----------------");
    context.log("Game Started.");
    printBoard(context, Array(9).fill(null));
    context.log("Player 1 (X), choose a position (0-8):");

    return new PlayerTurn();
  }
}

/**
 * State: Player Turn
 * Handles player input, updates board, checks win/draw conditions.
 */
/** @implements {GameState} */
export class PlayerTurn {
  /**
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(context) {
    /** @type {Array<number|null>} */
    const board = context.get('board');
    const options = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        options.push(String(i + 1));
      }
    }
    return options;
  }

  /**
   * @param {string} input
   * @param {GameContext} context
   * @returns {GameState}
   */
  processOption(input, context) {
    if (!input) return this;

    const idx = parseInt(input) - 1;
    /** @type {Array<number|null>} */
    const oldBoard = context.get('board');

    // Create a copy to ensure immutability in history
    const newBoard = [...oldBoard];

    const currentPlayer = context.getLastActivePlayer();
    newBoard[idx] = currentPlayer;

    context.set('board', newBoard);
    context.log(`> Player ${currentPlayer} chose ${idx}`);
    printBoard(context, newBoard);

    // Check Win
    if (checkWin(newBoard, currentPlayer)) {
      context.set('winner_id', currentPlayer);
      return new EndGame();
    }

    // Check Draw
    if (newBoard.every(cell => cell !== null)) {
      return new EndGame();
    }

    // Switch Player
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    context.setActivePlayer(nextPlayer);
    context.log(`Player ${nextPlayer} (${nextPlayer === 1 ? 'X' : 'O'}), choose a position (0-8):`);

    return new PlayerTurn();
  }
}

/**
 * State: End Game
 * Displays the result and terminates the game.
 */
/** @implements {GameState} */
export class EndGame {
  /**
   * @param {GameContext} context
   * @returns {(string)[]}
   */
  getOptions(context) {
    return []; // Automatic transition
  }

  /**
   * @param {string} input
   * @param {GameContext} context
   * @returns {GameState|null}
   */
  processOption(input, context) {
    const winnerId = context.get('winner_id');

    context.log("----------------");
    if (winnerId) {
      context.setWinner(winnerId);
      context.log(`Player ${winnerId} wins!`);
    } else {
      context.log("It's a draw!");
    }
    context.log("Game Over.");

    return null;
  }
}

/**
 * Checks if the player has won.
 * @param {Array<number|null>} board
 * @param {number} player
 * @returns {boolean}
 */
function checkWin(board, player) {
  return WINS.some(combo =>
    combo.every(idx => board[idx] === player)
  );
}

/**
 * Prints the board to the log.
 * @param {GameContext} context
 * @param {Array<number|null>} board
 */
function printBoard(context, board) {
  const s = board.map(c => c === 1 ? 'X' : (c === 2 ? 'O' : '.'));
  context.log(`${s[0]} ${s[1]} ${s[2]}`);
  context.log(`${s[3]} ${s[4]} ${s[5]}`);
  context.log(`${s[6]} ${s[7]} ${s[8]}`);
}