import { test, assert, assertEqual } from "./assert.js";
import { ACTION, PHASE, PLAYER } from "../js/game/engine/config.js";
import { applyAction } from "../js/game/engine/actions.js";
import { startDuel } from "../js/game/engine/turnManager.js";
import { createInitialState } from "../js/game/engine/gameState.js";
import { canNormalSummon, preventsDirectAttacks } from "../js/game/engine/gameRules.js";
import { chooseDrawIndex, handHasViablePlay } from "../js/game/ai/drawStrategy.js";
import { freshState, addToHand, addToField, addToDeck } from "./helpers.js";

export function runRulesTests() {
  console.log("\nRules, traps, fusion, draw");

  test("only one machine may be summoned per turn", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN });
    const a = addToHand(state, PLAYER.HUMAN, "rx-17");
    const b = addToHand(state, PLAYER.HUMAN, "mk-04");
    const first = applyAction(state, { type: ACTION.SUMMON, cardUid: a.uid });
    const second = applyAction(state, { type: ACTION.SUMMON, cardUid: b.uid });
    assert(first.ok, first.reason);
    assertEqual(second.ok, false);
    assertEqual(canNormalSummon(state, PLAYER.HUMAN), false);
  });

  test("traps do not consume the machine summon", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN });
    addToField(state, PLAYER.HUMAN, "titan-03");
    const trap = addToHand(state, PLAYER.HUMAN, "observer");
    const monster = addToHand(state, PLAYER.HUMAN, "rx-17");
    const trapResult = applyAction(state, {
      type: ACTION.ACTIVATE_TRAP,
      cardUid: trap.uid,
      targets: [state.players[PLAYER.HUMAN].field[0].uid],
    });
    const summon = applyAction(state, { type: ACTION.SUMMON, cardUid: monster.uid });
    assert(trapResult.ok, trapResult.reason);
    assert(summon.ok, summon.reason);
  });

  test("Git Merge summons a fusion frame from the Extra Pool", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN });
    const a = addToField(state, PLAYER.HUMAN, "rx-17");
    const b = addToField(state, PLAYER.HUMAN, "mk-04");
    const merge = addToHand(state, PLAYER.HUMAN, "git-merge");
    const result = applyAction(state, {
      type: ACTION.ACTIVATE_TRAP,
      cardUid: merge.uid,
      targets: [a.uid, b.uid],
    });
    assert(result.ok, result.reason);
    assertEqual(state.players[PLAYER.HUMAN].field.length, 1);
    assertEqual(state.players[PLAYER.HUMAN].field[0].cardId, "nx-00");
    assertEqual(state.players[PLAYER.HUMAN].graveyard.filter((c) => c.cardId !== "git-merge").length, 2);
  });

  test("Git Conflict cancels a pending merge", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN });
    const a = addToField(state, PLAYER.HUMAN, "rx-17");
    const b = addToField(state, PLAYER.HUMAN, "mk-04");
    const merge = addToHand(state, PLAYER.HUMAN, "git-merge");
    addToHand(state, PLAYER.AI, "git-conflict");
    applyAction(state, {
      type: ACTION.ACTIVATE_TRAP,
      cardUid: merge.uid,
      targets: [a.uid, b.uid],
    });
    assert(state.pending, "expected a response window");
    const conflict = state.players[PLAYER.AI].hand[0];
    const counter = applyAction(state, {
      type: ACTION.RESPOND,
      playerId: PLAYER.AI,
      cardUid: conflict.uid,
    });
    assert(counter.ok, counter.reason);
    assertEqual(state.pending, null);
    assertEqual(state.players[PLAYER.HUMAN].field.length, 2);
    assert(!state.players[PLAYER.HUMAN].field.some((m) => m.cardId === "nx-00"));
  });

  test("Git Cherry-pick steals a machine until end of turn", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN, turnNumber: 3 });
    const victim = addToField(state, PLAYER.AI, "titan-03");
    const trap = addToHand(state, PLAYER.HUMAN, "git-cherry-pick");
    const stolen = applyAction(state, {
      type: ACTION.ACTIVATE_TRAP,
      cardUid: trap.uid,
      targets: [victim.uid],
    });
    assert(stolen.ok, stolen.reason);
    assertEqual(victim.controller, PLAYER.HUMAN);
    assertEqual(state.players[PLAYER.HUMAN].field.length, 1);
    applyAction(state, { type: ACTION.ADVANCE_PHASE, playerId: PLAYER.HUMAN });
    applyAction(state, { type: ACTION.ADVANCE_PHASE, playerId: PLAYER.HUMAN });
    assertEqual(victim.controller, PLAYER.AI);
    assertEqual(state.players[PLAYER.AI].field.some((m) => m.uid === victim.uid), true);
  });

  test("Rollback restores HP up to the starting cap", () => {
    const state = freshState({ phase: PHASE.MAIN });
    state.players[PLAYER.HUMAN].hp = 5000;
    const trap = addToHand(state, PLAYER.HUMAN, "rollback");
    applyAction(state, { type: ACTION.ACTIVATE_TRAP, cardUid: trap.uid, targets: [] });
    assertEqual(state.players[PLAYER.HUMAN].hp, 6500);
  });

  test("Firewall expires after the opponent's turn ends", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN, turnNumber: 1 });
    const trap = addToHand(state, PLAYER.HUMAN, "firewall");
    applyAction(state, { type: ACTION.ACTIVATE_TRAP, cardUid: trap.uid, targets: [] });
    assert(preventsDirectAttacks(state, PLAYER.AI), "Firewall should block the opponent immediately");
    applyAction(state, { type: ACTION.ADVANCE_PHASE });
    applyAction(state, { type: ACTION.ADVANCE_PHASE });
    assertEqual(state.activePlayer, PLAYER.AI);
    assert(preventsDirectAttacks(state, PLAYER.AI), "Firewall should last through the opponent's turn");
    applyAction(state, { type: ACTION.ADVANCE_PHASE, playerId: PLAYER.AI });
    applyAction(state, { type: ACTION.ADVANCE_PHASE, playerId: PLAYER.AI });
    assertEqual(state.activePlayer, PLAYER.HUMAN);
    assertEqual(preventsDirectAttacks(state, PLAYER.AI), false);
    assertEqual(preventsDirectAttacks(state, PLAYER.HUMAN), false);
  });

  test("Rate Limiter restricts the opponent to one attack next turn", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN, turnNumber: 2 });
    addToField(state, PLAYER.AI, "titan-03");
    addToField(state, PLAYER.AI, "unit-08");
    const trap = addToHand(state, PLAYER.HUMAN, "rate-limiter");
    applyAction(state, { type: ACTION.ACTIVATE_TRAP, cardUid: trap.uid, targets: [] });
    applyAction(state, { type: ACTION.ADVANCE_PHASE });
    applyAction(state, { type: ACTION.ADVANCE_PHASE });
    assertEqual(state.activePlayer, PLAYER.AI);
    state.phase = PHASE.BATTLE;
    const a = state.players[PLAYER.AI].field[0];
    const b = state.players[PLAYER.AI].field[1];
    const first = applyAction(state, {
      type: ACTION.ATTACK,
      playerId: PLAYER.AI,
      attackerUid: a.uid,
      targetUid: "DIRECT",
    });
    const second = applyAction(state, {
      type: ACTION.ATTACK,
      playerId: PLAYER.AI,
      attackerUid: b.uid,
      targetUid: "DIRECT",
    });
    assert(first.ok, first.reason);
    assertEqual(second.ok, false);
  });

  test("opening hands are 5 cards and the first turn draws one more", () => {
    const state = createInitialState({
      seed: 7,
      humanDeckIds: Array.from({ length: 20 }, (_, i) => (i % 2 ? "rx-17" : "observer")),
      aiDeckIds: Array.from({ length: 20 }, (_, i) => (i % 2 ? "mk-04" : "hotfix")),
    });
    startDuel(state);
    assertEqual(state.players[PLAYER.HUMAN].hand.length, 6);
    assertEqual(state.players[PLAYER.AI].hand.length, 5);
    assertEqual(state.phase, PHASE.MAIN);
    assertEqual(state.activePlayer, PLAYER.HUMAN);
  });

  test("dead-hand draw prefers a useful machine over another blank trap", () => {
    const state = freshState({ phase: PHASE.MAIN, activePlayer: PLAYER.HUMAN, clearDeck: true });
    addToHand(state, PLAYER.HUMAN, "git-conflict");
    addToHand(state, PLAYER.HUMAN, "git-conflict");
    addToHand(state, PLAYER.HUMAN, "git-conflict");
    addToDeck(state, PLAYER.HUMAN, "git-conflict");
    addToDeck(state, PLAYER.HUMAN, "git-conflict");
    const titan = addToDeck(state, PLAYER.HUMAN, "titan-03");
    assertEqual(handHasViablePlay(state, PLAYER.HUMAN), false);
    const index = chooseDrawIndex(state, PLAYER.HUMAN);
    assertEqual(state.players[PLAYER.HUMAN].deck[index].uid, titan.uid);
  });
}
