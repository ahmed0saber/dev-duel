import { PHASE, PLAYER, opponentId } from "./config.js";
import { checkWinner, playerOf, pushLog } from "./gameState.js";
import { expireEffects } from "./effects.js";
import { drawCards } from "./draw.js";

export function resetTurnFlags(state, playerId) {
  const player = playerOf(state, playerId);
  player.summonsThisTurn = 0;
  player.attacksDeclaredThisTurn = 0;
  for (const monster of player.field) {
    monster.attacksThisTurn = 0;
  }
}

export function enterDrawPhase(state) {
  state.phase = PHASE.DRAW;
  resetTurnFlags(state, state.activePlayer);
  if (state.turnNumber > 0) {
    drawCards(state, state.activePlayer, state.config.drawPerTurn, "draw");
  }
  state.phase = PHASE.MAIN;
  pushLog(
    state,
    state.activePlayer === PLAYER.HUMAN ? "Your Main Phase." : "AI Main Phase.",
  );
}

export function startDuel(state) {
  if (state.started) return state;
  for (const playerId of [PLAYER.HUMAN, PLAYER.AI]) {
    drawCards(state, playerId, state.config.startingHand, "opening");
  }
  state.started = true;
  state.turnNumber = 1;
  state.activePlayer = state.config.firstPlayer;
  pushLog(state, "Duel initialized. Opening hands dealt.");
  enterDrawPhase(state);
  return state;
}

export function advancePhase(state) {
  if (state.winner) return;
  if (state.pending) return;

  if (state.phase === PHASE.MAIN) {
    state.phase = PHASE.BATTLE;
    pushLog(
      state,
      state.activePlayer === PLAYER.HUMAN ? "Battle Phase." : "AI Battle Phase.",
    );
    return;
  }

  if (state.phase === PHASE.BATTLE) {
    endTurn(state);
  }
}

export function endTurn(state) {
  state.phase = PHASE.END;
  expireEffects(state);
  checkWinner(state);
  if (state.winner) return;

  const previous = state.activePlayer;
  state.activePlayer = opponentId(previous);
  state.turnNumber += 1;
  pushLog(
    state,
    state.activePlayer === PLAYER.HUMAN ? "Your turn." : "AI turn.",
  );
  enterDrawPhase(state);
}
