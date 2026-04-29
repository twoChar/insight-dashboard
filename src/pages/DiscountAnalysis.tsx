import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { Heatmap } from "@/components/charts/Heatmap";
import { useFilters, groupByPeriod } from "@/contexts/FilterContext";
import { formatCurrency, formatPct, SEGMENTS, CUSTOMERS, ALL_MODELS } from "@/lib/mockData";
import { CHART_COLORS, chartTooltipStyle, axisStyle, gridStyle } from "@/components/charts/chartTheme";
import { Tags, AlertTriangle, TrendingDown, Flame } from "lucide-react";

export default function DiscountAnalysis() {
  const { data, filters } = useFilters();

  const computed = useMemo(() => {
    // weighted avg discount per period × segment
    const aggBy = (key: keyof typeof data[number]) => {
      const map: Record<string, Record<string, { rev: number; weighted: number }>> = {};
      data.forEach((r) => {
        const p = groupByPeriod(r.date, filters.timePeriod);
        const k = String(r[key]);
        if (!map[p]) map[p] = {};
        if (!map[p][k]) map[p][k] = { rev: 0, weighted: 0 };
        map[p][k].rev += r.revenue;
        map[p][k].weighted += r.revenue * r.discount_percent;
      });
      return map;
    };

    const segmentMap = aggBy("segment");
    const segmentTrend = Object.entries(segmentMap)
      .map(([period, vals]) => {
        const row: any = { period };
        SEGMENTS.forEach((s) => {
          const v = vals[s];
          row[s] = v && v.rev > 0 ? +(v.weighted / v.rev).toFixed(2) : 0;
        });
        return row;
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    // KPIs
    const totalRev = data.reduce((s, r) => s + r.revenue, 0);
    const totalUndiscounted = data.reduce((s, r) => s + r.units_sold * r.price, 0);
    const avgDiscount = data.length ? data.reduce((s, r) => s + r.discount_percent * r.revenue, 0) / Math.max(1, totalRev) : 0;
    const maxDiscount = Math.max(...data.map((r) => r.discount_percent), 0);
    const revenueImpact = totalUndiscounted - totalRev;

    // Heatmap: customer × model (avg discount weighted by revenue)
    const cmMap: Record<string, Record<string, { w: number; r: number }>> = {};
    data.forEach((r) => {
      cmMap[r.customer] = cmMap[r.customer] || {};
      cmMap[r.customer][r.model] = cmMap[r.customer][r.model] || { w: 0, r: 0 };
      cmMap[r.customer][r.model].w += r.discount_percent * r.revenue;
      cmMap[r.customer][r.model].r += r.revenue;
    });
    const heatmapCells = CUSTOMERS.flatMap((c) =>
      ALL_MODELS.map((m) => {
        const v = cmMap[c]?.[m];
        return { row: c, col: m, value: v && v.r > 0 ? +(v.w / v.r).toFixed(1) : 0 };
      })
    );

    // Anomalies: spikes vs avg
    const recentPeriod = segmentTrend[segmentTrend.length - 1];
    const anomalies = SEGMENTS
      .map((s) => {
        const series = segmentTrend.map((d) => d[s] as number).filter(Boolean);
        const mean = series.reduce((a, b) => a + b, 0) / Math.max(1, series.length);
        const std = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, series.length));
        const latest = recentPeriod?.[s] || 0;
        const z = std > 0 ? (latest - mean) / std : 0;
        return { segment: s, latest, mean, z };
      })
      .sort((a, b) => b.z - a.z);

    return { segmentTrend, avgDiscount, maxDiscount, revenueImpact, heatmapCells, anomalies };
  }, [data, filters.timePeriod]);

  const { segmentTrend, avgDiscount, maxDiscount, revenueImpact, heatmapCells, anomalies } = computed;

  const anomalyTone = (z: number) => z > 1.5 ? "danger" : z > 0.7 ? "warning" : "success";
  const anomalyLabel = (z: number) => z > 1.5 ? "High spike" : z > 0.7 ? "Moderate" : "Normal";

  return (
    <DashboardLayout
      title="Discount Analysis"
      subtitle="Discount discipline, anomalies, and revenue leakage from price concessions."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Avg Discount" value={formatPct(avgDiscount)} icon={Tags} tone={avgDiscount > 12 ? "warning" : "default"} hint="Revenue-weighted" />
        <KPICard label="Max Discount" value={formatPct(maxDiscount)} icon={Flame} tone="danger" hint="Single transaction peak" />
        <KPICard label="Revenue Impact" value={formatCurrency(revenueImpact)} icon={TrendingDown} tone="warning" hint="Foregone vs list price" />
        <KPICard label="Active Anomalies" value={anomalies.filter((a) => a.z > 1.5).length} icon={AlertTriangle} tone="danger" hint="Z-score > 1.5 in segments" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="Discount Trend by Segment" subtitle="Revenue-weighted % discount" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={segmentTrend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="period" {...axisStyle} />
              <YAxis {...axisStyle} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
              {SEGMENTS.map((s, i) => (
                <Line key={s} type="monotone" dataKey={s} stroke={CHART_COLORS[i]} strokeWidth={2.2} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Anomaly Status" subtitle="Latest period vs historical baseline">
          <div className="flex flex-col gap-2.5">
            {anomalies.map((a) => {
              const tone = anomalyTone(a.z);
              const label = anomalyLabel(a.z);
              const dot = tone === "danger" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-success";
              return (
                <div key={a.segment} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-secondary/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{a.segment}</div>
                      <div className="text-[11px] text-muted-foreground">μ {a.mean.toFixed(1)}% · z {a.z.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-mono font-bold text-foreground">{a.latest.toFixed(1)}%</div>
                    <div className={`text-[10px] font-semibold uppercase tracking-wide ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-success"}`}>{label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Discount Heatmap — Customer × Model" subtitle="Avg discount %, weighted by revenue. Red = high, Green = healthy.">
        <Heatmap
          data={heatmapCells}
          rows={CUSTOMERS}
          cols={ALL_MODELS}
          format={(v) => v > 0 ? `${v.toFixed(1)}%` : "—"}
          colorScale="discount"
        />
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
        <InsightCard
          tone="warning" icon={AlertTriangle}
          title="Premium segment under pricing pressure"
          body="Discount levels in Premium have drifted above the trailing-12-month mean. Re-validate dealer authority levels and approval gates."
        />
        <InsightCard
          tone="danger" icon={Flame}
          title="Top customer concessions"
          body="Apex Motors and Velocity Group consistently exceed portfolio averages. Renegotiate volume rebate structures vs net pricing."
        />
        <InsightCard
          tone="info" icon={Tags}
          title="Revenue impact materially significant"
          body={`Estimated ${formatCurrency(revenueImpact)} of revenue forgone to discounts in scope. ~30% likely recoverable through tighter governance.`}
        />
      </div>
    </DashboardLayout>
  );
}
