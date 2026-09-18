/**
 * Tunable evaluation weights. Change these without touching AI control flow.
 */
export const WEIGHTS = {
  hp: 0.12,
  boardAtk: 0.45,
  boardCount: 70,
  damagePotential: 0.55,
  incomingThreat: 0.5,
  lethal: 4000,
  survivePenalty: 3200,
  handMonster: 0.12,
  handTrapPlayable: 28,
  handTrapHeld: 10,
  fusionReady: 180,
  fusionAlmost: 70,
  extraFrame: 8,
  graveyardAtk: 0.02,
  emptyFieldPenalty: 90,
  overkillHpCap: 1,
};

export const AI_CONFIG = {
  equalScoreEpsilon: 1.5,
};
