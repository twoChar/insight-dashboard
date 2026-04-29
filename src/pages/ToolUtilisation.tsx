import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, ReferenceLine, ReferenceArea, ComposedChart,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard, ChartCard, InsightCard } from "@/components/cards/Cards";
import { chartTooltipStyle, axisStyle, gridStyle, CHART_COLORS } from "@/components/charts/chartTheme";
import { formatPct, formatCurrency } from "@/lib/mockData";
import { Wrench, AlertTriangle, Snowflake, TrendingDown, Activity, Gauge } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ToolRow = {
  id: string; tool: string; model: string; plant: string; platform: "ICE" | "EV";
  rated_capacity: number; actual_production: number;
  tool_nbv: number; tooling_capex: number; revenue_generated: number; amortisation_cost: number;
  payback_period: number; phase: "SOP" | "Steady";
};

const PLANTS = ["Pune", "Chennai", "Sanand", "Halol"];
const TOOL_GROUPS = ["Press Line", "Stamping Die", "Welding Jig", "Paint Robot", "Assembly Fixture", "Battery Pack Tool", "Motor Tool"];
const MODELS = ["Aurora X", "Horizon", "Pulse", "Nova", "EV-One", "EV-Two", "Titan HD"];

function buildTools(): ToolRow[] {
  let s = 11;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out: ToolRow[] = [];
  for (let i = 0; i < 60; i++) {
    const plat: "ICE" | "EV" = r() < 0.45 ? "EV" : "ICE";
    const tool = TOOL_GROUPS[Math.floor(r() * TOOL_GROUPS.length)];
    const model = MODELS[Math.floor(r() * MODELS.length)];
    const plant = PLANTS[Math.floor(r() * PLANTS.length)];
    const rated = Math.round(8000 + r() * 30000);
    // EV underutilised more often
    const utilBase = plat === "EV" ? 0.35 + r() * 0.55 : 0.55 + r() * 0.45;
    const actual = Math.round(rated * utilBase);
    const capex = Math.round(50 + r() * 450); // ₹ Cr
    const nbv = Math.round(capex * (0.4 + r() * 0.55));
    const revenue = Math.round(actual * (plat === "EV" ? 4.5 : 3.5) / 100); // ₹ Cr
    const amort = Math.round((capex / 8) * 10) / 10;
    out.push({
      id: `T-${i}`, tool, model, plant, platform: plat,
      rated_capacity: rated, actual_production: actual,
      tool_nbv: nbv, tooling_capex: capex, revenue_generated: revenue,
      amortisation_cost: amort, payback_period: +(2 + r() * 8).toFixed(1),
      phase: r() < 0.3 ? "SOP" : "Steady",
    });
  }
  return out;
}

const TOOLS = buildTools();

export default function ToolUtilisation() {
  const [plant, setPlant] = useState("all");
  const [tool, setTool] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [phase, setPhase] = useState<"all" | "SOP" | "Steady">("all");

  const data = useMemo(() => TOOLS.filter((t) =>
    (plant === "all" || t.plant === plant) &&
    (tool === "all" || t.tool === tool) &&
    (platform === "all" || t.platform === platform) &&
    (phase === "all" || t.phase === phase)
  ), [plant, tool, platform, phase]);

  const kpis = useMemo(() => {
    const totalRated = data.reduce((s, r) => s + r.rated_capacity, 0);
    const totalActual = data.reduce((s, r) => s + r.actual_production, 0);
    const util = totalRated ? (totalActual / totalRated) * 100 : 0;
    const totalNbv = data.reduce((s, r) => s + r.tool_nbv, 0);
    const underNbv = data.filter((r) => r.actual_production / r.rated_capacity < 0.6).reduce((s, r) => s + r.tool_nbv, 0);
    const underPct = totalNbv ? (underNbv / totalNbv) * 100 : 0;
    const totalCapex = data.reduce((s, r) => s + r.tooling_capex, 0);
    const totalRev = data.reduce((s, r) => s + r.revenue_generated, 0);
    const revPerRupee = totalCapex ? totalRev / totalCapex : 0;
    const totalAmort = data.reduce((s, r) => s + r.amortisation_cost, 0);
    const amortPerVeh = totalActual ? (totalAmort * 1e7) / totalActual : 0;
    const gap = totalRated - totalActual;
    return { util, underPct, revPerRupee, amortPerVeh, gap, underNbv };
  }, [data]);

  const toneFor = (v: number) => v < 60 ? "danger" : v < 75 ? "warning" : "success";

  // Bullet-style: per tool rated vs actual (sorted by util asc)
  const bulletData = useMemo(() => data
    .map((r) => ({ ...r, util: (r.actual_production / r.rated_capacity) * 100 }))
    .sort((a, b) => a.util - b.util)
    .slice(0, 14)
    .map((r) => ({
      name: `${r.tool} · ${r.model}`,
      Rated: r.rated_capacity,
      Actual: r.actual_production,
      util: +r.util.toFixed(1),
    }))
  , [data]);

  // Trend over time (mocked monthly)
  const trend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((m, i) => {
      const noise = ((i * 7) % 11) / 100;
      const base = kpis.util / 100;
      return {
        month: m,
        utilisation: +((base + noise - 0.05) * 100).toFixed(1),
        target: 80,
      };
    });
  }, [kpis.util]);

  // Cost per vehicle trend
  const costTrend = useMemo(() => {
    return ["Q1", "Q2", "Q3", "Q4"].map((q, i) => ({
      period: q,
      amortPerVeh: Math.round(kpis.amortPerVeh * (1.1 - i * 0.04)),
      absorption: 80 - i * 3,
    }));
  }, [kpis.amortPerVeh]);

  // Risk table
  const riskRows = useMemo(() => data.map((r) => {
    const util = (r.actual_production / r.rated_capacity) * 100;
    const recovery = (r.revenue_generated / r.tooling_capex) * 100;
    let flag = "🟢 Continue";
    if (util < 40) flag = "🔴 Impairment Review";
    else if (util < 60) flag = "🟠 Watch";
    if (util < 30 && r.platform === "EV") flag = "❄️ Capex Freeze";
    return { ...r, util: +util.toFixed(1), recovery: +recovery.toFixed(1), flag };
  }).sort((a, b) => a.util - b.util).slice(0, 12)
  , [data]);

  // EV vs ICE comparator
  const evIce = useMemo(() => {
    const calc = (plat: "ICE" | "EV") => {
      const sub = data.filter((r) => r.platform === plat);
      const rated = sub.reduce((s, r) => s + r.rated_capacity, 0);
      const actual = sub.reduce((s, r) => s + r.actual_production, 0);
      const nbv = sub.filter((r) => r.actual_production / r.rated_capacity < 0.6)
        .reduce((s, r) => s + r.tool_nbv, 0);
      const payback = sub.length ? sub.reduce((s, r) => s + r.payback_period, 0) / sub.length : 0;
      return {
        platform: plat,
        utilisation: rated ? +((actual / rated) * 100).toFixed(1) : 0,
        nbvAtRisk: nbv,
        payback: +payback.toFixed(1),
      };
    };
    return [calc("ICE"), calc("EV")];
  }, [data]);

  return (
    <DashboardLayout
      title="Tool Utilisation vs Rated Capacity"
      subtitle="CFO view — capital productivity, impairment triggers and capex governance"
    >
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <Local label="Plant" value={plant} setValue={setPlant} options={PLANTS} />
        <Local label="Tool Group" value={tool} setValue={setTool} options={TOOL_GROUPS} />
        <Local label="Platform" value={platform} setValue={setPlatform} options={["ICE", "EV"]} />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phase</label>
          <ToggleGroup type="single" value={phase} onValueChange={(v) => v && setPhase(v as any)} className="bg-card border border-border rounded-md h-9">
            <ToggleGroupItem value="all" className="text-xs px-3">All</ToggleGroupItem>
            <ToggleGroupItem value="SOP" className="text-xs px-3">SOP</ToggleGroupItem>
            <ToggleGroupItem value="Steady" className="text-xs px-3">Steady</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KPICard label="Tool Utilisation" value={formatPct(kpis.util)} icon={Gauge} tone={toneFor(kpis.util)} />
        <KPICard label="Underutilised NBV %" value={formatPct(kpis.underPct)} icon={AlertTriangle} tone={kpis.underPct > 25 ? "danger" : kpis.underPct > 15 ? "warning" : "success"} hint={`₹${kpis.underNbv.toFixed(0)} Cr at risk`} />
        <KPICard label="Revenue / ₹ Tooling" value={`${kpis.revPerRupee.toFixed(2)}x`} icon={Activity} tone={kpis.revPerRupee >= 1 ? "success" : "warning"} />
        <KPICard label="Amort / Vehicle" value={`₹${(kpis.amortPerVeh).toFixed(0)}`} icon={TrendingDown} tone="default" />
        <KPICard label="Capacity Gap" value={`${(kpis.gap / 1000).toFixed(1)}K`} icon={Wrench} tone="warning" hint="units below rated" />
      </div>

      {/* Row 2: utilisation analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Rated Capacity vs Actual Production" subtitle="Lowest-utilisation tools (sorted ascending)">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={bulletData} layout="vertical" margin={{ top: 6, right: 16, left: 12, bottom: 0 }}>
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" {...axisStyle} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" {...axisStyle} width={170} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Rated" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Actual" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Utilisation % over Time" subtitle="Reference bands at 60% / 75% / target 80%">
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={trend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="month" {...axisStyle} />
              <YAxis {...axisStyle} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}%`} />
              <ReferenceArea y1={0} y2={60} fill="hsl(var(--destructive))" fillOpacity={0.06} />
              <ReferenceArea y1={60} y2={75} fill="hsl(var(--warning))" fillOpacity={0.07} />
              <ReferenceArea y1={75} y2={100} fill="hsl(var(--success))" fillOpacity={0.06} />
              <ReferenceLine y={80} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: "Target 80%", fill: "hsl(var(--accent))", fontSize: 11, position: "right" }} />
              <Line type="monotone" dataKey="utilisation" stroke="hsl(var(--chart-2))" strokeWidth={2.8} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: cost impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Amortisation per Vehicle" subtitle="Trend across recent quarters">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={costTrend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="period" {...axisStyle} />
              <YAxis yAxisId="l" {...axisStyle} />
              <YAxis yAxisId="r" orientation="right" {...axisStyle} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="amortPerVeh" name="Amort / Vehicle (₹)" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" dataKey="absorption" name="Fixed-Cost Absorption %" stroke="hsl(var(--success))" strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="EV vs ICE Comparator" subtitle="Utilisation, NBV at risk and payback">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={evIce} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="platform" {...axisStyle} />
              <YAxis yAxisId="l" {...axisStyle} />
              <YAxis yAxisId="r" orientation="right" {...axisStyle} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="utilisation" name="Utilisation %" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="r" dataKey="nbvAtRisk" name="NBV at Risk (₹ Cr)" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="l" dataKey="payback" name="Payback (yrs)" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Risk Table */}
      <ChartCard title="Risk & Governance Panel" subtitle="Auto-flagged tools requiring CFO action" className="mb-5">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool · Model</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Utilisation</TableHead>
                <TableHead className="text-right">Recovery %</TableHead>
                <TableHead className="text-right">NBV at Risk</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.tool} · {r.model}</TableCell>
                  <TableCell>{r.plant}</TableCell>
                  <TableCell>{r.platform}</TableCell>
                  <TableCell className="text-right font-mono">{r.util}%</TableCell>
                  <TableCell className="text-right font-mono">{r.recovery}%</TableCell>
                  <TableCell className="text-right font-mono">₹{r.tool_nbv} Cr</TableCell>
                  <TableCell className="text-xs font-semibold">{r.flag}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InsightCard tone="danger" icon={AlertTriangle}
          title="Underutilised tooling NBV at risk"
          body={`₹${kpis.underNbv.toFixed(0)} Cr of NBV sits in tools running below 60% utilisation — flag for impairment review and capex freeze.`} />
        <InsightCard tone="warning" icon={Snowflake}
          title="EV tooling lagging ICE"
          body={`EV utilisation at ${evIce[1]?.utilisation}% vs ICE at ${evIce[0]?.utilisation}%. Stagger EV ramp or repurpose flexible lines.`} />
        <InsightCard tone="info" icon={Activity}
          title="Concentration risk"
          body="30% of tools contribute under 10% of revenue — review portfolio mix, redirect capex to high-recovery assets." />
      </div>
    </DashboardLayout>
  );
}

function Local({ label, value, setValue, options }:
  { label: string; value: string; setValue: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="h-9 w-[150px] bg-card border-border text-sm font-medium">
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
