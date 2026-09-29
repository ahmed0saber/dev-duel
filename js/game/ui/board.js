import { ACTION, PHASE, PLAYER } from "../engine/config.js";
import { EXTRA_POOL, FUSION_RECIPES, getCard, findFusionRecipe } from "../cards/index.js";
import { generateLegalActions } from "../ai/actionGenerator.js";
import { runAiBurst } from "../ai/aiController.js";
import { fieldOfController, getEffectiveAtk } from "../engine/gameRules.js";
import { renderCard, renderCardBack } from "./cardRenderer.js";
import { renderDebugPanel } from "./debugPanel.js";
import { cardArt } from "./cardArt.js";

const ui = {
  selectedHandUid: null,
  selectedAttackerUid: null,
  targeting: null,
  inspect: null,
  sidebarTab: "state",
  zoneModal: null,
  busy: false,
};

export function mountBoard(root, engine) {
  root.innerHTML = shellHtml();
  const refs = {
    start: root.querySelector("#dd-start"),
    table: root.querySelector("#dd-table"),
    modal: root.querySelector("#dd-modal"),
    result: root.querySelector("#dd-result"),
  };

  root.querySelector("#dd-start-btn").addEventListener("click", () => {
    refs.start.hidden = true;
    refs.table.hidden = false;
    engine.start();
    render(root, engine);
  });

  root.addEventListener("click", (event) => {
    if (event.target.id === "dd-zone") {
      closeZoneModal(root, engine);
      return;
    }
    const tab = event.target.closest("[data-sidebar-tab]")?.dataset.sidebarTab;
    if (tab) {
      ui.sidebarTab = tab;
      syncSidebarTabs(root);
      return;
    }
    const action = event.target.closest("[data-act]")?.dataset.act;
    if (!action) return;
    handleCommand(root, engine, action);
  });

  engine.subscribe(() => {
    render(root, engine);
  });

  bindStatic(root, engine);
  syncSidebarTabs(root);
  render(root, engine);
}

function bindStatic(root, engine) {
  root.querySelector("#dd-hand").addEventListener("click", (event) => {
    const cardEl = event.target.closest(".dd-card");
    if (!cardEl || ui.busy) return;
    handleHandClick(root, engine, cardEl.dataset.uid);
  });
  root.querySelector("#dd-player-field").addEventListener("click", (event) => {
    const cardEl = event.target.closest(".dd-card");
    if (!cardEl || ui.busy) return;
    handleFieldClick(root, engine, cardEl.dataset.uid, PLAYER.HUMAN);
  });
  root.querySelector("#dd-ai-field").addEventListener("click", (event) => {
    const cardEl = event.target.closest(".dd-card");
    if (!cardEl || ui.busy) return;
    handleFieldClick(root, engine, cardEl.dataset.uid, PLAYER.AI);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !ui.zoneModal) return;
    closeZoneModal(root, engine);
  });
}

function handleCommand(root, engine, action) {
  if (action === "advance") dispatchPlayer(root, engine, { type: ACTION.ADVANCE_PHASE, playerId: PLAYER.HUMAN });
  if (action === "direct") tryDirect(engine);
  if (action === "cancel") {
    resetSelection();
    setStatus(root, "");
    render(root, engine);
  }
  if (action === "open-extra") {
    ui.zoneModal = "extra";
    renderZoneModal(root, engine.getState());
    return;
  }
  if (action === "open-grave") {
    ui.zoneModal = "grave";
    renderZoneModal(root, engine.getState());
    return;
  }
  if (action === "close-zone") {
    closeZoneModal(root, engine);
    return;
  }
  if (action === "allow") dispatchPlayer(root, engine, { type: ACTION.PASS_RESPONSE, playerId: PLAYER.HUMAN });
  if (action === "conflict") {
    const state = engine.getState();
    const card = state.players[PLAYER.HUMAN].hand.find((c) => getCard(c.cardId).id === "git-conflict");
    if (card) dispatchPlayer(root, engine, { type: ACTION.RESPOND, playerId: PLAYER.HUMAN, cardUid: card.uid, cardId: "git-conflict" });
  }
  if (action === "rematch") window.location.reload();
}

function closeZoneModal(root, engine) {
  ui.zoneModal = null;
  renderZoneModal(root, engine.getState());
}

function resetSelection() {
  ui.selectedHandUid = null;
  ui.selectedAttackerUid = null;
  ui.targeting = null;
}

function handleHandClick(root, engine, uid) {
  const state = engine.getState();
  if (state.activePlayer !== PLAYER.HUMAN || state.winner) return;
  const card = state.players[PLAYER.HUMAN].hand.find((c) => c.uid === uid);
  if (!card) return;
  const def = getCard(card.cardId);
  ui.inspect = { card, def };

  if (state.pending) return;

  if (def.type === "monster") {
    dispatchPlayer(root, engine, { type: ACTION.SUMMON, playerId: PLAYER.HUMAN, cardUid: uid, cardId: def.id });
    return;
  }

  const need = def.targeting?.count ?? 0;
  const legalForCard = generateLegalActions(state, PLAYER.HUMAN).filter((action) => action.cardUid === uid);
  if (!legalForCard.length) {
    setStatus(root, "That trap cannot be activated right now.");
    render(root, engine);
    return;
  }
  if (need === 0) {
    dispatchPlayer(root, engine, {
      type: ACTION.ACTIVATE_TRAP,
      playerId: PLAYER.HUMAN,
      cardUid: uid,
      cardId: def.id,
      targets: [],
    });
    return;
  }

  ui.targeting = { card, def, targets: [] };
  ui.selectedHandUid = uid;
  render(root, engine);
}

function handleFieldClick(root, engine, uid, controllerSide) {
  const state = engine.getState();
  if (state.winner) return;

  const located = [...state.players.human.field, ...state.players.ai.field].find((m) => m.uid === uid);
  if (located) ui.inspect = { card: located, def: getCard(located.cardId) };

  if (ui.targeting) {
    pickTarget(root, engine, uid);
    return;
  }

  if (state.activePlayer !== PLAYER.HUMAN || state.pending) return;

  if (state.phase === PHASE.BATTLE) {
    if (controllerSide === PLAYER.HUMAN) {
      ui.selectedAttackerUid = uid;
      render(root, engine);
      return;
    }
    if (ui.selectedAttackerUid) {
      dispatchPlayer(root, engine, {
        type: ACTION.ATTACK,
        playerId: PLAYER.HUMAN,
        attackerUid: ui.selectedAttackerUid,
        targetUid: uid,
      });
    }
  }
}

function pickTarget(root, engine, uid) {
  const state = engine.getState();
  const { def, card, targets } = ui.targeting;
  if (targets.includes(uid)) return;
  const located = [...state.players.human.field, ...state.players.ai.field].find((m) => m.uid === uid);
  if (!located) return;
  if (def.targeting.from === "OWN_FIELD" && located.controller !== PLAYER.HUMAN) return;
  if (def.targeting.from === "OPPONENT_FIELD" && located.controller !== PLAYER.AI) return;
  if (def.targeting.filter === "FUSION_PAIR" && targets.length === 1) {
    const state = engine.getState();
    const first = [...state.players.human.field, ...state.players.ai.field].find((m) => m.uid === targets[0]);
    const second = [...state.players.human.field, ...state.players.ai.field].find((m) => m.uid === uid);
    if (!first || !second || !findFusionRecipe(first.cardId, second.cardId)) return;
  }
  targets.push(uid);
  if (targets.length >= def.targeting.count) {
    const payload = {
      type: ACTION.ACTIVATE_TRAP,
      playerId: PLAYER.HUMAN,
      cardUid: card.uid,
      cardId: def.id,
      targets: [...targets],
    };
    ui.targeting = null;
    dispatchPlayer(root, engine, payload);
    return;
  }
  render(root, engine);
}

function tryDirect(engine) {
  const state = engine.getState();
  if (!ui.selectedAttackerUid || state.phase !== PHASE.BATTLE) return;
  dispatchPlayer(document.getElementById("app"), engine, {
    type: ACTION.ATTACK,
    playerId: PLAYER.HUMAN,
    attackerUid: ui.selectedAttackerUid,
    targetUid: "DIRECT",
  });
}

async function dispatchPlayer(root, engine, action) {
  if (ui.busy) return;
  const result = engine.dispatch(action);
  if (!result.ok) {
    setStatus(root, result.reason);
    return;
  }
  setStatus(root, "");
  resetSelection();
  render(root, engine);
  await maybeRunAi(root, engine);
}

async function maybeRunAi(root, engine) {
  const state = engine.getState();
  const actor = state.pending ? state.pending.responderId : state.activePlayer;
  if (state.winner || actor !== PLAYER.AI) return;
  ui.busy = true;
  root.classList.add("is-ai-turn");
  setAiStatus(root, "AI synthesizing move…");
  await runAiBurst(engine, PLAYER.AI, engine.getState().config.aiActionDelayMs);
  ui.busy = false;
  root.classList.remove("is-ai-turn");
  setAiStatus(root, "");
  render(root, engine);
}

function setStatus(root, text) {
  const node = root.querySelector("#dd-status");
  if (!node) return;
  node.textContent = text;
  node.hidden = !text;
}

function setAiStatus(root, text) {
  const node = root.querySelector("#dd-ai-status");
  if (!node) return;
  node.textContent = text;
  node.hidden = !text;
}

function render(root, engine) {
  const state = engine.getState();
  if (!state.started) return;

  const human = state.players[PLAYER.HUMAN];
  const ai = state.players[PLAYER.AI];
  const legal = generateLegalActions(state, PLAYER.HUMAN);
  const playable = new Set(legal.filter((a) => a.cardUid).map((a) => a.cardUid));
  const attackable = new Set(legal.filter((a) => a.type === ACTION.ATTACK).map((a) => a.attackerUid));
  const attackTargets = new Set(legal.filter((a) => a.type === ACTION.ATTACK && a.targetUid !== "DIRECT").map((a) => a.targetUid));
  const canDirect = legal.some((a) => a.type === ACTION.ATTACK && a.targetUid === "DIRECT");
  const showDirect = Boolean(canDirect && ui.selectedAttackerUid);

  root.querySelector("#dd-ai-hp").textContent = ai.hp;
  root.querySelector("#dd-human-hp").textContent = human.hp;
  root.querySelector("#dd-ai-hp-bar").style.width = `${(ai.hp / state.config.startingHp) * 100}%`;
  root.querySelector("#dd-human-hp-bar").style.width = `${(human.hp / state.config.startingHp) * 100}%`;
  root.querySelector("#dd-turn").textContent = `Turn ${state.turnNumber}`;
  root.querySelector("#dd-phase").textContent = state.phase.toUpperCase();
  root.querySelector("#dd-actor").textContent = state.activePlayer === PLAYER.HUMAN ? "YOUR MOVE" : "AI MOVE";
  root.querySelector("#dd-ai-meta").textContent = `Deck ${ai.deck.length} · Grave ${ai.graveyard.length} · Extra ${ai.extraPool.length}`;
  root.querySelector("#dd-human-meta").textContent = `Deck ${human.deck.length} · Grave ${human.graveyard.length} · Extra ${human.extraPool.length}`;

  document.querySelectorAll(".dd-phase-pip").forEach((pip) => {
    pip.classList.toggle("is-on", pip.dataset.phase === state.phase);
  });

  const aiField = root.querySelector("#dd-ai-field");
  paintZone(aiField, ai.field, state, {
    attackable: false,
    targetableUids: targetableSet(state, attackTargets),
    onHover: (card, def) => {
      ui.inspect = { card, def };
      paintInspect(root, state);
    },
  });
  aiField.classList.toggle("is-direct-target", showDirect && ai.field.length === 0);
  if (showDirect && ai.field.length === 0) {
    aiField.innerHTML = `
      <button class="dd-direct is-ready" data-act="direct" type="button">Direct Strike</button>
    `;
  }
  paintZone(root.querySelector("#dd-player-field"), human.field, state, {
    selectedUid: ui.selectedAttackerUid,
    attackableUids: attackable,
    targetableUids: targetableSet(state, attackTargets),
    onHover: (card, def) => {
      ui.inspect = { card, def };
      paintInspect(root, state);
    },
  });

  const hand = root.querySelector("#dd-hand");
  hand.innerHTML = "";
  for (const card of human.hand) {
    hand.appendChild(
      renderCard(card, {
        state,
        size: "hand",
        selected: ui.selectedHandUid === card.uid,
        playable: playable.has(card.uid) && state.activePlayer === PLAYER.HUMAN && !state.pending,
        onHover: (c, def) => {
          ui.inspect = { card: c, def };
          paintInspect(root, state);
        },
      }),
    );
  }

  const backs = root.querySelector("#dd-ai-hand");
  backs.innerHTML = "";
  for (let i = 0; i < ai.hand.length; i += 1) backs.appendChild(renderCardBack("AI"));

  const log = root.querySelector("#dd-log");
  const logHtml = state.log
    .slice(-40)
    .map((entry) => `<li>${entry.text}</li>`)
    .join("");
  if (log.innerHTML !== logHtml) {
    log.innerHTML = logHtml;
    log.scrollTop = log.scrollHeight;
  }

  paintInspect(root, state);
  renderDebugPanel(root.querySelector("#dd-ai-debug"), engine);
  syncSidebarTabs(root);

  const canAdvance = legal.some((a) => a.type === ACTION.ADVANCE_PHASE);
  const advance = root.querySelector("#dd-advance");
  advance.disabled = !canAdvance || ui.busy || state.activePlayer !== PLAYER.HUMAN;
  advance.textContent = state.phase === PHASE.MAIN ? "Enter Battle" : "End Turn";

  const cancel = root.querySelector("#dd-cancel");
  if (cancel) {
    cancel.hidden = !ui.targeting && !ui.selectedAttackerUid && !ui.selectedHandUid;
  }

  renderModal(root, state);
  renderZoneModal(root, state);
  renderResult(root, state);

  root.dataset.phase = state.phase;
  root.dataset.actor = state.activePlayer;
}

function targetableSet(state, attackTargets) {
  if (ui.targeting) {
    const from = ui.targeting.def.targeting.from;
    const ownerId = from === "OWN_FIELD" ? PLAYER.HUMAN : PLAYER.AI;
    return new Set(fieldOfController(state, ownerId).map((m) => m.uid));
  }
  return attackTargets;
}

function paintZone(node, cards, state, options) {
  node.innerHTML = "";
  if (!cards.length) {
    node.innerHTML = `<div class="dd-empty">No frames</div>`;
    return;
  }
  for (const card of cards) {
    node.appendChild(
      renderCard(card, {
        state,
        size: "field",
        selected: options.selectedUid === card.uid || ui.targeting?.targets.includes(card.uid),
        attackable: options.attackableUids?.has(card.uid),
        targetable: options.targetableUids?.has(card.uid) || (ui.targeting && options.targetableUids?.has(card.uid)),
        onHover: options.onHover,
      }),
    );
  }
}

function paintInspect(root, state) {
  const panel = root.querySelector("#dd-inspect");
  if (!ui.inspect) {
    panel.innerHTML = `<p class="dd-inspect__empty">Hover a card to inspect it.</p>`;
    return;
  }
  const { card, def } = ui.inspect;
  const atk = def.type === "monster" ? getEffectiveAtk(state, card) : null;
  panel.innerHTML = `
    <div class="dd-inspect__art">${cardArt(def)}</div>
    <h3>${def.name}</h3>
    <p class="dd-inspect__sub">${def.subtitle}</p>
    <p class="dd-inspect__desc">${def.description}</p>
    ${def.type === "monster" ? `<p class="dd-inspect__atk">ATK ${atk}</p>` : ""}
    <p class="dd-inspect__tags">${(def.tags || []).join(" · ")}</p>
  `;
}

function syncSidebarTabs(root) {
  root.querySelectorAll("[data-sidebar-tab]").forEach((button) => {
    const on = button.dataset.sidebarTab === ui.sidebarTab;
    button.classList.toggle("is-active", on);
    button.setAttribute("aria-selected", String(on));
  });
  root.querySelectorAll("[data-sidebar-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.sidebarPanel === ui.sidebarTab);
  });
}

function extraLocation(player, cardId) {
  if (player.extraPool.some((card) => card.cardId === cardId)) return "available";
  if (player.field.some((card) => card.cardId === cardId)) return "field";
  if (player.graveyard.some((card) => card.cardId === cardId)) return "grave";
  return "used";
}

function extraLocationLabel(location) {
  if (location === "available") return "In Extra Pool";
  if (location === "field") return "On the field";
  if (location === "grave") return "In graveyard";
  return "Already compiled";
}

function extraMaterialsMarkup(cardId) {
  const recipe = FUSION_RECIPES.find((entry) => entry.result === cardId);
  if (!recipe) {
    return `<p class="dd-zone-item__summon">No Git Merge recipe exists for this frame.</p>`;
  }
  const chips = recipe.materials
    .map((id) => {
      const def = getCard(id);
      return `
        <div class="dd-zone-mat">
          <div class="dd-zone-mat__art">${cardArt(def)}</div>
          <span class="dd-zone-mat__name">${def.name}</span>
        </div>
      `;
    })
    .join(`<span class="dd-zone-mat__plus" aria-hidden="true">+</span>`);
  return `
    <p class="dd-zone-item__summon">Git Merge in Main Phase. Send both frames you control:</p>
    <div class="dd-zone-mats">${chips}</div>
  `;
}

function renderExtraColumn(player, title) {
  const remaining = player.extraPool.length;
  const items = EXTRA_POOL.map((def) => {
    const location = extraLocation(player, def.id);
    return `
      <article class="dd-zone-item dd-zone-item--extra${location === "available" ? "" : " is-used"}">
        <div class="dd-zone-item__art">${cardArt(def)}</div>
        <div>
          <p class="dd-zone-item__kicker">${extraLocationLabel(location)}</p>
          <h4>${def.name}</h4>
          <p class="dd-zone-item__sub">${def.subtitle}</p>
          <p>${def.description}</p>
          <p class="dd-zone-item__atk">ATK ${def.attack}</p>
        </div>
        ${extraMaterialsMarkup(def.id)}
      </article>
    `;
  }).join("");
  return `
    <section class="dd-zone-col">
      <h3>${title} · ${remaining} remaining</h3>
      ${items}
    </section>
  `;
}

function renderGraveColumn(player, title) {
  const items = player.graveyard.length
    ? player.graveyard
        .map((card) => {
          const def = getCard(card.cardId);
          const atk = def.type === "monster" ? `<p class="dd-zone-item__atk">ATK ${def.attack}</p>` : "";
          return `
            <article class="dd-zone-item">
              <div class="dd-zone-item__art">${cardArt(def)}</div>
              <div>
                <p class="dd-zone-item__kicker">${def.type}</p>
                <h4>${def.name}</h4>
                <p class="dd-zone-item__sub">${def.subtitle}</p>
                <p>${def.description}</p>
                ${atk}
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="dd-zone-empty">Graveyard is empty.</p>`;
  return `
    <section class="dd-zone-col">
      <h3>${title} · ${player.graveyard.length}</h3>
      ${items}
    </section>
  `;
}

function renderZoneModal(root, state) {
  const overlay = root.querySelector("#dd-zone");
  if (!overlay) return;
  overlay.hidden = !ui.zoneModal;
  if (!ui.zoneModal) return;

  const human = state.players[PLAYER.HUMAN];
  const ai = state.players[PLAYER.AI];
  const title = overlay.querySelector("#dd-zone-title");
  const body = overlay.querySelector("#dd-zone-body");

  if (ui.zoneModal === "extra") {
    title.textContent = "Extra Pool";
    body.innerHTML = `
      <p class="dd-zone-lead">Each Extra Pool frame can be compiled once per player with Git Merge.</p>
      <div class="dd-zone-grid">
        ${renderExtraColumn(human, "You")}
        ${renderExtraColumn(ai, "AI")}
      </div>
    `;
    return;
  }

  title.textContent = "Graveyard";
  body.innerHTML = `
    <p class="dd-zone-lead">Destroyed frames, spent traps, and merge materials rest here.</p>
    <div class="dd-zone-grid">
      ${renderGraveColumn(human, "You")}
      ${renderGraveColumn(ai, "AI")}
    </div>
  `;
}

function renderModal(root, state) {
  const modal = root.querySelector("#dd-modal");
  const pending = state.pending && state.pending.responderId === PLAYER.HUMAN;
  modal.hidden = !pending;
  if (!pending) return;
  const names = (state.pending.materials ?? [])
    .map((uid) => {
      const card = [...state.players.human.field, ...state.players.ai.field].find((m) => m.uid === uid);
      return card ? getCard(card.cardId).name : "?";
    })
    .join(" + ");
  const hasConflict = state.players[PLAYER.HUMAN].hand.some((c) => getCard(c.cardId).id === "git-conflict");
  modal.querySelector("#dd-modal-body").innerHTML = `
    <h2>Merge pending</h2>
    <p>AI is compiling ${names || "two frames"}.</p>
    <p>${hasConflict ? "Git Conflict is in your hand." : "You have no Git Conflict."}</p>
  `;
  modal.querySelector("[data-act='conflict']").disabled = !hasConflict;
}

function renderResult(root, state) {
  const box = root.querySelector("#dd-result");
  box.hidden = !state.winner;
  if (!state.winner) return;
  const title = state.winner === "draw" ? "Draw" : state.winner === PLAYER.HUMAN ? "You win" : "AI wins";
  box.querySelector("h2").textContent = title;
  box.querySelector("p").textContent =
    state.winner === "draw"
      ? "Both protocols exhausted without a knockout."
      : state.winner === PLAYER.HUMAN
        ? "Opponent integrity reached zero."
        : "Your integrity reached zero.";
}

function shellHtml() {
  return `
    <section id="dd-start" class="dd-start">
      <div class="dd-start__panel">
        <p class="dd-kicker">Local prototype</p>
        <h1>DEV DUEL</h1>
        <p class="dd-start__lead">Machines clash. Software decides the outcome.</p>
        <ul>
          <li>Reduce the opponent to 0 HP.</li>
          <li>Summon one frame per turn. Play any number of valid traps.</li>
          <li>Git Merge compiles compatible frames from the Extra Pool.</li>
          <li>The AI scores resulting game states, not the cards themselves.</li>
        </ul>
        <button id="dd-start-btn" class="dd-btn dd-btn--primary" type="button">Initialize Duel</button>
      </div>
    </section>
    <div id="dd-table" class="dd-table" hidden>
      <header class="dd-top">
        <div>
          <p class="dd-kicker">Protocol War</p>
          <h1>DEV DUEL</h1>
        </div>
        <div class="dd-phases">
          <span class="dd-phase-pip" data-phase="draw">DRAW</span>
          <span class="dd-phase-pip" data-phase="main">MAIN</span>
          <span class="dd-phase-pip" data-phase="battle">BATTLE</span>
          <span class="dd-phase-pip" data-phase="end">END</span>
        </div>
        <div class="dd-top__meta">
          <strong id="dd-actor">YOUR MOVE</strong>
          <span id="dd-turn">Turn 1</span>
          <span id="dd-phase">MAIN</span>
        </div>
      </header>
      <div class="dd-layout">
        <div class="dd-play">
          <section class="dd-row dd-row--ai">
            <div class="dd-hp">
              <span>AI</span>
              <p id="dd-ai-status" class="dd-ai-status" hidden></p>
              <strong id="dd-ai-hp">8000</strong>
              <div class="dd-hp__track"><i id="dd-ai-hp-bar"></i></div>
              <small id="dd-ai-meta"></small>
              <div id="dd-ai-hand" class="dd-ai-hand"></div>
            </div>
            <div id="dd-ai-field" class="dd-field"></div>
          </section>
          <section class="dd-row">
            <div id="dd-player-field" class="dd-field"></div>
            <div class="dd-hp dd-hp--you">
              <span>You</span>
              <strong id="dd-human-hp">8000</strong>
              <div class="dd-hp__track"><i id="dd-human-hp-bar"></i></div>
              <small id="dd-human-meta"></small>
            </div>
          </section>
          <section class="dd-dock">
            <p id="dd-status" class="dd-status" hidden></p>
            <div id="dd-hand" class="dd-hand"></div>
            <div class="dd-dock__actions">
              <button id="dd-advance" class="dd-btn dd-btn--primary" data-act="advance" type="button">Enter Battle</button>
              <button id="dd-cancel" class="dd-btn" data-act="cancel" type="button" hidden>Cancel</button>
            </div>
          </section>
        </div>
        <aside class="dd-sidebar">
          <div class="dd-tabs" role="tablist">
            <button class="dd-tab is-active" type="button" role="tab" data-sidebar-tab="state" aria-selected="true">Game State</button>
            <button class="dd-tab" type="button" role="tab" data-sidebar-tab="debug" aria-selected="false">AI Debugger</button>
          </div>
          <div class="dd-tab-panel is-active" data-sidebar-panel="state" role="tabpanel">
            <section>
              <h3>Hovered card</h3>
              <div id="dd-inspect" class="dd-inspect"></div>
            </section>
            <section class="dd-zone-actions">
              <button class="dd-btn" data-act="open-extra" type="button">Extra Pool</button>
              <button class="dd-btn" data-act="open-grave" type="button">Graveyard</button>
            </section>
            <section>
              <h3>Feed</h3>
              <ol id="dd-log" class="dd-log"></ol>
            </section>
          </div>
          <div class="dd-tab-panel" data-sidebar-panel="debug" role="tabpanel">
            <div id="dd-ai-debug" class="dd-debug"></div>
          </div>
        </aside>
      </div>
    </div>
    <div id="dd-zone" class="dd-overlay dd-overlay--zone" hidden>
      <div class="dd-overlay__card dd-overlay__card--wide">
        <div class="dd-zone__head">
          <h2 id="dd-zone-title">Zone</h2>
          <button class="dd-btn" data-act="close-zone" type="button">Close</button>
        </div>
        <div id="dd-zone-body"></div>
      </div>
    </div>
    <div id="dd-modal" class="dd-overlay" hidden>
      <div class="dd-overlay__card">
        <div id="dd-modal-body"></div>
        <div class="dd-overlay__actions">
          <button class="dd-btn dd-btn--danger" data-act="conflict" type="button">Git Conflict</button>
          <button class="dd-btn" data-act="allow" type="button">Allow merge</button>
        </div>
      </div>
    </div>
    <div id="dd-result" class="dd-overlay" hidden>
      <div class="dd-overlay__card">
        <h2>Result</h2>
        <p></p>
        <button class="dd-btn dd-btn--primary" data-act="rematch" type="button">Reboot Duel</button>
      </div>
    </div>
  `;
}

