//@ts-check

/** @typedef {import('./engine.js').GameContext} GameContext */

// --- Shared Helpers ---
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Initial Setup (Visual only)
 * @param {(text: string) => void} log
 */
export const startScenario = (log) => {
  log("Welcome to the Modulo Sum Game.");
  log("How many players? (1-9)");
};

/**
 * State: Ask how many players are playing.
 */
export class StartState {
  /**
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(context) {
    return ['2', '3', '4', '5'];
  }

  /**
   * @param {string} input
   * @param {GameContext} context
   * @returns {StartState|PlayerTurn}
   */
  processOption(input, context) {
    if (!input) return this;

    const count = parseInt(input);

    // Store initial game state in the history node
    context.set('player_count', count);

    // Explicitly set the active player for the next phase
    context.setActivePlayer(1);
    context.set('current_sum', 0);

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
export class PlayerTurn {
  /**
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(context) {
    return NUMBERS;
  }

  /**
   * @param {string} input
   * @param {GameContext} context
   * @returns {PlayerTurn|EndGame}
   */
  processOption(input, context) {
    if (!input) return this;

    const val = parseInt(input);
    const currentSum = context.get('current_sum');
    const totalPlayers = context.get('player_count');

    // Retrieve who just played from the previous state node
    const currentPlayer = context.getLastActivePlayer();

    context.log(`> ${val}`);

    // Update state in the new history node
    const newSum = currentSum + val;
    context.set('current_sum', newSum);

    if (currentPlayer < totalPlayers) {
      const nextPlayer = currentPlayer + 1;
      context.setActivePlayer(nextPlayer);

      context.log(`Player ${nextPlayer}, enter a number (0-9):`);
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
export class EndGame {
  /**
   * @param {GameContext} context
   * @returns {(string|number)[]}
   */
  getOptions(context) {
    return []; // Automatic transition
  }

  /**
   * @param {string} input
   * @param {GameContext} context
   * @returns {null}
   */
  processOption(input, context) {
    const finalSum = context.get('current_sum');
    const totalPlayers = context.get('player_count');
    const winnerIndex = (finalSum % totalPlayers) + 1;

    // Set the winner in the final state node
    context.setWinner(winnerIndex);

    context.log("----------------");
    context.log(`Total Sum: ${finalSum}`);
    context.log(`Calculation: ${finalSum} % ${totalPlayers} = ${finalSum % totalPlayers}`);
    context.log(`Player ${winnerIndex} wins!`);
    context.log("Game Over.");

    return null; // End of game
  }
}