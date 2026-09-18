function svg(hue, body) {
  return `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="g${hue}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue}, 80%, 18%)"/>
        <stop offset="100%" stop-color="hsl(${hue}, 90%, 8%)"/>
      </linearGradient>
    </defs>
    <rect width="160" height="120" fill="url(#g${hue})"/>
    <g opacity="0.25" stroke="hsl(${hue}, 90%, 70%)" fill="none">
      <path d="M0 90 H160 M20 0 V120 M140 0 V120"/>
    </g>
    ${body}
  </svg>`;
}

function machineBody(hue, shape) {
  const glow = `hsl(${hue}, 95%, 62%)`;
  const steel = `hsl(${hue}, 20%, 78%)`;
  const dark = `hsl(${hue}, 30%, 22%)`;
  const core = `hsl(${hue}, 100%, 68%)`;

  const frames = {
    drone: `
      <ellipse cx="80" cy="62" rx="36" ry="16" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <rect x="44" y="54" width="72" height="10" rx="2" fill="${steel}"/>
      <circle cx="80" cy="58" r="8" fill="${core}"/>
      <path d="M30 58 L12 48 M130 58 L148 48 M30 66 L14 78 M130 66 L146 78" stroke="${glow}" stroke-width="3"/>
      <circle cx="80" cy="36" r="6" fill="${steel}"/><path d="M80 20 V30" stroke="${glow}" stroke-width="2"/>`,
    probe: `
      <polygon points="80,24 108,70 80,96 52,70" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <circle cx="80" cy="62" r="10" fill="${core}"/>
      <path d="M52 70 L28 86 M108 70 L132 86" stroke="${steel}" stroke-width="4"/>`,
    walker: `
      <rect x="58" y="28" width="44" height="38" rx="6" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <rect x="66" y="36" width="28" height="12" fill="${core}"/>
      <path d="M62 66 L48 100 M98 66 L112 100 M80 66 V92" stroke="${steel}" stroke-width="6" stroke-linecap="square"/>
      <circle cx="80" cy="20" r="7" fill="${steel}"/>`,
    jet: `
      <polygon points="80,18 120,70 80,58 40,70" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <polygon points="80,34 92,70 80,88 68,70" fill="${core}"/>
      <path d="M40 70 L22 92 M120 70 L138 92" stroke="${steel}" stroke-width="4"/>`,
    biped: `
      <rect x="60" y="26" width="40" height="34" rx="4" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <rect x="70" y="34" width="20" height="8" fill="${core}"/>
      <path d="M68 60 L54 98 M92 60 L106 98" stroke="${steel}" stroke-width="7"/>
      <rect x="50" y="18" width="60" height="10" fill="${steel}"/>`,
    striker: `
      <polygon points="50,30 110,30 124,78 36,78" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <rect x="68" y="38" width="24" height="16" fill="${core}"/>
      <path d="M48 78 L40 104 M112 78 L120 104" stroke="${steel}" stroke-width="6"/>
      <path d="M36 50 H20 M124 50 H140" stroke="${glow}" stroke-width="3"/>`,
    soldier: `
      <rect x="62" y="22" width="36" height="28" rx="3" fill="${steel}"/>
      <rect x="56" y="50" width="48" height="28" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <rect x="70" y="56" width="20" height="10" fill="${core}"/>
      <path d="M64 78 L52 108 M96 78 L108 108" stroke="${steel}" stroke-width="6"/>`,
    siege: `
      <rect x="40" y="48" width="80" height="36" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <rect x="70" y="22" width="20" height="40" fill="${steel}"/>
      <circle cx="80" cy="24" r="10" fill="${core}"/>
      <circle cx="52" cy="92" r="10" fill="${steel}"/><circle cx="108" cy="92" r="10" fill="${steel}"/>`,
    guardian: `
      <path d="M80 16 L124 40 V88 L80 108 L36 88 V40 Z" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <circle cx="80" cy="58" r="14" fill="${core}"/>
      <path d="M80 16 V108" stroke="${steel}" stroke-width="2" opacity="0.6"/>`,
    titan: `
      <rect x="48" y="20" width="64" height="52" fill="${dark}" stroke="${glow}" stroke-width="3"/>
      <rect x="60" y="32" width="40" height="14" fill="${core}"/>
      <path d="M56 72 L36 110 M104 72 L124 110 M80 72 V110" stroke="${steel}" stroke-width="8"/>
      <circle cx="80" cy="18" r="8" fill="${steel}"/>`,
    "fusion-nx": `
      <polygon points="80,12 130,60 80,108 30,60" fill="${dark}" stroke="${glow}" stroke-width="3"/>
      <polygon points="80,32 108,60 80,88 52,60" fill="${core}"/>
      <path d="M30 60 H10 M130 60 H150" stroke="${glow}" stroke-width="3"/>`,
    "fusion-px": `
      <rect x="34" y="28" width="92" height="64" fill="${dark}" stroke="${glow}" stroke-width="3"/>
      <path d="M34 60 H126 M80 28 V92" stroke="${steel}" stroke-width="2"/>
      <circle cx="80" cy="60" r="16" fill="${core}"/>`,
    "fusion-tx": `
      <path d="M20 96 L80 12 L140 96 Z" fill="${dark}" stroke="${glow}" stroke-width="3"/>
      <path d="M48 96 L80 36 L112 96 Z" fill="${core}"/>
      <rect x="72" y="88" width="16" height="20" fill="${steel}"/>`,
    "fusion-ax": `
      <polygon points="80,20 150,64 80,52 10,64" fill="${dark}" stroke="${glow}" stroke-width="2"/>
      <polygon points="80,20 96,70 80,100 64,70" fill="${core}"/>
      <path d="M24 70 L8 92 M136 70 L152 92" stroke="${glow}" stroke-width="3"/>`,
  };
  return frames[shape] ?? frames.walker;
}

function trapMotif(hue, motif) {
  const glow = `hsl(${hue}, 95%, 66%)`;
  const ink = `hsl(${hue}, 80%, 78%)`;
  const common = `<text x="16" y="22" fill="${ink}" font-size="9" font-family="monospace" opacity="0.7">SYS://TRAP</text>`;
  const motifs = {
    merge: `${common}<path d="M40 90 V50 H80 V90 M80 50 H120 V90" stroke="${glow}" stroke-width="4" fill="none"/><circle cx="80" cy="40" r="8" fill="${glow}"/>`,
    conflict: `${common}<path d="M50 40 L110 92 M110 40 L50 92" stroke="${glow}" stroke-width="6"/><rect x="68" y="54" width="24" height="24" fill="none" stroke="${ink}"/>`,
    cherry: `${common}<path d="M80 36 C80 36 52 48 52 72 C52 88 80 96 80 96 C80 96 108 88 108 72 C108 48 80 36 80 36" fill="none" stroke="${glow}" stroke-width="3"/><circle cx="64" cy="70" r="8" fill="${glow}"/><circle cx="96" cy="66" r="7" fill="${ink}"/>`,
    limit: `${common}<rect x="36" y="40" width="88" height="56" fill="none" stroke="${glow}" stroke-width="3"/><path d="M48 68 H112" stroke="${ink}" stroke-width="8"/><text x="58" y="74" fill="#071018" font-size="14" font-family="monospace">1x</text>`,
    firewall: `${common}<path d="M40 92 V52 L80 32 L120 52 V92" stroke="${glow}" stroke-width="4" fill="none"/><path d="M56 92 V64 H104 V92" stroke="${ink}" stroke-width="3" fill="none"/>`,
    deadlock: `${common}<rect x="52" y="40" width="56" height="56" rx="6" fill="none" stroke="${glow}" stroke-width="4"/><circle cx="80" cy="68" r="10" fill="none" stroke="${ink}" stroke-width="3"/><path d="M80 58 V68 H88" stroke="${ink}" stroke-width="3"/>`,
    breaker: `${common}<path d="M70 28 L86 56 H70 L90 96" stroke="${glow}" stroke-width="6" fill="none"/><rect x="42" y="86" width="76" height="8" fill="${ink}"/>`,
    observer: `${common}<circle cx="80" cy="68" r="28" fill="none" stroke="${glow}" stroke-width="3"/><circle cx="80" cy="68" r="10" fill="${glow}"/><path d="M80 40 V32 M80 96 V104 M52 68 H44 M108 68 H116" stroke="${ink}" stroke-width="2"/>`,
    bug: `${common}<circle cx="80" cy="64" r="18" fill="none" stroke="${glow}" stroke-width="3"/><path d="M62 48 L48 36 M98 48 L112 36 M62 80 L48 96 M98 80 L112 96 M80 46 V32" stroke="${ink}" stroke-width="3"/>`,
    rollback: `${common}<path d="M110 70 A30 30 0 1 1 80 40" stroke="${glow}" stroke-width="6" fill="none"/><polygon points="70,28 90,40 70,52" fill="${glow}"/>`,
    hotfix: `${common}<rect x="70" y="36" width="20" height="56" fill="${glow}"/><rect x="52" y="54" width="56" height="20" fill="${ink}"/>`,
    factory: `${common}<rect x="36" y="58" width="88" height="40" fill="none" stroke="${glow}" stroke-width="3"/><path d="M48 58 V40 H72 V58 M88 58 V36 H112 V58" stroke="${ink}" stroke-width="3"/>`,
  };
  return motifs[motif] ?? motifs.limit;
}

export function cardArtSvg(def) {
  if (def.type === "monster") {
    return svg(def.art.hue, machineBody(def.art.hue, def.art.shape));
  }
  return svg(def.art.hue, trapMotif(def.art.hue, def.art.motif));
}
