import { ACTION } from "../engine/config.js";
import { nextRandom } from "../engine/gameState.js";
import { generateLegalActions, describeAction } from "./actionGenerator.js";
import { simulateAction } from "./simulator.js";
import { evaluateGameState } from "./evaluator.js";
import { AI_CONFIG } from "./scoringWeights.js";

function round(value) {
  return Math.round(value * 10) / 10;
}

export function chooseAction(state, playerId, options = {}) {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const epsilon = options.epsilon ?? AI_CONFIG.equalScoreEpsilon;
  const actions = generateLegalActions(state, playerId);
  const baseline = evaluateGameState(state, playerId);

  const candidates = actions.map((action) => {
    const simulated = simulateAction(state, action);
    if (!simulated.result.ok) {
      return {
        action,
        label: describeAction(action, state),
        score: Number.NEGATIVE_INFINITY,
        error: simulated.result.reason,
      };
    }
    const evaluation = evaluateGameState(simulated.state, playerId);
    return {
      action,
      label: describeAction(action, state),
      score: round(evaluation.total),
      delta: round(evaluation.total - baseline.total),
      evaluation,
      winner: simulated.state.winner,
    };
  });

  const finite = candidates.filter((entry) => Number.isFinite(entry.score));
  const winning = finite.filter((entry) => entry.winner === playerId);
  const valid = (winning.length ? winning : finite).sort((a, b) => b.score - a.score);

  const bestScore = valid[0]?.score ?? Number.NEGATIVE_INFINITY;
  const ties = valid.filter((entry) => Math.abs(entry.score - bestScore) <= epsilon);
  let chosen = ties[0] ?? null;
  if (ties.length > 1) {
    const index = Math.floor(nextRandom(state) * ties.length);
    chosen = ties[index];
  }

  const elapsedMs =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;

  return {
    action: chosen?.action ?? { type: ACTION.ADVANCE_PHASE, playerId },
    chosen,
    candidates: valid,
    baseline,
    elapsedMs,
  };
}

export async function runAiBurst(engine, playerId = "ai", delayMs = 380) {
  const steps = [];
  for (let i = 0; i < 16; i += 1) {
    const state = engine.getState();
    if (state.winner) break;
    const actor = state.pending ? state.pending.responderId : state.activePlayer;
    if (actor !== playerId) break;

    const decision = chooseAction(state, playerId);
    engine.setLastDecision(decision);
    steps.push(decision);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const result = engine.dispatch(decision.action);
    if (!result.ok) break;
  }
  return steps;
}
