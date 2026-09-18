/**
 * Generic combat resolution. No card-specific branches.
 *
 * Direct attack: defenderAtk is null.
 */
export function resolveCombat(attackerAtk, defenderAtk) {
  if (defenderAtk == null) {
    return {
      attackerDestroyed: false,
      defenderDestroyed: false,
      damageToDefenderOwner: attackerAtk,
      damageToAttackerOwner: 0,
      diff: attackerAtk,
    };
  }

  const diff = attackerAtk - defenderAtk;
  if (diff > 0) {
    return {
      attackerDestroyed: false,
      defenderDestroyed: true,
      damageToDefenderOwner: diff,
      damageToAttackerOwner: 0,
      diff,
    };
  }
  if (diff < 0) {
    return {
      attackerDestroyed: true,
      defenderDestroyed: false,
      damageToDefenderOwner: 0,
      damageToAttackerOwner: -diff,
      diff,
    };
  }
  return {
    attackerDestroyed: true,
    defenderDestroyed: true,
    damageToDefenderOwner: 0,
    damageToAttackerOwner: 0,
    diff: 0,
  };
}
