import { useState } from "react";
import { Store } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { getStoreInfo, setStoreInfo, type StoreInfo } from "@/lib/storeInfo";

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:bg-white";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600";

export function StoreInfoSection() {
  const { t } = useLang();
  const [info, setInfo] = useState<StoreInfo>(getStoreInfo);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof StoreInfo, value: string) => {
    setInfo((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const save = () => {
    if (!info.name.trim()) {
      setError(t("settings.store.nameRequired"));
      return;
    }
    if (info.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email.trim())) {
      setError(t("settings.store.emailInvalid"));
      return;
    }
    setStoreInfo(info);
    setInfo(getStoreInfo());
    setError(null);
    setSaved(true);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2 text-slate-800">
        <Store className="h-5 w-5 text-teal-500" />
        <h2 className="text-lg font-bold">{t("settings.store.title")}</h2>
      </div>
      <p className="mb-5 text-sm text-slate-500">{t("settings.store.hint")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={LABEL}>{t("settings.store.name")}</label>
          <input
            className={INPUT}
            value={info.name}
            placeholder={t("settings.store.namePh")}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL}>{t("settings.store.activity")}</label>
          <textarea
            rows={2}
            className={`${INPUT} resize-none`}
            value={info.activity}
            placeholder={t("settings.store.activityPh")}
            onChange={(e) => set("activity", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL}>{t("common.address")}</label>
          <input className={INPUT} value={info.address} onChange={(e) => set("address", e.target.value)} />
        </div>

        <div>
          <label className={LABEL}>{t("common.phone")}</label>
          <input dir="ltr" type="tel" className={INPUT} value={info.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>{t("common.email")}</label>
          <input dir="ltr" type="email" className={INPUT} value={info.email} onChange={(e) => set("email", e.target.value)} />
        </div>

        <div>
          <label className={LABEL}>{t("settings.store.rc")}</label>
          <input dir="ltr" className={INPUT} value={info.rc} onChange={(e) => set("rc", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>{t("settings.store.nif")}</label>
          <input dir="ltr" className={INPUT} value={info.nif} onChange={(e) => set("nif", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>{t("settings.store.ai")}</label>
          <input dir="ltr" className={INPUT} value={info.ai} onChange={(e) => set("ai", e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>{t("settings.store.nis")}</label>
          <input dir="ltr" className={INPUT} value={info.nis} onChange={(e) => set("nis", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>{t("settings.store.tva")}</label>
          <input dir="ltr" className={INPUT} value={info.tva} onChange={(e) => set("tva", e.target.value)} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} className="rounded-xl bg-teal-500 px-5 py-3 font-semibold text-white hover:bg-teal-600">
          {t("common.save")}
        </button>
        {saved && <span className="text-sm font-semibold text-teal-600">✓ {t("settings.store.saved")}</span>}
        {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
      </div>
    </section>
  );
}
