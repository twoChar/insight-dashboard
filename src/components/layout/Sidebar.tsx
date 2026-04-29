import { NavLink, useLocation } from "react-router-dom";
import {
  TrendingUp, Tags, BarChart3, Users, Package, Droplets, Sparkles,
  Building2, Wrench, Network,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Revenue Profiling", icon: TrendingUp },
  { to: "/discount", label: "Discount Analysis", icon: Tags },
  { to: "/sales", label: "Sales Volume & Realisation", icon: BarChart3 },
  { to: "/dealer", label: "Dealer Performance", icon: Users },
  { to: "/inventory", label: "Inventory & Working Capital", icon: Package },
  { to: "/margin", label: "Margin Leakage", icon: Droplets },
  { to: "/capex", label: "CAPEX Analysis", icon: Building2 },
  { to: "/tool-utilisation", label: "Tool Utilisation (CFO)", icon: Wrench },
  { to: "/volume", label: "Volume Analysis", icon: Network },
];

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border z-30">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-accent flex items-center justify-center shadow-elegant">
            <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-white tracking-tight text-[15px] leading-tight">Strata</div>
            <div className="text-[11px] text-sidebar-foreground/60 font-medium tracking-wide">CONSULTING ANALYTICS</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 mt-2">
        <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold px-3 py-2">
          Modules
        </div>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth group",
                  active
                    ? "bg-sidebar-accent text-white shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px] transition-smooth", active && "text-sidebar-primary")} />
                <span className="flex-1">{item.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-sidebar-primary" />}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="rounded-lg bg-sidebar-accent/40 p-3">
          <div className="text-xs font-semibold text-white mb-1">Q1 2026 Review</div>
          <div className="text-[11px] text-sidebar-foreground/70 leading-relaxed">
            Last data refresh: Apr 28, 2026
          </div>
        </div>
      </div>
    </aside>
  );
}
