import { cn } from "@/lib/utils";

type Cell = { row: string; col: string; value: number };
type Props = {
  data: Cell[];
  rows: string[];
  cols: string[];
  format?: (v: number) => string;
  colorScale?: "discount" | "performance"; // discount: low=good, performance: high=good
  className?: string;
};

export function Heatmap({ data, rows, cols, format = (v) => v.toFixed(1), colorScale = "discount", className }: Props) {
  const matrix: Record<string, Record<string, number>> = {};
  rows.forEach((r) => { matrix[r] = {}; cols.forEach((c) => (matrix[r][c] = 0)); });
  data.forEach((d) => { if (matrix[d.row]) matrix[d.row][d.col] = d.value; });

  const values = data.map((d) => d.value).filter((v) => v > 0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);

  const getColor = (v: number) => {
    if (v === 0) return "hsl(var(--muted))";
    const t = (v - min) / (max - min || 1);
    if (colorScale === "discount") {
      // green -> amber -> red
      if (t < 0.4) return `hsl(152 55% ${78 - t * 30}%)`;
      if (t < 0.7) return `hsl(38 85% ${75 - (t - 0.4) * 30}%)`;
      return `hsl(0 75% ${70 - (t - 0.7) * 30}%)`;
    } else {
      // light -> deep accent
      return `hsl(185 70% ${85 - t * 45}%)`;
    }
  };

  const textColor = (v: number) => {
    const t = (v - min) / (max - min || 1);
    return v === 0 ? "text-muted-foreground" : t > 0.55 ? "text-white" : "text-foreground";
  };

  return (
    <div className={cn("overflow-x-auto scrollbar-thin", className)}>
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="text-left p-2 font-semibold text-muted-foreground"></th>
            {cols.map((c) => (
              <th key={c} className="p-2 font-semibold text-muted-foreground text-center min-w-[80px] truncate">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td className="p-2 font-medium text-foreground text-right whitespace-nowrap pr-3">{r}</td>
              {cols.map((c) => {
                const v = matrix[r][c];
                return (
                  <td
                    key={c}
                    className={cn(
                      "rounded-md p-2 text-center font-mono font-semibold transition-smooth hover:scale-105 hover:shadow-md cursor-default",
                      textColor(v),
                    )}
                    style={{ backgroundColor: getColor(v) }}
                    title={`${r} × ${c}: ${format(v)}`}
                  >
                    {v === 0 ? "—" : format(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
