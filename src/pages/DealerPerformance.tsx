import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LabelList,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { Heatmap } from "@/components/charts/Heatmap";
import { useFilters } from "@/contexts/FilterContext";
import { formatCurrency, formatPct, CUSTOMERS, ALL_MODELS } from "@/lib/mockData";
import { chartTooltipStyle, axisStyle, gridStyle } from "@/components/charts/chartTheme";
import { Users, Crown, AlertTriangle, TrendingDown } from "lucide-react";

export default function DealerPerformance() {
  const { data } = useFilters();

  const { ranking, heatmap, highDiscount, lowMargin } = useMemo(() => {
    const cMap: Record<string, { rev: number; cost: number; discount: number; n: number; units: number }> = {};
    data.forEach((r) => {
      cMap[r.customer] = cMap[r.customer] || { rev: 0, cost: 0, discount: 0, n: 0, units: 0 };
      cMap[r.customer].rev += r.revenue;
      cMap[r.customer].cost += r.cost;
      cMap[r.customer].discount += r.discount_percent * r.revenue;
      cMap[r.customer].n += r.revenue;
      cMap[r.customer].units += r.units_sold;
    });
    const ranking = Object.entries(cMap)
      .map(([name, v]) => ({
        name, revenue: v.rev, units: v.units,
        margin: v.rev > 0 ? ((v.rev - v.cost) / v.rev) * 100 : 0,
        avgDiscount: v.n > 0 ? v.discount / v.n : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Customer × Model revenue
    const cmMap: Record<string, Record<string, number>> = {};
    data.forEach((r) => {
      cmMap[r.customer] = cmMap[r.customer] || {};
      cmMap[r.customer][r.model] = (cmMap[r.customer][r.model] || 0) + r.revenue;
    });
    const heatmap = CUSTOMERS.flatMap((c) =>
      ALL_MODELS.map((m) => ({ row: c, col: m, value: cmMap[c]?.[m] || 0 }))
    );

    const avgDisc = ranking.reduce((s, r) => s + r.avgDiscount, 0) / Math.max(1, ranking.length);
    const avgMargin = ranking.reduce((s, r) => s + r.margin, 0) / Math.max(1, ranking.length);
    const highDiscount = ranking.filter((r) => r.avgDiscount > avgDisc + 2).slice(0, 5);
    const lowMargin = [...ranking].sort((a, b) => a.margin - b.margin).slice(0, 5);

    return { ranking, heatmap, highDiscount, lowMargin };
  }, [data]);

  const top = ranking[0];

  return (
    <DashboardLayout
      title="Dealer / Customer Performance"
      subtitle="Ranking, profitability and discount discipline across the customer base."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Active Customers" value={ranking.length} icon={Users} />
        <KPICard label="Top Customer" value={top?.name ?? "—"} icon={Crown} tone="success" hint={top ? formatCurrency(top.revenue) : ""} />
        <KPICard label="High-Discount Dealers" value={highDiscount.length} icon={AlertTriangle} tone="warning" hint=">2pp above avg" />
        <KPICard label="Low-Margin Customers" value={lowMargin.filter((c) => c.margin < 22).length} icon={TrendingDown} tone="danger" hint="Margin <22%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Revenue Ranking" subtitle="Top customers by net revenue">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={ranking.slice(0, 10)} layout="vertical" margin={{ top: 6, right: 60, left: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" {...axisStyle} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis type="category" dataKey="name" {...axisStyle} width={120} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]}>
                <LabelList dataKey="revenue" position="right" formatter={(v: number) => formatCurrency(v)} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Margin Ranking" subtitle="Customer margin %, lowest highlighted">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={[...ranking].sort((a, b) => a.margin - b.margin).slice(0, 10)} layout="vertical" margin={{ top: 6, right: 50, left: 8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" {...axisStyle} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <YAxis type="category" dataKey="name" {...axisStyle} width={120} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatPct(v)} />
              <Bar dataKey="margin" radius={[0, 6, 6, 0]}>
                {ranking.slice(0, 10).map((r, i) => (
                  <Cell key={i} fill={r.margin < 22 ? "hsl(var(--destructive))" : r.margin < 26 ? "hsl(var(--warning))" : "hsl(var(--success))"} />
                ))}
                <LabelList dataKey="margin" position="right" formatter={(v: number) => formatPct(v)} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Customer × Model Revenue" subtitle="Distribution of revenue across the dealer–product matrix" className="mb-5">
        <Heatmap
          data={heatmap}
          rows={CUSTOMERS}
          cols={ALL_MODELS}
          format={(v) => formatCurrency(v)}
          colorScale="performance"
        />
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InsightCard
          tone="warning" icon={AlertTriangle}
          title="High-discount dealers"
          body={highDiscount.length
            ? `${highDiscount.map((d) => d.name).slice(0, 3).join(", ")} consistently price below portfolio average. Renegotiate authority levels.`
            : "Discount discipline is healthy across the dealer base."}
        />
        <InsightCard
          tone="danger" icon={TrendingDown}
          title="Low-margin customers"
          body={lowMargin.length
            ? `${lowMargin.slice(0, 3).map((c) => c.name).join(", ")} operate below 25% margin. Review mix, rebates and service revenue capture.`
            : "All customers operate within healthy margin bands."}
        />
        <InsightCard
          tone="success" icon={Crown}
          title="Top performer"
          body={top ? `${top.name} delivers ${formatCurrency(top.revenue)} at ${formatPct(top.margin)} margin. Replicate playbook across mid-tier accounts.` : "—"}
        />
      </div>
    </DashboardLayout>
  );
}
