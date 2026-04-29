import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, Cell,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { Heatmap } from "@/components/charts/Heatmap";
import { Waterfall } from "@/components/charts/Waterfall";
import { chartTooltipStyle, axisStyle, gridStyle, CHART_COLORS } from "@/components/charts/chartTheme";
import { useFilters } from "@/contexts/FilterContext";
import { REGIONS, SEGMENTS, MODELS, CUSTOMERS, formatNumber, formatPct } from "@/lib/mockData";
import { TrendingDown, AlertTriangle, Activity, MapPin, Users, Package } from "lucide-react";

export default function VolumeAnalysis() {
  const { data } = useFilters();

  const v = useMemo(() => {
    // derive volume metrics from existing data
    const totalRetail = data.reduce((s, r) => s + r.units_sold, 0);
    const wholesale = Math.round(totalRetail * 1.12);
    const production = Math.round(wholesale * 1.08);
    const dealerInventory = Math.round(totalRetail * 0.35);
    const plantInventory = Math.round(production - wholesale);
    const planVolume = Math.round(production * 1.06);
    const conversion = wholesale > 0 ? (totalRetail / wholesale) * 100 : 0;
    const wsGap = production - wholesale;
    const rtGap = wholesale - totalRetail;
    const velocity = totalRetail / Math.max(1, dealerInventory) * 30;
    const inventoryDays = (dealerInventory / Math.max(1, totalRetail / 30));

    return { totalRetail, wholesale, production, dealerInventory, plantInventory, planVolume, conversion, wsGap, rtGap, velocity, inventoryDays };
  }, [data]);

  const funnel = [
    { stage: "Production", units: v.production },
    { stage: "Wholesale", units: v.wholesale },
    { stage: "Retail", units: v.totalRetail },
  ];

  const regionData = useMemo(() => REGIONS.map((region) => {
    const sub = data.filter((r) => r.region === region);
    const retail = sub.reduce((s, r) => s + r.units_sold, 0);
    const wholesale = Math.round(retail * 1.12);
    return {
      region,
      retail,
      wholesale,
      conversion: wholesale > 0 ? +((retail / wholesale) * 100).toFixed(1) : 0,
      inventory: Math.round(retail * 0.35),
    };
  }), [data]);

  const segmentMix = useMemo(() => SEGMENTS.map((segment) => ({
    segment,
    units: data.filter((r) => r.segment === segment).reduce((s, r) => s + r.units_sold, 0),
    revenue: data.filter((r) => r.segment === segment).reduce((s, r) => s + r.revenue, 0),
  })), [data]);

  const modelMix = useMemo(() => {
    const allModels = Object.values(MODELS).flat();
    return allModels.map((model) => {
      const sub = data.filter((r) => r.model === model);
      const retail = sub.reduce((s, r) => s + r.units_sold, 0);
      return {
        model,
        Demand: retail,
        Supply: Math.round(retail * (0.85 + Math.random() * 0.4)),
      };
    }).sort((a, b) => b.Demand - a.Demand).slice(0, 10);
  }, [data]);

  const dealerRanking = useMemo(() => CUSTOMERS.map((customer) => {
    const sub = data.filter((r) => r.customer === customer);
    const retail = sub.reduce((s, r) => s + r.units_sold, 0);
    const inventory = Math.round(retail * (0.25 + Math.random() * 0.5));
    return {
      customer, retail, inventory,
      days: retail > 0 ? +((inventory / (retail / 30)).toFixed(1)) : 0,
      velocity: retail / Math.max(1, inventory) * 30,
    };
  }).sort((a, b) => b.retail - a.retail), [data]);

  // heatmap dealer × model retail intensity
  const heatCells = useMemo(() => {
    const out: { row: string; col: string; value: number }[] = [];
    const topModels = modelMix.slice(0, 6).map((m) => m.model);
    CUSTOMERS.forEach((c) => topModels.forEach((m) => {
      const v = data.filter((r) => r.customer === c && r.model === m).reduce((s, r) => s + r.units_sold, 0);
      out.push({ row: c, col: m, value: v });
    }));
    return { cells: out, cols: modelMix.slice(0, 6).map((m) => m.model) };
  }, [data, modelMix]);

  // Plan vs actual waterfall
  const waterfall = [
    { name: "Plan", value: v.planVolume, type: "start" as const },
    { name: "Production gap", value: -(v.planVolume - v.production), type: "negative" as const },
    { name: "Wholesale throttle", value: -(v.production - v.wholesale), type: "negative" as const },
    { name: "Retail shortfall", value: -(v.wholesale - v.totalRetail), type: "negative" as const },
    { name: "Actual Retail", value: v.totalRetail, type: "total" as const },
  ];

  const weakestRegion = [...regionData].sort((a, b) => a.conversion - b.conversion)[0];
  const topDealersStockShare = (() => {
    const top = dealerRanking.slice(0, 3).reduce((s, r) => s + r.inventory, 0);
    const tot = dealerRanking.reduce((s, r) => s + r.inventory, 0) || 1;
    return (top / tot) * 100;
  })();

  return (
    <DashboardLayout
      title="Volume Analysis – Demand & Channel Health"
      subtitle="Production → Wholesale → Retail funnel, channel stress and plan-vs-actual"
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KPICard label="Prod–Wholesale Gap" value={formatNumber(v.wsGap)} icon={Package} tone={v.wsGap > v.production * 0.1 ? "warning" : "default"} />
        <KPICard label="Wholesale–Retail Gap" value={formatNumber(v.rtGap)} icon={TrendingDown} tone={v.rtGap > v.wholesale * 0.1 ? "danger" : "default"} />
        <KPICard label="Retail Conversion" value={formatPct(v.conversion)} icon={Activity} tone={v.conversion < 80 ? "warning" : "success"} />
        <KPICard label="Dealer Inventory Days" value={`${v.inventoryDays.toFixed(0)}d`} icon={Package} tone={v.inventoryDays > 45 ? "danger" : v.inventoryDays > 30 ? "warning" : "success"} />
        <KPICard label="Retail Velocity" value={`${v.velocity.toFixed(0)}/mo`} icon={Activity} />
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="Pipeline: Production → Wholesale → Retail" subtitle="Volume drop at each stage" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnel} layout="vertical" margin={{ top: 6, right: 16, left: 12, bottom: 0 }}>
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" {...axisStyle} tickFormatter={(v) => formatNumber(v)} />
              <YAxis type="category" dataKey="stage" {...axisStyle} width={100} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey="units" radius={[0, 4, 4, 0]}>
                {funnel.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inventory Build-up" subtitle="Stock concentration across the chain">
          <div className="space-y-4 pt-2">
            <BuildupRow label="Plant Inventory" value={v.plantInventory} max={v.production} tone="warning" />
            <BuildupRow label="Dealer Inventory" value={v.dealerInventory} max={v.wholesale} tone="danger" />
            <BuildupRow label="In-Transit (est.)" value={Math.round(v.wsGap * 0.3)} max={v.wsGap || 1} tone="default" />
            <div className="pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
              Dealer end of chain holds the largest absolute stock — high risk of price erosion if retail momentum slows.
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Geography */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Geography — Conversion %" subtitle="Retail conversion by region (red = weakest)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="region" {...axisStyle} />
              <YAxis {...axisStyle} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="conversion" radius={[4, 4, 0, 0]}>
                {regionData.map((r, i) => (
                  <Cell key={i} fill={r.conversion < 70 ? "hsl(var(--destructive))" : r.conversion < 80 ? "hsl(var(--warning))" : "hsl(var(--success))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Region Inventory Build-up" subtitle="Stock vs retail by region">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="region" {...axisStyle} />
              <YAxis {...axisStyle} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="retail" name="Retail" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inventory" name="Inventory" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Segment & Model Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Segment Contribution" subtitle="Units & revenue by segment">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={segmentMix} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="segment" {...axisStyle} />
              <YAxis yAxisId="l" {...axisStyle} />
              <YAxis yAxisId="r" orientation="right" {...axisStyle} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="units" name="Units" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="r" dataKey="revenue" name="Revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demand vs Supply by Model" subtitle="Top 10 models">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelMix} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="model" {...axisStyle} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis {...axisStyle} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Demand" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Supply" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Dealer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Dealer Ranking" subtitle="Retail volume — flag overstocked">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={dealerRanking} layout="vertical" margin={{ top: 6, right: 16, left: 12, bottom: 0 }}>
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" {...axisStyle} />
              <YAxis type="category" dataKey="customer" {...axisStyle} width={130} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="retail" name="Retail" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="inventory" name="Inventory" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Dealer × Model Heatmap" subtitle="Retail intensity">
          <Heatmap
            rows={CUSTOMERS}
            cols={heatCells.cols}
            data={heatCells.cells}
            colorScale="performance"
            format={(v) => formatNumber(v)}
          />
        </ChartCard>
      </div>

      {/* Plan vs Actual */}
      <ChartCard title="Plan vs Actual Variance" subtitle="Where the volume miss came from" className="mb-5">
        <Waterfall steps={waterfall} height={340} />
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InsightCard tone="danger" icon={MapPin}
          title={`${weakestRegion?.region ?? "—"} region weakest at ${weakestRegion?.conversion ?? 0}%`}
          body="Retail conversion below 70% suggests demand softness; consider targeted retail incentives and dealer support." />
        <InsightCard tone="warning" icon={Package}
          title="Inventory concentration"
          body={`Top 3 dealers hold ${topDealersStockShare.toFixed(0)}% of inventory — risk of channel-stuffing and price erosion if retail slows.`} />
        <InsightCard tone="info" icon={Users}
          title="Retail-driven volume miss"
          body="Retail shortfall is the largest contributor to the plan gap — demand activation outweighs production fixes this period." />
      </div>
    </DashboardLayout>
  );
}

function BuildupRow({ label, value, max, tone }:
  { label: string; value: number; max: number; tone: "default" | "warning" | "danger" }) {
  const pct = Math.min(100, max ? (value / max) * 100 : 0);
  const color = tone === "danger" ? "hsl(var(--destructive))" : tone === "warning" ? "hsl(var(--warning))" : "hsl(var(--chart-2))";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs font-mono font-semibold text-foreground">{formatNumber(value)}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-smooth" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
