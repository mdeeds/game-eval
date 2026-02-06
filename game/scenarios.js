import { print, get, set, setActivePlayer, setWinner, getLastActivePlayer } from './engine.js';

// --- Shared Helpers ---
const NUMBERS = ['0','1','2','3','4','5','6','7','8','9'];

/**
 * Initial Setup (Visual only)
 */
export const startScenario = () => {
    print("Welcome to the Modulo Sum Game.");
    print("How many players? (1-9)");
};

/**
 * State: Ask how many players are playing.
 */
export class AskPlayerCount {
    getOptions() {
        return [2, 3, 4, 5];
    }

    processOption(input, log = print) {
        if (!input) return this;

        const count = parseInt(input);
        
        // Store initial game state in the history node
        set('player_count', count);
        
        // Explicitly set the active player for the next phase
        setActivePlayer(1);
        set('current_sum', 0);

        log(`> ${input}`);
        log(`Great. ${count} players configured.`);
        log("----------------");
        log("Player 1, enter a number (0-9):");

        return new PlayerTurn();
    }
}

/**
 * State: A generic player's turn.
 */
export class PlayerTurn {
    getOptions() {
        return NUMBERS;
    }

    processOption(input, log = print) {
        if (!input) return this;
        
        const val = parseInt(input);
        const currentSum = get('current_sum');
        const totalPlayers = get('player_count');
        
        // Retrieve who just played from the previous state node
        const currentPlayer = getLastActivePlayer();

        log(`> ${val}`);
        
        // Update state in the new history node
        const newSum = currentSum + val;
        set('current_sum', newSum);

        if (currentPlayer < totalPlayers) {
            const nextPlayer = currentPlayer + 1;
            setActivePlayer(nextPlayer);
            
            log(`Player ${nextPlayer}, enter a number (0-9):`);
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
    getOptions() {
        return []; // Automatic transition
    }

    processOption(input, log = print) {
        const finalSum = get('current_sum');
        const totalPlayers = get('player_count');
        const winnerIndex = (finalSum % totalPlayers) + 1;

        // Set the winner in the final state node
        setWinner(winnerIndex);

        log("----------------");
        log(`Total Sum: ${finalSum}`);
        log(`Calculation: ${finalSum} % ${totalPlayers} = ${finalSum % totalPlayers}`);
        log(`Player ${winnerIndex} wins!`);
        log("Game Over.");

        return null; // End of game
    }
}