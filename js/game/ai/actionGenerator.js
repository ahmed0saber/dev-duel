import { ACTION, PHASE, opponentId } from "../engine/config.js";
import { getCard } from "../cards/index.js";
import { playerOf } from "../engine/gameState.js";
import {
  canActivateTrap,
  canMonsterAttack,
  canNormalSummon,
  fieldOfController,
  validFusionPairs,
} from "../engine/gameRules.js";

function combinations(items, k) {
  if (k === 0) return [[]];
  if (k > items.length) return [];
  const result = [];
  const walk = (start, acc) => {
    if (acc.length === k) {
      result.push([...acc]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      acc.push(items[i]);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return result;
}

export function generateLegalActions(state, playerId) {
  if (state.winner) return [];

  if (state.pending) {
    if (state.pending.responderId !== playerId) return [];
    const actions = [{ type: ACTION.PASS_RESPONSE, playerId }];
    for (const card of playerOf(state, playerId).hand) {
      const def = getCard(card.cardId);
      if (def.responseTo === state.pending.effectType) {
        actions.push({ type: ACTION.RESPOND, playerId, cardUid: card.uid, cardId: def.id });
      }
    }
    return actions;
  }

  if (state.activePlayer !== playerId) return [];
  const actions = [];
  const player = playerOf(state, playerId);

  if (state.phase === PHASE.MAIN) {
    if (canNormalSummon(state, playerId)) {
      for (const card of player.hand) {
        if (getCard(card.cardId).type === "monster") {
          actions.push({
            type: ACTION.SUMMON,
            playerId,
            cardUid: card.uid,
            cardId: card.cardId,
          });
        }
      }
    }

    for (const card of player.hand) {
      const def = getCard(card.cardId);
      if (def.type !== "trap") continue;
      if (def.timing === "RESPONSE") continue;
      const targetCount = def.targeting?.count ?? 0;
      if (targetCount === 0) {
        const legal = canActivateTrap(state, playerId, card, []);
        if (legal.ok) {
          actions.push({
            type: ACTION.ACTIVATE_TRAP,
            playerId,
            cardUid: card.uid,
            cardId: def.id,
            targets: [],
          });
        }
        continue;
      }

      if (def.targeting.filter === "FUSION_PAIR") {
        for (const pair of validFusionPairs(state, playerId)) {
          const targets = pair.materials.map((m) => m.uid);
          const legal = canActivateTrap(state, playerId, card, targets);
          if (legal.ok) {
            actions.push({
              type: ACTION.ACTIVATE_TRAP,
              playerId,
              cardUid: card.uid,
              cardId: def.id,
              targets,
              resultId: pair.recipe.result,
            });
          }
        }
        continue;
      }

      const pool =
        def.targeting.from === "OWN_FIELD"
          ? fieldOfController(state, playerId)
          : fieldOfController(state, opponentId(playerId));
      for (const combo of combinations(pool, targetCount)) {
        const targets = combo.map((m) => m.uid);
        const legal = canActivateTrap(state, playerId, card, targets);
        if (legal.ok) {
          actions.push({
            type: ACTION.ACTIVATE_TRAP,
            playerId,
            cardUid: card.uid,
            cardId: def.id,
            targets,
          });
        }
      }
    }

    actions.push({ type: ACTION.ADVANCE_PHASE, playerId });
  }

  if (state.phase === PHASE.BATTLE) {
    const oppField = fieldOfController(state, opponentId(playerId));
    for (const monster of fieldOfController(state, playerId)) {
      if (!canMonsterAttack(state, monster, playerId)) continue;
      if (oppField.length === 0) {
        actions.push({
          type: ACTION.ATTACK,
          playerId,
          attackerUid: monster.uid,
          targetUid: "DIRECT",
          cardId: monster.cardId,
        });
      } else {
        for (const defender of oppField) {
          actions.push({
            type: ACTION.ATTACK,
            playerId,
            attackerUid: monster.uid,
            targetUid: defender.uid,
            cardId: monster.cardId,
            targetCardId: defender.cardId,
          });
        }
      }
    }
    actions.push({ type: ACTION.ADVANCE_PHASE, playerId });
  }

  return actions;
}

export function describeAction(action, state) {
  if (!action) return "None";
  if (action.type === ACTION.SUMMON) {
    return `Summon ${getCard(action.cardId).name}`;
  }
  if (action.type === ACTION.ACTIVATE_TRAP) {
    const name = getCard(action.cardId).name;
    if (action.resultId) return `${name} → ${getCard(action.resultId).name}`;
    if (action.targets?.length) {
      const labels = action.targets.map((uid) => {
        const id = findCardId(state, uid);
        return id ? getCard(id).name : uid;
      });
      return `${name} (${labels.join(", ")})`;
    }
    return `Play ${name}`;
  }
  if (action.type === ACTION.ATTACK) {
    const attacker = getCard(action.cardId).name;
    if (action.targetUid === "DIRECT") return `${attacker} attacks directly`;
    const targetName = action.targetCardId ? getCard(action.targetCardId).name : "target";
    return `${attacker} attacks ${targetName}`;
  }
  if (action.type === ACTION.ADVANCE_PHASE) {
    return state?.phase === PHASE.MAIN ? "Go to Battle Phase" : "End Turn";
  }
  if (action.type === ACTION.RESPOND) return `Respond with ${getCard(action.cardId).name}`;
  if (action.type === ACTION.PASS_RESPONSE) return "Allow the merge";
  return action.type;
}

function findCardId(state, uid) {
  for (const player of Object.values(state.players)) {
    const hit = [...player.field, ...player.hand].find((c) => c.uid === uid);
    if (hit) return hit.cardId;
  }
  return null;
}
