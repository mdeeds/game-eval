//@ts-check

/** @typedef {import('./engine.js').GameState} GameState */

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
