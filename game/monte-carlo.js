//@ts-check

/** @typedef {import('./engine.js').GameState} GameState */

import { Engine, GameContext, StateNode } from "./engine.js";

/**
 * Runs Monte Carlo simulations from the current state.
 * @param {Engine} engine
 * @param {number} simulations Number of iterations to run
 * @returns {Object<string, number>} Map of winner_id -> count
 */
export function runMonteCarlo(engine, simulations) {
    if (!engine.currentState || !engine.stateHead) {
        throw new Error(
            "Engine must have a current state and state head to run Monte Carlo simulations.");
    }

    const savedHead = engine.stateHead;
    const savedState = engine.currentState;
    /** @type {Object<string, number>} */
    const results = {};
    const ctx = new GameContext(() => { });

    for (let i = 0; i < simulations; i++) {
        // Reset to start of simulation (the current game state)
        engine.stateHead = savedHead;
        engine.currentState = savedState;

        while (engine.currentState) {
            if (!engine.stateHead) throw new Error("State head is null during simulation");
            const options = engine.currentState.getOptions(engine.stateHead, ctx);
            let input = null;

            if (options.length === 0) {
                input = null; // Auto-transition for EndGame
            } else if (options.length === 1) {
                input = options[0];
            } else {
                // Random choice
                const idx = Math.floor(Math.random() * options.length);
                input = options[idx];
            }

            // 1. Create history node for the simulation step
            const newNode = new StateNode(engine.stateHead, engine.currentState);
            engine.stateHead = newNode;

            // 2. Run Logic with NO-OP logger to prevent UI updates
            const nextState = engine.currentState.processOption(input, engine.stateHead, ctx);
            engine.currentState = nextState;

            if (engine.currentState && engine.currentState.onEnter) {
                engine.currentState.onEnter(engine.stateHead, ctx);
            }
        }

        // Game Over for this simulation run
        if (engine.stateHead.winner !== -1) {
            const w = engine.stateHead.winner;
            results[w] = (results[w] || 0) + 1;
        }
    }

    // Restore the actual game state
    engine.stateHead = savedHead;
    engine.currentState = savedState;

    return results;
}

/**
 * Runs Monte Carlo simulations for each valid option of the current state.
 * Returns the win count for the *current active player* for each option.
 * 
 * @param {Engine} engine
 * @param {number} simulationsPerOption
 * @returns {Object<string, number>|null} Map of option -> win_count for current player
 */
export function runOptionMonteCarlo(engine, simulationsPerOption) {
    if (!engine.currentState || !engine.stateHead) return null;

    const rootHead = engine.stateHead;
    const rootState = engine.currentState;
    const activePlayer = rootHead.activePlayer;

    // If no valid player is active (e.g. setup phase), we can't estimate "this" player's wins.
    if (activePlayer === -1) return null;

    const ctx = new GameContext(() => { });
    const options = engine.currentState.getOptions(engine.stateHead, ctx);
    /** @type {Object<string, number>} */
    const results = {};

    for (const opt of options) {
        // 1. Reset to the root state
        engine.stateHead = rootHead;
        engine.currentState = rootState;

        // 2. Perform the single transition for this option (manually)
        const newNode = new StateNode(engine.stateHead, engine.currentState);
        engine.stateHead = newNode;
        const nextState = engine.currentState.processOption(opt, engine.stateHead, ctx);
        engine.currentState = nextState;

        if (engine.currentState && engine.currentState.onEnter) {
            engine.currentState.onEnter(engine.stateHead, ctx);
        }

        // 3. Run Monte Carlo from this new hypothetical state
        // runMonteCarlo saves and restores the state internally, so it won't mess up our loop iteration state (which is the hypothetical state)
        const simResults = runMonteCarlo(engine, simulationsPerOption);

        // 4. Record wins for the original active player
        results[opt] = simResults[activePlayer] || 0;
    }

    // Final Restore
    engine.stateHead = rootHead;
    engine.currentState = rootState;

    return results;
}