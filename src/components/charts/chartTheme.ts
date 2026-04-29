// Common chart styling
export const chartTooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 8px 24px -8px hsl(215 30% 12% / 0.18)",
  padding: "10px 12px",
};

export const chartTooltipLabelStyle = {
  color: "hsl(var(--foreground))",
  fontWeight: 600,
  marginBottom: 4,
};

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export const axisStyle = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
};

export const gridStyle = {
  stroke: "hsl(var(--border))",
  strokeDasharray: "3 3",
};
