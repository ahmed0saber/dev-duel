export function flash(element, className = "is-flash") {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

export function formatScore(value) {
  const n = Number(value) || 0;
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}
