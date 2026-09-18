/**
 * Extra Pool — fusion frames. Not drawn. Summoned only by Git Merge recipes.
 */
export const EXTRA_POOL = [
  {
    id: "nx-00",
    name: "NX-00",
    type: "monster",
    attack: 4000,
    tags: ["mechanical", "fusion", "heavy"],
    extra: true,
    subtitle: "Merged Patrol Frame",
    description: "RX-17 and MK-04 locked into a single combat spine.",
    art: { hue: 175, shape: "fusion-nx" },
  },
  {
    id: "px-01",
    name: "PX-01",
    type: "monster",
    attack: 4500,
    tags: ["mechanical", "fusion", "heavy"],
    extra: true,
    subtitle: "Merged Assault Frame",
    description: "UNIT-08 and VX-09 compiled into a siege hybrid.",
    art: { hue: 280, shape: "fusion-px" },
  },
  {
    id: "tx-max",
    name: "TX-MAX",
    type: "monster",
    attack: 5200,
    tags: ["mechanical", "fusion", "heavy"],
    extra: true,
    subtitle: "Merged Bastion Frame",
    description: "TITAN-03 and SENTINEL-09 fused into a fortress engine.",
    art: { hue: 348, shape: "fusion-tx" },
  },
  {
    id: "ax-7",
    name: "AX-7",
    type: "monster",
    attack: 3400,
    tags: ["mechanical", "fusion", "air"],
    extra: true,
    subtitle: "Merged Interdictor",
    description: "AERO-12 and DRONE-21 bound as a swarm-wing.",
    art: { hue: 160, shape: "fusion-ax" },
  },
];

/**
 * Git Merge recipes. Order of materials does not matter.
 */
export const FUSION_RECIPES = [
  { materials: ["rx-17", "mk-04"], result: "nx-00" },
  { materials: ["unit-08", "vx-09"], result: "px-01" },
  { materials: ["titan-03", "sentinel-09"], result: "tx-max" },
  { materials: ["aero-12", "drone-21"], result: "ax-7" },
];

export function findFusionRecipe(cardIdA, cardIdB) {
  const key = [cardIdA, cardIdB].sort().join("+");
  return FUSION_RECIPES.find((recipe) => {
    const recipeKey = [...recipe.materials].sort().join("+");
    return recipeKey === key;
  }) ?? null;
}
