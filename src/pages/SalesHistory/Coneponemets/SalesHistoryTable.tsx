import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2 } from "lucide-react";
import type { VenteRow, VenteDetail } from "@/types/api";
import { ventesApi, ApiError } from "@/lib/api";
import { formatDate, nf } from "@/lib/utils";
import { Spinner, ErrorState, EmptyState } from "@/components/States";
import BonDetailDialog from "@/components/BonDetailDialog";
import { useLang } from "@/context/LanguageContext";

interface Props {
  data: VenteRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onChanged: () => void;
}

export default function SalesHistoryTable({ data, loading, error, onRetry, onChanged }: Props) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detail, setDetail] = useState<VenteDetail | null>(null);

  const openDetail = async (id: number) => {
    try {
      setDetail(await ventesApi.get(id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.loadFailed"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("sale.confirmCancel"))) return;
    setBusyId(id);
    try {
      await ventesApi.remove(id);
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const loadToPos = () => {
    if (!detail) return;
    navigate("/pos", { state: { loadVente: detail } });
  };

  return (
    <div className="h-full overflow-auto rounded-xl border bg-white">
      {loading ? (
        <Spinner label={t("sale.loadingList")} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : data.length === 0 ? (
        <EmptyState message={t("sale.none")} />
      ) : (
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.dateTime")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.billNumber")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.client")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.seller")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.items")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.totalAmount")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.status")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s) => (
              <TableRow
                key={s.id}
                onClick={() => setSelectedRow(selectedRow === s.id ? null : s.id)}
                onDoubleClick={() => openDetail(s.id)}
                title={t("common.dblClickDetail")}
                className={`cursor-pointer transition-colors duration-200 ${
                  selectedRow === s.id ? "bg-teal-100 hover:bg-teal-200" : "hover:bg-teal-50"
                }`}
              >
                <TableCell className="text-center text-md">{formatDate(s.date_vente || s.created_at, true)}</TableCell>
                <TableCell className="font-semibold text-center text-md">#{s.numero}</TableCell>
                <TableCell className="text-center text-md">{s.client_nom || t("pos.client.walkin")}</TableCell>
                <TableCell className="text-center text-md">{s.user_nom || "—"}</TableCell>
                <TableCell className="text-center text-md">{s.nb_articles}</TableCell>
                <TableCell className="text-center text-md font-bold">{nf(s.total)} {t("common.currency")}</TableCell>
                <TableCell className="text-center text-md">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-2xl border ${
                      s.reste > 0 ? "text-orange-500 bg-orange-500/10" : "text-teal-600 bg-teal-500/10"
                    }`}
                  >
                    {s.reste > 0 ? t("common.credit") : t("common.paid")}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-row justify-center items-center gap-3 py-4">
                    <button onClick={() => handleDelete(s.id)} disabled={busyId === s.id} title={t("common.cancel")}>
                      {busyId === s.id ? (
                        <Loader2 size={18} className="animate-spin text-slate-400" />
                      ) : (
                        <Trash2 size={18} className="text-red-500 hover:scale-125 transition-transform" />
                      )}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {detail && (
        <BonDetailDialog
          title={t("sale.voucher")}
          numero={detail.numero}
          date={detail.date_vente || detail.created_at}
          partenaire={detail.client_nom}
          partenaireLabel="Client"
          user={detail.user_nom}
          total={detail.total}
          paye={detail.paye}
          reste={detail.reste}
          items={detail.items}
          kind="vente"
          onClose={() => setDetail(null)}
          onLoad={loadToPos}
          loadLabel="Charger dans le POS"
        />
      )}
    </div>
  );
}
