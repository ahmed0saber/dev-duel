import { test, assertEqual, assert } from "./assert.js";
import { resolveCombat } from "../js/game/engine/combat.js";
import { ACTION, PHASE, PLAYER } from "../js/game/engine/config.js";
import { applyAction } from "../js/game/engine/actions.js";
import { getEffectiveAtk } from "../js/game/engine/gameRules.js";
import { freshState, addToField } from "./helpers.js";

export function runCombatTests() {
  console.log("\nCombat");

  test("5000 vs 4000 destroys defender and deals 1000", () => {
    const result = resolveCombat(5000, 4000);
    assertEqual(result.defenderDestroyed, true);
    assertEqual(result.attackerDestroyed, false);
    assertEqual(result.damageToDefenderOwner, 1000);
    assertEqual(result.damageToAttackerOwner, 0);
  });

  test("4000 vs 5000 destroys attacker and deals 1000 recoil", () => {
    const result = resolveCombat(4000, 5000);
    assertEqual(result.attackerDestroyed, true);
    assertEqual(result.defenderDestroyed, false);
    assertEqual(result.damageToAttackerOwner, 1000);
    assertEqual(result.damageToDefenderOwner, 0);
  });

  test("5000 vs 5000 destroys both with no HP damage", () => {
    const result = resolveCombat(5000, 5000);
    assertEqual(result.attackerDestroyed, true);
    assertEqual(result.defenderDestroyed, true);
    assertEqual(result.damageToAttackerOwner, 0);
    assertEqual(result.damageToDefenderOwner, 0);
  });

  test("direct attack deals full ATK", () => {
    const result = resolveCombat(4000, null);
    assertEqual(result.damageToDefenderOwner, 4000);
    assertEqual(result.attackerDestroyed, false);
  });

  test("engine: monster vs monster applies generic combat", () => {
    const state = freshState({ phase: PHASE.BATTLE, activePlayer: PLAYER.HUMAN });
    const attacker = addToField(state, PLAYER.HUMAN, "titan-03");
    const defender = addToField(state, PLAYER.AI, "unit-08");
    const result = applyAction(state, {
      type: ACTION.ATTACK,
      playerId: PLAYER.HUMAN,
      attackerUid: attacker.uid,
      targetUid: defender.uid,
    });
    assert(result.ok, result.reason);
    assertEqual(state.players[PLAYER.AI].field.length, 0);
    assertEqual(state.players[PLAYER.AI].hp, 8000 - (2800 - 2100));
  });

  test("engine: direct attack when the field is empty", () => {
    const state = freshState({ phase: PHASE.BATTLE, activePlayer: PLAYER.HUMAN });
    state.players[PLAYER.AI].hp = 6000;
    const attacker = addToField(state, PLAYER.HUMAN, "vx-09");
    const result = applyAction(state, {
      type: ACTION.ATTACK,
      playerId: PLAYER.HUMAN,
      attackerUid: attacker.uid,
      targetUid: "DIRECT",
    });
    assert(result.ok, result.reason);
    assertEqual(state.players[PLAYER.AI].hp, 6000 - 2300);
  });

  test("cannot direct attack while a protector remains", () => {
    const state = freshState({ phase: PHASE.BATTLE, activePlayer: PLAYER.HUMAN });
    const attacker = addToField(state, PLAYER.HUMAN, "rx-17");
    addToField(state, PLAYER.AI, "drone-21");
    const result = applyAction(state, {
      type: ACTION.ATTACK,
      playerId: PLAYER.HUMAN,
      attackerUid: attacker.uid,
      targetUid: "DIRECT",
    });
    assertEqual(result.ok, false);
  });

  test("a machine may attack only once per turn", () => {
    const state = freshState({ phase: PHASE.BATTLE, activePlayer: PLAYER.HUMAN });
    const attacker = addToField(state, PLAYER.HUMAN, "a-47");
    const first = addToField(state, PLAYER.AI, "drone-21");
    applyAction(state, {
      type: ACTION.ATTACK,
      attackerUid: attacker.uid,
      targetUid: first.uid,
    });
    addToField(state, PLAYER.AI, "xr-5");
    const second = applyAction(state, {
      type: ACTION.ATTACK,
      attackerUid: attacker.uid,
      targetUid: state.players[PLAYER.AI].field[0].uid,
    });
    assertEqual(second.ok, false);
    assertEqual(attacker.attacksThisTurn, 1);
  });

  test("effective ATK includes Observer bonus", () => {
    const state = freshState({ phase: PHASE.MAIN });
    const monster = addToField(state, PLAYER.HUMAN, "rx-17");
    state.effects.push({
      type: "MODIFY_ATK",
      monsterUid: monster.uid,
      value: 1000,
    });
    assertEqual(getEffectiveAtk(state, monster), 2600);
  });
}
