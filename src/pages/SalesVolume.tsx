import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { useFilters, groupByPeriod } from "@/contexts/FilterContext";
import { formatCurrency, formatNumber } from "@/lib/mockData";
import { chartTooltipStyle, axisStyle, gridStyle } from "@/components/charts/chartTheme";
import { Package2, DollarSign, Activity, AlertTriangle } from "lucide-react";

export default function SalesVolume() {
  const { data, filters } = useFilters();

  const { trendData, scatterData, totalUnits, asp, inefficiencies, totalRev } = useMemo(() => {
    const periodMap: Record<string, { units: number; rev: number; undiscounted: number }> = {};
    data.forEach((r) => {
      const p = groupByPeriod(r.date, filters.timePeriod);
      if (!periodMap[p]) periodMap[p] = { units: 0, rev: 0, undiscounted: 0 };
      periodMap[p].units += r.units_sold;
      periodMap[p].rev += r.revenue;
      periodMap[p].undiscounted += r.units_sold * r.price;
    });
    const trendData = Object.entries(periodMap)
      .map(([period, v]) => ({
        period, units: v.units, asp: v.units > 0 ? Math.round(v.rev / v.units) : 0, listAsp: v.units > 0 ? Math.round(v.undiscounted / v.units) : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Scatter: each model's total volume vs avg price (size = revenue)
    const modelMap: Record<string, { units: number; rev: number; priceSum: number; n: number; discount: number }> = {};
    data.forEach((r) => {
      modelMap[r.model] = modelMap[r.model] || { units: 0, rev: 0, priceSum: 0, n: 0, discount: 0 };
      const m = modelMap[r.model];
      m.units += r.units_sold; m.rev += r.revenue;
      m.priceSum += r.price * (1 - r.discount_percent / 100); m.n += 1;
      m.discount += r.discount_percent;
    });
    const scatterData = Object.entries(modelMap).map(([name, v]) => ({
      name, units: v.units, price: Math.round(v.priceSum / v.n), revenue: v.rev,
      avgDiscount: v.discount / v.n,
      inefficient: v.units < 200 && v.discount / v.n > 12,
    }));

    const totalUnits = data.reduce((s, r) => s + r.units_sold, 0);
    const totalRev = data.reduce((s, r) => s + r.revenue, 0);
    const asp = totalUnits > 0 ? totalRev / totalUnits : 0;

    const inefficiencies = scatterData.filter((d) => d.inefficient);

    return { trendData, scatterData, totalUnits, asp, inefficiencies, totalRev };
  }, [data, filters.timePeriod]);

  return (
    <DashboardLayout
      title="Sales Volume & Realisation"
      subtitle="Volume momentum vs price realisation, surfacing inefficient model pricing."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Units Sold" value={formatNumber(totalUnits)} icon={Package2} />
        <KPICard label="Average Selling Price" value={formatCurrency(asp)} icon={DollarSign} tone="default" hint="Net of discount" />
        <KPICard label="Net Revenue" value={formatCurrency(totalRev)} icon={Activity} tone="success" />
        <KPICard label="Inefficient Models" value={inefficiencies.length} icon={AlertTriangle} tone={inefficiencies.length ? "warning" : "success"} hint="Low volume × high discount" />
      </div>

      <ChartCard title="Volume vs Price Realisation" subtitle="Units sold (bars) vs average selling price (line) — dual-axis" className="mb-5">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={trendData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="period" {...axisStyle} />
            <YAxis yAxisId="left" {...axisStyle} tickFormatter={(v) => formatNumber(v)} />
            <YAxis yAxisId="right" orientation="right" {...axisStyle} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v: number, name: string) => name === "units" ? [formatNumber(v), "Units"] : [formatCurrency(v), name === "asp" ? "Net ASP" : "List ASP"]}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
            <Bar yAxisId="left" dataKey="units" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} name="Units" />
            <Line yAxisId="right" type="monotone" dataKey="listAsp" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="4 4" dot={false} name="List ASP" />
            <Line yAxisId="right" type="monotone" dataKey="asp" stroke="hsl(var(--chart-2))" strokeWidth={2.8} dot={{ r: 3 }} name="Net ASP" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Price–Volume Quadrant" subtitle="Each dot = a model. Red = inefficient (low vol × high discount)." className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis type="number" dataKey="price" name="Avg Net Price" {...axisStyle} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="number" dataKey="units" name="Units Sold" {...axisStyle} tickFormatter={(v) => formatNumber(v)} />
              <ZAxis type="number" dataKey="revenue" range={[80, 600]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={chartTooltipStyle}
                formatter={(v: any, n: string) => {
                  if (n === "Avg Net Price") return [formatCurrency(v), n];
                  if (n === "Units Sold") return [formatNumber(v), n];
                  return [v, n];
                }}
                labelFormatter={() => ""}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d: any = payload[0].payload;
                  return (
                    <div style={chartTooltipStyle as any}>
                      <div className="font-semibold mb-1">{d.name}</div>
                      <div className="text-xs text-muted-foreground">Units: <span className="font-mono text-foreground">{formatNumber(d.units)}</span></div>
                      <div className="text-xs text-muted-foreground">Avg Net Price: <span className="font-mono text-foreground">{formatCurrency(d.price)}</span></div>
                      <div className="text-xs text-muted-foreground">Revenue: <span className="font-mono text-foreground">{formatCurrency(d.revenue)}</span></div>
                      <div className="text-xs text-muted-foreground">Avg Discount: <span className="font-mono text-foreground">{d.avgDiscount.toFixed(1)}%</span></div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} fill="hsl(var(--chart-2))">
                {scatterData.map((d, i) => (
                  <Cell key={i} fill={d.inefficient ? "hsl(var(--destructive))" : "hsl(var(--chart-2))"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Realisation insights</div>
          <InsightCard
            tone={inefficiencies.length ? "warning" : "success"} icon={AlertTriangle}
            title={inefficiencies.length ? `${inefficiencies.length} inefficient model(s)` : "Pricing efficiency healthy"}
            body={inefficiencies.length
              ? `Models combining low volume with elevated discounts: ${inefficiencies.map((i) => i.name).join(", ")}. Recommend price floor enforcement.`
              : "No models exhibit the low-volume × high-discount inefficiency pattern."}
          />
          <InsightCard
            tone="info" icon={Activity}
            title="Realisation gap to list"
            body={`Net ASP runs below List ASP by an average of ${trendData.length ? (trendData.reduce((s, d) => s + (d.listAsp - d.asp), 0) / trendData.length / (trendData[0]?.listAsp || 1) * 100).toFixed(1) : 0}% — quantifying the discount drag on price realisation.`}
          />
          <InsightCard
            tone="success" icon={DollarSign}
            title="ASP trend"
            body="Track Net ASP vs Units to ensure volume push isn't eroding price discipline. Target +1–2% ASP each quarter while protecting volume."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
