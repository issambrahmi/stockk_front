import { useState } from "react";
import { Check, Globe, Percent, User as UserIcon } from "lucide-react";
import { getDefaultMargin, setDefaultMargin } from "@/lib/settings";
import { useLang } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LANGS } from "@/i18n/translations";
import { initials } from "@/lib/utils";
import { StoreInfoSection } from "./StoreInfoSection";
import { RecoverySection } from "./RecoverySection";

export function Settings() {
  const { t, lang, setLang } = useLang();
  const { user } = useAuth();
  const [margin, setMargin] = useState<number>(getDefaultMargin());
  const [saved, setSaved] = useState(false);
  const isAdmin = user?.role === "admin"; // store info + backup are for the owner only

  return (
    <div className="h-screen overflow-auto bg-[#eef7f8] p-8">
      <h1 className="mb-6 text-2xl font-extrabold text-slate-800">{t("settings.title")}</h1>

      <div className="mx-auto grid max-w-3xl gap-6">
        {/* Language */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-slate-800">
            <Globe className="h-5 w-5 text-teal-500" />
            <h2 className="text-lg font-bold">{t("settings.language")}</h2>
          </div>
          <p className="mb-4 text-sm text-slate-500">{t("settings.language.hint")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {LANGS.map((l) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-teal-400 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold">{l.native}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Store information (admin only) */}
        {isAdmin && <StoreInfoSection />}

        {/* Default margin */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-slate-800">
            <Percent className="h-5 w-5 text-teal-500" />
            <h2 className="text-lg font-bold">{t("settings.margin.title")}</h2>
          </div>
          <p className="mb-4 text-sm text-slate-500">{t("settings.margin.hint")}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
              <input
                type="number"
                min={0}
                max={100}
                value={margin}
                onChange={(e) => { setMargin(Math.min(100, Math.max(0, Number(e.target.value) || 0))); setSaved(false); }}
                className="w-24 bg-transparent text-right text-lg font-bold text-slate-800 outline-none"
              />
              <span className="font-semibold text-slate-500">%</span>
            </div>
            <button
              onClick={() => { setDefaultMargin(margin); setSaved(true); }}
              className="rounded-xl bg-teal-500 px-5 py-3 font-semibold text-white hover:bg-teal-600"
            >
              {t("settings.margin.save")}
            </button>
            {saved && <span className="text-sm font-semibold text-teal-600">✓ {t("settings.margin.saved")}</span>}
          </div>
        </section>

        {/* Backup / recovery (admin only) */}
        {isAdmin && <RecoverySection />}

        {/* Account */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-800">
            <UserIcon className="h-5 w-5 text-teal-500" />
            <h2 className="text-lg font-bold">{t("settings.account")}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-teal-500 text-sm font-bold text-white">
              {initials(user?.nom)}
            </span>
            <div>
              <p className="font-semibold text-slate-800">{user?.nom}</p>
              <p className="text-sm text-slate-500">
                @{user?.username} · {t(`role.${user?.role}`)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
