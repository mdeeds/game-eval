//@ts-check

/** @typedef {import('./engine.js').GameContext} GameContext */
/** @typedef {import('./engine.js').GameState} GameState */
/** @typedef {import('./engine.js').StateNode} StateNode */

/**
 * State: Start Game
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
    context.log("Welcome to the Modulo Sum Game.");
    context.log("How many players? (1-9)");
    return new GetPlayerCount();
  }
}

/**
 * State: Ask how many players are playing.
 */
/** @implements {GameState} */
export class GetPlayerCount {
  /**
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(node, context) {
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  }

  /**
   * @param {string} input
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {GameState}
   */
  processOption(input, node, context) {
    if (!input) return this;

    const count = parseInt(input);

    // Store initial game state in the history node
    node.set('player_count', count);

    // Explicitly set the active player for the next phase
    node.activePlayer = 1;
    node.set('current_sum', 0);

    context.log(`> ${input}`);
    context.log(`Great. ${count} players configured.`);
    context.log("----------------");
    context.log("Player 1, enter a number (0-9):");

    return new PlayerTurn();
  }
}

/**
 * State: A generic player's turn.
 */
/** @implements {GameState} */
export class PlayerTurn {
  /**
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(node, context) {
    const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    return NUMBERS;
  }

  /**
   * @param {string} input
   * @param {StateNode} node
   * @param {GameContext} context
   * @returns {GameState}
   */
  processOption(input, node, context) {
    if (!input) return this;

    const val = parseInt(input);
    const currentSum = node.get('current_sum');
    const totalPlayers = node.get('player_count');

    // Retrieve who just played from the previous state node
    const currentPlayer = node.activePlayer;

    context.log(`> ${val}`);

    // Update state in the new history node
    const newSum = currentSum + val;
    node.set('current_sum', newSum);

    if (currentPlayer < totalPlayers) {
      const nextPlayer = currentPlayer + 1;
      node.activePlayer = nextPlayer;

      context.log(`Player ${nextPlayer}, enter a number (1-11):`);
      return new PlayerTurn();
    } else {
      // Last player done. Transition to End Game logic.
      // activePlayer remains -1 in the transition node to EndGame
      return new EndGame();
    }
  }
}

/**
 * State: Game Over processing.
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
    const finalSum = node.get('current_sum');
    const totalPlayers = node.get('player_count');
    const winnerIndex = (finalSum % totalPlayers) + 1;

    // Set the winner in the final state node
    node.winner = winnerIndex;

    context.log("----------------");
    context.log(`Total Sum: ${finalSum}`);
    context.log(`Calculation: ${finalSum} % ${totalPlayers} = ${finalSum % totalPlayers}`);
    context.log(`Player ${winnerIndex} wins!`);
    context.log("Game Over.");

    return null; // End of game
  }
}