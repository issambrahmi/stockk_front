// Local (per-device) app settings for the desktop app.

const MARGIN_KEY = "stock.defaultMargin";

export function getDefaultMargin(): number {
  const v = Number(localStorage.getItem(MARGIN_KEY));
  return Number.isFinite(v) && v > 0 ? v : 20;
}

export function setDefaultMargin(v: number): void {
  const clamped = Math.min(100, Math.max(0, Number(v) || 0));
  localStorage.setItem(MARGIN_KEY, String(clamped));
}
