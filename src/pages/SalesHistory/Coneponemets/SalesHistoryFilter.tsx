import { Input } from "@/components/ui/input";
import { useLang } from "@/context/LanguageContext";

export interface SalesFilters {
  search: string;
  date_from: string;
  date_to: string;
}

export default function SalesHistoryFilter({
  value,
  onChange,
}: {
  value: SalesFilters;
  onChange: (f: SalesFilters) => void;
}) {
  const { t } = useLang();
  const set = (patch: Partial<SalesFilters>) => onChange({ ...value, ...patch });

  return (
    <div className="p-4 flex flex-col gap-2 bg-white border rounded-xl">
      <div className="flex flex-row gap-4">
        <span className="w-1/4 text-xs font-bold">{t("common.billNumber").toUpperCase()}</span>
        <span className="w-1/4 text-xs font-bold">{t("common.dateFrom")}</span>
        <span className="w-1/4 text-xs font-bold">{t("common.dateTo")}</span>
        <span className="w-1/4" />
      </div>

      <div className="flex flex-row gap-4">
        <Input
          className="w-1/4"
          type="text"
          placeholder="#Z8P90UV"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        <Input
          className="w-1/4"
          type="date"
          value={value.date_from}
          onChange={(e) => set({ date_from: e.target.value })}
        />
        <Input
          className="w-1/4"
          type="date"
          value={value.date_to}
          onChange={(e) => set({ date_to: e.target.value })}
        />
        <button
          onClick={() => onChange({ search: "", date_from: "", date_to: "" })}
          className="w-1/4 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("common.reset")}
        </button>
      </div>
    </div>
  );
}
