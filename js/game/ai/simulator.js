import { cloneState } from "../engine/clone.js";
import { applyAction } from "../engine/actions.js";

export function simulateAction(state, action) {
  const next = cloneState(state);
  next.simulation = true;
  if (next.pending && action.type !== "RESPOND" && action.type !== "PASS_RESPONSE") {
    next.pending = null;
  }
  const result = applyAction(next, action);
  return { state: next, result };
}

export function simulateActions(state, actions) {
  let current = cloneState(state);
  current.simulation = true;
  for (const action of actions) {
    const result = applyAction(current, action);
    if (!result.ok) return { state: current, result, failed: true };
  }
  return { state: current, result: { ok: true }, failed: false };
}
