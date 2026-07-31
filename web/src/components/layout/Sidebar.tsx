import {
  Activity,
  Blocks,
  BrainCircuit,
  ChartCandlestick,
  Compass,
  Crown,
  Dna,
  Download,
  Eye,
  Fingerprint,
  Flame,
  FlaskConical,
  Gauge,
  Layers,
  LayoutDashboard,
  LineChart,
  Radio,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  TrendingDown,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import { PLATFORM } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  operatorOnly?: boolean;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", label: "Command Center", icon: LayoutDashboard, end: true },
      { to: "/dashboard/market", label: "Market", icon: ChartCandlestick },
      { to: "/dashboard/ladder", label: "Ladder Telemetry", icon: Layers },
      { to: "/dashboard/resistance", label: "Resistance", icon: TrendingDown },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/dashboard/moonshot", label: "Moonshot Finder", icon: Rocket },
      { to: "/dashboard/dna", label: "DNA Hunter", icon: Dna },
      { to: "/dashboard/mega-pressure", label: "Mega Pressure Tracker", icon: Flame },
      { to: "/dashboard/pattern-dna", label: "Pattern DNA Tracker", icon: Zap },
      { to: "/dashboard/studio", label: "Forecast Studio", icon: BrainCircuit },
      { to: "/dashboard/linguistics", label: "Linguistics", icon: Fingerprint },
      { to: "/dashboard/investigation", label: "Investigation Suite", icon: FlaskConical, operatorOnly: true },
    ],
  },
  {
    label: "Execution",
    items: [
      { to: "/orchestrator", label: "Orchestrator", icon: Compass },
      { to: "/dashboard/momento-fx", label: "MomentoFX", icon: LineChart },
      { to: "/dashboard/momento-fx-v2", label: "MomentoFX v2.0", icon: Sparkles },
      { to: "/dashboard/autopilot", label: "Autopilot", icon: Gauge },
      { to: "/inventory", label: "Plugin Inventory", icon: Blocks },
    ],
  },
  {
    label: "Data & Platform",
    items: [
      { to: "/dashboard/ingest", label: "Ingest Console", icon: Radio },
      { to: "/dashboard/eagle-eye", label: "Eagle Eye", icon: Eye },
      { to: "/dashboard/sources", label: "Sources", icon: Activity },
      { to: "/dashboard/birdeye", label: "Bird's Eye", icon: LineChart },
      { to: "/dashboard/build-steps", label: "Build Steps", icon: Download },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/dashboard/settings", label: "Master Settings", icon: Settings2, operatorOnly: true },
      { to: "/dashboard/users", label: "Users", icon: Users, operatorOnly: true },
      { to: "/dashboard/testing", label: "Round Testing", icon: SlidersHorizontal, operatorOnly: true },
    ],
  },
];

const APP_ITEMS: NavItem[] = [
  { to: "/app", label: "Today", icon: Sparkles, end: true },
  { to: "/app/pro", label: "Pro Predictions", icon: ShieldCheck },
  { to: "/app/charts", label: "Charts", icon: LineChart },
  { to: "/app/premium", label: "Premium", icon: Crown },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors",
          isActive
            ? "bg-signal/10 font-medium text-signal"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-2 h-4 w-[2px] rounded-full bg-signal" aria-hidden />}
          <Icon className={cn("h-[15px] w-[15px] shrink-0", isActive ? "text-signal" : "text-muted-foreground/70")} />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/** Persistent operator navigation. Slides in as an overlay below `lg`. */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { isOperator } = useAuth();

  return (
    <>
      {open && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <NavLink to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="relative flex h-7 w-7 items-center justify-center rounded-md border border-signal/40 bg-signal/10">
              <span className="font-mono text-[11px] font-bold text-signal">Λ</span>
            </span>
            <span className="leading-tight">
              <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">{PLATFORM.suite}</span>
              <span className="block text-[10px] text-muted-foreground">{PLATFORM.name}</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {GROUPS.map((group) => {
            const items = group.items.filter((item) => !item.operatorOnly || isOperator);
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="space-y-1">
                <p className="px-2.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">{group.label}</p>
                {items.map((item) => (
                  <NavRow key={item.to} item={item} onNavigate={onClose} />
                ))}
              </div>
            );
          })}

          <div className="space-y-1 border-t border-sidebar-border pt-4">
            <p className="px-2.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Consumer App</p>
            {APP_ITEMS.map((item) => (
              <NavRow key={item.to} item={item} onNavigate={onClose} />
            ))}
          </div>
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
            v{PLATFORM.version} · local backend
          </p>
        </div>
      </aside>
    </>
  );
}
