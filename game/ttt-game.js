//@ts-check

/** @typedef {import('./engine.js').GameContext} GameContext */
/** @typedef {import('./engine.js').GameState} GameState */

import { StateNode } from "./state-node.js";

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
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(node, context) {
    return [];
  }

  /**
   * @param {string} input
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {GameState}
   */
  processOption(input, node, context) {

    // Initialize empty board (null = empty, 1 = X, 2 = O)
    node.set('board', Array(9).fill(null));

    // Player 1 starts
    node.activePlayer = 1;
    context.log("Welcome to Tic-Tac-Toe.");
    context.log("Player 1 is X. Player 2 is O.");
    context.log("----------------");
    context.log("Game Started.");
    printBoard(context, node, Array(9).fill(null));

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
   * @param {StateNode} node
   * @param {GameContext} context
   */
  onEnter(node, context) {
    const player = node.activePlayer;
    context.log(`Player ${player} (${player === 1 ? 'X' : 'O'}), choose a position (1-9):`);
  }

  /**
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(node, context) {
    /** @type {Array<number|null>} */
    const board = node.get('board');
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
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {GameState}
   */
  processOption(input, node, context) {
    if (!input) return this;

    const idx = parseInt(input) - 1;
    /** @type {Array<number|null>} */
    const oldBoard = node.get('board');

    // Create a copy to ensure immutability in history
    const newBoard = [...oldBoard];

    const currentPlayer = node.activePlayer;
    newBoard[idx] = currentPlayer;

    node.set('board', newBoard);
    context.log(`> Player ${currentPlayer} chose ${idx}`);
    printBoard(context, node, newBoard);

    // Check Win
    if (checkWin(newBoard, currentPlayer)) {
      node.set('winner_id', currentPlayer);
      return new EndGame();
    }

    // Check Draw
    if (newBoard.every(cell => cell !== null)) {
      return new EndGame();
    }

    // Switch Player
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    node.activePlayer = nextPlayer;

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
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {(string)[]}
   */
  getOptions(node, context) {
    return []; // Automatic transition
  }

  /**
   * @param {string} input
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {GameState|null}
   */
  processOption(input, node, context) {
    const winnerId = node.get('winner_id');

    context.log("----------------");
    if (winnerId) {
      node.winner = winnerId;
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
 * @param {StateNode} node
 * @param {Array<number|null>} board
 */
function printBoard(context, node, board) {
  const s = board.map(c => c === 1 ? 'X' : (c === 2 ? 'O' : '.'));
  context.log(`${s[0]} ${s[1]} ${s[2]}`);
  context.log(`${s[3]} ${s[4]} ${s[5]}`);
  context.log(`${s[6]} ${s[7]} ${s[8]}`);
}