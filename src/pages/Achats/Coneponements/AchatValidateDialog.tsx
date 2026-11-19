import { useEffect, useMemo, useState } from "react";
import { X, Wallet, TrendingDown, Check, Loader2, Truck } from "lucide-react";
import { nf } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suppliertName: string;
  ancienSolde: number;
  totalVente: number; // total of the purchase
  onConfirm: (paye: number) => void | Promise<void>;
}

export function AchatValidationDialog({
  open,
  onOpenChange,
  suppliertName,
  ancienSolde,
  totalVente,
  onConfirm,
}: Props) {
  const { t } = useLang();
  const [payeInput, setPayeInput] = useState<string>(String(totalVente));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPayeInput(String(totalVente));
      setSaving(false);
    }
  }, [open, totalVente]);

  const paye = payeInput === "" ? 0 : Number(payeInput);
  const resteAchat = Math.max(0, totalVente - paye);
  const nouveauSolde = useMemo(() => ancienSolde + resteAchat, [ancienSolde, resteAchat]);

  if (!open) return null;

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm(paye);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative flex items-center gap-3 bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white">
          <div className="rounded-xl bg-white/20 p-3">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t("achat.validate")}</h2>
            <p className="flex items-center gap-1 text-white/80">
              <Truck size={14} /> {suppliertName}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="ml-auto grid h-9 w-9 place-items-center rounded-xl hover:bg-red-500"
          >
            <X />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("pos.oldBalance")}</div>
              <div className="mt-1 text-lg font-bold text-slate-600">
                {nf(ancienSolde)} <span className="text-xs font-normal text-slate-400">{t("common.currency")}</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("achat.totalPurchase")}</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {nf(totalVente)} <span className="text-xs font-normal text-slate-400">{t("common.currency")}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("pos.amountPaid")}</label>
            <div className="flex items-center rounded-lg border border-gray-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={payeInput}
                onChange={(e) => setPayeInput(e.target.value)}
                className="w-full bg-transparent px-4 py-3 text-lg font-semibold outline-none"
              />
              <span className="px-3 text-sm text-gray-500">{t("common.currency")}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setPayeInput(String(totalVente))}
                className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100"
              >
                {t("pos.paidInFull")}
              </button>
              <button
                onClick={() => setPayeInput("0")}
                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                {t("pos.allOnCredit")}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <TrendingDown size={18} />
              <span className="text-sm font-medium">{t("pos.newBalance")}</span>
            </div>
            <span className={`text-xl font-bold ${nouveauSolde > 0 ? "text-red-500" : "text-teal-600"}`}>
              {nf(nouveauSolde)} {t("common.currency")}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={confirm}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2 font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {t("common.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
