import { MONSTERS } from "./monsters.js";
import { TRAPS } from "./traps.js";
import { EXTRA_POOL, FUSION_RECIPES, findFusionRecipe } from "./extraPool.js";
import { DECK_LIST, expandDeckList } from "./deck.js";

const ALL = [...MONSTERS, ...TRAPS, ...EXTRA_POOL];
const BY_ID = Object.fromEntries(ALL.map((card) => [card.id, card]));

export function getCard(id) {
  const card = BY_ID[id];
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}

export function tryGetCard(id) {
  return BY_ID[id] ?? null;
}

export {
  MONSTERS,
  TRAPS,
  EXTRA_POOL,
  FUSION_RECIPES,
  findFusionRecipe,
  DECK_LIST,
  expandDeckList,
};
