import { test, assert, assertEqual } from "./assert.js";
import { ACTION, PHASE, PLAYER } from "../js/game/engine/config.js";
import { chooseAction } from "../js/game/ai/aiController.js";
import { evaluateGameState } from "../js/game/ai/evaluator.js";
import { simulateAction } from "../js/game/ai/simulator.js";
import { freshState, addToHand, addToField } from "./helpers.js";

export function runAiTests() {
  console.log("\nAI evaluation");

  test("simulation does not mutate the original state", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.AI });
    const monster = addToHand(state, PLAYER.AI, "titan-03");
    const beforeHp = state.players[PLAYER.HUMAN].hp;
    const beforeHand = state.players[PLAYER.AI].hand.length;
    const simulated = simulateAction(state, {
      type: ACTION.SUMMON,
      playerId: PLAYER.AI,
      cardUid: monster.uid,
      cardId: "titan-03",
    });
    assert(simulated.result.ok, simulated.result.reason);
    assertEqual(simulated.state.players[PLAYER.AI].field.length, 1);
    assertEqual(state.players[PLAYER.AI].field.length, 0);
    assertEqual(state.players[PLAYER.AI].hand.length, beforeHand);
    assertEqual(state.players[PLAYER.HUMAN].hp, beforeHp);
  });

  test("AI summons a machine instead of passing on an empty board", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.AI });
    addToHand(state, PLAYER.AI, "titan-03");
    const decision = chooseAction(state, PLAYER.AI);
    assertEqual(decision.action.type, ACTION.SUMMON);
    assertEqual(decision.action.cardId, "titan-03");
  });

  test("AI prefers Rate Limiter when four machines threaten an empty field", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.AI });
    addToHand(state, PLAYER.AI, "rate-limiter");
    addToField(state, PLAYER.HUMAN, "titan-03");
    addToField(state, PLAYER.HUMAN, "sentinel-09");
    addToField(state, PLAYER.HUMAN, "vx-09");
    addToField(state, PLAYER.HUMAN, "unit-08");
    const decision = chooseAction(state, PLAYER.AI);
    assertEqual(decision.action.type, ACTION.ACTIVATE_TRAP);
    assertEqual(decision.action.cardId, "rate-limiter");
  });

  test("AI does not waste Rate Limiter against a single machine when it can summon", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.AI });
    addToHand(state, PLAYER.AI, "rate-limiter");
    addToHand(state, PLAYER.AI, "titan-03");
    addToField(state, PLAYER.HUMAN, "drone-21");
    const decision = chooseAction(state, PLAYER.AI);
    assertEqual(decision.action.type, ACTION.SUMMON);
    assertEqual(decision.action.cardId, "titan-03");
  });

  test("AI counters a merge that would run over its wall", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN });
    addToField(state, PLAYER.AI, "a-47");
    const a = addToField(state, PLAYER.HUMAN, "rx-17");
    const b = addToField(state, PLAYER.HUMAN, "mk-04");
    state.pending = {
      kind: "TRAP_RESPONSE",
      effectType: "FUSION",
      actorId: PLAYER.HUMAN,
      responderId: PLAYER.AI,
      trapCardId: "git-merge",
      materials: [a.uid, b.uid],
    };
    addToHand(state, PLAYER.AI, "git-conflict");
    const decision = chooseAction(state, PLAYER.AI);
    assertEqual(decision.action.type, ACTION.RESPOND);
    assertEqual(decision.action.cardId, "git-conflict");
  });

  test("AI allows a merge that reduces the opponent's attack count", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN });
    const a = addToField(state, PLAYER.HUMAN, "titan-03");
    const b = addToField(state, PLAYER.HUMAN, "sentinel-09");
    state.pending = {
      kind: "TRAP_RESPONSE",
      effectType: "FUSION",
      actorId: PLAYER.HUMAN,
      responderId: PLAYER.AI,
      trapCardId: "git-merge",
      materials: [a.uid, b.uid],
    };
    addToHand(state, PLAYER.AI, "git-conflict");
    const pass = simulateAction(state, { type: ACTION.PASS_RESPONSE, playerId: PLAYER.AI });
    const counter = simulateAction(state, {
      type: ACTION.RESPOND,
      playerId: PLAYER.AI,
      cardUid: state.players[PLAYER.AI].hand[0].uid,
      cardId: "git-conflict",
    });
    const passScore = evaluateGameState(pass.state, PLAYER.AI).total;
    const counterScore = evaluateGameState(counter.state, PLAYER.AI).total;
    const decision = chooseAction(state, PLAYER.AI);
    assert(
      decision.action.type === ACTION.PASS_RESPONSE,
      `expected allow-merge, chose ${decision.action.type} (pass=${passScore.toFixed(1)} counter=${counterScore.toFixed(1)})`,
    );
  });

  test("AI attacks directly when the opponent field is empty", () => {
    const state = freshState({ phase: PHASE.BATTLE, activePlayer: PLAYER.AI });
    addToField(state, PLAYER.AI, "vx-09");
    const decision = chooseAction(state, PLAYER.AI);
    assertEqual(decision.action.type, ACTION.ATTACK);
    assertEqual(decision.action.targetUid, "DIRECT");
  });

  test("AI takes a lethal direct attack instead of ending the turn", () => {
    const state = freshState({ phase: PHASE.BATTLE, activePlayer: PLAYER.AI });
    addToField(state, PLAYER.AI, "vx-09");
    state.players[PLAYER.HUMAN].hp = 1000;
    const decision = chooseAction(state, PLAYER.AI);
    assertEqual(decision.action.type, ACTION.ATTACK);
    assertEqual(decision.action.targetUid, "DIRECT");
  });

  test("AI crashes through a weaker defender when that attack ends the duel", () => {
    const state = freshState({ phase: PHASE.BATTLE, activePlayer: PLAYER.AI });
    addToField(state, PLAYER.AI, "titan-03");
    addToField(state, PLAYER.HUMAN, "drone-21");
    addToField(state, PLAYER.HUMAN, "titan-03");
    state.players[PLAYER.HUMAN].hp = 800;
    const decision = chooseAction(state, PLAYER.AI);
    assertEqual(decision.action.type, ACTION.ATTACK);
    assertEqual(decision.action.targetCardId, "drone-21");
  });

  test("AI decision stays well under 500ms on a typical board", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.AI });
    addToHand(state, PLAYER.AI, "titan-03");
    addToHand(state, PLAYER.AI, "observer");
    addToHand(state, PLAYER.AI, "rate-limiter");
    addToHand(state, PLAYER.AI, "circuit-breaker");
    addToHand(state, PLAYER.AI, "git-merge");
    addToField(state, PLAYER.AI, "rx-17");
    addToField(state, PLAYER.AI, "mk-04");
    addToField(state, PLAYER.HUMAN, "unit-08");
    addToField(state, PLAYER.HUMAN, "a-47");
    const decision = chooseAction(state, PLAYER.AI);
    assert(decision.elapsedMs < 500, `AI took ${decision.elapsedMs}ms`);
    assert(decision.action, "AI produced no action");
  });
}
