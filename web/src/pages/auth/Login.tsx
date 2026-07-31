import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORM } from "@/lib/config";
import { useAuth } from "@/state/AuthProvider";

/** Operator + user sign in. One account model, roles decide the surface. */
export default function Login() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState<string>("operator@momento.local");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.is_operator ? "/dashboard" : "/app", { replace: true });
    } catch {
      // The error is surfaced through the auth context.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to overview
        </Link>

        <div className="panel panel-lit p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-signal/40 bg-signal/10">
              <KeyRound className="h-4 w-4 text-signal" />
            </span>
            <div>
              <h1 className="text-sm font-semibold">Sign in</h1>
              <p className="text-[11px] text-muted-foreground">
                {PLATFORM.suite} · {PLATFORM.name}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {error && (
              <p className="rounded-md border border-critical/30 bg-critical/10 px-3 py-2 text-[11px] text-critical">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full gap-2 bg-signal font-semibold text-primary-foreground hover:bg-signal/90">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {submitting ? "Verifying…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            No account?{" "}
            <Link to="/register" className="text-signal hover:underline">
              Create one
            </Link>
          </p>
        </div>

        <div className="panel mt-3 px-4 py-3">
          <p className="hud-label">First boot credentials</p>
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            operator@momento.local / momento
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/70">
            Created automatically on the first backend start. Change it from Master Settings, or override with the
            <code className="mx-1 font-mono text-foreground/70">MOMENTO_OPERATOR_PASSWORD</code> environment variable.
          </p>
        </div>
      </div>
    </div>
  );
}
