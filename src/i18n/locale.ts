import { dict, type Lang } from "./translations";

// Module-level mirror of the active language, so plain helpers (number / date /
// currency formatting in lib/utils.ts) follow the language chosen in Settings.
// LanguageProvider updates it on every render, before any child renders.
let active: Lang = "fr";

export function setActiveLang(l: Lang) {
  active = l;
}

/** BCP-47 locale for Intl. Latin digits are kept for Arabic (ar-DZ). */
export function getLocale(): string {
  return active === "ar" ? "ar-DZ" : active === "en" ? "en-GB" : "fr-FR";
}

/** Currency label for the Algerian dinar. */
export function getCurrency(): string {
  return active === "ar" ? "دج" : "DA";
}

/** Translate outside React (e.g. in lib/http.ts). Inside components use useLang().t */
export function tr(key: string, params?: Record<string, string | number>): string {
  const entry = dict[key];
  if (!entry) return key;
  let text = entry[active] || entry.fr || key;
  if (params) for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
  return text;
}
