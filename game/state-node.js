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
        /** @type {Map<string, string|number|boolean>} */
        this.kvs = new Map();
        this.activePlayer = parent ? parent.activePlayer : -1;
        this.winner = -1;
    }

    /**
     * @param {string} key
     * @return {string|number|boolean|undefined}
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
     * Returns the string value for the given key, or undefined if not found.
     * Throws an error if the value is not a string.
     * @param {string} key 
     * @returns {string|undefined}
     */
    getAsString(key) {
        const val = this.get(key);
        if (val === undefined) {
            return undefined;
        }
        if (typeof val !== 'string') {
            throw new Error(`Value for key ${key} is not a string`);
        }
        return val;
    }

    /**
     * Recursively collects all keys with the given prefix into an object. For example, 
     * if the node has keys "players.p1.score", "players.p2.score", and "round", then 
     * getAsObject("players") would return:
     * { p1 { score: ... }, p2: { score: ... } }
     * @param {string} keyPrefix 
     */
    getAsObject(keyPrefix) {
        const obj = {};
        const prefixWithDot = keyPrefix + '.';
        const relevantData = new Map();

        /** @type {StateNode|null} */
        let n = this;
        while (n) {
            for (const [k, v] of n.kvs) {
                if (k.startsWith(prefixWithDot) && !relevantData.has(k)) {
                    relevantData.set(k, v);
                }
            }
            n = n.parent;
        }

        for (const [fullKey, value] of relevantData) {
            const relativeKey = fullKey.slice(prefixWithDot.length);
            const parts = relativeKey.split('.');
            let current = obj;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part] || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part];
            }
            current[parts[parts.length - 1]] = value;
        }
        return obj;
    }

    /**
     * Recursively sets keys from the given object using the prefix.
     * Only calls set() if the value is different from the current value.
     * @param {string} keyPrefix 
     * @param {Object} obj 
     */
    setFromObject(keyPrefix, obj) {
        const traverse = (prefix, current) => {
            if (current !== null && typeof current === 'object') {
                Object.keys(current).forEach(key => {
                    const nextKey = prefix ? `${prefix}.${key}` : key;
                    traverse(nextKey, current[key]);
                });
            } else if (current !== undefined) {
                if (this.get(prefix) !== current) {
                    this.set(prefix, current);
                }
            }
        };
        traverse(keyPrefix, obj);
    }

    /**
     * Returns the value for a given key as a number, or undefined if not found or not a number.
     * @param {string} key 
     * @returns {number|undefined}
     */
    getAsNumber(key) {
        const val = this.get(key);
        if (val === undefined) {
            return undefined;
        }
        if (typeof val !== 'number') {
            throw new Error(`Value for key ${key} is not a number`);
        }
        return val;
    }

    /**
     * @param {string} key
     * @param {string|number|boolean} value
     */
    set(key, value) {
        this.kvs.set(key, value);
    }
}
