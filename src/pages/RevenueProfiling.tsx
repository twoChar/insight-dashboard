import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, Treemap,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { useFilters, groupByPeriod } from "@/contexts/FilterContext";
import { formatCurrency, formatNumber, SEGMENTS } from "@/lib/mockData";
import { CHART_COLORS, chartTooltipStyle, axisStyle, gridStyle } from "@/components/charts/chartTheme";
import { DollarSign, TrendingUp, Layers, AlertTriangle, Target, Award } from "lucide-react";

export default function RevenueProfiling() {
  const { data, filters } = useFilters();

  const { stackedData, lineData, treemapData, totalRev, topModel, concentration, deltaPct, avgRev } = useMemo(() => {
    // Stacked by period × segment
    const periodMap: Record<string, any> = {};
    data.forEach((r) => {
      const p = groupByPeriod(r.date, filters.timePeriod);
      if (!periodMap[p]) { periodMap[p] = { period: p }; SEGMENTS.forEach((s) => (periodMap[p][s] = 0)); }
      periodMap[p][r.segment] += r.revenue;
    });
    const stackedData = Object.values(periodMap).sort((a: any, b: any) => a.period.localeCompare(b.period));

    const lineData = stackedData.map((d: any) => ({
      period: d.period,
      revenue: SEGMENTS.reduce((s, seg) => s + (d[seg] || 0), 0),
    }));

    // Treemap by model
    const modelMap: Record<string, number> = {};
    data.forEach((r) => { modelMap[r.model] = (modelMap[r.model] || 0) + r.revenue; });
    const treemapData = Object.entries(modelMap)
      .map(([name, size], i) => ({ name, size, fill: CHART_COLORS[i % CHART_COLORS.length] }))
      .sort((a, b) => b.size - a.size);

    const totalRev = lineData.reduce((s, d) => s + d.revenue, 0);
    const avgRev = totalRev / Math.max(1, lineData.length);
    const topModel = treemapData[0];
    const top3 = treemapData.slice(0, 3).reduce((s, d) => s + d.size, 0);
    const concentration = totalRev > 0 ? (top3 / totalRev) * 100 : 0;

    const half = Math.floor(lineData.length / 2);
    const recent = lineData.slice(half).reduce((s, d) => s + d.revenue, 0);
    const prior = lineData.slice(0, half).reduce((s, d) => s + d.revenue, 0);
    const deltaPct = prior > 0 ? ((recent - prior) / prior) * 100 : 0;

    return { stackedData, lineData, treemapData, totalRev, topModel, concentration, deltaPct, avgRev };
  }, [data, filters.timePeriod]);

  return (
    <DashboardLayout
      title="Revenue Profiling"
      subtitle="Composition, trajectory, and concentration of revenue across segments and models."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Revenue" value={formatCurrency(totalRev)} delta={deltaPct} icon={DollarSign} tone="default" />
        <KPICard label="Avg Period Revenue" value={formatCurrency(avgRev)} icon={TrendingUp} tone="success" hint="Per selected period" />
        <KPICard label="Top Model Share" value={topModel ? `${((topModel.size / totalRev) * 100).toFixed(1)}%` : "—"} icon={Award} hint={topModel?.name} tone="default" />
        <KPICard label="Top-3 Concentration" value={`${concentration.toFixed(1)}%`} icon={Target} tone={concentration > 60 ? "warning" : "success"} hint="Concentration risk indicator" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="Revenue Composition" subtitle="Stacked contribution by segment over time" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stackedData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="period" {...axisStyle} />
              <YAxis {...axisStyle} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
              {SEGMENTS.map((s, i) => (
                <Bar key={s} dataKey={s} stackId="rev" fill={CHART_COLORS[i]} radius={i === SEGMENTS.length - 1 ? [6, 6, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Trend" subtitle="Total revenue trajectory">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={lineData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="period" {...axisStyle} />
              <YAxis {...axisStyle} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Line
                type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--chart-2))" }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Model Revenue Breakdown" subtitle="Treemap — sized by total revenue contribution" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={340}>
            <Treemap
              data={treemapData} dataKey="size" nameKey="name" stroke="hsl(var(--background))"
              content={<TreemapContent />}
            />
          </ResponsiveContainer>
        </ChartCard>

        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Auto-generated insights</div>
          <InsightCard
            tone="success" icon={Award}
            title={`${topModel?.name ?? "—"} leads the portfolio`}
            body={`Contributing ${topModel ? ((topModel.size / totalRev) * 100).toFixed(1) : 0}% of total revenue. Consider expanding distribution and pricing leverage.`}
          />
          <InsightCard
            tone={concentration > 60 ? "warning" : "info"} icon={AlertTriangle}
            title={concentration > 60 ? "Concentration risk detected" : "Balanced portfolio"}
            body={`Top-3 models account for ${concentration.toFixed(1)}% of revenue. ${concentration > 60 ? "Diversification recommended to reduce single-product exposure." : "Healthy spread across the portfolio."}`}
          />
          <InsightCard
            tone={deltaPct >= 0 ? "success" : "danger"} icon={Layers}
            title={`Revenue ${deltaPct >= 0 ? "expanded" : "contracted"} ${Math.abs(deltaPct).toFixed(1)}% H/H`}
            body={`Latest 12-month period vs prior, signaling ${deltaPct >= 0 ? "momentum" : "softening demand"} in current segments and pricing.`}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

// Custom Treemap content
function TreemapContent(props: any) {
  const { x, y, width, height, name, size, fill, root } = props;
  if (width < 2 || height < 2) return null;
  const total = root?.value || 1;
  const pct = ((size / total) * 100).toFixed(1);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="hsl(var(--background))" strokeWidth={2} rx={6} />
      {width > 70 && height > 40 && (
        <>
          <text x={x + 10} y={y + 22} fill="white" fontSize={12} fontWeight={600}>{name}</text>
          <text x={x + 10} y={y + 38} fill="rgba(255,255,255,0.8)" fontSize={11} fontFamily="JetBrains Mono">{pct}%</text>
        </>
      )}
    </g>
  );
}
