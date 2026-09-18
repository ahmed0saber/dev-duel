import { PHASE, EFFECT, opponentId } from "./config.js";
import { getCard, findFusionRecipe } from "../cards/index.js";
import { findOnField, playerOf } from "./gameState.js";

export function getAtkModifiers(state, monsterUid) {
  return state.effects
    .filter((effect) => effect.type === EFFECT.MODIFY_ATK && effect.monsterUid === monsterUid)
    .reduce((sum, effect) => sum + effect.value, 0);
}

export function getEffectiveAtk(state, monster) {
  const def = getCard(monster.cardId);
  return Math.max(0, def.attack + getAtkModifiers(state, monster.uid));
}

export function getAttackLimit(state, playerId) {
  const limits = state.effects.filter(
    (effect) => effect.type === EFFECT.LIMIT_ATTACKS && effect.targetPlayerId === playerId,
  );
  if (!limits.length) return Infinity;
  return Math.min(...limits.map((effect) => effect.value));
}

export function preventsDirectAttacks(state, attackerPlayerId) {
  return state.effects.some(
    (effect) =>
      effect.type === EFFECT.PREVENT_DIRECT_ATTACKS && effect.targetPlayerId === attackerPlayerId,
  );
}

export function isMonsterAttackPrevented(state, monsterUid) {
  return state.effects.some(
    (effect) => effect.type === EFFECT.PREVENT_ATTACK && effect.monsterUid === monsterUid,
  );
}

export function canMonsterAttack(state, monster, playerId) {
  if (state.winner) return false;
  if (state.phase !== PHASE.BATTLE) return false;
  if (state.activePlayer !== playerId) return false;
  if (monster.controller !== playerId) return false;
  if (monster.attacksThisTurn >= state.config.maxAttacksPerMonster) return false;
  if (isMonsterAttackPrevented(state, monster.uid)) return false;
  const player = playerOf(state, playerId);
  if (player.attacksDeclaredThisTurn >= getAttackLimit(state, playerId)) return false;
  return true;
}

export function canNormalSummon(state, playerId) {
  if (state.winner || state.pending) return false;
  if (state.phase !== PHASE.MAIN) return false;
  if (state.activePlayer !== playerId) return false;
  const player = playerOf(state, playerId);
  if (player.summonsThisTurn >= state.config.maxNormalSummonsPerTurn) return false;
  if (player.field.length >= state.config.maxField) return false;
  return true;
}

export function isTrapPlayableNow(state, playerId, card) {
  const def = getCard(card.cardId);
  if (def.type !== "trap") return false;
  if (state.winner) return false;

  if (def.timing === "RESPONSE") {
    if (!state.pending) return false;
    if (state.pending.responderId !== playerId) return false;
    if (def.responseTo && state.pending.effectType !== def.responseTo) return false;
    return true;
  }

  if (state.pending) return false;
  if (state.phase !== PHASE.MAIN) return false;
  if (state.activePlayer !== playerId) return false;
  return true;
}

export function ownedField(state, playerId) {
  return playerOf(state, playerId).field.filter((m) => m.controller === playerId);
}

export function fieldOfController(state, playerId) {
  const result = [];
  for (const player of Object.values(state.players)) {
    for (const monster of player.field) {
      if (monster.controller === playerId) result.push(monster);
    }
  }
  return result;
}

export function validFusionPairs(state, playerId) {
  const field = fieldOfController(state, playerId);
  const extra = playerOf(state, playerId).extraPool;
  const pairs = [];
  for (let i = 0; i < field.length; i += 1) {
    for (let j = i + 1; j < field.length; j += 1) {
      const recipe = findFusionRecipe(field[i].cardId, field[j].cardId);
      if (!recipe) continue;
      const extraCard = extra.find((c) => c.cardId === recipe.result);
      if (!extraCard) continue;
      pairs.push({
        materials: [field[i], field[j]],
        recipe,
        extraCard,
      });
    }
  }
  return pairs;
}

export function resolveTargets(state, playerId, targeting, targetUids = []) {
  if (!targeting || targeting.count === 0) return { ok: true, monsters: [] };
  if (targetUids.length !== targeting.count) {
    return { ok: false, reason: "Wrong number of targets." };
  }

  const unique = new Set(targetUids);
  if (unique.size !== targetUids.length) {
    return { ok: false, reason: "Duplicate targets." };
  }

  const monsters = [];
  for (const uid of targetUids) {
    const located = findOnField(state, uid);
    if (!located) return { ok: false, reason: "Target is not on the field." };
    const controllerIsPlayer = located.card.controller === playerId;
    const controllerIsOpponent = located.card.controller === opponentId(playerId);

    if (targeting.from === "OWN_FIELD" && !controllerIsPlayer) {
      return { ok: false, reason: "Must target a machine you control." };
    }
    if (targeting.from === "OPPONENT_FIELD" && !controllerIsOpponent) {
      return { ok: false, reason: "Must target an opponent machine." };
    }
    monsters.push(located.card);
  }

  if (targeting.filter === "FUSION_PAIR") {
    const recipe = findFusionRecipe(monsters[0].cardId, monsters[1].cardId);
    if (!recipe) return { ok: false, reason: "Those frames are not compatible." };
    const extraCard = playerOf(state, playerId).extraPool.find((c) => c.cardId === recipe.result);
    if (!extraCard) return { ok: false, reason: "Fusion frame already used." };
  }

  return { ok: true, monsters };
}

export function canActivateTrap(state, playerId, card, targetUids = []) {
  if (!isTrapPlayableNow(state, playerId, card)) {
    return { ok: false, reason: "This trap cannot be played right now." };
  }
  const def = getCard(card.cardId);
  if (def.targeting?.from === "OWN_FIELD" && fieldOfController(state, playerId).length < (def.targeting.count || 0)) {
    return { ok: false, reason: "No valid machines you control." };
  }
  if (def.targeting?.from === "OPPONENT_FIELD") {
    const oppField = fieldOfController(state, opponentId(playerId));
    if (oppField.length < (def.targeting.count || 0)) {
      return { ok: false, reason: "No valid opponent machines." };
    }
  }
  if (def.effects.some((e) => e.type === EFFECT.FUSION)) {
    if (!validFusionPairs(state, playerId).length) {
      return { ok: false, reason: "No compatible merge on the field." };
    }
  }
  if (def.effects.some((e) => e.type === EFFECT.DRAW_CARDS)) {
    if (playerOf(state, playerId).deck.length === 0) {
      return { ok: false, reason: "Deck is empty." };
    }
  }
  if (targetUids.length) {
    return resolveTargets(state, playerId, def.targeting, targetUids);
  }
  if (def.targeting?.count > 0) {
    return { ok: false, reason: "Select targets." };
  }
  return { ok: true, monsters: [] };
}
