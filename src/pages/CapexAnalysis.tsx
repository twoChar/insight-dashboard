import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { Heatmap } from "@/components/charts/Heatmap";
import { Waterfall } from "@/components/charts/Waterfall";
import { chartTooltipStyle, axisStyle, gridStyle, CHART_COLORS } from "@/components/charts/chartTheme";
import { formatCurrency, formatPct } from "@/lib/mockData";
import { useFilters } from "@/contexts/FilterContext";
import {
  Building2, Zap, Cpu, Factory, Wrench, BatteryCharging, Leaf,
  TrendingUp, AlertTriangle, Sparkles, Target,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ---------- Mock CAPEX dataset (deterministic) ----------
type CapexRow = {
  id: string;
  theme: string;
  asset_type: string;
  function: string;
  segment: "ICE" | "EV" | "Hybrid" | "CV";
  stage: "Planned" | "Approved" | "In Progress" | "Capitalised";
  plant: string;
  capex_amount: number; // $M
  utilised: number; // $M
  payback: number; // years
  roce_impact: number; // %
  volume_enabled: number; // units
  cost_per_vehicle: number;
  defect_rate: number;
  throughput: number;
  supply_risk: number; // 0..100
  csat: number;
  tat: number;
  warranty: number;
  year: number;
};

const THEMES = [
  "EV & Powertrain", "Manufacturing Automation", "Digital & Analytics",
  "Aftersales", "Charging Ecosystem", "Localization",
];
const ASSETS = ["Plant & Machinery", "Tooling", "IT Systems", "Service Infra", "Charging Assets", "R&D"];
const FUNCTIONS = ["Manufacturing", "EV", "Digital", "Aftersales", "Supply Chain"];
const SEGMENTS_C = ["ICE", "EV", "Hybrid", "CV"] as const;
const STAGES = ["Planned", "Approved", "In Progress", "Capitalised"] as const;
const PLANTS = ["Pune", "Chennai", "Sanand", "Halol", "Pantnagar"];

function buildCapex(): CapexRow[] {
  let s = 7;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const rows: CapexRow[] = [];
  for (let i = 0; i < 140; i++) {
    const theme = THEMES[Math.floor(r() * THEMES.length)];
    const asset = ASSETS[Math.floor(r() * ASSETS.length)];
    const fn = FUNCTIONS[Math.floor(r() * FUNCTIONS.length)];
    const segment = SEGMENTS_C[Math.floor(r() * SEGMENTS_C.length)];
    const stage = STAGES[Math.floor(r() * STAGES.length)];
    const plant = PLANTS[Math.floor(r() * PLANTS.length)];
    const capex = Math.round((5 + r() * 95) * 10) / 10;
    const utilPct = stage === "Capitalised" ? 0.92 + r() * 0.08 :
      stage === "In Progress" ? 0.4 + r() * 0.45 :
      stage === "Approved" ? 0.05 + r() * 0.2 : 0;
    rows.push({
      id: `C-${i}`, theme, asset_type: asset, function: fn, segment, stage, plant,
      capex_amount: capex,
      utilised: +(capex * utilPct).toFixed(1),
      payback: +(2 + r() * 7).toFixed(1),
      roce_impact: +((r() * 6) - 1).toFixed(2),
      volume_enabled: Math.round(500 + r() * 8000),
      cost_per_vehicle: Math.round(8000 - r() * 2000),
      defect_rate: +(0.5 + r() * 3).toFixed(2),
      throughput: Math.round(60 + r() * 40),
      supply_risk: Math.round(r() * 100),
      csat: +(70 + r() * 25).toFixed(1),
      tat: +(2 + r() * 6).toFixed(1),
      warranty: +(0.5 + r() * 4).toFixed(2),
      year: 2024 + Math.floor(r() * 3),
    });
  }
  return rows;
}

const CAPEX_DATA = buildCapex();

export default function CapexAnalysis() {
  const { filters } = useFilters();
  const [stage, setStage] = useState<string>("all");
  const [fn, setFn] = useState<string>("all");
  const [segC, setSegC] = useState<string>("all");

  // Scenario sliders
  const [iceToEv, setIceToEv] = useState(0); // %
  const [delayGreenfield, setDelayGreenfield] = useState(0); // %
  const [digitalUp, setDigitalUp] = useState(0); // %

  const data = useMemo(() => {
    return CAPEX_DATA.filter((r) => {
      if (stage !== "all" && r.stage !== stage) return false;
      if (fn !== "all" && r.function !== fn) return false;
      if (segC !== "all" && r.segment !== segC) return false;
      return true;
    });
  }, [stage, fn, segC, filters]);

  const totals = useMemo(() => {
    const approved = data.filter((r) => r.stage !== "Planned").reduce((s, r) => s + r.capex_amount, 0);
    const utilised = data.reduce((s, r) => s + r.utilised, 0);
    const ev = data.filter((r) => r.theme === "EV & Powertrain" || r.segment === "EV").reduce((s, r) => s + r.capex_amount, 0);
    const mfg = data.filter((r) => r.function === "Manufacturing").reduce((s, r) => s + r.capex_amount, 0);
    const digital = data.filter((r) => r.function === "Digital").reduce((s, r) => s + r.capex_amount, 0);
    const total = data.reduce((s, r) => s + r.capex_amount, 0) || 1;
    const payback = data.reduce((s, r) => s + r.payback, 0) / Math.max(1, data.length);
    const roce = data.reduce((s, r) => s + r.roce_impact * r.capex_amount, 0) / total;
    return { approved, utilised, ev, mfg, digital, total, payback, roce };
  }, [data]);

  const themeData = useMemo(() =>
    THEMES.map((t) => ({
      name: t,
      value: +data.filter((r) => r.theme === t).reduce((s, r) => s + r.capex_amount, 0).toFixed(1),
    })).filter((d) => d.value > 0)
  , [data]);

  const assetData = useMemo(() =>
    ASSETS.map((a) => {
      const row: any = { asset: a };
      SEGMENTS_C.forEach((seg) => {
        row[seg] = +data.filter((r) => r.asset_type === a && r.segment === seg).reduce((s, r) => s + r.capex_amount, 0).toFixed(1);
      });
      return row;
    })
  , [data]);

  const scatter = useMemo(() => data.map((r) => ({
    capex: r.capex_amount,
    revenue: Math.round(r.volume_enabled * (r.segment === "EV" ? 32 : 24)),
    margin: r.roce_impact,
    segment: r.segment,
    z: Math.max(2, Math.abs(r.roce_impact) * 80),
  })), [data]);

  const efficiency = useMemo(() => {
    const years = [2024, 2025, 2026];
    return years.map((y) => {
      const rows = data.filter((r) => r.year === y && r.theme === "Manufacturing Automation");
      const cap = rows.reduce((s, r) => s + r.capex_amount, 0);
      const cpv = rows.length ? rows.reduce((s, r) => s + r.cost_per_vehicle, 0) / rows.length : 0;
      const def = rows.length ? rows.reduce((s, r) => s + r.defect_rate, 0) / rows.length : 0;
      const tp = rows.length ? rows.reduce((s, r) => s + r.throughput, 0) / rows.length : 0;
      return { year: `FY${y}`, capex: +cap.toFixed(1), cpv: Math.round(cpv), defect: +def.toFixed(2), throughput: +tp.toFixed(1) };
    });
  }, [data]);

  const evFunnel = useMemo(() => {
    const stages = ["Battery platforms", "Power electronics", "Charging infra", "Software"];
    return stages.map((name, i) => ({
      name,
      value: +(data.filter((r) => r.theme === "EV & Powertrain" || r.theme === "Charging Ecosystem")
        .reduce((s, r) => s + r.capex_amount, 0) * (1 - i * 0.18)).toFixed(1),
    }));
  }, [data]);

  const iceVsEv = useMemo(() => {
    return [2024, 2025, 2026].map((y) => ({
      year: `FY${y}`,
      ICE: +data.filter((r) => r.year === y && r.segment === "ICE").reduce((s, r) => s + r.capex_amount, 0).toFixed(1),
      EV: +data.filter((r) => r.year === y && r.segment === "EV").reduce((s, r) => s + r.capex_amount, 0).toFixed(1),
      Hybrid: +data.filter((r) => r.year === y && r.segment === "Hybrid").reduce((s, r) => s + r.capex_amount, 0).toFixed(1),
      CV: +data.filter((r) => r.year === y && r.segment === "CV").reduce((s, r) => s + r.capex_amount, 0).toFixed(1),
    }));
  }, [data]);

  const aftersales = useMemo(() => {
    const rows = data.filter((r) => r.function === "Aftersales");
    const buckets = ["Low", "Medium", "High"];
    return buckets.map((b, i) => {
      const sub = rows.filter((r) => {
        if (i === 0) return r.capex_amount < 20;
        if (i === 1) return r.capex_amount >= 20 && r.capex_amount < 60;
        return r.capex_amount >= 60;
      });
      const csat = sub.length ? sub.reduce((s, r) => s + r.csat, 0) / sub.length : 0;
      const tat = sub.length ? sub.reduce((s, r) => s + r.tat, 0) / sub.length : 0;
      const warranty = sub.length ? sub.reduce((s, r) => s + r.warranty, 0) / sub.length : 0;
      return { bucket: `${b} CAPEX`, csat: +csat.toFixed(1), tat: +tat.toFixed(2), warranty: +warranty.toFixed(2) };
    });
  }, [data]);

  const supplyHeat = useMemo(() => {
    const cells: { row: string; col: string; value: number }[] = [];
    ASSETS.forEach((a) => {
      ["Low", "Mid", "High"].forEach((b) => {
        const sub = data.filter((r) => {
          if (r.asset_type !== a) return false;
          if (b === "Low") return r.capex_amount < 20;
          if (b === "Mid") return r.capex_amount < 60;
          return r.capex_amount >= 60;
        });
        const v = sub.length ? sub.reduce((s, r) => s + r.supply_risk, 0) / sub.length : 0;
        cells.push({ row: a, col: b, value: +v.toFixed(0) });
      });
    });
    return cells;
  }, [data]);

  const tableRows = useMemo(() => data
    .slice()
    .sort((a, b) => b.capex_amount - a.capex_amount)
    .slice(0, 10)
  , [data]);

  // Scenario impact (illustrative)
  const scenario = useMemo(() => {
    const baseRoce = totals.roce;
    const baseRev = data.reduce((s, r) => s + r.volume_enabled * (r.segment === "EV" ? 32 : 24), 0);
    const roce = baseRoce + iceToEv * 0.012 + digitalUp * 0.015 - delayGreenfield * 0.008;
    const revenue = baseRev * (1 + iceToEv * 0.004 + digitalUp * 0.003 - delayGreenfield * 0.005);
    const efficiency = 100 + digitalUp * 0.2 + iceToEv * 0.1 - delayGreenfield * 0.15;
    return { roce, revenue, efficiency };
  }, [iceToEv, delayGreenfield, digitalUp, totals.roce, data]);

  return (
    <DashboardLayout
      title="CAPEX Analysis"
      subtitle="Strategic and operational lens on capital allocation, efficiency and ROI"
    >
      {/* Local filters */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <LocalFilter label="CAPEX Stage" value={stage} onChange={setStage} options={[...STAGES]} />
        <LocalFilter label="Function" value={fn} onChange={setFn} options={FUNCTIONS} />
        <LocalFilter label="Segment" value={segC} onChange={setSegC} options={[...SEGMENTS_C]} />
      </div>

      {/* Row 1: KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <KPICard label="Total Approved" value={`$${totals.approved.toFixed(0)}M`} icon={Building2} delta={6.4} />
        <KPICard label="Utilised %" value={formatPct(totals.approved ? (totals.utilised / totals.approved) * 100 : 0)} icon={Target} tone="success" />
        <KPICard label="EV-linked %" value={formatPct((totals.ev / (totals.total || 1)) * 100)} icon={Zap} tone="success" delta={12.1} />
        <KPICard label="Manufacturing %" value={formatPct((totals.mfg / (totals.total || 1)) * 100)} icon={Factory} />
        <KPICard label="Digital %" value={formatPct((totals.digital / (totals.total || 1)) * 100)} icon={Cpu} tone="success" delta={8.3} />
        <KPICard label="Avg Payback" value={`${totals.payback.toFixed(1)}y`} icon={TrendingUp} tone={totals.payback > 5 ? "warning" : "default"} />
        <KPICard label="ROCE Impact" value={formatPct(totals.roce)} icon={Sparkles} tone={totals.roce >= 1 ? "success" : "warning"} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="CAPEX by Strategic Theme" subtitle="Capital allocation shifting toward EV & Digital">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={themeData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={2}>
                {themeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `$${v}M`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="CAPEX by Asset Type" subtitle="Stacked by powertrain segment">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={assetData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="asset" {...axisStyle} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis {...axisStyle} tickFormatter={(v) => `$${v}M`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `$${v}M`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {SEGMENTS_C.map((s, i) => (
                <Bar key={s} dataKey={s} stackId="a" fill={CHART_COLORS[i]} radius={i === SEGMENTS_C.length - 1 ? [4, 4, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="CAPEX vs Revenue / Volume" subtitle="Bubble size = ROCE impact; color = segment">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="capex" name="CAPEX" {...axisStyle} tickFormatter={(v) => `$${v}M`} />
              <YAxis dataKey="revenue" name="Revenue" {...axisStyle} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <ZAxis dataKey="z" range={[40, 400]} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              {SEGMENTS_C.map((s, i) => (
                <Scatter key={s} name={s} data={scatter.filter((d) => d.segment === s)} fill={CHART_COLORS[i]} />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Automation CAPEX vs Efficiency" subtitle="Is CAPEX improving cost & throughput?">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={efficiency} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="year" {...axisStyle} />
              <YAxis yAxisId="l" {...axisStyle} tickFormatter={(v) => `$${v}M`} />
              <YAxis yAxisId="r" orientation="right" {...axisStyle} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="capex" name="Automation CAPEX" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" dataKey="cpv" name="Cost / Vehicle" stroke="hsl(var(--destructive))" strokeWidth={2.5} />
              <Line yAxisId="r" dataKey="throughput" name="Throughput" stroke="hsl(var(--success))" strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="EV CAPEX Funnel" subtitle="Battery → Power Electronics → Charging → Software">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evFunnel} layout="vertical" margin={{ top: 6, right: 16, left: 12, bottom: 0 }}>
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" {...axisStyle} tickFormatter={(v) => `$${v}M`} />
              <YAxis type="category" dataKey="name" {...axisStyle} width={140} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `$${v}M`} />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ICE vs EV Transition" subtitle="Multi-year stacked CAPEX trend">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={iceVsEv} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="year" {...axisStyle} />
              <YAxis {...axisStyle} tickFormatter={(v) => `$${v}M`} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ICE" stackId="a" fill={CHART_COLORS[4]} />
              <Bar dataKey="Hybrid" stackId="a" fill={CHART_COLORS[3]} />
              <Bar dataKey="CV" stackId="a" fill={CHART_COLORS[2]} />
              <Bar dataKey="EV" stackId="a" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Aftersales CAPEX Impact" subtitle="CSAT, TAT and warranty by CAPEX bucket">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={aftersales} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="bucket" {...axisStyle} />
              <YAxis yAxisId="l" {...axisStyle} />
              <YAxis yAxisId="r" orientation="right" {...axisStyle} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="csat" name="CSAT" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" dataKey="tat" name="TAT (days)" stroke="hsl(var(--warning))" strokeWidth={2.5} />
              <Line yAxisId="r" dataKey="warranty" name="Warranty %" stroke="hsl(var(--destructive))" strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Supply Chain Risk Heatmap" subtitle="Asset × CAPEX size — color = risk score">
          <Heatmap
            rows={ASSETS}
            cols={["Low", "Mid", "High"]}
            data={supplyHeat}
            colorScale="discount"
            format={(v) => v.toFixed(0)}
          />
        </ChartCard>
      </div>

      {/* Row 6: governance + scenario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="CAPEX Status — Top 10" subtitle="Approved vs utilised, ROCE flags" className="lg:col-span-2">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Theme</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Utilised</TableHead>
                  <TableHead className="text-right">Payback</TableHead>
                  <TableHead className="text-right">ROCE</TableHead>
                  <TableHead>Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((r) => {
                  const flag = r.roce_impact < 0.5 ? "🔴" : r.roce_impact < 1.5 ? "🟠" : "🟢";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.theme}</TableCell>
                      <TableCell className="text-xs">{r.stage}</TableCell>
                      <TableCell className="text-right font-mono">${r.capex_amount}M</TableCell>
                      <TableCell className="text-right font-mono">${r.utilised}M</TableCell>
                      <TableCell className="text-right font-mono">{r.payback}y</TableCell>
                      <TableCell className="text-right font-mono">{r.roce_impact}%</TableCell>
                      <TableCell>{flag}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </ChartCard>

        <ChartCard title="Scenario Panel" subtitle="Drag sliders to model strategic shifts">
          <div className="space-y-5">
            <ScenarioSlider label="Shift CAPEX ICE → EV" value={iceToEv} onChange={setIceToEv} suffix="%" />
            <ScenarioSlider label="Delay greenfield projects" value={delayGreenfield} onChange={setDelayGreenfield} suffix="%" />
            <ScenarioSlider label="Increase Digital CAPEX" value={digitalUp} onChange={setDigitalUp} suffix="%" />
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
              <ScenarioStat label="ROCE" value={`${scenario.roce.toFixed(2)}%`} tone={scenario.roce > totals.roce ? "success" : "danger"} />
              <ScenarioStat label="Revenue" value={formatCurrency(scenario.revenue)} tone={scenario.revenue > 0 ? "success" : "danger"} />
              <ScenarioStat label="Efficiency" value={`${scenario.efficiency.toFixed(0)}`} tone={scenario.efficiency >= 100 ? "success" : "danger"} />
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Insight Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InsightCard tone="success" icon={Zap}
          title="EV concentration drives growth"
          body={`${formatPct((totals.ev / (totals.total || 1)) * 100)} of CAPEX is EV-linked — these projects are projected to enable 60%+ of incremental volume by FY26.`} />
        <InsightCard tone="info" icon={Cpu}
          title="Automation lowering cost / vehicle"
          body="Manufacturing automation CAPEX is correlated with a ~6% reduction in cost-per-vehicle and 12% throughput uplift over 2 years." />
        <InsightCard tone="warning" icon={AlertTriangle}
          title="Watch supply-risk concentration"
          body="High-CAPEX × High-risk cells in Tooling and Charging Assets warrant dual-source strategies and earlier capex staging." />
      </div>
    </DashboardLayout>
  );
}

function LocalFilter({ label, value, onChange, options }:
  { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[160px] bg-card border-border text-sm font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ScenarioSlider({ label, value, onChange, suffix = "" }:
  { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs font-mono font-semibold text-accent">{value}{suffix}</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={0} max={50} step={1} />
    </div>
  );
}

function ScenarioStat({ label, value, tone }:
  { label: string; value: string; tone: "success" | "danger" }) {
  const cls = tone === "success" ? "text-success" : "text-destructive";
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`text-sm font-mono font-bold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}
