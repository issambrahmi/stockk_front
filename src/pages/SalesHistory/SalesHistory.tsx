import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ventesApi } from "@/lib/api";
import type { VenteRow } from "@/types/api";
import SalesHistoryFilter, { type SalesFilters } from "./Coneponemets/SalesHistoryFilter";
import SalesHistoryTable from "./Coneponemets/SalesHistoryTable";

const EMPTY: SalesFilters = { search: "", date_from: "", date_to: "" };

export function SalesHistory() {
  const [filters, setFilters] = useState<SalesFilters>(EMPTY);

  const state = useApi<VenteRow[]>(
    (signal) =>
      ventesApi.list(
        {
          search: filters.search || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        },
        signal,
      ),
    [filters.search, filters.date_from, filters.date_to],
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden py-[2vh] px-[1vw] gap-[2vh]">
      <SalesHistoryFilter value={filters} onChange={setFilters} />
      <div className="flex-1 min-h-0">
        <SalesHistoryTable
          data={state.data ?? []}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          onChanged={state.reload}
        />
      </div>
    </div>
  );
}
