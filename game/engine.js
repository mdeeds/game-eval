//@ts-check

/**
 * @interface
 * @typedef {Object} GameState
 * @property {(node: StateNode, context: GameContext) => (string)[]} getOptions
 * @property {(input: string, node: StateNode, context: GameContext) => GameState|null} processOption
 * @property {(node: StateNode, context: GameContext) => void} [onEnter]
 */

/**
 * A node representing the current state of the game.  Current state that is not
 * captured in this node is captured in the parent.
 */
export class StateNode {
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
    this.activePlayer = parent ? parent.activePlayer : -1;
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

  /**
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    this.kvs.set(key, value);
  }
}

/**
 * Concrete implementation of the GameContext interface.
 */
export class GameContext {
  /**
   * @param {(text: string) => void} log
   */
  constructor(log) {
    this.log = log;
  }
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
    /** @type {string} */
    this.inputBuffer = '';
    /** @type {HTMLElement|null} */
    this.inputElement = null;
    /** @type {GameContext} */
    this.ctx = new GameContext((text) => this.#print(text));
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

    if (this.inputElement && this.container.contains(this.inputElement)) {
      this.container.insertBefore(el, this.inputElement);
    } else {
      this.container.appendChild(el);
    }
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
      input, this.stateHead, this.ctx);
    this.currentState = nextState;

    if (this.currentState && this.currentState.onEnter) {
      this.currentState.onEnter(this.stateHead, this.ctx);
    }
  }

  #autoTransition() {
    while (this.currentState) {
      let nextOptions = this.currentState.getOptions(this.stateHead, this.ctx);
      if (nextOptions.length === 0) {
        this.#transitionOnce(null);
      } else if (nextOptions.length === 1) {
        this.#transitionOnce(nextOptions[0]);
      } else {
        break;
      }
    }
  }

  #updateInputDisplay() {
    if (this.inputElement) {
      if (this.currentState) {
        this.inputElement.textContent = `> ${this.inputBuffer}_`;
      } else {
        this.inputElement.textContent = '';
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
    this.container = rootElement;
    this.currentState = initialState;
    this.container.innerHTML = '';

    this.inputBuffer = '';
    this.inputElement = document.createElement('span');
    this.container.appendChild(this.inputElement);
    this.#updateInputDisplay();

    // Initialize the Linked List with a root node. 
    this.stateHead = new StateNode(null, initialState);
    if (this.currentState.onEnter) {
      this.currentState.onEnter(this.stateHead, this.ctx);
    }
    this.#autoTransition();
    this.#updateInputDisplay();
  }

  /**
   * Executes a state transition logic.
   * @param {string} input
   */
  transition(input) {
    this.#transitionOnce(input);
    this.#autoTransition();
    this.#updateInputDisplay();
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
      const options = this.currentState.getOptions(this.stateHead, this.ctx);
      // If it's an auto-state, user didn't stop there, so undo further.
      if (options.length <= 1) {
        this.recursiveUndo();
      }
    }
    this.#updateInputDisplay();
  }

  handleGlobalKeydown(key) {
    console.log('Keypress:', key);
    if (!this.container || !this.stateHead) return;

    // --- UNDO ---
    if (key === 'Backspace') {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.#updateInputDisplay();
      } else if (this.stateHead.parent) {
        this.recursiveUndo();
      }
      return;
    }

    // If game is over, ignore inputs
    if (!this.currentState) return;

    // --- ENTER ---
    if (key === 'Enter') {
      const options = this.currentState.getOptions(this.stateHead, this.ctx);
      if (options.includes(this.inputBuffer)) {
        const val = this.inputBuffer;
        this.inputBuffer = '';
        this.#updateInputDisplay();
        this.transition(val);
      }
      return;
    }

    if (key.length !== 1) return;

    // --- INPUT ---
    const options = this.currentState.getOptions(this.stateHead, this.ctx);
    const nextInput = this.inputBuffer + key;
    const matches = options.filter(opt => opt.startsWith(nextInput));

    if (matches.length === 1) {
      this.inputBuffer = '';
      this.#updateInputDisplay();
      this.transition(matches[0]);
    } else if (matches.length > 1) {
      this.inputBuffer = nextInput;
      this.#updateInputDisplay();
    }
  }
}
