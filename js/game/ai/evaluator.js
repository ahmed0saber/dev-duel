import { opponentId } from "../engine/config.js";
import { getCard, findFusionRecipe } from "../cards/index.js";
import { playerOf } from "../engine/gameState.js";
import {
  fieldOfController,
  getAttackLimit,
  getEffectiveAtk,
  isMonsterAttackPrevented,
  preventsDirectAttacks,
  validFusionPairs,
} from "../engine/gameRules.js";
import { resolveCombat } from "../engine/combat.js";
import { WEIGHTS } from "./scoringWeights.js";

function sum(nums) {
  return nums.reduce((a, b) => a + b, 0);
}

function controlledMonsters(state, playerId) {
  return fieldOfController(state, playerId);
}

function attackValue(state, monster) {
  return getEffectiveAtk(state, monster);
}

/**
 * Estimate damage a player could deal in one Battle Phase with the current board.
 */
export function estimateBattleDamage(state, attackerId) {
  const defenders = controlledMonsters(state, opponentId(attackerId))
    .map((m) => ({ uid: m.uid, atk: attackValue(state, m) }))
    .sort((a, b) => a.atk - b.atk);

  const limit = getAttackLimit(state, attackerId);
  const attackers = controlledMonsters(state, attackerId)
    .filter((m) => !isMonsterAttackPrevented(state, m.uid))
    .map((m) => ({ uid: m.uid, atk: attackValue(state, m) }))
    .sort((a, b) => b.atk - a.atk)
    .slice(0, Number.isFinite(limit) ? limit : undefined);

  if (!attackers.length) return 0;
  if (!defenders.length) {
    if (preventsDirectAttacks(state, attackerId)) return 0;
    return sum(attackers.map((a) => a.atk));
  }

  const remaining = defenders.map((d) => d.atk);
  let damage = 0;
  for (const attacker of attackers) {
    if (!remaining.length) {
      if (!preventsDirectAttacks(state, attackerId)) damage += attacker.atk;
      continue;
    }
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const result = resolveCombat(attacker.atk, remaining[i]);
      let score = 0;
      if (result.defenderDestroyed) score += remaining[i] + result.damageToDefenderOwner * 1.2;
      if (result.attackerDestroyed) score -= attacker.atk + result.damageToAttackerOwner;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestScore < -attacker.atk * 0.4) continue;
    const result = resolveCombat(attacker.atk, remaining[bestIndex]);
    damage += result.damageToDefenderOwner;
    if (result.defenderDestroyed) remaining.splice(bestIndex, 1);
  }
  return damage;
}

function handQuality(state, playerId) {
  const player = playerOf(state, playerId);
  let value = 0;
  for (const card of player.hand) {
    const def = getCard(card.cardId);
    if (def.type === "monster") {
      value += def.attack * WEIGHTS.handMonster;
      continue;
    }
    if (def.timing === "RESPONSE") {
      value += state.pending ? WEIGHTS.handTrapPlayable * 1.6 : WEIGHTS.handTrapHeld * 0.6;
      continue;
    }
    if (def.tags?.includes("fusion")) {
      value += validFusionPairs(state, playerId).length
        ? WEIGHTS.handTrapPlayable * 1.4
        : WEIGHTS.handTrapHeld;
      continue;
    }
    if (def.tags?.includes("removal") || def.tags?.includes("control")) {
      const opp = controlledMonsters(state, opponentId(playerId));
      value += opp.length ? WEIGHTS.handTrapPlayable : WEIGHTS.handTrapHeld * 0.5;
      continue;
    }
    if (def.tags?.includes("restriction")) {
      const opp = controlledMonsters(state, opponentId(playerId));
      value += opp.length >= 2 ? WEIGHTS.handTrapPlayable : WEIGHTS.handTrapHeld * 0.5;
      continue;
    }
    value += WEIGHTS.handTrapHeld;
  }
  return value;
}

function fusionPotential(state, playerId) {
  const ready = validFusionPairs(state, playerId).length;
  let almost = 0;
  const fieldIds = controlledMonsters(state, playerId).map((m) => m.cardId);
  const handIds = playerOf(state, playerId)
    .hand.filter((c) => getCard(c.cardId).type === "monster")
    .map((c) => c.cardId);
  const extraIds = new Set(playerOf(state, playerId).extraPool.map((c) => c.cardId));
  const pool = [...fieldIds, ...handIds];
  for (let i = 0; i < pool.length; i += 1) {
    for (let j = i + 1; j < pool.length; j += 1) {
      const recipe = findFusionRecipe(pool[i], pool[j]);
      if (recipe && extraIds.has(recipe.result)) almost += 1;
    }
  }
  return ready * WEIGHTS.fusionReady + Math.max(0, almost - ready) * WEIGHTS.fusionAlmost;
}

/**
 * Score a state from one player's point of view.
 * Opponent hand contents are never read.
 */
export function evaluateGameState(state, perspectiveId, weights = WEIGHTS) {
  const me = playerOf(state, perspectiveId);
  const opp = playerOf(state, opponentId(perspectiveId));
  const myField = controlledMonsters(state, perspectiveId);
  const oppField = controlledMonsters(state, opponentId(perspectiveId));
  const myAtk = sum(myField.map((m) => attackValue(state, m)));
  const oppAtk = sum(oppField.map((m) => attackValue(state, m)));

  const outgoing = estimateBattleDamage(state, perspectiveId);
  const incoming = estimateBattleDamage(state, opponentId(perspectiveId));

  const hpAdvantage = (me.hp - opp.hp) * weights.hp;
  const boardAdvantage =
    (myAtk - oppAtk) * weights.boardAtk + (myField.length - oppField.length) * weights.boardCount;
  const damagePotential = outgoing * weights.damagePotential;
  const threatResponse = -incoming * weights.incomingThreat;
  const lethal = outgoing >= opp.hp && opp.hp > 0 ? weights.lethal : 0;
  const survive = incoming >= me.hp && me.hp > 0 ? -weights.survivePenalty : 0;
  const hand = handQuality(state, perspectiveId);
  const fusion = fusionPotential(state, perspectiveId);
  const extra = me.extraPool.length * weights.extraFrame;
  const grave = sum(
    me.graveyard
      .filter((c) => getCard(c.cardId).type === "monster")
      .map((c) => getCard(c.cardId).attack),
  ) * weights.graveyardAtk;
  const empty = myField.length === 0 && oppField.length > 0 ? -weights.emptyFieldPenalty : 0;

  const parts = {
    hpAdvantage,
    boardAdvantage,
    damagePotential,
    threatResponse,
    lethal,
    survive,
    handQuality: hand,
    fusionPotential: fusion,
    extraValue: extra,
    graveyardValue: grave,
    emptyField: empty,
  };

  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total, parts, outgoing, incoming, myAtk, oppAtk };
}

export function impactOfTransition(before, after, perspectiveId) {
  const a = evaluateGameState(before, perspectiveId);
  const b = evaluateGameState(after, perspectiveId);
  return {
    delta: b.total - a.total,
    before: a,
    after: b,
  };
}
