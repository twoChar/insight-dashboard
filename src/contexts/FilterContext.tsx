import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { SALES_DATA, SalesRecord } from "@/lib/mockData";

export type TimePeriod = "month" | "quarter" | "year";

export type Filters = {
  timePeriod: TimePeriod;
  region: string;
  segment: string;
  model: string;
  customer: string;
};

type FilterContextType = {
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  data: SalesRecord[]; // filtered
  rawData: SalesRecord[];
};

const defaultFilters: Filters = {
  timePeriod: "month",
  region: "all",
  segment: "all",
  model: "all",
  customer: "all",
};

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const resetFilters = () => setFilters(defaultFilters);

  const data = useMemo(() => {
    return SALES_DATA.filter((r) => {
      if (filters.region !== "all" && r.region !== filters.region) return false;
      if (filters.segment !== "all" && r.segment !== filters.segment) return false;
      if (filters.model !== "all" && r.model !== filters.model) return false;
      if (filters.customer !== "all" && r.customer !== filters.customer) return false;
      return true;
    });
  }, [filters]);

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters, data, rawData: SALES_DATA }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
};

// Group date by time period
export function groupByPeriod(date: string, period: TimePeriod): string {
  const [y, m] = date.split("-").map(Number);
  if (period === "year") return `${y}`;
  if (period === "quarter") return `${y} Q${Math.ceil(m / 3)}`;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[m - 1]} ${String(y).slice(2)}`;
}
