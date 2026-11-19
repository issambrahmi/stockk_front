import { useState } from "react";
import { productsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { maskStatValues } from "@/lib/permissions";
import type { Product, ProductStats } from "@/types/api";
import { ProductsTableProductPage } from "@/pages/Products/Conemponemts/productsTable";
import ProductsPageTopSection from "./Conemponemts/ProductsPageTopSection";
import { DEFAULT_FILTERS, type FiltersValue } from "./Conemponemts/ProductsFilter";

export function Products() {
  const { user } = useAuth();
  const masked = maskStatValues(user?.role);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FiltersValue>(DEFAULT_FILTERS);

  const productsState = useApi<Product[]>(
    (signal) =>
      productsApi.list(
        {
          search: search || undefined,
          status: filters.status === "all" ? undefined : filters.status,
          sort: filters.sort,
          order: filters.order,
        },
        signal,
      ),
    [search, filters.status, filters.sort, filters.order],
  );

  const statsState = useApi<ProductStats>((signal) => productsApi.stats(signal), []);

  const reloadAll = () => {
    productsState.reload();
    statsState.reload();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ProductsPageTopSection stats={statsState.data} loading={statsState.loading} masked={masked} />
      <div className="flex-1 bg-white shadow-xs m-4 border-2 rounded-xl overflow-hidden">
        <ProductsTableProductPage
          products={productsState.data ?? []}
          loading={productsState.loading}
          error={productsState.error}
          onRetry={productsState.reload}
          search={search}
          onSearch={setSearch}
          filters={filters}
          onFilters={setFilters}
          onChanged={reloadAll}
        />
      </div>
    </div>
  );
}
