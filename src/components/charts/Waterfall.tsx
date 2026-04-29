import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList, Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/mockData";

type Step = { name: string; value: number; type: "start" | "positive" | "negative" | "total" };
type Props = { steps: Step[]; height?: number };

export function Waterfall({ steps, height = 360 }: Props) {
  // Compute cumulative for floating bars
  let running = 0;
  const data = steps.map((s) => {
    let base = 0, height = 0;
    if (s.type === "start" || s.type === "total") {
      base = 0;
      height = s.value;
      running = s.value;
    } else if (s.type === "negative") {
      base = running + s.value; // value is negative
      height = -s.value;
      running = running + s.value;
    } else {
      base = running;
      height = s.value;
      running = running + s.value;
    }
    return { ...s, base, height, displayValue: s.value };
  });

  const colorOf = (t: Step["type"]) => ({
    start: "hsl(var(--chart-1))",
    total: "hsl(var(--chart-2))",
    positive: "hsl(var(--success))",
    negative: "hsl(var(--destructive))",
  }[t]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 30, right: 16, left: 8, bottom: 8 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
            borderRadius: 8, fontSize: 12,
          }}
          formatter={(_v: any, _n: any, p: any) => [formatCurrency(p.payload.displayValue), p.payload.name]}
        />
        {/* invisible base */}
        <Bar dataKey="base" stackId="w" fill="transparent" />
        <Bar dataKey="height" stackId="w" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={colorOf(d.type)} />)}
          <LabelList
            dataKey="displayValue"
            position="top"
            formatter={(v: number) => formatCurrency(v)}
            style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
