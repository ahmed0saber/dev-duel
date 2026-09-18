import { CONFIG, PLAYER, PHASE, opponentId } from "./config.js";
import { getCard, EXTRA_POOL, expandDeckList } from "../cards/index.js";

export function createRngState(seed = Date.now() % 2147483646) {
  let value = seed <= 0 ? 1 : seed % 2147483647;
  if (value <= 0) value = 1;
  return value;
}

export function nextRandom(state) {
  state.rngState = (state.rngState * 16807) % 2147483647;
  return (state.rngState - 1) / 2147483646;
}

export function makeUid(state, prefix = "id") {
  state.nextUid += 1;
  return `${prefix}_${state.nextUid}`;
}

export function shuffleInPlace(state, array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function instantiateCard(state, cardId, owner) {
  const def = getCard(cardId);
  return {
    uid: makeUid(state, def.type === "monster" ? "m" : "t"),
    cardId,
    owner,
    controller: owner,
    attacksThisTurn: 0,
    summonedTurn: 0,
  };
}

export function createPlayer(state, id, deckIds) {
  const deck = deckIds.map((cardId) => instantiateCard(state, cardId, id));
  shuffleInPlace(state, deck);
  return {
    id,
    hp: CONFIG.startingHp,
    deck,
    hand: [],
    field: [],
    graveyard: [],
    extraPool: EXTRA_POOL.map((card) => instantiateCard(state, card.id, id)),
    summonsThisTurn: 0,
    attacksDeclaredThisTurn: 0,
  };
}

export function createInitialState(options = {}) {
  const seed = options.seed ?? Date.now() % 2147483646;
  const state = {
    version: 1,
    rngState: createRngState(seed),
    nextUid: 0,
    seed,
    config: { ...CONFIG, ...(options.config ?? {}) },
    players: {},
    activePlayer: options.firstPlayer ?? CONFIG.firstPlayer,
    phase: PHASE.DRAW,
    turnNumber: 1,
    effects: [],
    pending: null,
    winner: null,
    log: [],
    simulation: Boolean(options.simulation),
    started: false,
  };

  const deckIds = options.deckIds ?? expandDeckList();
  state.players[PLAYER.HUMAN] = createPlayer(state, PLAYER.HUMAN, options.humanDeckIds ?? deckIds);
  state.players[PLAYER.AI] = createPlayer(state, PLAYER.AI, options.aiDeckIds ?? deckIds);
  return state;
}

export function playerOf(state, playerId) {
  return state.players[playerId];
}

export function opponentOf(state, playerId) {
  return state.players[opponentId(playerId)];
}

export function findInstance(state, uid) {
  for (const player of Object.values(state.players)) {
    for (const zone of ["hand", "field", "deck", "graveyard", "extraPool"]) {
      const found = player[zone].find((card) => card.uid === uid);
      if (found) return { card: found, player, zone };
    }
  }
  return null;
}

export function findOnField(state, uid) {
  for (const player of Object.values(state.players)) {
    const card = player.field.find((m) => m.uid === uid);
    if (card) return { card, player };
  }
  return null;
}

export function pushLog(state, text, extra = {}) {
  if (state.simulation) return;
  state.log.push({
    turn: state.turnNumber,
    phase: state.phase,
    text,
    ...extra,
  });
  if (state.log.length > 80) state.log.shift();
}

export function checkWinner(state) {
  if (state.winner) return state.winner;
  const humanHp = state.players[PLAYER.HUMAN].hp;
  const aiHp = state.players[PLAYER.AI].hp;
  if (humanHp <= 0 && aiHp <= 0) {
    state.winner = "draw";
    return state.winner;
  }
  if (humanHp <= 0) {
    state.winner = PLAYER.AI;
    return state.winner;
  }
  if (aiHp <= 0) {
    state.winner = PLAYER.HUMAN;
    return state.winner;
  }

  const bothEmpty = [PLAYER.HUMAN, PLAYER.AI].every((id) => {
    const p = state.players[id];
    return p.deck.length === 0 && p.hand.length === 0 && p.field.length === 0;
  });
  if (bothEmpty) {
    state.winner = "draw";
  }
  return state.winner;
}

export function modifyHp(state, playerId, amount) {
  const player = playerOf(state, playerId);
  const next = player.hp + amount;
  player.hp = amount > 0 ? Math.min(state.config.maxHp, next) : Math.max(0, next);
  checkWinner(state);
  return player.hp;
}
