import { getCard } from "../cards/index.js";
import { getEffectiveAtk } from "../engine/gameRules.js";
import { cardArtSvg } from "./cardArt.js";

export function renderCard(card, options = {}) {
  const def = getCard(card.cardId);
  const el = document.createElement("button");
  el.type = "button";
  el.className = `dd-card dd-card--${def.type}`;
  if (options.size) el.classList.add(`dd-card--${options.size}`);
  if (options.selected) el.classList.add("is-selected");
  if (options.playable) el.classList.add("is-playable");
  if (options.attackable) el.classList.add("is-attackable");
  if (options.targetable) el.classList.add("is-targetable");
  if (options.disabled) el.classList.add("is-disabled");
  if (def.extra) el.classList.add("dd-card--fusion");
  el.dataset.uid = card.uid;
  el.dataset.cardId = card.cardId;

  const atk = def.type === "monster" && options.state ? getEffectiveAtk(options.state, card) : def.attack;
  const atkChanged = def.type === "monster" && atk !== def.attack;

  el.innerHTML = `
    <span class="dd-card__kind">${def.type === "monster" ? "FRAME" : "TRAP"}</span>
    <span class="dd-card__name">${def.name}</span>
    <span class="dd-card__art">${cardArtSvg(def)}</span>
    <span class="dd-card__sub">${def.subtitle}</span>
    ${
      def.type === "monster"
        ? `<span class="dd-card__atk${atkChanged ? " is-mod" : ""}">ATK ${atk}</span>`
        : `<span class="dd-card__tag">${(def.tags || [])[0] ?? "protocol"}</span>`
    }
  `;
  el.title = `${def.name} — ${def.description}`;
  if (options.onClick) el.addEventListener("click", (event) => {
    event.stopPropagation();
    options.onClick(card, def, el);
  });
  el.addEventListener("mouseenter", () => options.onHover?.(card, def));
  return el;
}

export function renderCardBack(label = "AI") {
  const el = document.createElement("div");
  el.className = "dd-card dd-card--back";
  el.innerHTML = `<span>${label}</span><span class="dd-card__back-mark">DD</span>`;
  return el;
}
