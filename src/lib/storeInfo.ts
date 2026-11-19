// Store (market) information — kept in this computer's localStorage, NOT in the database.

export interface StoreInfo {
  name: string;     // market name
  activity: string; // description of the activity
  address: string;
  phone: string;
  email: string;
  rc: string;       // Registre du commerce
  nif: string;      // Numéro d'identification fiscale
  ai: string;       // Article d'imposition
  nis: string;      // Numéro d'identification statistique
  tva: string;      // TVA
}

export const STORE_INFO_FIELDS = [
  "name", "activity", "address", "phone", "email", "rc", "nif", "ai", "nis", "tva",
] as const satisfies readonly (keyof StoreInfo)[];

export const EMPTY_STORE_INFO: StoreInfo = {
  name: "", activity: "", address: "", phone: "", email: "",
  rc: "", nif: "", ai: "", nis: "", tva: "",
};

const STORE_KEY = "stock.store.info";

/** Coerce anything (parsed JSON, backup content…) into a clean StoreInfo. */
export function normalizeStoreInfo(raw: unknown): StoreInfo {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...EMPTY_STORE_INFO };
  for (const key of STORE_INFO_FIELDS) {
    const v = src[key];
    out[key] = typeof v === "string" ? v : "";
  }
  return out;
}

export function getStoreInfo(): StoreInfo {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? normalizeStoreInfo(JSON.parse(raw)) : { ...EMPTY_STORE_INFO };
  } catch {
    return { ...EMPTY_STORE_INFO };
  }
}

export function setStoreInfo(info: StoreInfo): void {
  const clean = normalizeStoreInfo(info);
  for (const key of STORE_INFO_FIELDS) clean[key] = clean[key].trim();
  localStorage.setItem(STORE_KEY, JSON.stringify(clean));
}
