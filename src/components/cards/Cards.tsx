import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  delta?: number; // percentage
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
};

export function KPICard({ label, value, delta, hint, icon: Icon, tone = "default", className }: Props) {
  const toneRing = {
    default: "from-primary/10 to-primary/0",
    success: "from-success/15 to-success/0",
    warning: "from-warning/15 to-warning/0",
    danger: "from-destructive/15 to-destructive/0",
  }[tone];

  const iconColor = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/15",
    danger: "text-destructive bg-destructive/10",
  }[tone];

  const deltaIcon = delta == null ? null : delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;
  const deltaColor =
    delta == null ? "" :
    delta > 0.5 ? "text-success bg-success/10" :
    delta < -0.5 ? "text-destructive bg-destructive/10" :
    "text-muted-foreground bg-muted";

  return (
    <div className={cn(
      "relative bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-smooth overflow-hidden group",
      className,
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", toneRing)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
          <div className="text-[28px] font-bold text-foreground tracking-tight leading-none font-mono">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-2">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {delta != null && deltaIcon && (
        <div className="relative mt-3 flex items-center gap-1.5">
          <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold", deltaColor)}>
            {(() => { const Ico = deltaIcon; return <Ico className="w-3 h-3" />; })()}
            {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
          </div>
          <span className="text-[11px] text-muted-foreground">vs prior period</span>
        </div>
      )}
    </div>
  );
}

export function ChartCard({
  title, subtitle, action, children, className,
}: {
  title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-smooth p-5",
      className,
    )}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function InsightCard({
  tone = "info", title, body, icon: Icon,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title: string;
  body: string;
  icon?: LucideIcon;
}) {
  const styles = {
    info: "border-l-accent bg-accent/5",
    warning: "border-l-warning bg-warning/5",
    danger: "border-l-destructive bg-destructive/5",
    success: "border-l-success bg-success/5",
  }[tone];
  const iconColor = {
    info: "text-accent",
    warning: "text-warning",
    danger: "text-destructive",
    success: "text-success",
  }[tone];

  return (
    <div className={cn("rounded-lg border border-border border-l-4 p-4 transition-smooth hover:translate-x-0.5", styles)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={cn("mt-0.5", iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
          <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
        </div>
      </div>
    </div>
  );
}
