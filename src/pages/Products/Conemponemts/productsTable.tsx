import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Star, Pencil, X, Package } from "lucide-react";
import AddProductDialog from "./AddProductDialog";
import { ProductFilters, DEFAULT_FILTERS, type FiltersValue } from "./ProductsFilter";
import { Spinner, ErrorState, EmptyState } from "@/components/States";
import { productsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canDeleteProduct } from "@/lib/permissions";
import type { Product } from "@/types/api";
import { formToProductInput, productToForm, type ProductFormLike } from "@/pages/Products/productForm";
import { imageSrc } from "@/lib/img";
import { nf } from "@/lib/utils";

import { useLang } from "@/context/LanguageContext";
const STATUS_LABEL: Record<string, string> = {
  faible: "product.status.faible",
  moyene: "product.status.moyene",
  eleve: "product.status.eleve",
};

const STATUS_CLASS: Record<string, string> = {
  faible: "bg-red-500/20 text-red-500",
  moyene: "bg-orange-500/20 text-orange-500",
  eleve: "bg-teal-500/20 text-teal-700",
};

interface Props {
  products: Product[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  search: string;
  onSearch: (v: string) => void;
  filters: FiltersValue;
  onFilters: (f: FiltersValue) => void;
  onChanged: () => void;
}

export function ProductsTableProductPage({
  products,
  loading,
  error,
  onRetry,
  search,
  onSearch,
  filters,
  onFilters,
  onChanged,
}: Props) {
  const { t } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const canDelete = canDeleteProduct(user?.role);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const handleCreate = async (form: ProductFormLike) => {
    if (!form.designation.trim()) {
      setSaveError(t("product.designationRequired"));
      return;
    }
    const body = formToProductInput(form);
    setSaving(true);
    setSaveError(null);
    try {
      await productsApi.create(body);
      setIsOpen(false);
      onChanged();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number, form: ProductFormLike) => {
    if (!form.designation.trim()) {
      setSaveError(t("product.designationRequired"));
      return;
    }
    const body = formToProductInput(form);
    setSaving(true);
    setSaveError(null);
    try {
      await productsApi.update(id, body);
      setEditing(null);
      onChanged();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("common.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const filtersActive =
    search.trim() !== "" ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.order !== DEFAULT_FILTERS.order;

  const clearAll = () => {
    onSearch("");
    onFilters(DEFAULT_FILTERS);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("product.confirmDelete"))) return;
    setBusyId(id);
    try {
      await productsApi.remove(id);
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const toggleFavorite = async (p: Product) => {
    setBusyId(p.id);
    try {
      if (p.is_favorite) await productsApi.removeFavorite(p.id);
      else await productsApi.addFavorite(p.id);
      onChanged();
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col h-full py-2">
      {/* TOP section */}
      <div className="flex flex-row gap-2 bg-white rounded-t-xl p-2">
        <Input
          placeholder={t("product.searchPlaceholder")}
          className="h-10 rounded-lg shadow-none"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />

        <ProductFilters value={filters} onChange={onFilters} />

        {filtersActive && (
          <Button
            variant="outline"
            className="h-10 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={clearAll}
            title={t("product.clearFilters")}
          >
            <X className="h-4 w-4" />
            {t("common.clear")}
          </Button>
        )}

        <Button
          className="h-10 bg-teal-500 border rounded-lg text-white hover:bg-teal-400"
          onClick={() => {
            setSaveError(null);
            setIsOpen(true);
          }}
        >
          <Plus className="h-8 w-8 text-white" />
          {t("product.add")}
        </Button>
        {isOpen && (
          <AddProductDialog onClose={() => setIsOpen(false)} onSave={handleCreate} />
        )}
        {editing && (
          <AddProductDialog
            mode="edit"
            initial={productToForm(editing)}
            onClose={() => setEditing(null)}
            onSave={(form) => handleUpdate(editing.id, form)}
          />
        )}
      </div>

      {saveError && (
        <div className="mx-2 mb-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {saveError}
        </div>
      )}
      {saving && (
        <div className="mx-2 mb-1 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-600">
          {t("common.saving")}
        </div>
      )}

      {/* Down Section */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <Spinner label={t("product.loadingList")} />
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : products.length === 0 ? (
          <EmptyState message={t("product.notFoundList")} />
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-center text-slate-500">{t("product.barcode")}</TableHead>
                <TableHead className="text-center text-slate-500 w-2/8">{t("common.designation")}</TableHead>
                <TableHead className="text-center text-slate-500 w-1/8">{t("common.quantity")}</TableHead>
                <TableHead className="text-center text-slate-500 w-1/8">{t("product.purchasePrice")}</TableHead>
                <TableHead className="text-center text-slate-500 w-1/8">{t("product.purchaseValue")}</TableHead>
                <TableHead className="text-center text-slate-500 w-1/8">{t("product.salePrice")}</TableHead>
                <TableHead className="text-center text-slate-500 w-1/8">{t("product.saleValue")}</TableHead>
                <TableHead className="text-center text-slate-500">{t("common.status")}</TableHead>
                <TableHead className="text-center text-slate-500">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  className={`${selectedRow === product.id ? "bg-teal-100 hover:bg-teal-200" : "hover:bg-teal-50"}`}
                  onClick={() =>
                    setSelectedRow(selectedRow === product.id ? null : product.id)
                  }
                >
                  <TableCell className="text-center text-xs text-black">
                    <div className="flex flex-col items-center gap-1">
                      {product.image_url ? (
                        <img
                          src={imageSrc(product.image_url)}
                          alt={product.designation}
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                          <Package size={16} />
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-slate-600">
                        {product.barcodes?.[0] ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-md font-semibold">
                    {product.designation}
                  </TableCell>
                  <TableCell className="text-center text-md font-semibold text-slate-700">
                    {nf(product.quantite)}
                  </TableCell>
                  <TableCell className="text-center text-md font-semibold text-slate-700">
                    {nf(product.prix_achat)}
                  </TableCell>
                  <TableCell className="text-center text-md font-semibold text-slate-700">
                    {nf(product.valeur_achat)}
                  </TableCell>
                  <TableCell className="text-center text-md font-semibold text-slate-700">
                    {nf(product.prix_vente)}
                  </TableCell>
                  <TableCell className="text-center text-md font-semibold text-slate-700">
                    {nf(product.valeur_vente)}
                  </TableCell>
                  <TableCell className="text-center text-xs font-semibold p-1 text-slate-700">
                    <div className={`m-3 px-3 py-2 rounded-xl border ${STATUS_CLASS[product.status]}`}>
                      {t(STATUS_LABEL[product.status])}
                    </div>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        disabled={busyId === product.id}
                        onClick={() => toggleFavorite(product)}
                        className="p-2 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                        title={t("common.favorite")}
                      >
                        <Star
                          size={16}
                          className={product.is_favorite ? "fill-amber-400 text-amber-400" : "text-slate-400"}
                        />
                      </button>
                      <button
                        onClick={() => {
                          setSaveError(null);
                          setEditing(product);
                        }}
                        className="p-2 rounded-lg hover:bg-teal-100"
                        title={t("common.edit")}
                      >
                        <Pencil size={16} className="text-slate-400 hover:text-teal-600" />
                      </button>
                      {canDelete && (
                        <button
                          disabled={busyId === product.id}
                          onClick={() => handleDelete(product.id)}
                          className="p-2 rounded-lg hover:bg-red-100 disabled:opacity-50"
                          title={t("common.delete")}
                        >
                          <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
