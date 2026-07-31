import { AlertTriangle } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { API_BASE_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/state/PlatformProvider";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

/** Chrome shared by every authenticated surface: sidebar, top bar, content well. */
export function AppShell({ title, subtitle, actions, children, wide = false }: AppShellProps) {
  const [navOpen, setNavOpen] = useState<boolean>(false);
  const { error } = usePlatform();

  return (
    <div className="min-h-screen">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="lg:pl-[248px]">
        <TopBar title={title} subtitle={subtitle} onMenuClick={() => setNavOpen(true)} actions={actions} />

        {error && (
          <div className="flex items-start gap-2.5 border-b border-critical/30 bg-critical/10 px-4 py-2.5 lg:px-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
            <div className="min-w-0 text-[11px] leading-relaxed">
              <p className="font-medium text-critical">Backend link problem — {error}</p>
              <p className="text-muted-foreground">
                Expecting the Python API at <code className="font-mono text-foreground/80">{API_BASE_URL}</code>. Start it with{" "}
                <code className="font-mono text-foreground/80">cd backend &amp;&amp; python3 run_api.py</code>.
              </p>
            </div>
          </div>
        )}

        <main className={cn("px-4 py-5 lg:px-6 lg:py-6", wide ? "max-w-none" : "mx-auto max-w-[1680px]")}>{children}</main>
      </div>
    </div>
  );
}
