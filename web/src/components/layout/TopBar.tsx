import { LogOut, Menu, RefreshCw, Radio, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ConnectionPill } from "@/components/console/ConnectionPill";
import { StateBadge } from "@/components/console/StateBadge";
import { SourceSwitcher } from "@/components/layout/SourceSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { multiplier } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { usePlatform } from "@/state/PlatformProvider";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  actions?: React.ReactNode;
}

/** Sticky header: page identity on the left, live telemetry on the right. */
export function TopBar({ title, subtitle, onMenuClick, actions }: TopBarProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { analysis, latestRound, feed, refreshAll, flashRoundId } = usePlatform();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {actions}

          {latestRound && (
            <div
              key={latestRound.id}
              className={cn(
                "hidden items-center gap-2 rounded-md border border-border bg-card/60 px-2.5 py-1 md:flex",
                flashRoundId === latestRound.id && "animate-ticker-in border-signal/50",
              )}
              title="Most recent round"
            >
              <span className="hud-label">Last</span>
              <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: latestRound.multiplier >= 2 ? "hsl(var(--signal))" : "hsl(var(--critical))" }}>
                {multiplier(latestRound.multiplier)}
              </span>
            </div>
          )}

          {analysis && <StateBadge state={analysis.state} size="sm" pulse={analysis.state === "Ignition" || analysis.state === "Moonshot"} className="hidden sm:inline-flex" />}

          {feed?.running && (
            <span className="chip-signal hidden lg:inline-flex" title={`Live engine emitting every ~${feed.config.interval_seconds}s`}>
              <Radio className="h-2.5 w-2.5" />
              Feed
            </span>
          )}

          <ConnectionPill className="hidden md:inline-flex" />

          <SourceSwitcher />

          <Button variant="ghost" size="icon" onClick={refreshAll} className="h-8 w-8" title="Refresh all data">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title={isAuthenticated ? (user?.email ?? "Account") : "Sign in"}>
                <UserCircle2 className={cn("h-4 w-4", isAuthenticated ? "text-signal" : "text-muted-foreground")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isAuthenticated && user ? (
                <>
                  <DropdownMenuLabel className="space-y-1">
                    <span className="block truncate text-xs font-medium">{user.display_name ?? user.email}</span>
                    <span className="block truncate text-[10px] font-normal text-muted-foreground">{user.email}</span>
                    <span className="flex gap-1 pt-1">
                      <span className="chip-info">{user.role}</span>
                      <span className={user.is_premium ? "chip-signal" : "chip-muted"}>{user.tier}</span>
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate("/app")}>Consumer app</DropdownMenuItem>
                  {user.is_operator && <DropdownMenuItem onSelect={() => navigate("/dashboard/settings")}>Master settings</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      logout();
                      navigate("/");
                    }}
                    className="text-critical"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel className="text-xs">Not signed in</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate("/login")}>Operator sign in</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate("/register")}>Create account</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
