import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/state/AuthProvider";

/** Self-service account creation. New accounts land on the free consumer tier. */
export default function Register() {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    clearError();
    setLocalError(null);

    if (password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (password.length < 4) {
      setLocalError("Use at least 4 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, displayName || undefined);
      navigate("/app", { replace: true });
    } catch {
      // Surfaced through the auth context.
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
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-info/40 bg-info/10">
              <UserPlus className="h-4 w-4 text-info" />
            </span>
            <div>
              <h1 className="text-sm font-semibold">Create account</h1>
              <p className="text-[11px] text-muted-foreground">Free tier · upgrade any time</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Display name
              </Label>
              <Input id="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="text-xs" />
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Confirm
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {(localError ?? error) && (
              <p className="rounded-md border border-critical/30 bg-critical/10 px-3 py-2 text-[11px] text-critical">
                {localError ?? error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full gap-2 bg-info font-semibold text-secondary-foreground hover:bg-info/90">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              {submitting ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="text-signal hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
