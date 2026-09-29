import { ACTION, EFFECT, PHASE, opponentId } from "./config.js";
import { getCard } from "../cards/index.js";
import { resolveCombat } from "./combat.js";
import {
  findInstance,
  findOnField,
  playerOf,
  pushLog,
  checkWinner,
  modifyHp,
} from "./gameState.js";
import {
  canNormalSummon,
  canMonsterAttack,
  canActivateTrap,
  getEffectiveAtk,
  fieldOfController,
  preventsDirectAttacks,
} from "./gameRules.js";
import {
  applyTrapEffects,
  cancelPendingFusion,
  destroyMonster,
} from "./effects.js";
import { advancePhase } from "./turnManager.js";
import { drawCards } from "./draw.js";

function fail(reason) {
  return { ok: false, reason, events: [] };
}

function succeed(events, extra = {}) {
  return { ok: true, events, ...extra };
}

export function applyAction(state, action) {
  if (!action || !action.type) return fail("Invalid action.");
  if (state.winner && action.type !== ACTION.RESPOND) return fail("Duel is over.");

  switch (action.type) {
    case ACTION.SUMMON:
      return applySummon(state, action);
    case ACTION.ACTIVATE_TRAP:
      return applyTrap(state, action);
    case ACTION.ATTACK:
      return applyAttack(state, action);
    case ACTION.ADVANCE_PHASE:
      return applyAdvance(state, action);
    case ACTION.RESPOND:
      return applyRespond(state, action);
    case ACTION.PASS_RESPONSE:
      return applyPassResponse(state, action);
    case ACTION.DRAW:
      return applyDraw(state, action);
    default:
      return fail(`Unknown action type: ${action.type}`);
  }
}

function applyDraw(state, action) {
  const playerId = action.playerId ?? state.activePlayer;
  const drawn = drawCards(state, playerId, action.count ?? 1, action.reason ?? "draw");
  return succeed([{ type: "DRAW", playerId, uids: drawn.map((c) => c.uid) }]);
}

function applySummon(state, action) {
  const playerId = action.playerId ?? state.activePlayer;
  if (!canNormalSummon(state, playerId)) {
    return fail("Cannot summon right now.");
  }
  const located = findInstance(state, action.cardUid);
  if (!located || located.zone !== "hand" || located.player.id !== playerId) {
    return fail("That card is not in your hand.");
  }
  const def = getCard(located.card.cardId);
  if (def.type !== "monster") return fail("Only machines can be summoned this way.");

  located.player.hand = located.player.hand.filter((c) => c.uid !== located.card.uid);
  located.card.controller = playerId;
  located.card.summonedTurn = state.turnNumber;
  located.card.attacksThisTurn = 0;
  located.player.field.push(located.card);
  located.player.summonsThisTurn += 1;
  pushLog(state, `${playerId === "human" ? "You summon" : "AI summons"} ${def.name} (${def.attack} ATK).`);
  return succeed([{ type: "SUMMON", playerId, uid: located.card.uid, cardId: def.id }]);
}

function applyTrap(state, action) {
  const playerId = action.playerId ?? state.activePlayer;
  const located = findInstance(state, action.cardUid);
  if (!located || located.zone !== "hand" || located.player.id !== playerId) {
    return fail("Trap is not in your hand.");
  }
  const def = getCard(located.card.cardId);
  if (def.type !== "trap") return fail("Not a trap card.");

  const legal = canActivateTrap(state, playerId, located.card, action.targets ?? []);
  if (!legal.ok) return fail(legal.reason);

  located.player.hand = located.player.hand.filter((c) => c.uid !== located.card.uid);
  located.player.graveyard.push(located.card);

  if (def.counterable && def.effects.some((e) => e.type === EFFECT.FUSION) && !state.simulation) {
    const responderId = opponentId(playerId);
    const hasCounter = playerOf(state, responderId).hand.some(
      (c) => getCard(c.cardId).responseTo === "FUSION",
    );
    if (hasCounter) {
      state.pending = {
        kind: "TRAP_RESPONSE",
        effectType: "FUSION",
        actorId: playerId,
        responderId,
        trapUid: located.card.uid,
        trapCardId: def.id,
        targets: action.targets ?? [],
        materials: (legal.monsters ?? []).map((m) => m.uid),
      };
      pushLog(state, `${def.name} is pending. Opponent may respond.`);
      return succeed([{ type: "PENDING", pending: state.pending }], { pending: true });
    }
  }

  const events = applyTrapEffects(state, playerId, located.card, legal.monsters ?? []);
  for (const event of events) {
    if (event.type === "DRAW_REQUEST") {
      drawCards(state, event.playerId, event.count, "factory");
    }
  }
  checkWinner(state);
  return succeed([{ type: "TRAP", cardId: def.id, playerId }, ...events]);
}

function resolvePendingTrap(state) {
  const pending = state.pending;
  if (!pending) return succeed([]);
  const actor = playerOf(state, pending.actorId);
  const trapDef = getCard(pending.trapCardId);
  const dummyCard = { cardId: pending.trapCardId, uid: pending.trapUid, owner: pending.actorId };
  const targets = (pending.materials ?? pending.targets ?? [])
    .map((uid) => findOnField(state, uid)?.card)
    .filter(Boolean);
  state.pending = null;
  const events = applyTrapEffects(state, pending.actorId, dummyCard, targets);
  for (const event of events) {
    if (event.type === "DRAW_REQUEST") {
      drawCards(state, event.playerId, event.count, "factory");
    }
  }
  actor.graveyard.find((c) => c.uid === pending.trapUid);
  checkWinner(state);
  return succeed([{ type: "TRAP_RESOLVE", cardId: trapDef.id }, ...events]);
}

function applyRespond(state, action) {
  if (!state.pending) return fail("Nothing to respond to.");
  const responderId = action.playerId ?? state.pending.responderId;
  if (responderId !== state.pending.responderId) return fail("Not your response.");

  const located = findInstance(state, action.cardUid);
  if (!located || located.zone !== "hand" || located.player.id !== responderId) {
    return fail("Response card is not in hand.");
  }
  const def = getCard(located.card.cardId);
  if (def.responseTo !== state.pending.effectType) {
    return fail("That trap cannot answer this action.");
  }

  located.player.hand = located.player.hand.filter((c) => c.uid !== located.card.uid);
  located.player.graveyard.push(located.card);
  cancelPendingFusion(state);
  return succeed([{ type: "COUNTER", cardId: def.id, playerId: responderId }]);
}

function applyPassResponse(state, action) {
  if (!state.pending) return fail("Nothing to pass.");
  const responderId = action.playerId ?? state.pending.responderId;
  if (responderId !== state.pending.responderId) return fail("Not your response.");
  return resolvePendingTrap(state);
}

function applyAttack(state, action) {
  const playerId = action.playerId ?? state.activePlayer;
  if (state.phase !== PHASE.BATTLE) return fail("Attacks are only legal in the Battle Phase.");
  if (state.activePlayer !== playerId) return fail("Not your Battle Phase.");
  if (state.pending) return fail("A response is pending.");

  const attackerLoc = findOnField(state, action.attackerUid);
  if (!attackerLoc || attackerLoc.card.controller !== playerId) {
    return fail("You do not control that attacker.");
  }
  if (!canMonsterAttack(state, attackerLoc.card, playerId)) {
    return fail("That machine cannot attack.");
  }

  const attackerAtk = getEffectiveAtk(state, attackerLoc.card);
  const attackerName = getCard(attackerLoc.card.cardId).name;
  const oppId = opponentId(playerId);
  const oppField = fieldOfController(state, oppId);

  if (action.targetUid && action.targetUid !== "DIRECT") {
    const defenderLoc = findOnField(state, action.targetUid);
    if (!defenderLoc || defenderLoc.card.controller !== oppId) {
      return fail("Invalid attack target.");
    }
    const defenderAtk = getEffectiveAtk(state, defenderLoc.card);
    const defenderName = getCard(defenderLoc.card.cardId).name;
    const result = resolveCombat(attackerAtk, defenderAtk);
    attackerLoc.card.attacksThisTurn += 1;
    playerOf(state, playerId).attacksDeclaredThisTurn += 1;

    pushLog(
      state,
      `${attackerName} (${attackerAtk}) vs ${defenderName} (${defenderAtk}).`,
    );

    if (result.defenderDestroyed) destroyMonster(state, defenderLoc.card);
    if (result.attackerDestroyed) destroyMonster(state, attackerLoc.card);
    if (result.damageToDefenderOwner) {
      modifyHp(state, oppId, -result.damageToDefenderOwner);
      pushLog(state, `${result.damageToDefenderOwner} damage to ${oppId === "human" ? "you" : "AI"}.`);
    }
    if (result.damageToAttackerOwner) {
      modifyHp(state, playerId, -result.damageToAttackerOwner);
      pushLog(state, `${result.damageToAttackerOwner} recoil damage to ${playerId === "human" ? "you" : "AI"}.`);
    }
    return succeed([{ type: "ATTACK", ...result, attackerUid: action.attackerUid, targetUid: action.targetUid }]);
  }

  if (oppField.length > 0) return fail("Cannot attack directly while machines protect the opponent.");
  if (preventsDirectAttacks(state, playerId)) return fail("Firewall is blocking direct attacks.");

  const result = resolveCombat(attackerAtk, null);
  attackerLoc.card.attacksThisTurn += 1;
  playerOf(state, playerId).attacksDeclaredThisTurn += 1;
  modifyHp(state, oppId, -result.damageToDefenderOwner);
  pushLog(state, `${attackerName} strikes directly for ${attackerAtk}.`);
  return succeed([{ type: "DIRECT_ATTACK", damage: attackerAtk, attackerUid: action.attackerUid }]);
}

function applyAdvance(state, action) {
  const playerId = action.playerId ?? state.activePlayer;
  if (state.activePlayer !== playerId) return fail("Not your turn.");
  if (state.pending) return fail("Resolve the pending response first.");
  if (state.phase !== PHASE.MAIN && state.phase !== PHASE.BATTLE) {
    return fail("Cannot advance this phase.");
  }
  const from = state.phase;
  advancePhase(state);
  return succeed([{ type: "PHASE", from, to: state.phase, activePlayer: state.activePlayer }]);
}
