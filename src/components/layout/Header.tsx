import { useFilters } from "@/contexts/FilterContext";
import { REGIONS, SEGMENTS, ALL_MODELS, CUSTOMERS } from "@/lib/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw, Calendar } from "lucide-react";

type Props = { title: string; subtitle?: string };

export function Header({ title, subtitle }: Props) {
  const { filters, setFilter, resetFilters } = useFilters();

  const FilterSelect = ({
    label, value, onChange, options,
  }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[140px] bg-card border-border text-sm font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent mb-1.5">
              <Calendar className="w-3 h-3" />
              <span>FY 2024 — 2026 · 24-Month View</span>
            </div>
            <h1 className="text-[26px] font-bold text-foreground tracking-tight leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-end gap-3 mt-5 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time Period</label>
            <Select value={filters.timePeriod} onValueChange={(v) => setFilter("timePeriod", v as any)}>
              <SelectTrigger className="h-9 w-[130px] bg-card text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FilterSelect label="Region" value={filters.region} onChange={(v) => setFilter("region", v)} options={REGIONS} />
          <FilterSelect label="Segment" value={filters.segment} onChange={(v) => setFilter("segment", v)} options={SEGMENTS} />
          <FilterSelect label="Model" value={filters.model} onChange={(v) => setFilter("model", v)} options={ALL_MODELS} />
          <FilterSelect label="Customer" value={filters.customer} onChange={(v) => setFilter("customer", v)} options={CUSTOMERS} />
          <Button
            variant="ghost" size="sm"
            onClick={resetFilters}
            className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>
      </div>
    </header>
  );
}
