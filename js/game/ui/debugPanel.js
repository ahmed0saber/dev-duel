import { PLAYER } from "../engine/config.js";
import { formatScore } from "./animations.js";

function partRow(name, value) {
  return `<div class="dd-debug__row"><span>${name}</span><strong>${formatScore(value)}</strong></div>`;
}

export function renderDebugPanel(root, engine) {
  const state = engine.getState();
  const decision = engine.getLastDecision();

  const candidates = (decision?.candidates ?? [])
    .slice(0, 12)
    .map((entry) => {
      const selected =
        decision?.chosen &&
        entry.label === decision.chosen.label &&
        entry.score === decision.chosen.score;
      return `<li class="${selected ? "is-chosen" : ""}"><span>${entry.label}</span><b>${entry.score}</b></li>`;
    })
    .join("");

  const parts = decision?.chosen?.evaluation?.parts ?? decision?.baseline?.parts ?? {};

  root.innerHTML = `
    <p class="dd-sidebar__meta">Turn ${state.turnNumber} · ${state.activePlayer} · ${state.phase}</p>
    <section>
      <h3>Selected action</h3>
      <p class="dd-debug__pick">${decision?.chosen?.label ?? "—"}</p>
      <p>Score ${decision?.chosen?.score ?? "—"} · ${Math.round(decision?.elapsedMs ?? 0)} ms</p>
    </section>
    <section>
      <h3>Candidates</h3>
      <ol class="dd-debug__list">${candidates || "<li>No AI decision yet.</li>"}</ol>
    </section>
    <section>
      <h3>Evaluation breakdown</h3>
      ${
        Object.keys(parts).length
          ? Object.entries(parts).map(([k, v]) => partRow(k, v)).join("")
          : "<p>No breakdown yet.</p>"
      }
      <div class="dd-debug__row dd-debug__total"><span>Total</span><strong>${formatScore(decision?.chosen?.evaluation?.total ?? decision?.baseline?.total ?? 0)}</strong></div>
    </section>
  `;
}
