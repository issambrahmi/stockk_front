import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2 } from "lucide-react";
import type { AchatRow, AchatDetail } from "@/types/api";
import { achatsApi, ApiError } from "@/lib/api";
import { formatDate, nf } from "@/lib/utils";
import { Spinner, ErrorState, EmptyState } from "@/components/States";
import BonDetailDialog from "@/components/BonDetailDialog";
import { useLang } from "@/context/LanguageContext";

interface Props {
  data: AchatRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onChanged: () => void;
}

export default function AchatHistoryTable({ data, loading, error, onRetry, onChanged }: Props) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AchatDetail | null>(null);

  const openDetail = async (id: number) => {
    try {
      setDetail(await achatsApi.get(id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.loadFailed"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("achat.confirmCancel"))) return;
    setBusyId(id);
    try {
      await achatsApi.remove(id);
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const loadToAchat = () => {
    if (!detail) return;
    navigate("/achats", { state: { loadAchat: detail } });
  };

  return (
    <div className="h-full overflow-auto rounded-xl border bg-white">
      {loading ? (
        <Spinner label={t("achat.loadingList")} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : data.length === 0 ? (
        <EmptyState message={t("achat.none")} />
      ) : (
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.date")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("achat.number")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.supplier")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.user")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.items")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.totalAmount")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.status")}</TableHead>
              <TableHead className="text-center w-1/8 text-xs font-semibold uppercase">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((a) => (
              <TableRow
                key={a.id}
                onClick={() => setSelectedRow(selectedRow === a.id ? null : a.id)}
                onDoubleClick={() => openDetail(a.id)}
                title={t("common.dblClickDetail")}
                className={`cursor-pointer transition-colors duration-200 ${
                  selectedRow === a.id ? "bg-teal-100 hover:bg-teal-200" : "hover:bg-teal-50"
                }`}
              >
                <TableCell className="text-center text-md">{formatDate(a.date_achat || a.created_at, true)}</TableCell>
                <TableCell className="font-semibold text-center text-md">#{a.numero}</TableCell>
                <TableCell className="text-center text-md">{a.fournisseur_nom || t("common.none")}</TableCell>
                <TableCell className="text-center text-md">{a.user_nom || "—"}</TableCell>
                <TableCell className="text-center text-md">{a.nb_articles}</TableCell>
                <TableCell className="text-center text-md font-semibold text-teal-600">{nf(a.total)} {t("common.currency")}</TableCell>
                <TableCell className="text-center text-md">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-2xl border ${
                      a.reste > 0 ? "text-red-500 bg-red-500/10" : "text-teal-600 bg-teal-500/10"
                    }`}
                  >
                    {a.reste > 0 ? t("common.credit") : t("common.paid")}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-row justify-center items-center gap-3 py-4">
                    <button onClick={() => handleDelete(a.id)} disabled={busyId === a.id} title={t("common.cancel")}>
                      {busyId === a.id ? (
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                      ) : (
                        <Trash2 size={16} className="hover:text-red-500 hover:scale-125 transition-transform" />
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
          title={t("achat.voucher")}
          numero={detail.numero}
          date={detail.date_achat || detail.created_at}
          partenaire={detail.fournisseur_nom}
          partenaireLabel="Fournisseur"
          user={detail.user_nom}
          total={detail.total}
          paye={detail.paye}
          reste={detail.reste}
          items={detail.items}
          kind="achat"
          onClose={() => setDetail(null)}
          onLoad={loadToAchat}
          loadLabel="Charger dans les achats"
        />
      )}
    </div>
  );
}
