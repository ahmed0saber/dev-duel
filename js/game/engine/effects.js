import { DURATION, EFFECT, opponentId } from "./config.js";
import { getCard, findFusionRecipe } from "../cards/index.js";
import {
  findOnField,
  makeUid,
  modifyHp,
  playerOf,
  pushLog,
  checkWinner,
} from "./gameState.js";

function expiryFor(state, duration) {
  if (duration === DURATION.END_OF_TURN) {
    return { turnNumber: state.turnNumber, phase: "end" };
  }
  if (duration === DURATION.UNTIL_OPPONENT_END) {
    return { turnNumber: state.turnNumber + 1, phase: "end" };
  }
  return { turnNumber: state.turnNumber, phase: "end" };
}

export function expireEffects(state) {
  const remaining = [];
  for (const effect of state.effects) {
    const due =
      effect.expires &&
      effect.expires.turnNumber === state.turnNumber &&
      effect.expires.phase === "end";
    if (!due) {
      remaining.push(effect);
      continue;
    }
    if (effect.type === EFFECT.TEMPORARY_CONTROL && effect.monsterUid) {
      const located = findOnField(state, effect.monsterUid);
      if (located) {
        const originalOwner = effect.originalOwner ?? located.card.owner;
        moveMonsterControl(state, located.card, originalOwner);
        pushLog(state, `${getCard(located.card.cardId).name} returns to its owner.`);
      }
    }
  }
  state.effects = remaining;
}

function moveMonsterControl(state, monster, newController) {
  if (monster.controller === newController) return;
  const from = playerOf(state, monster.controller);
  const to = playerOf(state, newController);
  from.field = from.field.filter((m) => m.uid !== monster.uid);
  if (to.field.length >= state.config.maxField) {
    sendToGraveyard(state, monster);
    return;
  }
  monster.controller = newController;
  to.field.push(monster);
}

function sendToGraveyard(state, monsterOrCard) {
  const located = findOnField(state, monsterOrCard.uid);
  if (located) {
    located.player.field = located.player.field.filter((m) => m.uid !== monsterOrCard.uid);
  }
  state.effects = state.effects.filter((effect) => effect.monsterUid !== monsterOrCard.uid);
  const owner = playerOf(state, monsterOrCard.owner);
  monsterOrCard.controller = monsterOrCard.owner;
  monsterOrCard.attacksThisTurn = 0;
  owner.graveyard.push(monsterOrCard);
}

export function destroyMonster(state, monster) {
  const name = getCard(monster.cardId).name;
  sendToGraveyard(state, monster);
  pushLog(state, `${name} is destroyed.`);
  checkWinner(state);
}

function addEffect(state, partial) {
  state.effects.push({
    uid: makeUid(state, "fx"),
    ...partial,
  });
}

export function applyTrapEffects(state, playerId, card, targets) {
  const def = getCard(card.cardId);
  const events = [];

  for (const effect of def.effects) {
    if (effect.type === EFFECT.MODIFY_ATK) {
      const monster = targets[0];
      addEffect(state, {
        type: EFFECT.MODIFY_ATK,
        sourceCardId: def.id,
        sourcePlayerId: playerId,
        monsterUid: monster.uid,
        value: effect.value,
        expires: expiryFor(state, effect.duration),
      });
      const sign = effect.value > 0 ? "+" : "";
      pushLog(state, `${def.name}: ${getCard(monster.cardId).name} ${sign}${effect.value} ATK.`);
      events.push({ type: "MODIFY_ATK", monsterUid: monster.uid, value: effect.value });
    }

    if (effect.type === EFFECT.MODIFY_HP) {
      const targetId = effect.target === "SELF" ? playerId : opponentId(playerId);
      modifyHp(state, targetId, effect.value);
      const who = targetId === playerId ? "you" : "the opponent";
      pushLog(state, `${def.name}: ${effect.value > 0 ? "restore" : "deal"} ${Math.abs(effect.value)} HP to ${who}.`);
      events.push({ type: "MODIFY_HP", playerId: targetId, value: effect.value });
    }

    if (effect.type === EFFECT.DESTROY_MONSTER) {
      destroyMonster(state, targets[0]);
      events.push({ type: "DESTROY", monsterUid: targets[0].uid });
    }

    if (effect.type === EFFECT.LIMIT_ATTACKS) {
      const targetId = effect.target === "OPPONENT" ? opponentId(playerId) : playerId;
      addEffect(state, {
        type: EFFECT.LIMIT_ATTACKS,
        sourceCardId: def.id,
        sourcePlayerId: playerId,
        targetPlayerId: targetId,
        value: effect.value,
        expires: expiryFor(state, effect.duration),
      });
      pushLog(state, `${def.name}: opponent limited to ${effect.value} attack(s).`);
      events.push({ type: "LIMIT_ATTACKS", targetPlayerId: targetId, value: effect.value });
    }

    if (effect.type === EFFECT.PREVENT_DIRECT_ATTACKS) {
      const targetId = effect.target === "OPPONENT" ? opponentId(playerId) : playerId;
      addEffect(state, {
        type: EFFECT.PREVENT_DIRECT_ATTACKS,
        sourceCardId: def.id,
        sourcePlayerId: playerId,
        targetPlayerId: targetId,
        expires: expiryFor(state, effect.duration),
      });
      pushLog(state, `${def.name}: direct attacks blocked.`);
      events.push({ type: "PREVENT_DIRECT" });
    }

    if (effect.type === EFFECT.PREVENT_ATTACK) {
      const monster = targets[0];
      addEffect(state, {
        type: EFFECT.PREVENT_ATTACK,
        sourceCardId: def.id,
        sourcePlayerId: playerId,
        monsterUid: monster.uid,
        expires: expiryFor(state, effect.duration),
      });
      pushLog(state, `${def.name}: ${getCard(monster.cardId).name} cannot attack.`);
      events.push({ type: "PREVENT_ATTACK", monsterUid: monster.uid });
    }

    if (effect.type === EFFECT.TEMPORARY_CONTROL) {
      const monster = targets[0];
      const originalOwner = monster.owner;
      addEffect(state, {
        type: EFFECT.TEMPORARY_CONTROL,
        sourceCardId: def.id,
        sourcePlayerId: playerId,
        monsterUid: monster.uid,
        originalOwner,
        expires: expiryFor(state, effect.duration),
      });
      moveMonsterControl(state, monster, playerId);
      monster.attacksThisTurn = 0;
      pushLog(state, `${def.name}: stolen ${getCard(monster.cardId).name} until end of turn.`);
      events.push({ type: "CONTROL", monsterUid: monster.uid, controller: playerId });
    }

    if (effect.type === EFFECT.FUSION) {
      const result = performFusion(state, playerId, targets);
      events.push({ type: "FUSION", resultUid: result.uid, cardId: result.cardId });
    }

    if (effect.type === EFFECT.DRAW_CARDS) {
      events.push({ type: "DRAW_REQUEST", count: effect.value, playerId });
    }
  }

  return events;
}

function performFusion(state, playerId, materials) {
  const recipe = findFusionRecipe(materials[0].cardId, materials[1].cardId);
  const player = playerOf(state, playerId);
  const extraIndex = player.extraPool.findIndex((c) => c.cardId === recipe.result);
  const fusion = player.extraPool.splice(extraIndex, 1)[0];

  for (const material of materials) {
    sendToGraveyard(state, material);
  }

  fusion.controller = playerId;
  fusion.owner = playerId;
  fusion.attacksThisTurn = 0;
  fusion.summonedTurn = state.turnNumber;
  player.field.push(fusion);
  pushLog(state, `Merge complete: ${getCard(fusion.cardId).name} enters the field.`);
  return fusion;
}

export function cancelPendingFusion(state) {
  const pending = state.pending;
  if (!pending) return;
  pushLog(state, "Git Conflict: merge aborted. Materials remain.");
  state.pending = null;
}
