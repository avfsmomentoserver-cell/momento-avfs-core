import { ArrowLeft, Gauge, SearchX } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";

/** 404 — offers the two real entry points instead of a dead end. */
export default function NotFound() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-caution/40 bg-caution/10">
          <SearchX className="h-5 w-5 text-caution" />
        </span>

        <h1 className="mt-5 font-mono text-4xl font-bold tabular-nums">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">No screen is mapped to this route.</p>
        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/60">{location.pathname}</p>

        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Button asChild className="gap-1.5 bg-signal font-semibold text-primary-foreground hover:bg-signal/90">
            <Link to="/dashboard">
              <Gauge className="h-4 w-4" />
              Operator console
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Overview
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
