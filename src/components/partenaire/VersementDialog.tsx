import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Banknote, Receipt, TrendingDown, Plus, Wallet, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import type { CreditHistory, CreditInput } from "@/types/api";
import { formatDate, nf } from "@/lib/utils";
import { Spinner, ErrorState } from "@/components/States";
import { useLang } from "@/context/LanguageContext";

export interface CreditApi {
  credits: (id: number) => Promise<CreditHistory>;
  addCredit: (id: number, body: CreditInput) => Promise<CreditHistory>;
  deleteCredit: (id: number, creditId: number) => Promise<CreditHistory>;
}

interface Props {
  api: CreditApi;
  entityId: number;
  entityName: string;
  onClose: () => void;
  onChanged?: () => void;
}

export default function VersementDialog({ api, entityId, entityName, onClose, onChanged }: Props) {
  const { t } = useLang();
  const { data, loading, error, reload, setData } = useApi<CreditHistory>(
    () => api.credits(entityId),
    [entityId],
  );
  const [showAdd, setShowAdd] = useState<null | "credit" | "versement">(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const summary = data?.summary ?? { credit_total: 0, paye: 0, reste: 0 };
  const entries = data?.data ?? [];

  const handleDelete = async (creditId: number) => {
    if (!confirm(t("part.confirmDeleteEntry"))) return;
    setBusyId(creditId);
    try {
      const updated = await api.deleteCredit(entityId, creditId);
      setData(updated);
      onChanged?.();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-col gap-4 relative bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white">
          <div className="flex flex-row gap-3">
            <div className="rounded-xl bg-white/20 p-3">
              <Receipt size={24} className="text-white" />
            </div>
            <div className="flex flex-col items-start">
              <h2 className="text-xl font-semibold text-white">{t("part.creditHistory")}</h2>
              <p className="text-white/80">{entityName}</p>
            </div>
            <button
              className="ml-auto w-10 h-10 p-1 rounded-xl hover:bg-red-500 flex items-center justify-center"
              onClick={onClose}
            >
              <X />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <Kpi icon={<Wallet size={16} />} label={t("common.credit").toUpperCase()} value={summary.credit_total} />
            <Kpi icon={<Banknote size={16} />} label={t("common.paid").toUpperCase()} value={summary.paye} />
            <Kpi icon={<TrendingDown size={16} />} label={t("common.remaining").toUpperCase()} value={summary.reste} />
          </div>
        </div>

        {/* Body */}
        <div className="bg-gray-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">{entries.length} {t("common.entries")}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd("credit")}
                className="flex items-center gap-2 rounded-lg border border-teal-500 px-3 py-2 text-teal-600 hover:bg-teal-50"
              >
                <Plus size={16} /> {t("common.credit")}
              </button>
              <button
                onClick={() => setShowAdd("versement")}
                className="flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-white hover:bg-teal-600"
              >
                <Plus size={16} /> {t("part.payment")}
              </button>
            </div>
            {showAdd && (
              <AddEntryDialog
                type={showAdd}
                reste={summary.reste}
                entityName={entityName}
                onClose={() => setShowAdd(null)}
                onSubmit={async (montant, note) => {
                  const updated = await api.addCredit(entityId, { type: showAdd, montant, note });
                  setData(updated);
                  setShowAdd(null);
                  onChanged?.();
                }}
              />
            )}
          </div>

          <div className="max-h-[45vh] overflow-auto rounded-lg">
            {loading ? (
              <Spinner label={t("common.loading")} />
            ) : error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t("part.noEntries")}</p>
            ) : (
              <Table className="rounded-lg">
                <TableHeader className="bg-muted/50">
                  <TableRow className="text-xs">
                    <TableHead className="text-left text-slate-500">{t("common.date")}</TableHead>
                    <TableHead className="text-left text-slate-500">{t("common.type")}</TableHead>
                    <TableHead className="text-left text-slate-500">{t("common.amount")}</TableHead>
                    <TableHead className="text-left text-slate-500">{t("common.remaining")}</TableHead>
                    <TableHead className="text-left text-slate-500">{t("common.note")}</TableHead>
                    <TableHead className="text-slate-500" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-left text-xs text-black">
                        {formatDate(v.created_at)}
                      </TableCell>
                      <TableCell className="text-left text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            v.type === "versement"
                              ? "bg-teal-100 text-teal-700"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {v.type === "versement" ? t("part.payment") : t("common.credit")}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-left text-md font-semibold ${
                          v.type === "versement" ? "text-teal-600" : "text-blue-600"
                        }`}
                      >
                        {v.type === "versement" ? "+" : "−"}
                        {nf(v.montant)}
                      </TableCell>
                      <TableCell className="text-left text-md font-semibold text-black">
                        {nf(v.reste_apres)}
                      </TableCell>
                      <TableCell className="text-left text-xs text-slate-500 max-w-[140px] truncate">
                        {v.note || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <button
                          disabled={busyId === v.id}
                          onClick={() => handleDelete(v.id)}
                          className="p-2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 disabled:opacity-50"
                        >
                          {busyId === v.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <Trash2 className="text-slate-400 hover:text-red-500" size={16} />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const { t } = useLang();
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-white/80">
        {icon} {label}
      </div>
      <div className="flex gap-2 items-start mt-1 text-xl font-bold">
        {nf(value)} <span className="text-sm font-normal text-white/70">{t("common.currency")}</span>
      </div>
    </div>
  );
}

function AddEntryDialog({
  type,
  reste,
  entityName,
  onClose,
  onSubmit,
}: {
  type: "credit" | "versement";
  reste: number;
  entityName: string;
  onClose: () => void;
  onSubmit: (montant: number, note?: string) => Promise<void>;
}) {
  const { t } = useLang();
  const [somme, setSomme] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const montant = parseFloat(somme);
    if (!montant || montant <= 0) {
      setErr(t("part.amountPositive"));
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onSubmit(montant, note.trim() || undefined);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("common.saveFailed"));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-4 relative bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white">
          <div className="flex flex-row gap-3">
            <div className="rounded-xl bg-white/20 p-3">
              <Receipt size={24} className="text-white" />
            </div>
            <div className="flex flex-col items-start">
              <h2 className="text-xl font-semibold text-white">
                {type === "versement" ? t("part.newPayment") : t("part.newCredit")}
              </h2>
              <p className="text-white/80">{entityName}</p>
            </div>
            <button
              className="ml-auto w-10 h-10 p-1 rounded-xl hover:bg-red-500 flex items-center justify-center"
              onClick={onClose}
            >
              <X />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between rounded-xl bg-gray-100 p-4">
            <div>
              <div className="text-xs font-medium tracking-wide text-gray-500">{t("part.remainingToPay").toUpperCase()}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {nf(reste)} <span className="text-base font-normal text-gray-500">{t("common.currency")}</span>
              </div>
            </div>
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-teal-600">
              <TrendingDown size={20} />
            </div>
          </div>

          {err && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{err}</div>
          )}

          <div className="flex flex-col gap-2 items-start w-full">
            <label className="text-sm font-medium text-gray-700">
              {type === "versement" ? t("part.paymentAmount") : t("part.creditAmount")}
            </label>
            <div className="w-full flex items-center rounded-lg border border-gray-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
              <input
                type="number"
                step="0.01"
                min="0"
                value={somme}
                onChange={(e) => setSomme(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent px-4 py-4 outline-none"
                autoFocus
              />
              <span className="px-3 text-sm text-gray-500">{t("common.currency")}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-start w-full">
            <label className="text-sm font-medium text-gray-700">{t("common.noteOptional")}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("part.commentPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
