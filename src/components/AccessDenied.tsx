import { ShieldAlert } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function AccessDenied() {
  const { t } = useLang();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-500">
        <ShieldAlert className="h-8 w-8" />
      </span>
      <h1 className="text-2xl font-extrabold text-slate-800">{t("access.denied.title")}</h1>
      <p className="max-w-sm text-sm text-slate-500">{t("access.denied.body")}</p>
    </div>
  );
}
