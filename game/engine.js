//@ts-check

/**
 * @interface
 * @typedef {Object} GameState
 * @property {(context: GameContext) => (string)[]} getOptions
 * @property {(input: string, context: GameContext) => GameState|null} processOption
 */

/**
 * A node representing the current state of the game.  Current state that is not
 * captured in this node is captured in the parent.
 */
class StateNode {
  /**
   * @param {StateNode|null} parent
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
    /** @type {StateNode|null} */ let n = this;
    while (n) {
      if (n.kvs.has(key)) {
        return n.kvs.get(key);
      }
      n = n.parent;
    }
    return undefined;
  }
}

/**
 * Concrete implementation of the GameContext interface.
 */
export class GameContext {
  /**
   * @param {StateNode} node
   * @param {(text: string) => void} log
   */
  constructor(node, log) {
    this.node = node;
    this.log = log;
  }

  get(key) { return this.node.get(key); }
  set(key, value) { this.node.kvs.set(key, value); }
  setActivePlayer(id) { this.node.activePlayer = id; }
  setWinner(id) { this.node.winner = id; }
  getLastActivePlayer() { return this.node.parent ? this.node.parent.activePlayer : -1; }
}

export class Engine {
  constructor() {
    // Global Engine State
    /** @type {HTMLElement|null} */
    this.container = null;
    /** @type {GameState|null} */
    this.currentState = null;
    /** @type {StateNode|null} */
    this.stateHead = null;
  }

  /**
   * Gets the currently active player.
   * @returns {number}
   */
  getActivePlayer() {
    return this.stateHead ? this.stateHead.activePlayer : -1;
  }

  /**
   * Appends text to the terminal and tracks the element in the current state node.
   * @param {string} text
   */
  #print(text) {
    if (!this.container || !this.stateHead) return;

    const el = document.createElement('div');
    el.textContent = text;

    this.container.appendChild(el);
    this.stateHead.elements.push(el);
    window.scrollTo(0, document.body.scrollHeight);
  }

  /**
   * Executes a state transition logic.
   * @param {string|null} input
   */
  #transitionOnce(input) {
    console.log('Transition:', input);
    if (!this.currentState || !this.stateHead) return;

    // 1. Create new history node
    const newNode = new StateNode(this.stateHead, this.currentState);
    this.stateHead = newNode;

    // 2. Run Logic
    const nextState = this.currentState.processOption(
      input, new GameContext(this.stateHead, (text) => this.#print(text)));
    this.currentState = nextState;
  }

  #autoTransition() {
    while (this.currentState) {
      const context = new GameContext(this.stateHead, (text) => this.#print(text));
      let nextOptions = this.currentState.getOptions(context);
      if (nextOptions.length === 0) {
        this.#transitionOnce(null);
      } else if (nextOptions.length === 1) {
        this.#transitionOnce(nextOptions[0]);
      } else {
        break;
      }
    }
  }

  /**
   * Initializes the game engine.
   * @param {HTMLElement} rootElement
   * @param {GameState} initialState
   */
  initGame(
    rootElement,
    initialState
  ) {
    console.log('A');
    this.container = rootElement;
    this.currentState = initialState;
    this.container.innerHTML = '';

    // Initialize the Linked List with a root node. 
    this.stateHead = new StateNode(null, initialState);
    this.#autoTransition();
  }

  /**
   * Executes a state transition logic.
   * @param {string} input
   */
  transition(input) {
    this.#transitionOnce(input);
    this.#autoTransition();
  }

  /**
   * Recursively performs undo operations.
   */
  recursiveUndo() {
    if (!this.stateHead || !this.stateHead.parent) return;

    // 1. Remove DOM elements from the current head
    this.stateHead.elements.forEach(el => el.remove());

    // 2. Restore logic state from the node we are removing
    if (this.stateHead.handler) {
      this.currentState = this.stateHead.handler;
    }

    // 3. Move pointer back
    this.stateHead = this.stateHead.parent;

    // 4. Check if the *restored* state is automatic. 
    if (this.currentState) {
      const options = this.currentState.getOptions(new GameContext(this.stateHead, (text) => this.#print(text)));
      // If it's an auto-state, user didn't stop there, so undo further.
      if (options.length <= 1) {
        this.recursiveUndo();
      }
    }
  }

  handleGlobalKeydown(key) {
    console.log('Keypress:', key);
    if (!this.container || !this.stateHead) return;

    // --- UNDO ---
    if (key === 'Backspace') {
      if (this.stateHead.parent) {
        this.recursiveUndo();
      }
      return;
    }

    // If game is over, ignore inputs
    if (!this.currentState) return;

    // --- INPUT ---
    const options = this.currentState.getOptions(new GameContext(this.stateHead, (text) => this.#print(text)));
    console.log('Options:', options);

    if (options.length > 1) {
      if (options.includes(key)) {
        this.transition(key);
      }
    }
  }
}

/**
 * Runs Monte Carlo simulations from the current state.
 * @param {Engine} engine
 * @param {number} simulations Number of iterations to run
 * @returns {Object<string, number>|null} Map of winner_id -> count
 */
export function runMonteCarlo(engine, simulations) {
  if (!engine.currentState || !engine.stateHead) return null;

  const savedHead = engine.stateHead;
  const savedState = engine.currentState;
  /** @type {Object<string, number>} */
  const results = {};

  for (let i = 0; i < simulations; i++) {
    // Reset to start of simulation (the current game state)
    engine.stateHead = savedHead;
    engine.currentState = savedState;

    while (engine.currentState) {
      const options = engine.currentState.getOptions(new GameContext(engine.stateHead, () => { }));
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
      const nextState = engine.currentState.processOption(input, new GameContext(engine.stateHead, () => { }));
      engine.currentState = nextState;
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

  const options = engine.currentState.getOptions(new GameContext(engine.stateHead, () => { }));
  /** @type {Object<string, number>} */
  const results = {};

  for (const opt of options) {
    // 1. Reset to the root state
    engine.stateHead = rootHead;
    engine.currentState = rootState;

    // 2. Perform the single transition for this option (manually)
    const newNode = new StateNode(engine.stateHead, engine.currentState);
    engine.stateHead = newNode;
    const nextState = engine.currentState.processOption(opt, new GameContext(engine.stateHead, () => { }));
    engine.currentState = nextState;

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