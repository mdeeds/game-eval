# Game Evaluation Engine

This project is a lightweight, pure JavaScript framework designed for building, playing, and analyzing turn-based state-machine games. It features a core engine that handles state transitions, history tracking (allowing for recursive undo operations), and a DOM-based terminal interface.

Additionally, the engine includes built-in support for **Monte Carlo simulations**, allowing you to estimate win probabilities and evaluate the strength of specific moves for any game implemented with this interface.

## Features

*   **State Machine Architecture**: Games are defined as a series of state transitions.
*   **History & Undo**: The engine tracks the state tree, allowing for deep undo operations.
*   **Monte Carlo Analysis**: Built-in tools to simulate thousands of random games to estimate win rates for the current state or specific options.
*   **Text-based UI**: Simple DOM-based logging and input handling.

## Creating a New Game

To create a new game, you must implement the `GameState` interface. A game is essentially a collection of classes (States) that define valid inputs and transitions.

### The `GameState` Interface

Every state in your game must implement the following two methods:

```javascript
/**
 * @interface
 */
class GameState {
  /**
   * Returns a list of valid string inputs (options) for the current state.
   * If the list is empty, the engine may auto-transition or stop.
   * @param {GameContext} context
   * @returns {string[]}
   */
  getOptions(context) {}

  /**
   * Processes the selected input, updates game state, and returns the next State.
   * Returns `null` if the game has ended.
   * @param {string} input
   * @param {GameContext} context
   * @returns {GameState|null}
   */
  processOption(input, context) {}
}
```

### The `GameContext` API

The `context` object is passed to your state methods to interact with the engine and storage.

*   **`context.log(message)`**: Prints text to the game terminal.
*   **`context.get(key)`**: Retrieves a value from the state history.
*   **`context.set(key, value)`**: Saves a value to the current state node.
*   **`context.setActivePlayer(id)`**: Sets the ID (number) of the player currently acting.
*   **`context.getLastActivePlayer()`**: Returns the ID of the player who acted in the previous state.
*   **`context.setWinner(id)`**: Marks the specific player ID as the winner of the game (used for Monte Carlo stats).

### Example Implementation

Here is a minimal example of a coin toss game:

```javascript
import { GameContext, GameState } from './engine.js';

export class StartState {
  getOptions(context) {
    return ['Heads', 'Tails'];
  }

  processOption(input, context) {
    context.log(`You chose ${input}.`);
    const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
    context.log(`Result: ${result}`);
    
    if (input === result) {
      context.log("You Win!");
      context.setWinner(1);
    } else {
      context.log("You Lose.");
    }
    
    return null; // Game Over
  }
}
```

## Running Your Game

To run your game, import your initial state in `index.js` and pass it to the engine:

```javascript
import { StartState } from './game/my-new-game.js';
// ...
engine.initGame(root, new StartState());
```