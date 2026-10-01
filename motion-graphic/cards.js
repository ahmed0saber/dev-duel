// Card data mirrors js/game/cards/*.js so the video shows the real game values.
window.MG_CARDS = {
  "drone-21": { name: "DRONE-21", kind: "m", atk: 1200, sub: "Scout Chassis" },
  "xr-5": { name: "XR-5", kind: "m", atk: 1400, sub: "Probe Frame" },
  "rx-17": { name: "RX-17", kind: "m", atk: 1600, sub: "Patrol Frame" },
  "aero-12": { name: "AERO-12", kind: "m", atk: 1800, sub: "Interdictor" },
  "mk-04": { name: "MK-04", kind: "m", atk: 1900, sub: "Line Walker" },
  "a-47": { name: "A-47", kind: "m", atk: 2000, sub: "Striker Frame" },
  "unit-08": { name: "UNIT-08", kind: "m", atk: 2100, sub: "Assault Frame" },
  "vx-09": { name: "VX-09", kind: "m", atk: 2300, sub: "Siege Frame" },
  "sentinel-09": { name: "SENTINEL-09", kind: "m", atk: 2500, sub: "Guardian Frame" },
  "titan-03": { name: "TITAN-03", kind: "m", atk: 2800, sub: "Heavy Frame" },

  "git-merge": { name: "Git Merge", kind: "t", sub: "Combine compatible frames" },
  "git-conflict": { name: "Git Conflict", kind: "t", sub: "Reject a merge" },
  "git-cherry-pick": { name: "Git Cherry-pick", kind: "t", sub: "Borrow one enemy frame" },
  "rate-limiter": { name: "Rate Limiter", kind: "t", sub: "Cap incoming attacks" },
  firewall: { name: "Firewall", kind: "t", sub: "Block direct strikes" },
  deadlock: { name: "Deadlock", kind: "t", sub: "Freeze one frame" },
  "circuit-breaker": { name: "Circuit Breaker", kind: "t", sub: "Trip a live circuit" },
  observer: { name: "Observer", kind: "t", sub: "Watch and adapt" },
  "bug-injection": { name: "Bug Injection", kind: "t", sub: "Corrupt a target" },
  rollback: { name: "Rollback", kind: "t", sub: "Restore integrity" },
  hotfix: { name: "Hotfix", kind: "t", sub: "Emergency patch" },
  factory: { name: "Factory", kind: "t", sub: "Spin up another unit" },

  "nx-00": { name: "NX-00", kind: "f", atk: 4000, sub: "Merged Patrol Frame" },
  "px-01": { name: "PX-01", kind: "f", atk: 4500, sub: "Merged Assault Frame" },
  "tx-max": { name: "TX-MAX", kind: "f", atk: 5200, sub: "Merged Bastion Frame" },
  "ax-7": { name: "AX-7", kind: "f", atk: 3400, sub: "Merged Interdictor" },
};

(function renderCards() {
  const KIND_LABEL = { m: "MACHINE", t: "TRAP", f: "FUSION" };
  document.querySelectorAll("[data-card]").forEach((el) => {
    const id = el.dataset.card;
    const c = window.MG_CARDS[id];
    if (!c) {
      console.warn("Unknown card", id);
      return;
    }
    const atk = el.dataset.atk ?? c.atk;
    el.classList.add("card", `k-${c.kind}`);
    el.innerHTML = `
      <div class="c-top"><span class="c-name">${c.name}</span><span class="c-kind">${KIND_LABEL[c.kind]}</span></div>
      <div class="c-art" style="background-image:url('../assets/cards/${id}.jpg')"></div>
      <div class="c-sub">${c.sub}</div>
      <div class="c-foot">${
        c.kind === "t"
          ? `<span class="c-trap">TRAP CARD</span>`
          : `<span class="c-atk"><b>ATK</b> <span class="v">${atk}</span></span>`
      }</div>`;
  });
})();
