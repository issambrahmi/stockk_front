import { X, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, nf } from "@/lib/utils";
import type { VenteItem, AchatItem } from "@/types/api";
import { useLang } from "@/context/LanguageContext";

interface Props {
  title: string;
  numero: string;
  date: string | null;
  partenaire: string | null;
  partenaireLabel: string;
  user: string | null;
  total: number;
  paye: number;
  reste: number;
  items: (VenteItem | AchatItem)[];
  kind: "vente" | "achat";
  onClose: () => void;
  onLoad?: () => void;
  loadLabel?: string;
}

export default function BonDetailDialog({
  title,
  numero,
  date,
  partenaire,
  partenaireLabel,
  user,
  total,
  paye,
  reste,
  items,
  kind,
  onClose,
  onLoad,
  loadLabel,
}: Props) {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-br from-[#1f2d44] to-[#182438] px-6 py-5 text-white">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">{title}</p>
            <p className="text-xl font-bold text-teal-400">#{numero}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-red-500"
          >
            <X />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 border-b border-slate-100 p-5 text-sm">
          <Info label={t("common.date")} value={formatDate(date)} />
          <Info label={partenaireLabel} value={partenaire || "—"} />
          <Info label={t("common.user")} value={user || "—"} />
        </div>

        <div className="max-h-[40vh] overflow-auto p-5">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-left text-slate-500">{t("common.designation")}</TableHead>
                <TableHead className="text-center text-slate-500">{t("common.qty")}</TableHead>
                <TableHead className="text-center text-slate-500">
                  {kind === "vente" ? t("product.salePrice") : t("product.purchasePrice")}
                </TableHead>
                {kind === "vente" && <TableHead className="text-center text-slate-500">{t("common.discount")}</TableHead>}
                <TableHead className="text-right text-slate-500">{t("common.total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="text-left font-semibold">{it.designation}</TableCell>
                  <TableCell className="text-center">{nf(it.quantite)}</TableCell>
                  <TableCell className="text-center">
                    {nf(kind === "vente" ? (it as VenteItem).prix_vente : (it as AchatItem).prix_achat)}
                  </TableCell>
                  {kind === "vente" && (
                    <TableCell className="text-center">{nf((it as VenteItem).remise)}</TableCell>
                  )}
                  <TableCell className="text-right font-semibold">{nf(it.prix_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-slate-100 p-5">
          <Info label={t("common.total")} value={`${nf(total)} ${t("common.currency")}`} strong />
          <Info label={t("common.paid")} value={`${nf(paye)} ${t("common.currency")}`} />
          <Info label={t("common.remaining")} value={`${nf(reste)} ${t("common.currency")}`} danger={reste > 0} />
        </div>

        {onLoad && (
          <div className="flex justify-end gap-3 border-t border-slate-100 p-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {t("common.close")}
            </button>
            <button
              onClick={onLoad}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-600"
            >
              <Send size={16} /> {loadLabel ?? t("common.load")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-0.5 ${strong ? "text-lg font-bold text-teal-600" : "font-semibold"} ${
          danger ? "text-red-500" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
