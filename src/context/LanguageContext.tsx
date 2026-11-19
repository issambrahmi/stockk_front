import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dict, type Lang } from "@/i18n/translations";
import { setActiveLang } from "@/i18n/locale";

const STORAGE_KEY = "stock.lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStored(): Lang {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (raw === "fr" || raw === "en" || raw === "ar") return raw;
  } catch {
    /* ignore */
  }
  return "fr";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored);
  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";
  setActiveLang(lang); // keep lib/utils formatting in sync (idempotent)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const entry = dict[key];
      if (!entry) return key;
      let text = entry[lang] || entry.fr || key;
      if (params) {
        for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
      }
      return text;
    },
    [lang],
  );

  // BCP-47 locale used for dates and numbers (Latin digits are kept for Arabic in Algeria).
  const locale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-GB" : "fr-FR";

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t, dir, locale }), [lang, setLang, t, dir, locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}

// Convenience: role label from a role code, translated.
// eslint-disable-next-line react-refresh/only-export-components
export function roleKey(role: string): string {
  return `role.${role}`;
}
