import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, Plus, Trash2, type LucideProps, Wallet, AlertCircle, CircleDollarSign, Users } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { maskStatValues } from "@/lib/permissions";
import type { Partenaire, PartenaireInput, PartenaireStats, CreditHistory, CreditInput } from "@/types/api";
import { nf, initials } from "@/lib/utils";
import { imageSrc } from "@/lib/img";
import { Spinner, ErrorState, EmptyState } from "@/components/States";
import AddPartenaireDialog from "./AddPartenaireDialog";
import VersementDialog from "./VersementDialog";

import { useLang } from "@/context/LanguageContext";
export interface PartenaireApi {
  list: (params?: { search?: string }, signal?: AbortSignal) => Promise<Partenaire[]>;
  stats: (signal?: AbortSignal) => Promise<PartenaireStats>;
  create: (body: PartenaireInput) => Promise<Partenaire>;
  update: (id: number, body: Partial<PartenaireInput>) => Promise<Partenaire>;
  remove: (id: number) => Promise<{ message: string }>;
  credits: (id: number) => Promise<CreditHistory>;
  addCredit: (id: number, body: CreditInput) => Promise<CreditHistory>;
  deleteCredit: (id: number, creditId: number) => Promise<CreditHistory>;
}

interface Props {
  api: PartenaireApi;
  kind: "client" | "fournisseur";
}

export default function PartenairePage({ api, kind }: Props) {
  const { t } = useLang();
  const isClient = kind === "client";
  const addTitle = isClient ? t("part.addClient") : t("part.addFournisseur");
  const { user } = useAuth();
  const masked = maskStatValues(user?.role);
  const [search, setSearch] = useState("");
  const listState = useApi<Partenaire[]>(
    (signal) => api.list({ search: search || undefined }, signal),
    [search],
  );
  const statsState = useApi<PartenaireStats>((signal) => api.stats(signal), []);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Partenaire | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [versementFor, setVersementFor] = useState<Partenaire | null>(null);

  const reloadAll = () => {
    listState.reload();
    statsState.reload();
  };

  const rows = listState.data ?? [];
  const stats = statsState.data;
  const totalCount = stats?.clients_total ?? stats?.fournisseurs_total ?? rows.length;

  const handleCreate = async (body: PartenaireInput, soldeInitial: number) => {
    const created = await api.create(body);
    if (soldeInitial > 0) {
      await api.addCredit(created.id, { type: "credit", montant: soldeInitial, note: "Solde initial" });
    }
    setIsAddOpen(false);
    reloadAll();
  };

  const handleUpdate = async (body: PartenaireInput) => {
    if (!editing) return;
    await api.update(editing.id, body);
    setEditing(null);
    reloadAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t(isClient ? "part.confirmDeleteClient" : "part.confirmDeleteSupplier"))) return;
    setBusyId(id);
    try {
      await api.remove(id);
      reloadAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const statCards: {
    id: "total" | "credit" | "paye" | "reste";
    text: string;
    price: string;
    icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
    stext: string;
  }[] = [
    { id: "total", text: isClient ? t("part.clientsTotal") : t("part.suppliersTotal"), price: masked ? "•••" : nf(totalCount), icon: Users, stext: t("part.inTotal") },
    { id: "credit", text: t("part.creditTotal"), price: masked ? "•••" : `${nf(stats?.credit_total ?? 0)} ${t("common.currency")}`, icon: Wallet, stext: t("part.creditGranted") },
    { id: "paye", text: t("common.paid"), price: masked ? "•••" : `${nf(stats?.paye ?? 0)} ${t("common.currency")}`, icon: CircleDollarSign, stext: t("part.collected") },
    { id: "reste", text: t("common.remaining"), price: masked ? "•••" : `${nf(stats?.reste ?? 0)} ${t("common.currency")}`, icon: AlertCircle, stext: t("part.balanceLeft") },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Stats */}
      <div className="flex flex-row items-center justify-center gap-5 mt-5 mx-4">
        {statCards.map((item) => (
          <div
            key={item.id}
            className="py-3 px-6 bg-white flex flex-col gap-2 min-w-[15vw] rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.15)]"
          >
            <div className="flex flex-row gap-2 items-center">
              <div
                className={`flex justify-center items-center rounded-lg w-7.5 h-7.5 p-1.25 ${
                  item.id === "reste"
                    ? "bg-red-50"
                    : item.id === "paye"
                      ? "bg-emerald-50"
                      : item.id === "credit"
                        ? "bg-blue-50"
                        : "bg-gray-100"
                }`}
              >
                <item.icon
                  className={`text-xs ${
                    item.id === "reste"
                      ? "text-rose-400"
                      : item.id === "paye"
                        ? "text-teal-500"
                        : item.id === "credit"
                          ? "text-blue-500"
                          : "text-gray-600"
                  }`}
                />
              </div>
              <span className="text-gray-600 font-semibold text-sm">{item.text}</span>
            </div>
            <span
              className={`font-semibold text-3xl ${
                item.id === "reste"
                  ? "text-rose-400"
                  : item.id === "paye"
                    ? "text-teal-500"
                    : item.id === "credit"
                      ? "text-blue-500"
                      : "text-black"
              } ${statsState.loading ? "opacity-40" : ""}`}
            >
              {item.price}
            </span>
            <span className="text-gray-600 text-sm">{item.stext}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 bg-white shadow-xs m-4 border-2 rounded-xl overflow-hidden">
        <div className="flex flex-col h-full py-2">
          <div className="flex flex-row gap-2 bg-white rounded-t-xl p-2">
            <Input
              placeholder={t("common.searchByName")}
              className="h-10 rounded-lg shadow-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              className="h-10 bg-teal-500 border rounded-lg text-white hover:bg-teal-400"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-8 w-8 text-white" />
              {addTitle}
            </Button>
            {isAddOpen && (
              <AddPartenaireDialog
                title={addTitle}
                onClose={() => setIsAddOpen(false)}
                onSubmit={handleCreate}
              />
            )}
            {editing && (
              <AddPartenaireDialog
                mode="edit"
                title={isClient ? t("part.editClient") : t("part.editSupplier")}
                initial={{
                  nom: editing.nom,
                  telephone: editing.telephone,
                  email: editing.email,
                  adresse: editing.adresse,
                  image: editing.image_url,
                }}
                onClose={() => setEditing(null)}
                onSubmit={handleUpdate}
              />
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {listState.loading ? (
              <Spinner />
            ) : listState.error ? (
              <ErrorState message={listState.error} onRetry={listState.reload} />
            ) : rows.length === 0 ? (
              <EmptyState message={t("common.noResult")} />
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-center text-slate-500 text-[14px] w-1/20">#</TableHead>
                    <TableHead className="text-left text-slate-500 text-[14px] w-3/12">{t("common.name")}</TableHead>
                    <TableHead className="text-left text-slate-500 text-[14px] w-2/12">{t("common.phone")}</TableHead>
                    <TableHead className="text-left text-slate-500 text-[14px] w-2/12">{t("part.creditTotal")}</TableHead>
                    <TableHead className="text-left text-slate-500 text-[14px] w-2/12">{t("common.paid")}</TableHead>
                    <TableHead className="text-center text-slate-500 text-[14px] w-2/12">{t("common.remaining")}</TableHead>
                    <TableHead className="text-center text-slate-500 text-[14px] w-1/12">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((f) => (
                    <TableRow
                      key={f.id}
                      className={`cursor-pointer ${selectedRow === f.id ? "bg-teal-100 hover:bg-teal-200" : "hover:bg-teal-50"}`}
                      title={t("common.clickToEdit")}
                      onClick={() => {
                        setSelectedRow(f.id);
                        setEditing(f);
                      }}
                    >
                      <TableCell className="text-center text-xs text-slate-500 font-medium">{f.id}</TableCell>
                      <TableCell className="text-left text-md font-semibold">
                        <div className="flex flex-row gap-4 my-2">
                          {f.image_url ? (
                            <img
                              src={imageSrc(f.image_url)}
                              alt={f.nom}
                              className="h-9 w-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <span className="flex justify-center items-center text-xs text-blue-900 bg-blue-100 p-2 rounded-full w-9 h-9">
                              {initials(f.nom)}
                            </span>
                          )}
                          <div className="flex flex-col">
                            <span className="text-md font-medium">{f.nom}</span>
                            <span className="text-xs text-slate-600 font-medium capitalize">
                              {isClient ? t("common.client") : t("common.supplier")} #{f.id}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left text-md text-slate-700">
                        {f.telephone || "—"}
                      </TableCell>
                      <TableCell className="text-left text-[14px] font-semibold text-black">
                        <span className="py-1 px-3 bg-blue-50 text-blue-500 rounded-2xl">
                          {nf(f.credit_total)} {t("common.currency")}
                        </span>
                      </TableCell>
                      <TableCell className="text-left text-md text-teal-600">
                        <span className="py-1 px-3 bg-teal-50 text-teal-600 rounded-2xl">
                          {nf(f.paye)} {t("common.currency")}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-[14px] font-medium">
                        <span
                          className={`py-1 px-3 rounded-2xl ${
                            f.reste > 0 ? "bg-red-100 text-red-500" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {nf(f.reste)} {t("common.currency")}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="rounded-lg border bg-teal-100 hover:bg-teal-300"
                            onClick={() => setVersementFor(f)}
                            title={t("part.creditHistory")}
                          >
                            <History className="h-2 w-2 text-teal-600" />
                          </Button>
                          <button
                            disabled={busyId === f.id}
                            onClick={() => handleDelete(f.id)}
                            className="p-2 rounded-lg hover:bg-red-100 disabled:opacity-50"
                            title={t("common.delete")}
                          >
                            <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {versementFor && (
        <VersementDialog
          api={api}
          entityId={versementFor.id}
          entityName={versementFor.nom}
          onClose={() => setVersementFor(null)}
          onChanged={reloadAll}
        />
      )}
    </div>
  );
}
