import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { isAxiosError } from "axios";
import logoUrl from "@/assets/logo.png";
import { login, logout, requestPasswordReset, resetPassword, setPassword as saveSetupPassword } from "@/features/auth/api";
import { loginDestination } from "@/features/auth/roles";
import { useAuth } from "@/features/auth/auth-context";

function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-background px-5 py-8"><section className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm"><div className="mb-6 flex items-center gap-3"><img className="h-9 w-9 object-contain" src={logoUrl} alt="CP Hub" /><div><p className="text-sm font-semibold text-primary">CP Hub</p><h1 className="text-xs text-muted">{title}</h1></div></div>{children}</section></main>;
}

function PasswordFields({ password, setPassword }: { password: string; setPassword: (value: string) => void }) {
  return <label className="block text-xs font-medium text-primary">Password<input required minLength={12} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand" /></label>;
}

function ErrorText({ error }: { error: string | null }) { return error ? <p className="mt-3 text-xs text-danger" role="alert">{error}</p> : null; }
function message(error: unknown, fallback: string) { return isAxiosError(error) && typeof error.response?.data?.detail === "string" ? error.response.data.detail : fallback; }

export function LoginPage({ admin = false }: { admin?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, startSession, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const from = (location.state as { from?: string } | null)?.from;
  const destination = user ? loginDestination(user, admin, from) : null;
  if (destination) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const signedIn = await login({ email, password });
      const target = loginDestination(signedIn.user, admin, from);
      if (!target) {
        await logout();
        setError(admin ? "This account does not have admin access." : "This account does not have student, teacher, or leads access.");
        return;
      }
      startSession(signedIn);
      navigate(target, { replace: true });
    } catch (err) {
      setError(message(err, "We couldn’t sign you in. Check your email and password."));
    } finally {
      setSubmitting(false);
    }
  }

  return <AuthLayout title={admin ? "Admin sign in" : "Student and teacher sign in"}>
    {user ? <div className="space-y-3"><p className="text-sm text-muted">This signed-in account does not have access to this portal.</p><button type="button" className="text-xs text-brand hover:underline" onClick={() => void signOut()}>Sign out and use another account</button></div> : <><form className="space-y-4" onSubmit={submit}>
      <label className="block text-xs font-medium text-primary">Email<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand" /></label>
      <label className="block text-xs font-medium text-primary">Password<input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand" /></label>
      <button disabled={submitting} className="h-10 w-full rounded-md bg-brand text-sm font-medium text-white disabled:opacity-60">{submitting ? "Signing in…" : "Sign in"}</button>
    </form><ErrorText error={error} /><Link className="mt-4 block text-xs text-brand hover:underline" to={admin ? "/forgot-password?portal=admin" : "/forgot-password"}>Forgot password?</Link></>}
    <Link className="mt-4 block text-xs text-muted hover:text-primary hover:underline" to={admin ? "/login" : "/admin/login"}>{admin ? "Student and teacher sign in" : "Admin sign in"}</Link>
  </AuthLayout>;
}

export function PasswordActionPage({ mode }: { mode: "setup" | "reset" }) {
  const navigate = useNavigate(); const [params] = useSearchParams(); const [password, setPassword] = useState(""); const [error, setError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false); const token = params.get("token") ?? "";
  async function submit(event: FormEvent) { event.preventDefault(); if (!token) { setError("This link is incomplete. Request a new one."); return; } setSubmitting(true); setError(null); try { if (mode === "setup") await saveSetupPassword({ token, password }); else await resetPassword({ token, password }); navigate("/login", { replace: true }); } catch (err) { setError(message(err, "This link is no longer valid. Request a new one.")); } finally { setSubmitting(false); } }
  return <AuthLayout title={mode === "setup" ? "Set your password" : "Reset your password"}><p className="mb-4 text-xs leading-5 text-muted">Choose a password with at least 12 characters.</p><form className="space-y-4" onSubmit={submit}><PasswordFields password={password} setPassword={setPassword} /><button disabled={submitting} className="h-10 w-full rounded-md bg-brand text-sm font-medium text-white disabled:opacity-60">{submitting ? "Saving…" : "Save password"}</button></form><ErrorText error={error} /></AuthLayout>;
}

export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setSubmitting(true); setError(null); try { await requestPasswordReset(email); setDone(true); } catch (err) { setError(message(err, "We couldn’t send that email. Please try again.")); } finally { setSubmitting(false); } }
  return <AuthLayout title="Reset your password">{done ? <p className="text-sm leading-6 text-muted">If that email belongs to an active CP Hub account, a reset link is on its way.</p> : <form className="space-y-4" onSubmit={submit}><p className="text-xs leading-5 text-muted">Enter your account email and we’ll send a reset link.</p><label className="block text-xs font-medium text-primary">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand" /></label><button disabled={submitting} className="h-10 w-full rounded-md bg-brand text-sm font-medium text-white disabled:opacity-60">{submitting ? "Sending…" : "Send reset link"}</button><ErrorText error={error} /></form>}<Link className="mt-4 block text-xs text-brand hover:underline" to={params.get("portal") === "admin" ? "/admin/login" : "/login"}>Back to sign in</Link></AuthLayout>;
}
