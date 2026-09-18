import { createInitialState, instantiateCard } from "../js/game/engine/gameState.js";
import { PHASE, PLAYER } from "../js/game/engine/config.js";

export function freshState(options = {}) {
  const state = createInitialState({
    seed: options.seed ?? 1,
    humanDeckIds: options.humanDeckIds ?? ["rx-17", "mk-04", "git-merge"],
    aiDeckIds: options.aiDeckIds ?? ["rx-17", "mk-04", "git-merge"],
    ...options,
  });
  state.started = true;
  state.phase = options.phase ?? PHASE.MAIN;
  state.activePlayer = options.activePlayer ?? PLAYER.HUMAN;
  state.turnNumber = options.turnNumber ?? 1;
  for (const id of [PLAYER.HUMAN, PLAYER.AI]) {
    state.players[id].hand = [];
    state.players[id].field = [];
    state.players[id].graveyard = [];
    if (options.clearDeck) state.players[id].deck = [];
  }
  return state;
}

export function addToHand(state, playerId, cardId) {
  const card = instantiateCard(state, cardId, playerId);
  state.players[playerId].hand.push(card);
  return card;
}

export function addToField(state, playerId, cardId, extra = {}) {
  const card = instantiateCard(state, cardId, playerId);
  Object.assign(card, extra);
  state.players[playerId].field.push(card);
  return card;
}

export function addToDeck(state, playerId, cardId) {
  const card = instantiateCard(state, cardId, playerId);
  state.players[playerId].deck.push(card);
  return card;
}

export function addToExtra(state, playerId, cardId) {
  const existing = state.players[playerId].extraPool.find((c) => c.cardId === cardId);
  if (existing) return existing;
  const card = instantiateCard(state, cardId, playerId);
  state.players[playerId].extraPool.push(card);
  return card;
}
