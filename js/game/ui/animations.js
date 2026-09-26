export function formatScore(value) {
  const n = Number(value) || 0;
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}
