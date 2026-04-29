import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { Waterfall } from "@/components/charts/Waterfall";
import { useFilters, groupByPeriod } from "@/contexts/FilterContext";
import { formatCurrency, formatPct } from "@/lib/mockData";
import { chartTooltipStyle, axisStyle, gridStyle } from "@/components/charts/chartTheme";
import { Droplets, TrendingDown, Activity, AlertTriangle } from "lucide-react";

export default function MarginLeakage() {
  const { data, filters } = useFilters();

  const { steps, marginTrend, gross, discount, net, cost, profit, marginPct, leakageDrivers, avgMargin } = useMemo(() => {
    const gross = data.reduce((s, r) => s + r.units_sold * r.price, 0);
    const net = data.reduce((s, r) => s + r.revenue, 0);
    const discount = -(gross - net);
    const cost = -data.reduce((s, r) => s + r.cost, 0);
    const profit = net + cost;
    const marginPct = net > 0 ? (profit / net) * 100 : 0;

    const steps = [
      { name: "Gross Revenue", value: gross, type: "start" as const },
      { name: "Discount", value: discount, type: "negative" as const },
      { name: "Net Revenue", value: net, type: "total" as const },
      { name: "Cost", value: cost, type: "negative" as const },
      { name: "Profit", value: profit, type: "total" as const },
    ];

    // Margin % trend
    const periodMap: Record<string, { net: number; cost: number }> = {};
    data.forEach((r) => {
      const p = groupByPeriod(r.date, filters.timePeriod);
      periodMap[p] = periodMap[p] || { net: 0, cost: 0 };
      periodMap[p].net += r.revenue;
      periodMap[p].cost += r.cost;
    });
    const marginTrend = Object.entries(periodMap)
      .map(([period, v]) => ({ period, margin: v.net > 0 ? +(((v.net - v.cost) / v.net) * 100).toFixed(2) : 0 }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const avgMargin = marginTrend.reduce((s, d) => s + d.margin, 0) / Math.max(1, marginTrend.length);

    // Top leakage drivers (by absolute discount $)
    const driverMap: Record<string, number> = {};
    data.forEach((r) => {
      const d = r.units_sold * r.price * (r.discount_percent / 100);
      driverMap[r.segment] = (driverMap[r.segment] || 0) + d;
    });
    const leakageDrivers = Object.entries(driverMap)
      .map(([segment, amount]) => ({ segment, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { steps, marginTrend, gross, discount, net, cost, profit, marginPct, leakageDrivers, avgMargin };
  }, [data, filters.timePeriod]);

  return (
    <DashboardLayout
      title="Margin Leakage"
      subtitle="Tracing the path from gross revenue to profit — and where margin is lost."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Gross Revenue" value={formatCurrency(gross)} icon={Activity} />
        <KPICard label="Discount Leakage" value={formatCurrency(Math.abs(discount))} icon={Droplets} tone="warning" hint={`${gross > 0 ? ((Math.abs(discount) / gross) * 100).toFixed(1) : 0}% of gross`} />
        <KPICard label="Profit" value={formatCurrency(profit)} icon={TrendingDown} tone="success" />
        <KPICard label="Net Margin" value={formatPct(marginPct)} icon={AlertTriangle} tone={marginPct < 25 ? "warning" : "success"} hint={`Avg ${formatPct(avgMargin)} period`} />
      </div>

      <ChartCard title="Margin Waterfall" subtitle="Revenue → Discount → Net Revenue → Cost → Profit" className="mb-5">
        <Waterfall steps={steps} height={380} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="Margin % Trend" subtitle="Period-over-period margin trajectory" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={marginTrend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="period" {...axisStyle} />
              <YAxis {...axisStyle} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatPct(v)} />
              <ReferenceLine y={avgMargin} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: `Avg ${avgMargin.toFixed(1)}%`, position: "right", fill: "hsl(var(--accent))", fontSize: 11 }} />
              <Line
                type="monotone" dataKey="margin"
                stroke="hsl(var(--chart-1))" strokeWidth={2.8}
                dot={{ r: 3, fill: "hsl(var(--chart-1))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Leakage Drivers" subtitle="Discount $ by segment">
          <div className="flex flex-col gap-2.5">
            {leakageDrivers.map((d, i) => {
              const max = leakageDrivers[0]?.amount || 1;
              const pct = (d.amount / max) * 100;
              return (
                <div key={d.segment} className="">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-foreground">{d.segment}</div>
                    <div className="text-xs font-mono font-semibold text-foreground">{formatCurrency(d.amount)}</div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-smooth"
                      style={{
                        width: `${pct}%`,
                        background: i === 0 ? "hsl(var(--destructive))" : i === 1 ? "hsl(var(--warning))" : "hsl(var(--chart-2))",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InsightCard
          tone="danger" icon={Droplets}
          title="Discount is the largest leakage source"
          body={`${formatCurrency(Math.abs(discount))} of revenue is foregone via discount — equivalent to ${gross > 0 ? ((Math.abs(discount) / gross) * 100).toFixed(1) : 0}% of gross. Even a 100bps reduction recovers ${formatCurrency(gross * 0.01)}.`}
        />
        <InsightCard
          tone="warning" icon={AlertTriangle}
          title={`${leakageDrivers[0]?.segment ?? "—"} drives leakage`}
          body={`This segment contributes ${leakageDrivers[0] ? formatCurrency(leakageDrivers[0].amount) : "—"} of discount cost. Prioritize pricing governance and approval workflows here.`}
        />
        <InsightCard
          tone={marginPct < 25 ? "warning" : "success"} icon={TrendingDown}
          title={`Margin at ${formatPct(marginPct)}`}
          body={marginPct < 25
            ? "Below industry benchmark. Consider tighter discount caps, cost-to-serve segmentation, and SKU rationalisation."
            : "Margin profile is healthy. Maintain pricing discipline and continue protecting realisation."}
        />
      </div>
    </DashboardLayout>
  );
}
