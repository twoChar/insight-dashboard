import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { useFilters } from "@/contexts/FilterContext";
import { formatNumber, formatPct } from "@/lib/mockData";
import { chartTooltipStyle, axisStyle, gridStyle } from "@/components/charts/chartTheme";
import { Package, Clock, AlertTriangle, Layers } from "lucide-react";

// Inventory aging buckets (deterministic per model)
function agingBucket(model: string): "0-30" | "31-60" | "61-90" | "90+" {
  const buckets = ["0-30", "31-60", "61-90", "90+"] as const;
  let h = 0;
  for (let i = 0; i < model.length; i++) h = (h * 31 + model.charCodeAt(i)) % 1000;
  return buckets[h % 4];
}

export default function Inventory() {
  const { data } = useFilters();

  const { aging, scatter, slowMoving, totalInv, avgDiscount, avgInv } = useMemo(() => {
    const modelMap: Record<string, { inv: number; units: number; discount: number; n: number }> = {};
    data.forEach((r) => {
      modelMap[r.model] = modelMap[r.model] || { inv: 0, units: 0, discount: 0, n: 0 };
      modelMap[r.model].inv += r.inventory;
      modelMap[r.model].units += r.units_sold;
      modelMap[r.model].discount += r.discount_percent;
      modelMap[r.model].n += 1;
    });
    const models = Object.entries(modelMap).map(([name, v]) => ({
      name, inventory: v.inv, units: v.units,
      avgDiscount: v.n > 0 ? v.discount / v.n : 0,
      turnover: v.inv > 0 ? v.units / v.inv : 0,
      bucket: agingBucket(name),
    }));

    const buckets = ["0-30", "31-60", "61-90", "90+"];
    const aging = buckets.map((b) => ({
      bucket: b,
      inventory: models.filter((m) => m.bucket === b).reduce((s, m) => s + m.inventory, 0),
    }));

    const scatter = models.map((m) => ({ ...m, slow: m.turnover < 0.3 }));
    const slowMoving = scatter.filter((s) => s.slow);
    const totalInv = models.reduce((s, m) => s + m.inventory, 0);
    const avgInv = totalInv / Math.max(1, models.length);
    const avgDiscount = models.reduce((s, m) => s + m.avgDiscount, 0) / Math.max(1, models.length);

    return { aging, scatter, slowMoving, totalInv, avgDiscount, avgInv };
  }, [data]);

  const bucketColor = (b: string) =>
    b === "0-30" ? "hsl(var(--success))" :
    b === "31-60" ? "hsl(var(--chart-2))" :
    b === "61-90" ? "hsl(var(--warning))" :
    "hsl(var(--destructive))";

  return (
    <DashboardLayout
      title="Inventory & Working Capital"
      subtitle="Stock aging, slow-movers, and the discount–inventory feedback loop."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Inventory" value={formatNumber(totalInv)} icon={Package} hint="Units in stock" />
        <KPICard label="Avg Inventory / Model" value={formatNumber(avgInv)} icon={Layers} />
        <KPICard label="Slow-Moving SKUs" value={slowMoving.length} icon={Clock} tone={slowMoving.length ? "warning" : "success"} hint="Turnover < 0.3" />
        <KPICard label="Avg Discount" value={formatPct(avgDiscount)} icon={AlertTriangle} tone="default" hint="On stocked models" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="Inventory Aging" subtitle="Units by age bucket" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={aging} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="bucket" {...axisStyle} />
              <YAxis {...axisStyle} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey="inventory" radius={[8, 8, 0, 0]}>
                {aging.map((a, i) => <Cell key={i} fill={bucketColor(a.bucket)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inventory vs Discount" subtitle="High inventory often correlates with elevated discounts" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis type="number" dataKey="inventory" name="Inventory" {...axisStyle} tickFormatter={(v) => formatNumber(v)} />
              <YAxis type="number" dataKey="avgDiscount" name="Avg Discount" {...axisStyle} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <ZAxis type="number" dataKey="units" range={[80, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d: any = payload[0].payload;
                  return (
                    <div style={chartTooltipStyle as any}>
                      <div className="font-semibold mb-1">{d.name}</div>
                      <div className="text-xs text-muted-foreground">Inventory: <span className="font-mono text-foreground">{formatNumber(d.inventory)}</span></div>
                      <div className="text-xs text-muted-foreground">Avg Discount: <span className="font-mono text-foreground">{d.avgDiscount.toFixed(1)}%</span></div>
                      <div className="text-xs text-muted-foreground">Turnover: <span className="font-mono text-foreground">{d.turnover.toFixed(2)}</span></div>
                      {d.slow && <div className="text-xs text-destructive font-semibold mt-1">⚠ Slow-moving</div>}
                    </div>
                  );
                }}
              />
              <Scatter data={scatter}>
                {scatter.map((s, i) => (
                  <Cell key={i} fill={s.slow ? "hsl(var(--destructive))" : "hsl(var(--chart-2))"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Slow-Moving Stock Watchlist" subtitle="Models flagged for working capital review" className="mb-5">
        {slowMoving.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No slow-moving SKUs in current selection.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {slowMoving.map((s) => (
              <div key={s.name} className="rounded-lg border border-border bg-secondary/40 p-4 hover:shadow-card-hover transition-smooth">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-foreground text-sm">{s.name}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-destructive/10 text-destructive">Slow</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-muted-foreground">Inventory</div><div className="font-mono font-semibold">{formatNumber(s.inventory)}</div></div>
                  <div><div className="text-muted-foreground">Turnover</div><div className="font-mono font-semibold">{s.turnover.toFixed(2)}</div></div>
                  <div><div className="text-muted-foreground">Discount</div><div className="font-mono font-semibold">{s.avgDiscount.toFixed(1)}%</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          tone="warning" icon={Clock}
          title="Aging stock concentration"
          body={`${formatNumber(aging.find((a) => a.bucket === "90+")?.inventory || 0)} units sit in the 90+ day bucket. Plan clearance campaigns with controlled discount caps to avoid margin spillover.`}
        />
        <InsightCard
          tone="info" icon={AlertTriangle}
          title="Discount × inventory feedback"
          body="Models with above-average inventory show consistently higher discount rates — confirming working-capital pressure as a discount driver. Tighten production planning."
        />
      </div>
    </DashboardLayout>
  );
}
