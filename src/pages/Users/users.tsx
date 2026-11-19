import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Users as UsersIcon, Mail, Phone } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { usersApi, ApiError } from "@/lib/api";
import type { AppUser, UserInput, UserStats } from "@/types/api";
import { nf, initials } from "@/lib/utils";
import { imageSrc } from "@/lib/img";
import { Spinner, ErrorState, EmptyState } from "@/components/States";
import { useLang } from "@/context/LanguageContext";
import AddUserDialog from "./Coneponemets/AddUserDialog";
import EditUserDialog from "./Coneponemets/EditUserDialog";

function UserAvatar({ nom, imageUrl }: { nom: string; imageUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = imageSrc(imageUrl);

  if (src && !failed) {
    return (
      <img
        key={src}
        src={src}
        alt={nom}
        onError={() => setFailed(true)}
        className="w-9 h-9 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <span className="flex justify-center items-center text-xs text-blue-900 bg-blue-100 p-2 rounded-full w-9 h-9 shrink-0">
      {initials(nom)}
    </span>
  );
}

export function Users() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const listState = useApi<AppUser[]>(
    (signal) => usersApi.list({ search: search || undefined }, signal),
    [search],
  );
  const statsState = useApi<UserStats>((signal) => usersApi.stats(signal), []);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const rows = listState.data ?? [];
  const stats = statsState.data;

  const reloadAll = () => {
    listState.reload();
    statsState.reload();
  };

  const handleCreate = async (body: UserInput) => {
    await usersApi.create(body);
    setIsAddOpen(false);
    reloadAll();
  };

  const handleUpdate = async (id: number, body: Partial<UserInput>) => {
    await usersApi.update(id, body);
    setEditingUser(null);
    reloadAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("user.confirmDelete"))) return;
    setBusyId(id);
    try {
      await usersApi.remove(id);
      reloadAll();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const roleCounts = rows.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  const cards = [
    { text: t("user.card.users"), price: nf(stats?.users_total ?? rows.length), icon: UsersIcon, tint: "bg-gray-100 text-gray-600", color: "text-black" },
    { text: t("user.card.admins"), price: nf(roleCounts["admin"] ?? 0), icon: UsersIcon, tint: "bg-blue-50 text-blue-500", color: "text-blue-500" },
    { text: t("user.card.managers"), price: nf(roleCounts["gerant"] ?? 0), icon: UsersIcon, tint: "bg-amber-50 text-amber-500", color: "text-amber-500" },
    { text: t("user.card.sellers"), price: nf((roleCounts["vendeur"] ?? 0) + (roleCounts["vendeur_plus"] ?? 0)), icon: UsersIcon, tint: "bg-emerald-50 text-teal-500", color: "text-teal-500" },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex flex-row items-center justify-center gap-5 mt-5 mx-4">
        {cards.map((item) => (
          <div
            key={item.text}
            className="py-3 px-6 bg-white flex flex-col gap-2 min-w-[15vw] rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.15)]"
          >
            <div className="flex flex-row gap-2 items-center">
              <div className={`flex justify-center items-center rounded-lg w-7.5 h-7.5 p-1.25 ${item.tint}`}>
                <item.icon className="text-xs" />
              </div>
              <span className="text-gray-600 font-semibold text-sm">{item.text}</span>
            </div>
            <span className={`font-semibold text-3xl ${item.color} ${statsState.loading ? "opacity-40" : ""}`}>
              {item.price}
            </span>
          </div>
        ))}
      </div>

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
              {t("user.add")}
            </Button>
            {isAddOpen && <AddUserDialog onClose={() => setIsAddOpen(false)} onSubmit={handleCreate} />}
            {editingUser && (
              <EditUserDialog
                key={editingUser.id}
                user={editingUser}
                onClose={() => setEditingUser(null)}
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
              <EmptyState message={t("user.none")} />
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-center text-slate-500 text-[14px] w-1/20">#</TableHead>
                    <TableHead className="text-left text-slate-500 text-[14px] w-3/12">{t("common.name")}</TableHead>
                    <TableHead className="text-left text-slate-500 text-[14px] w-2/12">{t("common.role")}</TableHead>
                    <TableHead className="text-left text-slate-500 text-[14px] w-2/12">{t("common.phone")}</TableHead>
                    <TableHead className="text-left text-slate-500 text-[14px] w-3/12">{t("common.email")}</TableHead>
                    <TableHead className="text-center text-slate-500 text-[14px] w-1/12">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow
                      key={u.id}
                      className={`cursor-pointer select-none ${selectedRow === u.id ? "bg-teal-100 hover:bg-teal-200" : "hover:bg-teal-50"}`}
                      onClick={() => setSelectedRow(selectedRow === u.id ? null : u.id)}
                      onDoubleClick={() => {
                        setSelectedRow(u.id);
                        setEditingUser(u);
                      }}
                    >
                      <TableCell className="text-center text-xs text-slate-500 font-medium">{u.id}</TableCell>
                      <TableCell className="text-left text-md font-semibold">
                        <div className="flex flex-row gap-4 my-2">
                          <UserAvatar nom={u.nom} imageUrl={u.image_url} />
                          <div className="flex flex-col">
                            <span className="text-md font-medium">{u.nom}</span>
                            <span className="text-xs text-slate-600 font-medium">@{u.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left text-md text-slate-700">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {t(`role.${u.role}`)}
                        </span>
                      </TableCell>
                      <TableCell className="text-left text-md text-slate-700">
                        {u.telephone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone size={14} className="text-slate-400" /> {u.telephone}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-left text-md text-slate-700">
                        {u.email ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail size={14} className="text-slate-400" /> {u.email}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled={busyId === u.id}
                            onClick={() => handleDelete(u.id)}
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
    </div>
  );
}
