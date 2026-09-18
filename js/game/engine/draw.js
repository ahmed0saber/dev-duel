import { getCard } from "../cards/index.js";
import { playerOf, pushLog } from "./gameState.js";
import { chooseDrawIndex } from "../ai/drawStrategy.js";

export function drawCards(state, playerId, count = 1, reason = "draw") {
  const player = playerOf(state, playerId);
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (player.deck.length === 0) {
      pushLog(state, `${playerId === "human" ? "You" : "AI"} cannot draw — deck is empty.`);
      break;
    }
    if (player.hand.length >= state.config.maxHand) {
      const overflow = player.deck.pop();
      player.graveyard.push(overflow);
      pushLog(state, `Hand full. ${getCard(overflow.cardId).name} is discarded.`);
      break;
    }
    const index =
      reason === "opening" || player.deck.length === 1
        ? player.deck.length - 1
        : chooseDrawIndex(state, playerId);
    const [card] = player.deck.splice(index, 1);
    player.hand.push(card);
    drawn.push(card);
    if (reason === "draw") {
      pushLog(
        state,
        playerId === "human"
          ? `You draw ${getCard(card.cardId).name}.`
          : "AI draws a card.",
      );
    } else if (reason === "factory") {
      pushLog(
        state,
        playerId === "human"
          ? `Factory: you draw ${getCard(card.cardId).name}.`
          : "AI draws from Factory.",
      );
    }
  }
  return drawn;
}
