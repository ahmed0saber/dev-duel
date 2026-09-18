import { ACTION, CONFIG, opponentId } from "../engine/config.js";
import { getCard, findFusionRecipe } from "../cards/index.js";
import { nextRandom, playerOf } from "../engine/gameState.js";
import {
  fieldOfController,
  getEffectiveAtk,
  validFusionPairs,
} from "../engine/gameRules.js";
import { generateLegalActions } from "./actionGenerator.js";

/**
 * Contextual usefulness of a card given the current board.
 * Used by the draw helper — not a permanent card ranking.
 */
export function scoreCardUsefulness(state, playerId, card) {
  const def = getCard(card.cardId);
  const myField = fieldOfController(state, playerId);
  const oppField = fieldOfController(state, opponentId(playerId));
  const cfg = state.config?.draw ?? CONFIG.draw;

  if (def.type === "monster") {
    if (myField.length >= (state.config?.maxField ?? CONFIG.maxField)) return 8;
    let score = def.attack * cfg.futureMonsterWeight;
    if (myField.length === 0) score += 10;
    for (const monster of myField) {
      if (findFusionRecipe(monster.cardId, def.id)) score += 20;
    }
    return score;
  }

  switch (def.id) {
    case "git-conflict":
      return state.pending?.effectType === "FUSION" ? 90 : cfg.unplayableTrapValue;
    case "git-merge": {
      if (validFusionPairs(state, playerId).length) return 72;
      const ids = [
        ...myField.map((m) => m.cardId),
        ...playerOf(state, playerId)
          .hand.filter((c) => getCard(c.cardId).type === "monster")
          .map((c) => c.cardId),
      ];
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          if (findFusionRecipe(ids[i], ids[j])) return 18;
        }
      }
      return cfg.unplayableTrapValue;
    }
    case "rate-limiter":
      return oppField.length >= 2 ? 28 + (oppField.length - 1) * 10 : 7;
    case "firewall":
      return myField.length === 0 && oppField.length > 0 ? 42 : 9;
    case "deadlock": {
      if (!oppField.length) return 5;
      const peak = Math.max(...oppField.map((m) => getEffectiveAtk(state, m)));
      return 16 + peak * 0.01;
    }
    case "circuit-breaker": {
      if (!oppField.length) return 5;
      const peak = Math.max(...oppField.map((m) => getEffectiveAtk(state, m)));
      return 22 + peak * 0.02;
    }
    case "git-cherry-pick":
      return oppField.length ? 24 + Math.max(...oppField.map((m) => getEffectiveAtk(state, m))) * 0.02 : 6;
    case "observer":
      return myField.length ? 20 + Math.max(...myField.map((m) => getEffectiveAtk(state, m))) * 0.01 : 6;
    case "bug-injection":
      return oppField.length ? 18 : 6;
    case "rollback":
    case "hotfix":
      return (CONFIG.startingHp - playerOf(state, playerId).hp) * 0.02 + 8;
    case "factory":
      return playerOf(state, playerId).deck.length ? 16 : 0;
    default:
      return cfg.futureTrapValue;
  }
}

export function handHasViablePlay(state, playerId) {
  const cfg = state.config?.draw ?? CONFIG.draw;
  const actions = generateLegalActions(state, playerId).filter(
    (action) => action.type !== ACTION.ADVANCE_PHASE && action.type !== ACTION.PASS_RESPONSE,
  );
  const playNow = actions.some(
    (action) =>
      action.type === ACTION.SUMMON ||
      action.type === ACTION.ACTIVATE_TRAP ||
      action.type === ACTION.ATTACK ||
      action.type === ACTION.RESPOND,
  );
  const best = Math.max(
    0,
    ...playerOf(state, playerId).hand.map((card) => scoreCardUsefulness(state, playerId, card)),
  );
  return playNow && best >= cfg.viableHandThreshold;
}

/**
 * Pick a deck index. Random when the hand is already playable.
 * If the hand is dead, randomly pick among reasonably useful cards — never auto-best.
 */
export function chooseDrawIndex(state, playerId) {
  const player = playerOf(state, playerId);
  if (player.deck.length <= 1) return 0;
  const cfg = state.config?.draw ?? CONFIG.draw;

  if (handHasViablePlay(state, playerId)) {
    return Math.floor(nextRandom(state) * player.deck.length);
  }

  const scored = player.deck.map((card, index) => ({
    index,
    score: scoreCardUsefulness(state, playerId, card),
  }));
  const useful = scored.filter((entry) => entry.score >= cfg.minUsefulScore);
  const pool = useful.length ? useful : scored;
  const pick = pool[Math.floor(nextRandom(state) * pool.length)];
  return pick.index;
}
