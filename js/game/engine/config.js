/**
 * Centralized prototype assumptions.
 * If a rule was not specified in the master prompt, it lives here.
 */
export const CONFIG = {
  startingHp: 8000,
  maxHp: 8000,
  startingHand: 5,
  maxField: 5,
  maxHand: 10,
  drawPerTurn: 1,
  firstPlayer: "human",
  maxAttacksPerMonster: 1,
  maxNormalSummonsPerTurn: 1,
  tieScoreEpsilon: 1.5,
  aiActionDelayMs: 1000,
  phaseDelayMs: 280,

  draw: {
    viableHandThreshold: 22,
    minUsefulScore: 16,
    futureMonsterWeight: 0.18,
    futureTrapValue: 12,
    unplayableTrapValue: 6,
  },

  effects: {
    /** Restrictive traps played in your Main Phase last through the opponent's next turn. */
    opponentRestrictionExtraTurns: 1,
    observerAtkBonus: 1000,
    bugInjectionAtkPenalty: 1000,
    rollbackHeal: 1500,
    hotfixHeal: 1200,
    circuitBreaker: { type: "DESTROY_MONSTER", target: "OPPONENT_MONSTER" },
  },

  /**
   * Traps are played during your Main Phase, except:
   * - Git Conflict, which answers a pending Git Merge.
   * Rate Limiter / Firewall / Deadlock therefore expire after the opponent's next turn.
   */
  trapTiming: {
    default: "OWN_MAIN",
    response: ["git-conflict"],
  },
};

export const PLAYER = {
  HUMAN: "human",
  AI: "ai",
};

export const PHASE = {
  DRAW: "draw",
  MAIN: "main",
  BATTLE: "battle",
  END: "end",
};

export const CARD_TYPE = {
  MONSTER: "monster",
  TRAP: "trap",
};

export const ACTION = {
  DRAW: "DRAW",
  SUMMON: "SUMMON",
  ACTIVATE_TRAP: "ACTIVATE_TRAP",
  ATTACK: "ATTACK",
  ADVANCE_PHASE: "ADVANCE_PHASE",
  RESPOND: "RESPOND",
  PASS_RESPONSE: "PASS_RESPONSE",
};

export const EFFECT = {
  MODIFY_ATK: "MODIFY_ATK",
  MODIFY_HP: "MODIFY_HP",
  DESTROY_MONSTER: "DESTROY_MONSTER",
  LIMIT_ATTACKS: "LIMIT_ATTACKS",
  PREVENT_DIRECT_ATTACKS: "PREVENT_DIRECT_ATTACKS",
  PREVENT_ATTACK: "PREVENT_ATTACK",
  TEMPORARY_CONTROL: "TEMPORARY_CONTROL",
  FUSION: "FUSION",
  CANCEL_ACTION: "CANCEL_ACTION",
  DRAW_CARDS: "DRAW_CARDS",
};

export const DURATION = {
  END_OF_TURN: "END_OF_TURN",
  UNTIL_OPPONENT_END: "UNTIL_OPPONENT_END",
};

export function opponentId(playerId) {
  return playerId === PLAYER.HUMAN ? PLAYER.AI : PLAYER.HUMAN;
}
