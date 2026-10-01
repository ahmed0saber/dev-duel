/*
 * DEV DUEL motion graphic timeline.
 *
 * Every animation is a paused Web Animation whose currentTime is driven by one
 * master clock, so the page can be played in real time (optionally locked to
 * audio.wav) or seeked to any exact time for frame-by-frame capture.
 *
 * Anchor timestamps come from transcript.txt; beats inside a segment are placed
 * by word position within that segment.
 *
 * Public API (window.MG): ready, done, duration, time, play(fromSeconds?),
 * playWithAudio(fromSeconds?), pause(), seek(seconds)
 */
(() => {
  "use strict";

  const DURATION = 269.56;

  const EASE = {
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    in: "cubic-bezier(0.7, 0, 0.84, 0)",
    io: "cubic-bezier(0.65, 0, 0.35, 1)",
    back: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    lin: "linear",
  };

  const specs = [];
  const anims = [];
  const counters = new Map();

  const els = (sel) => {
    if (typeof sel !== "string") return Array.isArray(sel) ? sel : [sel];
    const found = [...document.querySelectorAll(sel)];
    if (!found.length) console.warn("[timeline] no element for", sel);
    return found;
  };

  // Specs are sorted by start time before instantiation so that, for any
  // element, later cues always override earlier ones (WAAPI composite order).
  function A(sel, t, d, keyframes, o = {}) {
    els(sel).forEach((el, i) => {
      if (o.hide) el.style.opacity = "0";
      specs.push({ el, t: t + (o.stagger || 0) * i, d, keyframes, o });
    });
  }

  const show = (sel, t, o = {}) =>
    A(sel, t, o.d ?? 0.7, [
      { opacity: 0, transform: o.from ?? "translateY(40px)" },
      { opacity: o.op ?? 1, transform: o.to ?? "none" },
    ], { hide: true, ease: o.ease ?? EASE.out, stagger: o.stagger });

  const pop = (sel, t, o = {}) =>
    A(sel, t, o.d ?? 0.6, [
      { opacity: 0, transform: `scale(${o.s ?? 0.5})` },
      { opacity: 1, transform: "none" },
    ], { hide: true, ease: EASE.back, stagger: o.stagger });

  const hide = (sel, t, o = {}) =>
    A(sel, t, o.d ?? 0.45, [
      { opacity: o.fromOp ?? 1, transform: o.from ?? "none" },
      { opacity: 0, transform: o.to ?? "translateY(-30px)" },
    ], { ease: EASE.in, stagger: o.stagger });

  const move = (sel, t, d, from, to, ease = EASE.io) =>
    A(sel, t, d, [{ transform: from }, { transform: to }], { ease });

  const scene = (sel, t0, t1, fade = 0.5) => {
    A(sel, t0, fade, [{ opacity: 0 }, { opacity: 1 }], { hide: true, ease: EASE.lin });
    if (t1 != null) A(sel, t1 - fade, fade, [{ opacity: 1 }, { opacity: 0 }], { ease: EASE.lin });
  };

  const window_ = (sel, t0, t1) => {
    A(sel, t0, 0.35, [{ opacity: 0 }, { opacity: 1 }], { hide: true, ease: EASE.lin });
    A(sel, t1 - 0.3, 0.3, [{ opacity: 1 }, { opacity: 0 }], { ease: EASE.lin });
  };

  const stamp = (sel, t, rot = -8) =>
    A(sel, t, 0.45, [
      { opacity: 0, transform: `rotate(${rot}deg) scale(2.2)` },
      { opacity: 1, transform: `rotate(${rot}deg) scale(1)` },
    ], { hide: true, ease: EASE.back });

  const burst = (sel, t) =>
    A(sel, t, 0.8, [
      { opacity: 0, transform: "scale(0.2)" },
      { opacity: 1, transform: "scale(1)", offset: 0.3 },
      { opacity: 0, transform: "scale(1.7)" },
    ], { hide: true, ease: EASE.out });

  const explode = (sel, t) =>
    A(sel, t, 0.6, [
      { opacity: 1, transform: "none", filter: "none" },
      { opacity: 1, transform: "translateX(-12px) rotate(-3deg)", filter: "brightness(2)", offset: 0.25 },
      { opacity: 0, transform: "scale(1.3) rotate(8deg)", filter: "brightness(3) blur(8px)" },
    ], { ease: EASE.in });

  const floatNum = (sel, t, hold = false) =>
    A(sel, t, hold ? 0.7 : 1.8, hold
      ? [
          { opacity: 0, transform: "translateY(30px) scale(0.6)" },
          { opacity: 1, transform: "none" },
        ]
      : [
          { opacity: 0, transform: "translateY(30px) scale(0.6)" },
          { opacity: 1, transform: "translateY(0) scale(1.1)", offset: 0.2 },
          { opacity: 1, transform: "translateY(-40px) scale(1)", offset: 0.75 },
          { opacity: 0, transform: "translateY(-70px) scale(1)" },
        ], { hide: true, ease: hold ? EASE.back : EASE.lin });

  const lunge = (sel, t, dx) =>
    A(sel, t, 0.5, [
      { transform: "none" },
      { transform: `translateX(${dx}px) rotate(${dx > 0 ? 6 : -6}deg)`, offset: 0.55 },
      { transform: "none" },
    ], { ease: EASE.io });

  const glitchOut = (sel, t) =>
    A(sel, t, 0.5, [
      { opacity: 1, transform: "none", filter: "none" },
      { opacity: 0.8, transform: "skewX(20deg) translateX(20px)", filter: "hue-rotate(90deg) brightness(2)", offset: 0.3 },
      { opacity: 0.4, transform: "skewX(-15deg) translateX(-20px)", filter: "hue-rotate(-90deg)", offset: 0.6 },
      { opacity: 0, transform: "scaleY(0.02)", filter: "brightness(3)" },
    ], { ease: EASE.lin });

  const glitchIn = (sel, t) =>
    A(sel, t, 0.6, [
      { opacity: 0, transform: "scaleY(0.02)", filter: "brightness(3)" },
      { opacity: 0.7, transform: "skewX(-15deg)", filter: "hue-rotate(90deg)", offset: 0.5 },
      { opacity: 1, transform: "none", filter: "none" },
    ], { hide: true, ease: EASE.out });

  const blurIn = (sel, t) =>
    A(sel, t, 1.0, [
      { opacity: 0, transform: "scale(1.35)", filter: "blur(24px)" },
      { opacity: 1, transform: "none", filter: "blur(0)" },
    ], { hide: true, ease: EASE.out });

  const grow = (sel, t, d = 0.7, axis = "X") =>
    A(sel, t, d, [{ transform: `scale${axis}(0)` }, { transform: `scale${axis}(1)` }], { ease: EASE.out });

  const loop = (sel, t0, t1, period, keyframes, o = {}) =>
    A(sel, t0, period, keyframes, {
      iter: Math.max(1, Math.floor((t1 - t0) / period)),
      ease: o.ease ?? EASE.io,
      dir: o.dir ?? "alternate",
      stagger: o.stagger,
      hide: o.hide,
    });

  function C(sel, t0, t1, from, to, ease = "out") {
    els(sel).forEach((el) => {
      if (!counters.has(el)) counters.set(el, []);
      counters.get(el).push({ t0, t1, from, to, ease });
    });
  }

  const at = (sel, times, fn) => els(sel).forEach((el, i) => fn(el, times[i]));

  /* ================================================================
   * CUES
   * ================================================================ */

  // ---- ambient ----
  A("#grid", 0, DURATION, [{ backgroundPosition: "0 0" }, { backgroundPosition: "0 1200px" }], { ease: EASE.lin });
  loop("#glow-a", 0, DURATION, 14, [{ transform: "translate(0,0)" }, { transform: "translate(260px,160px)" }]);
  loop("#glow-b", 0, DURATION, 17, [{ transform: "translate(0,0)" }, { transform: "translate(-240px,-140px)" }]);
  A(".eye", 0, 4, [
    { transform: "scaleY(1)" },
    { transform: "scaleY(1)", offset: 0.9 },
    { transform: "scaleY(0.1)", offset: 0.95 },
    { transform: "scaleY(1)" },
  ], { iter: Math.ceil(DURATION / 4), ease: EASE.lin });
  loop(".bot-head", 0, DURATION, 1.4, [{ transform: "translateY(0)" }, { transform: "translateY(-8px)" }]);
  loop(".bot-core", 0, DURATION, 0.9, [{ opacity: 0.55 }, { opacity: 1 }]);

  // ---- HUD ----
  show("#hud-logo", 18.6, { from: "translateY(-20px)" });
  hide("#hud-logo", 255.3, { to: "translateY(-20px)" });
  window_("#hud-ch-0", 18.6, 28.6);
  window_("#hud-ch-1", 28.8, 44.9);
  window_("#hud-ch-2", 45.0, 121.8);
  window_("#hud-ch-3", 122.0, 160.9);
  window_("#hud-ch-4", 161.0, 255.4);
  window_("#hud-progress", 18.6, 255.4);
  A("#hud-progress-fill", 0, DURATION, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { ease: EASE.lin });

  // ---- S1 INTRO (0 - 18.5) ----
  scene("#s-intro", 0, 18.4, 0.4);
  blurIn("#intro-title", 0.15);
  A("#intro-card-l", 0.5, 0.7, [
    { opacity: 0, transform: "translate(-300px,-500px) rotate(-30deg)" },
    { opacity: 1, transform: "none" },
  ], { hide: true, ease: EASE.back });
  A("#intro-card-r", 0.7, 0.7, [
    { opacity: 0, transform: "translate(300px,-500px) rotate(30deg)" },
    { opacity: 1, transform: "none" },
  ], { hide: true, ease: EASE.back });
  pop("#intro-vs", 1.1);
  A("#intro-card-l", 1.75, 0.5, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-700px) rotate(-20deg)" }], { ease: EASE.in });
  A("#intro-card-r", 1.75, 0.5, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(700px) rotate(20deg)" }], { ease: EASE.in });
  hide("#intro-vs", 1.75, { to: "scale(0.4)" });

  pop("#tag-ahmed", 2.0);
  grow("#tag-strike", 2.7, 0.4);
  hide("#tag-ahmed", 3.3, { to: "scale(0.8)" });

  pop("#bot-main", 3.5, { s: 0.3 });
  show("#bot-bubble", 4.1, { from: "translateX(-30px)" });
  show("#chip-by", 5.8);
  show("#chip-presented", 7.3);
  hide("#bot-bubble", 9.6);
  hide("#chip-by", 9.8);
  hide("#chip-presented", 9.8);
  hide("#intro-title", 9.8);

  move("#bot-main", 10.0, 0.9, "none", "translateX(-420px)");
  show("#bot-opp", 10.6, { from: "translateX(200px)" });
  A("#family-link", 12.0, 0.7, [{ opacity: 0, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)" }], { hide: true });
  hide("#bot-main", 14.2, { from: "translateX(-420px)", to: "translateX(-520px)" });
  hide("#bot-opp", 14.2, { to: "translateX(100px)" });
  hide("#family-link", 14.2, { from: "scaleX(1)", to: "scaleX(1)" });

  pop("#browser", 14.6, { s: 0.85 });
  pop("#br-human", 15.3);
  pop("#br-vs", 16.0);
  pop("#br-ai", 16.4);
  show("#br-caption", 17.0);

  // ---- S2 INDEX (18.5 - 28.6) ----
  scene("#s-index", 18.5, 28.6);
  show("#idx-head", 18.7);
  show("#idx-1", 20.0, { from: "translateX(-60px)" });
  show("#idx-2", 21.2, { from: "translateX(-60px)" });
  show("#idx-3", 22.2, { from: "translateX(-60px)" });
  show("#idx-4", 23.4, { from: "translateX(-60px)" });
  loop("#idx-4-glow", 23.8, 28.4, 0.9, [{ opacity: 0.25 }, { opacity: 1 }]);
  show("#idx-numbers span", 25.4, { from: "translateX(30px)", stagger: 0.35 });

  // ---- S3 INSPIRATION (28.8 - 45) ----
  scene("#s-insp", 28.8, 44.9);
  show("#insp-head", 28.9);
  pop("#insp-left-old", 29.2);
  pop("#insp-right-old", 29.4);
  pop("#insp-i1", 29.8);
  pop("#insp-i2", 30.8);
  pop("#insp-i3", 31.8);
  glitchOut("#insp-left-old", 32.7);
  glitchIn("#insp-left-new", 33.1);
  show("#insp-left-lbl", 33.5, { from: "translateY(20px)" });
  glitchOut("#insp-right-old", 35.2);
  glitchIn("#insp-right-new", 35.6);
  show("#insp-right-lbl", 36.0, { from: "translateY(20px)" });
  show("#insp-c1", 37.6);
  show("#insp-c2", 38.4);
  show("#insp-c3", 39.2);
  show("#insp-m1", 40.8, { from: "translateY(10px)" });
  show("#insp-m2", 41.8, { from: "translateY(10px)" });
  show("#insp-m3", 42.8, { from: "translateY(10px)" });

  // ---- S4 DECK + MACHINES (45 - 66.8) ----
  scene("#s-deck", 45.0, 66.8);
  pop("#deck-main", 45.2, { s: 0.7 });
  C("#deck-n", 45.4, 47.0, 0, 27);
  hide("#deck-main", 49.4, { to: "scale(0.8)" });
  show("#deck-human", 49.6, { from: "translateX(320px)", d: 0.8 });
  show("#deck-ai", 49.6, { from: "translateX(-320px)", d: 0.8 });
  show("#deck-caption", 50.4, { from: "translateY(20px)" });
  loop("#deck-human, #deck-ai", 51.0, 52.5, 0.25, [{ transform: "none" }, { transform: "rotate(-4deg) translateY(-10px)" }]);
  hide("#deck-human", 53.2);
  hide("#deck-ai", 53.2);
  hide("#deck-caption", 53.2);

  show("#mach-head", 53.6);
  show(".mc", 53.8, { from: "translateY(80px) rotate(8deg)", stagger: 0.12 });
  show("#atk-explain", 58.0);
  A(".mc .c-atk", 58.3, 0.6, [{ transform: "scale(1)" }, { transform: "scale(1.5)", offset: 0.4 }, { transform: "scale(1)" }], { stagger: 0.07 });
  hide("#atk-explain", 61.2);
  A("#mc-1, #mc-2, #mc-3, #mc-4, #mc-5, #mc-6, #mc-7, #mc-8, #mc-9", 61.5, 0.5, [{ opacity: 1 }, { opacity: 0.25 }]);
  move("#mc-0", 61.5, 0.6, "none", "translateY(-40px) scale(1.25)", EASE.back);
  show("#callout-drone", 61.8);
  hide("#callout-drone", 64.8);
  A("#mc-0", 65.0, 0.5, [{ opacity: 1, transform: "translateY(-40px) scale(1.25)" }, { opacity: 0.25, transform: "none" }]);
  A("#mc-9", 65.0, 0.6, [{ opacity: 0.25, transform: "none" }, { opacity: 1, transform: "translateY(-40px) scale(1.25)" }], { ease: EASE.back });
  show("#callout-titan", 65.2);
  show("#atk-range", 65.4, { from: "translateY(20px)" });
  grow("#atk-range-fill", 65.6, 1.0);

  // ---- S5 TRAPS (67 - 85) ----
  scene("#s-traps", 67.0, 84.9);
  show("#traps-head", 67.0);
  pop("#traps-grid .tc", 67.1, { stagger: 0.05 });
  hide("#traps-head", 68.7);
  hide("#traps-grid", 68.7, { to: "scale(0.9)" });

  show("#f-firewall", 69.0, { from: "translateX(60px)" });
  A("#fw-arrow", 69.8, 1.0, [{ opacity: 0, transform: "translateX(0)" }, { opacity: 1, transform: "translateX(160px)" }], { hide: true, ease: EASE.in });
  A("#fw-wall", 70.3, 0.5, [{ opacity: 0, transform: "scaleY(0)" }, { opacity: 1, transform: "scaleY(1)" }], { hide: true, ease: EASE.back });
  move("#fw-arrow", 70.8, 0.4, "translateX(160px)", "translateX(60px)", EASE.out);
  stamp("#fw-stamp", 71.0);
  hide("#f-firewall", 72.7, { to: "translateX(-60px)" });

  show("#f-breaker", 73.0, { from: "translateX(60px)" });
  A("#cb-bolt", 74.2, 0.5, [
    { opacity: 0, transform: "translateY(-60px)" },
    { opacity: 1, transform: "none", offset: 0.4 },
    { opacity: 1, transform: "none", offset: 0.7 },
    { opacity: 0, transform: "none" },
  ], { hide: true, ease: EASE.lin });
  explode("#cb-target", 74.6);
  burst("#cb-burst", 74.6);
  stamp("#cb-stamp", 75.0);
  hide("#f-breaker", 76.0, { to: "translateX(-60px)" });

  show("#f-observer", 76.4, { from: "translateX(60px)" });
  floatNum("#ob-plus", 78.0, true);
  C("#ob-atk", 78.0, 79.4, 1600, 2600);
  C("#ob-target .v", 78.0, 79.4, 1600, 2600);
  A("#ob-target", 78.0, 1.0, [
    { filter: "none" },
    { filter: "drop-shadow(0 0 30px #3dff9a) brightness(1.3)", offset: 0.5 },
    { filter: "drop-shadow(0 0 14px #3dff9a)" },
  ]);
  hide("#f-observer", 81.7, { to: "translateX(-60px)" });

  show("#f-rollback", 82.1, { from: "translateX(60px)" });
  A("#rb-fill", 82.9, 1.2, [{ transform: "scaleX(0.625)" }, { transform: "scaleX(0.8125)" }]);
  C("#rb-hp", 82.9, 84.1, 5000, 6500);
  floatNum("#rb-plus", 82.9, true);

  // ---- S6 GIT MERGE (85 - 110) ----
  scene("#s-merge", 85.0, 109.8);
  pop("#gm-hero", 85.1, { s: 0.6 });
  show("#gm-label", 85.5, { from: "translateY(20px)" });
  hide("#gm-label", 87.6);
  move("#gm-hero", 87.8, 0.9, "none", "translateX(-440px) scale(0.8)");
  show("#gm-explain", 88.4);
  show("#xpool", 89.6, { from: "translateX(60px)" });
  pop("#xpool .xp", 90.0, { stagger: 0.25 });
  hide("#gm-hero", 93.0, { from: "translateX(-440px) scale(0.8)", to: "translateX(-440px) scale(0.6)" });
  hide("#gm-explain", 93.0);
  hide("#xpool", 93.0, { to: "translateX(60px)" });

  show("#gm-rx", 93.5, { from: "translateX(-200px)" });
  pop("#gm-plus", 94.3);
  show("#gm-mk", 94.7, { from: "translateX(200px)" });
  A("#gm-rx", 96.1, 0.5, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(430px) scale(0.6)" }], { ease: EASE.in });
  A("#gm-mk", 96.1, 0.5, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-430px) scale(0.6)" }], { ease: EASE.in });
  hide("#gm-plus", 96.1, { to: "scale(0)" });
  burst("#gm-flash", 96.5);
  pop("#gm-nx", 96.7, { s: 0.3 });
  C("#gm-nx .v", 97.0, 98.3, 0, 4000);
  show("#gm-nx-recipe", 97.2, { from: "translateY(20px)" });
  hide("#gm-nx", 98.5, { to: "scale(0.8)" });
  hide("#gm-nx-recipe", 98.5);

  pop("#gm-tx", 99.0, { s: 0.4 });
  C("#gm-tx .v", 99.3, 100.8, 0, 5200);
  show("#gm-tx-label", 99.6, { from: "translateY(20px)" });
  hide("#gm-tx-label", 102.4);
  move("#gm-tx", 102.6, 0.8, "none", "translateX(-400px) scale(0.9)");
  show("#gm-b1", 102.9, { from: "translateX(60px)" });
  show("#gm-b2", 105.7, { from: "translateX(60px)" });

  // ---- S7 GIT CONFLICT (110 - 121.8) ----
  scene("#s-conflict", 110.0, 121.8);
  show("#gc-merge", 110.1, { from: "translateX(-60px)" });
  A("#gc-arrow", 110.4, 0.7, [{ opacity: 0, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)" }], { hide: true });
  A("#gc-ghost", 110.8, 0.6, [{ opacity: 0, transform: "scale(0.8)" }, { opacity: 0.45, transform: "none" }], { hide: true });
  A("#gc-conflict", 111.4, 0.5, [
    { opacity: 0, transform: "translateY(-400px) rotate(20deg)" },
    { opacity: 1, transform: "rotate(4deg)" },
  ], { hide: true, ease: EASE.back });
  stamp("#gc-stamp", 112.1, -6);
  A("#gc-ghost", 112.1, 0.5, [
    { opacity: 0.45, transform: "none", filter: "none" },
    { opacity: 0, transform: "scale(1.2) rotate(6deg)", filter: "blur(8px)" },
  ]);
  A("#gc-arrow", 112.1, 0.4, [{ opacity: 1 }, { opacity: 0.2 }]);
  show("#gc-note", 112.6, { from: "translateY(20px)" });
  hide("#gc-merge", 113.1);
  hide("#gc-arrow", 113.1, { fromOp: 0.2, from: "scaleX(1)", to: "scaleX(1)" });
  hide("#gc-conflict", 113.1, { from: "rotate(4deg)", to: "translateY(-30px) rotate(4deg)" });
  hide("#gc-stamp", 113.1, { from: "rotate(-6deg)", to: "rotate(-6deg) scale(0.8)" });
  hide("#gc-note", 113.1);

  show("#gc-head", 113.5);
  pop("#gc-modal", 116.8, { s: 0.85 });
  show("#gc-cursor", 117.8, { from: "translate(40px,40px)" });
  move("#gc-cursor", 118.4, 0.9, "none", "translate(-560px,-290px)");
  A("#gc-btn-conflict", 119.2, 0.4, [
    { background: "#0f1a2e", boxShadow: "0 0 0 rgba(255,90,78,0)" },
    { background: "rgba(255,90,78,0.25)", boxShadow: "0 0 30px rgba(255,90,78,0.7)" },
  ]);
  A("#gc-btn-conflict", 120.3, 0.3, [
    { background: "rgba(255,90,78,0.25)", boxShadow: "0 0 30px rgba(255,90,78,0.7)" },
    { background: "#0f1a2e", boxShadow: "0 0 0 rgba(255,90,78,0)" },
  ]);
  move("#gc-cursor", 120.2, 0.7, "translate(-560px,-290px)", "translate(-270px,-290px)");
  A("#gc-btn-allow", 120.8, 0.4, [
    { background: "#0f1a2e", borderColor: "#22324e", boxShadow: "0 0 0 rgba(60,239,255,0)" },
    { background: "rgba(60,239,255,0.2)", borderColor: "#3cefff", boxShadow: "0 0 30px rgba(60,239,255,0.6)" },
  ]);

  // ---- S8 RULES (122 - 137.8) ----
  scene("#s-rules", 122.0, 137.8);
  show("#r-hp-h", 122.1, { from: "translateX(-60px)" });
  show("#r-hp-a", 122.2, { from: "translateX(60px)" });
  grow("#r-fill-h", 122.3, 1.5);
  grow("#r-fill-a", 122.3, 1.5);
  C("#r-hp-h-v", 122.3, 123.8, 0, 8000);
  C("#r-hp-a-v", 122.3, 123.8, 0, 8000);
  show("#r-hand-h .cardback", 123.7, { from: "translateY(-60px) rotate(-10deg)", stagger: 0.1 });
  show("#r-hand-a .cardback", 123.7, { from: "translateY(-60px) rotate(10deg)", stagger: 0.1 });
  show("#r-hand-lbl", 124.4, { from: "translateY(10px)" });
  pop("#r-draw", 125.6);
  show("#r-phases", 127.2);
  A("#r-ph-main", 128.0, 0.4, [
    { background: "rgba(10,18,32,0.88)", color: "#7d8fad", borderColor: "#22324e", boxShadow: "0 0 0 rgba(60,239,255,0)" },
    { background: "rgba(60,239,255,0.16)", color: "#3cefff", borderColor: "#3cefff", boxShadow: "0 0 30px rgba(60,239,255,0.5)" },
  ]);
  show("#r-t1", 128.3, { from: "translateY(60px)" });
  show("#r-t2", 130.1, { from: "translateY(60px)" });
  show("#r-t3", 132.8, { from: "translateY(60px)" });
  show("#r-t4", 134.8, { from: "translateY(60px)" });

  // ---- S9 COMBAT (138 - 161) ----
  scene("#s-combat", 138.0, 160.9);
  show("#cb-phases", 138.1, { from: "translateY(-20px)" });
  A("#cb-ph-battle", 138.5, 0.4, [
    { background: "rgba(10,18,32,0.88)", color: "#7d8fad", borderColor: "#22324e", boxShadow: "0 0 0 rgba(255,90,78,0)" },
    { background: "rgba(255,90,78,0.18)", color: "#ff5a4e", borderColor: "#ff5a4e", boxShadow: "0 0 30px rgba(255,90,78,0.5)" },
  ]);
  show("#cb-once", 139.0);
  hide("#cb-once", 143.1);
  pop("#cb-vs", 143.5);
  hide("#cb-vs", 145.0, { to: "scale(0.6)" });

  window_("#clip1", 145.4, 148.8);
  show("#c1-a", 145.5, { from: "translateX(-80px)" });
  show("#c1-d", 145.5, { from: "translateX(80px)" });
  lunge("#c1-a", 146.1, 480);
  explode("#c1-d", 146.5);
  burst("#c1-burst", 146.5);
  floatNum("#c1-dmg", 146.8);

  window_("#clip2", 149.0, 152.3);
  show("#c2-a", 149.1, { from: "translateX(-80px)" });
  show("#c2-d", 149.1, { from: "translateX(80px)" });
  lunge("#c2-a", 149.6, 480);
  explode("#c2-a", 150.0);
  burst("#c2-burst", 150.0);
  floatNum("#c2-dmg", 150.3);

  window_("#clip3", 152.5, 154.8);
  show("#c3-a", 152.55, { from: "translateX(-80px)", d: 0.4 });
  show("#c3-d", 152.55, { from: "translateX(80px)", d: 0.4 });
  lunge("#c3-a", 153.0, 300);
  lunge("#c3-d", 153.0, -300);
  explode("#c3-a", 153.3);
  explode("#c3-d", 153.3);
  burst("#c3-burst-l", 153.3);
  burst("#c3-burst-r", 153.3);
  floatNum("#c3-dmg", 153.6);

  A("#clip4", 155.0, 0.35, [{ opacity: 0 }, { opacity: 1 }], { hide: true, ease: EASE.lin });
  show("#c4-a", 155.1, { from: "translateX(-80px)" });
  lunge("#c4-a", 156.1, 560);
  floatNum("#c4-dmg", 156.5);
  A("#c4-fill", 155.0, 0.01, [{ transform: "scaleX(0.7)" }, { transform: "scaleX(0.7)" }]);
  A("#c4-fill", 156.5, 1.0, [{ transform: "scaleX(0.7)" }, { transform: "scaleX(0.35)" }]);
  C("#c4-hp", 156.5, 157.5, 5600, 2800);
  lunge("#c4-a", 158.9, 560);
  floatNum("#c4-dmg2", 159.3);
  A("#c4-fill", 159.3, 0.7, [{ transform: "scaleX(0.35)" }, { transform: "scaleX(0)" }]);
  C("#c4-hp", 159.3, 160.0, 2800, 0);
  pop("#win-banner", 159.9);

  // ---- S10 AI TITLE (161 - 164) ----
  scene("#s-aititle", 161.0, 164.0, 0.35);
  pop("#ai-title", 161.1, { s: 0.7 });
  loop(".brain span", 161.1, 164.0, 0.5, [{ opacity: 0.3 }, { opacity: 1 }], { stagger: 0.12 });

  // ---- S11 ENGINE (164 - 173.4) ----
  scene("#s-engine", 164.0, 173.4, 0.35);
  pop("#en-ui", 164.1);
  stamp("#en-ui-stamp", 164.9, -4);
  hide("#en-ui", 166.0);
  hide("#en-ui-stamp", 166.0, { from: "rotate(-4deg)", to: "rotate(-4deg) scale(0.8)" });
  show("#en-human", 166.3, { from: "translateX(-60px)" });
  show("#en-ai", 166.3, { from: "translateX(60px)" });
  pop("#en-engine", 166.5);
  grow("#en-line-l i", 166.9, 0.6);
  grow("#en-line-r i", 166.9, 0.6);
  const packet = (dx) => [
    { opacity: 0, transform: "translateX(0)" },
    { opacity: 1, transform: `translateX(${dx * 0.3}px)`, offset: 0.2 },
    { opacity: 1, transform: `translateX(${dx * 0.85}px)`, offset: 0.8 },
    { opacity: 0, transform: `translateX(${dx}px)` },
  ];
  A("#en-pk-l", 167.4, 1.2, packet(200), { hide: true, iter: 5, ease: EASE.lin });
  A("#en-pk-r", 167.4, 1.2, packet(-200), { hide: true, iter: 5, ease: EASE.lin });
  loop("#en-engine", 168.0, 173.4, 0.6, [
    { boxShadow: "0 0 30px rgba(255,176,32,0.2)" },
    { boxShadow: "0 0 90px rgba(255,176,32,0.6)" },
  ]);
  pop("#en-badge", 170.6);

  // ---- S12 PIPELINE (173.5 - 235.4) ----
  scene("#s-pipe", 173.5, 235.4, 0.35);
  show("#steps .step", 173.8, { from: "translateY(-40px)", stagger: 0.45 });
  pop("#steps-intro", 173.7, { s: 0.8 });
  hide("#steps-intro", 176.1);
  window_("#st-1-on", 176.5, 183.0);
  window_("#st-2-on", 183.0, 196.0);
  window_("#st-3-on", 196.0, 221.1);
  window_("#st-4-on", 221.1, 235.3);

  // Step 1: legal actions
  scene("#b1", 176.5, 182.9, 0.3);
  at("#b1 .act", [177.3, 177.8, 178.8, 179.5, 180.2, 181.3, 182.0], (el, t) => pop(el, t, { s: 0.7 }));
  show("#b1 .b1-count", 177.3, { from: "translateY(20px)" });
  C("#b1-n", 177.3, 182.0, 0, 7, "lin");

  // Step 2: simulate on clones
  scene("#b2", 183.0, 195.8, 0.3);
  pop("#b2-real", 183.2, { s: 0.8 });
  at("#b2 .board--clone", [184.0, 184.25, 184.5, 184.75], (el, t) => {
    const dx = { "b2-c1": 600, "b2-c2": 200, "b2-c3": -200, "b2-c4": -600 }[el.id];
    show(el, t, { from: `translate(${dx}px,-360px) scale(0.6)`, d: 0.8 });
  });
  at("#b2 .board__res", [185.4, 185.85, 186.3, 186.75], (el, t) => pop(el, t));
  pop("#b2-q", 188.0);
  show("#b2-lock", 192.6, { from: "translateY(10px)" });
  A("#b2-real", 192.6, 0.6, [
    { borderColor: "#3cefff", boxShadow: "0 0 0 rgba(61,255,154,0)" },
    { borderColor: "#3dff9a", boxShadow: "0 0 50px rgba(61,255,154,0.5)" },
  ]);
  pop("#b2 .sandbox", 193.0, { stagger: 0.12 });

  // Step 3: evaluate
  scene("#b3", 196.0, 221.0, 0.3);
  show("#b3-clones .mini-clone", 196.2, { stagger: 0.15 });
  pop("#b3-clones .score-pop", 197.0, { stagger: 0.35 });
  hide("#b3-clones", 200.3);
  show("#b3-chart .chart__head", 200.6, { from: "translateY(20px)" });
  show("#b3-chart .chart__axis", 200.8, { from: "none" });
  at("#b3-chart .frow", [202.8, 205.1, 207.1, 209.0, 211.2, 214.4, 217.2, 220.1], (el, t) => {
    show(el, t, { from: "translateX(-30px)", d: 0.5 });
    grow(el.querySelector(".frow__bar"), t + 0.15, 0.7);
    if (el.querySelector(".frow__bar.big")) {
      A(el.querySelector(".frow__bar"), t + 0.9, 0.6, [{ filter: "brightness(1)" }, { filter: "brightness(1.9)", offset: 0.5 }, { filter: "brightness(1)" }]);
    }
  });

  // Step 4a: winning move first
  scene("#b4a", 221.2, 224.3, 0.3);
  show("#b4a-r1, #b4a-r2, #b4a-r3", 221.3, { stagger: 0.1 });
  A("#b4a-win", 221.9, 0.9, [
    { opacity: 0, transform: "translateY(384px)" },
    { opacity: 1, transform: "translateY(384px)", offset: 0.3 },
    { opacity: 1, transform: "none" },
  ], { hide: true, ease: EASE.io });
  pop("#b4a-note", 222.6);

  // Step 4b: highest score, random among near-ties
  scene("#b4b", 224.4, 231.3, 0.3);
  show("#b4b .cand", 224.5, { stagger: 0.08, from: "translateY(20px)" });
  window_("#b4b-top", 225.2, 226.6);
  show("#b4b-top-lbl", 225.3, { from: "translateX(-30px)" });
  hide("#b4b-top-lbl", 226.4);
  A("#b4b-bracket", 226.6, 0.5, [{ opacity: 0, transform: "scaleY(0)" }, { opacity: 1, transform: "scaleY(1)" }], { hide: true });
  (() => {
    const seq = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1];
    const weights = seq.map((_, k) => 1 + k * 0.35);
    const total = weights.reduce((a, b) => a + b, 0);
    const frames = [];
    let acc = 0;
    seq.forEach((row, k) => {
      const start = acc / total;
      acc += weights[k];
      const end = acc / total;
      const y = `translateY(${row * 86}px)`;
      frames.push({ offset: start, transform: y, opacity: 1 });
      frames.push({ offset: Math.max(start, end - 0.004), transform: y, opacity: 1 });
    });
    frames[frames.length - 1].offset = 1;
    A("#b4b-pick", 227.4, 3.0, frames, { hide: true, ease: EASE.lin });
  })();
  pop("#b4b-rand", 230.5);

  // Step 4c: dispatch and loop
  scene("#b4c", 231.4, 235.3, 0.3);
  show("#b4c-chip", 231.5, { from: "translateX(-60px)" });
  pop("#b4c .b4c-engine", 231.6);
  A("#b4c-chip", 232.2, 0.9, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(860px) scale(0.6)" }], { ease: EASE.in });
  A("#b4c .b4c-engine", 233.0, 0.6, [
    { boxShadow: "0 0 60px rgba(255,176,32,0.25)" },
    { boxShadow: "0 0 120px rgba(255,176,32,0.9)", offset: 0.4 },
    { boxShadow: "0 0 60px rgba(255,176,32,0.25)" },
  ]);
  show("#b4c-loop", 232.9, { from: "translateY(20px)" });
  A("#b4c-ring", 232.9, 1.0, [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { iter: 3, ease: EASE.lin });

  // ---- S13 FAIR PLAY (235.6 - 241) ----
  scene("#s-fair", 235.6, 240.9, 0.35);
  pop("#fair-eye", 235.8);
  A("#fair-slash", 236.4, 0.4, [{ transform: "rotate(-25deg) scaleX(0)" }, { transform: "rotate(-25deg) scaleX(1)" }]);
  show("#fair-head", 236.2);
  show("#fair-hand .cardback", 236.6, { from: "translateY(60px)", stagger: 0.1 });
  show("#fair-vis-lbl", 238.3, { from: "translateY(10px)" });
  pop("#fair-vis .pill", 238.6, { stagger: 0.25 });

  // ---- S14 AI DEBUGGER (241 - 255.5) ----
  scene("#s-debug", 241.0, 255.5, 0.35);
  show("#dbg", 241.1, { from: "translateX(-80px)" });
  A("#dbg-tab", 241.7, 0.5, [
    { boxShadow: "0 0 0 rgba(60,239,255,0)" },
    { boxShadow: "0 0 30px rgba(60,239,255,0.8)" },
  ], { iter: 2, dir: "alternate" });
  window_("#dbg-hl1", 243.9, 246.0);
  show("#dbg-co1", 244.1, { from: "translateX(-30px)" });
  window_("#dbg-hl2", 246.0, 248.4);
  show("#dbg-co2", 246.2, { from: "translateX(-30px)" });
  window_("#dbg-hl3", 248.4, 250.9);
  show("#dbg-co3", 248.6, { from: "translateX(-30px)" });
  pop("#bbox", 251.0);
  A("#bbox-lid", 251.8, 0.7, [{ transform: "none" }, { transform: "translate(-30px,-60px) rotate(-40deg)" }], { ease: EASE.back });
  A("#bbox-rays", 252.0, 0.8, [{ opacity: 0 }, { opacity: 1 }], { hide: true });
  A("#bbox .bbox__body", 252.0, 0.6, [{ color: "#2a3348" }, { color: "#ffd54a" }]);
  show("#bbox-lbl", 252.3);
  show("#bbox-sub", 253.4, { from: "translateY(10px)" });

  // ---- S15 OUTRO (255.7 - end) ----
  scene("#s-outro", 255.7, null);
  blurIn("#out-logo", 255.9);
  show("#out-t1", 256.6);
  show("#out-t2", 258.2);
  show("#out-bot", 261.5, { from: "translateX(-80px)" });
  pop("#out-thanks", 261.9);
  pop("#out-btn", 263.6);
  loop("#out-btn", 264.3, DURATION, 0.8, [
    { boxShadow: "0 0 30px rgba(60,239,255,0.4)" },
    { boxShadow: "0 0 90px rgba(60,239,255,1)" },
  ]);
  show("#out-dare", 265.2);
  show("#out-credit", 266.0, { from: "translateY(10px)" });

  /* ================================================================
   * ENGINE
   * ================================================================ */

  specs
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .forEach(({ el, t, d, keyframes, o }) => {
      const a = el.animate(keyframes, {
        duration: d * 1000,
        delay: t * 1000,
        fill: "forwards",
        easing: o.ease || EASE.out,
        iterations: o.iter || 1,
        direction: o.dir || "normal",
      });
      a.pause();
      anims.push(a);
    });

  const counterList = [...counters.entries()].map(([el, list]) => [el, list.sort((a, b) => a.t0 - b.t0)]);
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);

  function renderCounters(t) {
    for (const [el, list] of counterList) {
      let cur = list[0];
      let value = cur.from;
      for (const c of list) if (t >= c.t0) cur = c;
      if (t >= cur.t0) {
        const p = Math.min(1, Math.max(0, (t - cur.t0) / (cur.t1 - cur.t0)));
        value = cur.from + (cur.to - cur.from) * (cur.ease === "lin" ? p : easeOutCubic(p));
      }
      const text = String(Math.round(value));
      if (el.textContent !== text) el.textContent = text;
    }
  }

  const params = new URLSearchParams(location.search);
  const audio = document.getElementById("audio");
  const overlay = document.getElementById("start-overlay");
  const timecode = document.getElementById("timecode");
  if (params.get("hud") === "1") timecode.classList.add("on");

  let playing = false;
  let useAudio = false;
  let base = Math.max(0, Number(params.get("t")) || 0);
  let startPerf = 0;

  const now = () => {
    if (useAudio && playing) return audio.currentTime;
    if (!playing) return base;
    return base + (performance.now() - startPerf) / 1000;
  };

  function render(t) {
    const clamped = Math.min(t, DURATION);
    const ms = clamped * 1000;
    for (const a of anims) a.currentTime = ms;
    renderCounters(clamped);
    if (timecode.classList.contains("on")) {
      const m = Math.floor(clamped / 60);
      const s = (clamped % 60).toFixed(2).padStart(5, "0");
      timecode.textContent = `${m}:${s}`;
    }
    if (clamped >= DURATION && !MG.done) {
      MG.done = true;
      document.body.dataset.done = "true";
    }
  }

  function frame() {
    const t = now();
    render(t);
    if (playing && t >= DURATION) {
      base = DURATION;
      playing = false;
    }
    requestAnimationFrame(frame);
  }

  function fitStage() {
    const stage = document.getElementById("stage");
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    const x = (window.innerWidth - 1920 * scale) / 2;
    const y = (window.innerHeight - 1080 * scale) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  const MG = {
    duration: DURATION,
    ready: false,
    done: false,
    get time() {
      return now();
    },
    play(from) {
      if (from != null) base = from;
      useAudio = false;
      MG.done = base >= DURATION;
      startPerf = performance.now();
      playing = true;
      overlay.hidden = true;
    },
    async playWithAudio(from) {
      if (from != null) base = from;
      audio.currentTime = base;
      await audio.play();
      useAudio = true;
      playing = true;
      overlay.hidden = true;
    },
    pause() {
      base = now();
      playing = false;
      if (useAudio) audio.pause();
    },
    seek(t) {
      base = Math.max(0, Math.min(DURATION, t));
      MG.done = false;
      if (useAudio) audio.currentTime = base;
      if (playing && !useAudio) startPerf = performance.now();
      render(base);
    },
  };
  window.MG = MG;

  window.addEventListener("resize", fitStage);
  fitStage();
  render(base);
  requestAnimationFrame(frame);

  document.getElementById("btn-audio").addEventListener("click", () => MG.playWithAudio());
  document.getElementById("btn-silent").addEventListener("click", () => MG.play());
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (playing) MG.pause();
      else if (useAudio) MG.playWithAudio();
      else MG.play();
    }
    if (e.code === "ArrowRight") MG.seek(now() + 5);
    if (e.code === "ArrowLeft") MG.seek(now() - 5);
  });

  const mode = params.get("mode");
  if (mode === "record" || params.get("autoplay") === "1") overlay.hidden = true;

  const artUrls = Object.keys(window.MG_CARDS).map((id) => `../assets/cards/${id}.jpg`);
  const preload = artUrls.map(
    (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = resolve;
        img.src = src;
      }),
  );
  Promise.all([document.fonts.ready, ...preload]).then(() => {
    MG.ready = true;
    document.body.dataset.ready = "true";
    render(base);
    if (params.get("autoplay") === "1") MG.play();
  });
})();
