/**
 * Shared deck list. Each player receives a shuffled instance of this list.
 * Total 27 cards (within the 20–30 prototype range).
 */
export const DECK_LIST = [
  ["drone-21", 2],
  ["xr-5", 1],
  ["rx-17", 2],
  ["aero-12", 1],
  ["mk-04", 2],
  ["a-47", 1],
  ["unit-08", 2],
  ["vx-09", 1],
  ["sentinel-09", 1],
  ["titan-03", 1],
  ["git-merge", 2],
  ["git-conflict", 1],
  ["git-cherry-pick", 1],
  ["rate-limiter", 1],
  ["firewall", 1],
  ["deadlock", 1],
  ["circuit-breaker", 1],
  ["observer", 1],
  ["bug-injection", 1],
  ["rollback", 1],
  ["hotfix", 1],
  ["factory", 1],
];

export function expandDeckList(list = DECK_LIST) {
  const ids = [];
  for (const [id, count] of list) {
    for (let i = 0; i < count; i += 1) ids.push(id);
  }
  return ids;
}
