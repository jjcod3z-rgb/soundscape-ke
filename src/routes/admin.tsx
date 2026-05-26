import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAdminAuth } from "@/lib/store";
import { useState, useEffect } from "react";
import { loginFn, verifyTokenFn } from "@/lib/server-actions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Kelele Sound" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const [token, setToken] = useAdminAuth();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsAuthenticated(false);
        setIsVerifying(false);
        return;
      }
      const res = await verifyTokenFn({ data: token });
      setIsAuthenticated(res.authed);
      if (!res.authed) setToken(null);
      setIsVerifying(false);
    }
    checkAuth();
  }, [token, setToken]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await loginFn({ data: pw });
    if (res.success && res.token) {
      setToken(res.token);
      setIsAuthenticated(true);
    } else {
      setErr(res.error || "Login failed");
    }
  }

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center">Verifying session...</div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={handleLogin}
          className="bg-card-grad w-full max-w-sm rounded-2xl border border-border/60 p-8"
        >
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            // Secure Admin Portal
          </span>
          <h1 className="font-display mt-2 text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Authorized personnel only.</p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="mt-6 w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
          />
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <button className="mt-4 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 transition">
            Enter Dashboard
          </button>
          <Link
            to="/"
            className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to site
          </Link>
        </form>
      </div>
    );
  }

  const tabs: { to: string; label: string; exact?: boolean }[] = [
    { to: "/admin", label: "Overview", exact: true },
    { to: "/admin/uploads", label: "Uploads & Export" },
    { to: "/admin/purchases", label: "Purchases" },
    { to: "/admin/emails", label: "Emails" },
    { to: "/admin/announcements", label: "Announcements" },
    { to: "/admin/layout", label: "Site Layout" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-sidebar shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/admin" className="font-display font-bold text-xl">
            <span className="text-primary">▌</span> Soundscape Admin
          </Link>
          <button
            onClick={() => setToken(null)}
            className="text-sm rounded-full bg-secondary px-4 py-2 text-secondary-foreground hover:opacity-90 transition"
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 pt-1">
          {tabs.map((t) => {
            const active = t.exact
              ? location.pathname === t.to
              : location.pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to as string}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-card hover:text-foreground border border-transparent hover:border-border"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {tabs.find((t) =>
              t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to),
            )?.label || "Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your storefront, packs, and system settings.
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-6 md:p-8 shadow-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
