import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { achatsApi } from "@/lib/api";
import type { AchatRow } from "@/types/api";
import AchatHistoryTable from "./Coneponements/AchatHistoryTable";
import AchatsHistoryFilter, { type AchatFilters } from "./Coneponements/AchatsHistoryFilter";

const EMPTY: AchatFilters = { search: "", date_from: "", date_to: "" };

export function AchatsHistory() {
  const [filters, setFilters] = useState<AchatFilters>(EMPTY);

  const state = useApi<AchatRow[]>(
    (signal) =>
      achatsApi.list(
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
    <div className="flex flex-col h-screen overflow-hidden py-[0.5vh] px-[0.5vw] gap-[2vh]">
      <AchatsHistoryFilter value={filters} onChange={setFilters} />
      <div className="flex-1 min-h-0">
        <AchatHistoryTable
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
