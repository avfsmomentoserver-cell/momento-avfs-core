import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText, FolderArchive, Loader2, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/console/EmptyState";
import { Panel } from "@/components/console/Panel";
import { StatTile } from "@/components/console/StatTile";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { bytes, dateTime, integer } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";

/**
 * Build Steps: every implementation step ships a markdown document and a zipped
 * source bundle. This screen indexes them and serves the download links.
 */
export default function BuildSteps() {
  const { isOperator } = useAuth();
  const queryClient = useQueryClient();
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const stepsQuery = useQuery({
    queryKey: ["build-steps"],
    queryFn: () => api.buildSteps(),
    staleTime: 30000,
  });

  const docQuery = useQuery({
    queryKey: ["step-doc", openSlug],
    queryFn: () => api.stepDoc(openSlug as string),
    enabled: openSlug !== null,
  });

  const sync = useMutation({
    mutationFn: () => api.syncBuildSteps(),
    onSuccess: (result) => {
      toast.success("Manifest synced", { description: `${result.synced} steps mirrored into the database.` });
      void queryClient.invalidateQueries({ queryKey: ["build-steps"] });
    },
    onError: (error: Error) => toast.error("Sync failed", { description: error.message }),
  });

  const steps = stepsQuery.data?.steps ?? [];
  const bundleTotal = steps.reduce((sum, step) => sum + (step.bundle.size_bytes ?? 0), 0);
  const docsTotal = steps.reduce((sum, step) => sum + (step.doc.size_bytes ?? 0), 0);

  return (
    <AppShell
      title="Build Steps"
      subtitle="Step documentation and downloadable source bundles"
      actions={
        isOperator ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync manifest
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Steps documented" value={integer(stepsQuery.data?.total_steps)} accent="signal" hint="each with a doc and a source bundle" emphasis />
          <StatTile label="Documentation" value={bytes(docsTotal)} accent="info" hint="markdown across every step" />
          <StatTile label="Source bundles" value={bytes(bundleTotal)} accent="violet" hint="zipped, ready to download" />
          <StatTile
            label="Generated"
            value={stepsQuery.data?.generated_at ? dateTime(stepsQuery.data.generated_at) : "—"}
            accent="caution"
            hint={stepsQuery.data?.downloads_dir ?? "downloads directory"}
          />
        </div>

        {stepsQuery.data?.full_bundle && (
          <Panel title="Complete Source Archive" subtitle="the entire platform in one zip" icon={<FolderArchive className="h-3.5 w-3.5" />} lit>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-foreground/85">{stepsQuery.data.full_bundle.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Backend, frontend, documentation and deployment scripts — {bytes(stepsQuery.data.full_bundle.size_bytes)}
                </p>
              </div>
              <Button asChild size="sm" className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90">
                <a href={api.downloadUrl(stepsQuery.data.full_bundle.name ?? "")} download>
                  <Download className="h-3.5 w-3.5" />
                  Download archive
                </a>
              </Button>
            </div>
          </Panel>
        )}

        {stepsQuery.isLoading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading manifest…
          </div>
        ) : steps.length === 0 ? (
          <EmptyState
            title="No build steps published"
            description="Run the bundle script to generate step documents and source archives: python3 scripts/build_bundles.py"
          />
        ) : (
          <div className="space-y-3">
            {steps.map((step) => (
              <article key={step.slug} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-signal/35 bg-signal/10 font-mono text-[11px] font-bold text-signal">
                        {String(step.ordinal).padStart(2, "0")}
                      </span>
                      <h2 className="truncate text-sm font-semibold">{step.title}</h2>
                      <span className={step.status === "complete" ? "chip-signal" : "chip-caution"}>
                        {step.status === "complete" && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {step.status}
                      </span>
                    </div>

                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{step.summary}</p>

                    {step.highlights.length > 0 && (
                      <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
                        {step.highlights.map((highlight) => (
                          <li key={highlight} className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground/85">
                            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-signal/70" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setOpenSlug(openSlug === step.slug ? null : step.slug)}
                      disabled={!step.doc.exists}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {openSlug === step.slug ? "Hide doc" : "Read doc"}
                    </Button>

                    {step.doc.exists && step.doc.name && (
                      <Button asChild size="sm" variant="ghost" className="gap-1.5 text-[11px]">
                        <a href={api.downloadUrl(step.doc.name)} download>
                          <Download className="h-3 w-3" />
                          {bytes(step.doc.size_bytes)} md
                        </a>
                      </Button>
                    )}

                    {step.bundle.exists && step.bundle.name && (
                      <Button asChild size="sm" variant="ghost" className="gap-1.5 text-[11px] text-signal">
                        <a href={api.downloadUrl(step.bundle.name)} download>
                          <FolderArchive className="h-3 w-3" />
                          {bytes(step.bundle.size_bytes)} zip
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {openSlug === step.slug && (
                  <div className="mt-4 border-t border-border/50 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="hud-label">{step.doc.name}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpenSlug(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {docQuery.isLoading ? (
                      <div className="flex h-24 items-center justify-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <pre className={cn("no-scrollbar max-h-[420px] overflow-auto rounded-md border border-border/50 bg-ink/60 p-4", "whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground")}>
                        {typeof docQuery.data === "string" ? docQuery.data : "Could not load document."}
                      </pre>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
