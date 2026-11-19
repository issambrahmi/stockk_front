import { useEffect, useRef, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Filter, RotateCcw, SlidersHorizontal } from "lucide-react";

import { useLang } from "@/context/LanguageContext";
export type StockStatusValue = "faible" | "moyene" | "eleve";
export type SortFieldValue = "price" | "designation" | "quantite" | "created_at";

export type FiltersValue = {
  status: StockStatusValue | "all";
  sort: SortFieldValue;
  order: "asc" | "desc";
};

export const DEFAULT_FILTERS: FiltersValue = {
  status: "all",
  sort: "created_at",
  order: "desc",
};

// Each status carries the exact classes to apply WHEN selected.
const STATUS_OPTIONS: Array<{ value: StockStatusValue; labelKey: string; dot: string; on: string }> = [
  { value: "faible", labelKey: "product.status.faible", dot: "bg-red-500",    on: "border-red-300 bg-red-50 text-red-600" },
  { value: "moyene", labelKey: "product.status.moyene", dot: "bg-orange-400", on: "border-orange-300 bg-orange-50 text-orange-600" },
  { value: "eleve",  labelKey: "product.status.eleve",  dot: "bg-teal-500",   on: "border-teal-300 bg-teal-50 text-teal-700" },
];

const SORT_OPTIONS: Array<{ value: SortFieldValue; labelKey: string }> = [
  { value: "designation", labelKey: "product.sort.name" },
  { value: "price", labelKey: "common.price" },
  { value: "quantite", labelKey: "common.quantity" },
  { value: "created_at", labelKey: "product.sort.date" },
];

const ORDER_OPTIONS = [
  { value: "asc", labelKey: "product.sort.asc", Icon: ArrowUpAZ },
  { value: "desc", labelKey: "product.sort.desc", Icon: ArrowDownAZ },
] as const;

const CHIP_BASE = "rounded-lg border px-3 py-2 text-xs font-medium transition-colors";
const CHIP_OFF = "border-slate-200 text-slate-500 hover:bg-slate-50";
const CHIP_ON_TEAL = "border-teal-300 bg-teal-50 text-teal-700";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</p>;
}

export function ProductFilters({
  value,
  onChange,
}: {
  value?: FiltersValue;
  onChange?: (next: FiltersValue) => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  // Works standalone (internal state) AND controlled (value + onChange).
  const [internal, setInternal] = useState<FiltersValue>(value ?? DEFAULT_FILTERS);
  const current = value ?? internal;

  // Merge the patch into the full object, and emit the FULL next object.
  const set = (patch: Partial<FiltersValue>) => {
    const next = { ...current, ...patch };
    setInternal(next);
    onChange?.(next);
  };

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeCount =
    (current.status !== DEFAULT_FILTERS.status ? 1 : 0) +
    (current.sort !== DEFAULT_FILTERS.sort || current.order !== DEFAULT_FILTERS.order ? 1 : 0);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
      >
        <Filter className="size-4" />
        {t("common.filter")}
        {activeCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-500 px-1.5 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <span className="flex size-7 items-center justify-center rounded-md border border-teal-400/50 text-teal-600">
              <SlidersHorizontal className="size-4" />
            </span>
            <h3 className="text-sm font-semibold text-teal-600">{t("product.filterProducts")}</h3>
          </div>

          <div className="space-y-5 px-5 py-5">
            {/* STATUT */}
            <div className="space-y-2.5">
              <SectionTitle>{t("product.stockStatus")}</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => set({ status: "all" })}
                  className={`col-span-2 ${CHIP_BASE} ${current.status === "all" ? CHIP_ON_TEAL : CHIP_OFF}`}
                >
                  {t("product.allStatuses")}
                </button>
                {STATUS_OPTIONS.map((opt) => {
                  const isOn = current.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set({ status: opt.value })}
                      className={`flex items-center gap-2 ${CHIP_BASE} ${isOn ? opt.on : CHIP_OFF}`}
                    >
                      <span className={`size-2 rounded-full ${opt.dot}`} />
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {t("product.statusHint")}
              </p>
            </div>

            {/* TRI */}
            <div className="space-y-2.5">
              <SectionTitle>{t("product.sortBy")}</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {SORT_OPTIONS.map((field) => {
                  const isOn = current.sort === field.value;
                  return (
                    <button
                      key={field.value}
                      type="button"
                      onClick={() => set({ sort: field.value })}
                      className={`${CHIP_BASE} ${isOn ? CHIP_ON_TEAL : CHIP_OFF}`}
                    >
                      {t(field.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ORDRE */}
            <div className="space-y-2.5">
              <SectionTitle>{t("product.order")}</SectionTitle>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                {ORDER_OPTIONS.map(({ value: v, labelKey, Icon }) => {
                  const isOn = current.order === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set({ order: v })}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isOn ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={() => set(DEFAULT_FILTERS)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              <RotateCcw className="size-3.5" />
              {t("common.reset")}
            </button>
            <span className="text-[11px] text-slate-400">
              {activeCount > 0 ? t("product.activeFilters", { n: activeCount }) : t("product.noFilter")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
