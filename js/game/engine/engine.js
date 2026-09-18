import { ACTION } from "./config.js";
import { createInitialState } from "./gameState.js";
import { startDuel } from "./turnManager.js";
import { applyAction } from "./actions.js";
import { cloneState } from "./clone.js";

export function createEngine(options = {}) {
  let state = createInitialState(options);
  const listeners = [];
  let lastDecision = null;

  function emit(events, action) {
    for (const listener of listeners) listener(state, events, action);
  }

  return {
    getState() {
      return state;
    },
    start() {
      startDuel(state);
      emit([{ type: "START" }], { type: "START" });
      return state;
    },
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
    dispatch(action) {
      const result = applyAction(state, action);
      if (result.ok) emit(result.events, action);
      return result;
    },
    replaceState(next) {
      state = next;
      emit([{ type: "REPLACE" }], { type: "REPLACE" });
    },
    setLastDecision(decision) {
      lastDecision = decision;
    },
    getLastDecision() {
      return lastDecision;
    },
    clone() {
      return cloneState(state);
    },
  };
}

export { applyAction, cloneState, ACTION };
