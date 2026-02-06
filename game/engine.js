//@ts-check

// @typedef {Object} GameState
// @property {(context: GameContext) => (string|number)[]} getOptions
// @property {(input: any, context: GameContext) => GameState|null} processOption

// @typedef {Object} GameContext
// @property {(key: string) => any} get
// @property {(key: string, value: any) => void} set
// @property {(id: number) => void} setActivePlayer
// @property {(id: number) => void} setWinner
// @property {() => number} getLastActivePlayer
// @property {(text: string) => void} log

// Global Engine State
/** @type {HTMLElement|null} */
let container = null;
/** @type {GameState|null} */
let currentState = null;
/** @type {StateNodeImpl|null} */
let stateHead = null;

/**
 * Concrete implementation of the StateNode to handle recursive lookups.
 */
class StateNodeImpl {
  /**
   * @param {StateNodeImpl|null} parent
   * @param {GameState|null} handler
   */
  constructor(parent, handler) {
    this.parent = parent;
    this.handler = handler;
    /** @type {HTMLElement[]} */
    this.elements = [];
    /** @type {Map<string, any>} */
    this.kvs = new Map();
    this.activePlayer = -1;
    this.winner = -1;
  }

  /**
   * @param {string} key
   */
  get(key) {
    if (this.kvs.has(key)) {
      return this.kvs.get(key);
    }
    if (this.parent) {
      return this.parent.get(key);
    }
    return undefined;
  }
}

/**
 * Creates a context object for the given state node.
 * @param {StateNodeImpl} node
 * @param {(text: string) => void} log
 * @returns {GameContext}
 */
function makeContext(node, log) {
  return {
    get: (key) => node.get(key),
    set: (key, value) => node.kvs.set(key, value),
    setActivePlayer: (id) => { node.activePlayer = id; },
    setWinner: (id) => { node.winner = id; },
    getLastActivePlayer: () => node.parent ? node.parent.activePlayer : -1,
    log: log
  };
}

/**
 * Gets the currently active player.
 * @returns {number}
 */
export function getActivePlayer() {
  return stateHead ? stateHead.activePlayer : -1;
}

/**
 * Appends text to the terminal and tracks the element in the current state node.
 * @param {string} text
 */
function print(text) {
  if (!container || !stateHead) return;

  const el = document.createElement('div');
  el.textContent = text;

  container.appendChild(el);
  stateHead.elements.push(el);
  window.scrollTo(0, document.body.scrollHeight);
}

/**
 * Initializes the game engine.
 * @param {HTMLElement} rootElement
 * @param {GameState} initialState
 * @param {(log: (text: string) => void) => void} initialSetup
 */
export function initGame(
  rootElement,
  initialState,
  initialSetup
) {
  container = rootElement;
  currentState = initialState;

  // Initialize the Linked List with a root node. 
  stateHead = new StateNodeImpl(null, initialState);

  container.innerHTML = '';
  initialSetup(print);
}

/**
 * Executes a state transition logic.
 * @param {string|null} input
 */
function transition(input) {
  console.log('A');
  if (!currentState || !stateHead) return;
  console.log('B');

  // 1. Create new history node
  const newNode = new StateNodeImpl(stateHead, currentState);
  stateHead = newNode;

  // 2. Run Logic
  const nextState = currentState.processOption(input, makeContext(stateHead, print));
  currentState = nextState;

  // 3. Check for Auto-Transition in the NEW state
  if (currentState) {
    console.log('C');
    const options = currentState.getOptions(makeContext(stateHead, print));
    if (options.length === 0) {
      transition(null);
    } else if (options.length === 1) {
      transition(options[0]);
    }
  }
}

/**
 * Recursively performs undo operations.
 */
function recursiveUndo() {
  if (!stateHead || !stateHead.parent) return;

  // 1. Remove DOM elements from the current head
  stateHead.elements.forEach(el => el.remove());

  // 2. Restore logic state from the node we are removing
  if (stateHead.handler) {
    currentState = stateHead.handler;
  }

  // 3. Move pointer back
  stateHead = stateHead.parent;

  // 4. Check if the *restored* state is automatic. 
  if (currentState) {
    const options = currentState.getOptions(makeContext(stateHead, print));
    // If it's an auto-state, user didn't stop there, so undo further.
    if (options.length <= 1) {
      recursiveUndo();
    }
  }
}

export function handleGlobalKeydown(key) {
  console.log('Keypress:', key);
  if (!container || !stateHead) return;

  // --- UNDO ---
  if (key === 'Backspace') {
    if (stateHead.parent) {
      recursiveUndo();
    }
    return;
  }

  // If game is over, ignore inputs
  if (!currentState) return;

  // --- INPUT ---
  const options = currentState.getOptions(makeContext(stateHead, print));
  console.log('Options:', options);

  if (options.length > 1) {
    if (options.includes(key)) {
      transition(key);
    }
  }
}

/**
 * Runs Monte Carlo simulations from the current state.
 * @param {number} simulations Number of iterations to run
 * @returns {Object<string, number>|null} Map of winner_id -> count
 */
export function runMonteCarlo(simulations) {
  if (!currentState || !stateHead) return null;

  const savedHead = stateHead;
  const savedState = currentState;
  /** @type {Object<string, number>} */
  const results = {};

  for (let i = 0; i < simulations; i++) {
    // Reset to start of simulation (the current game state)
    stateHead = savedHead;
    currentState = savedState;

    while (currentState) {
      const options = currentState.getOptions(makeContext(stateHead, () => { }));
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
      const newNode = new StateNodeImpl(stateHead, currentState);
      stateHead = newNode;

      // 2. Run Logic with NO-OP logger to prevent UI updates
      const nextState = currentState.processOption(input, makeContext(stateHead, () => { }));
      currentState = nextState;
    }

    // Game Over for this simulation run
    if (stateHead.winner !== -1) {
      const w = stateHead.winner;
      results[w] = (results[w] || 0) + 1;
    }
  }

  // Restore the actual game state
  stateHead = savedHead;
  currentState = savedState;

  return results;
}

/**
 * Runs Monte Carlo simulations for each valid option of the current state.
 * Returns the win count for the *current active player* for each option.
 * 
 * @param {number} simulationsPerOption
 * @returns {Object<string, number>|null} Map of option -> win_count for current player
 */
export function runOptionMonteCarlo(simulationsPerOption) {
  if (!currentState || !stateHead) return null;

  const rootHead = stateHead;
  const rootState = currentState;
  const activePlayer = rootHead.activePlayer;

  // If no valid player is active (e.g. setup phase), we can't estimate "this" player's wins.
  if (activePlayer === -1) return null;

  const options = currentState.getOptions(makeContext(stateHead, () => { }));
  /** @type {Object<string, number>} */
  const results = {};

  for (const opt of options) {
    // 1. Reset to the root state
    stateHead = rootHead;
    currentState = rootState;

    // 2. Perform the single transition for this option (manually)
    const newNode = new StateNodeImpl(stateHead, currentState);
    stateHead = newNode;
    const nextState = currentState.processOption(opt, makeContext(stateHead, () => { }));
    currentState = nextState;

    // 3. Run Monte Carlo from this new hypothetical state
    // runMonteCarlo saves and restores the state internally, so it won't mess up our loop iteration state (which is the hypothetical state)
    const simResults = runMonteCarlo(simulationsPerOption);

    // 4. Record wins for the original active player
    results[opt] = simResults[activePlayer] || 0;
  }

  // Final Restore
  stateHead = rootHead;
  currentState = rootState;

  return results;
}