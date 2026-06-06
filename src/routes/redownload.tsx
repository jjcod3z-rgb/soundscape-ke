import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { DownloadManager } from "@/components/DownloadManager";
import { useState } from "react";

export const Route = createFileRoute("/redownload")({
  head: () => ({
    meta: [
      { title: "Re-download Your Files — The-Sound-Scape" },
      { name: "description", content: "Use your email and order reference to re-access your purchased audio files." },
    ],
  }),
  component: RedownloadPage,
});

function RedownloadPage() {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [foundOrderId, setFoundOrderId] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/.netlify/functions/lookup-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), orderId: orderId.trim() }),
      });
      const data = await res.json();
      if (data.success && data.orderId) {
        setFoundOrderId(data.orderId);
      } else {
        setError(data.error || "No matching order found. Please check your details.");
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (foundOrderId) {
    return (
      <DownloadManager
        orderId={foundOrderId}
        onClose={() => setFoundOrderId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-10">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Re-download</span>
            <h1 className="font-display mt-3 text-4xl font-bold text-foreground">Access your files</h1>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              Enter the email you used at checkout and your Order Reference ID to re-access your purchase.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleLookup}
            className="bg-card border border-border/60 rounded-2xl p-8 shadow-xl space-y-4"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <input
                required
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground outline-none focus:border-primary transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Order Reference ID</label>
              <input
                required
                placeholder="e.g. 8429f55e-749f-4f07-..."
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-primary transition"
              />
              <p className="text-xs text-muted-foreground">
                Found in your purchase receipt (.txt file) or confirmation email.
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              disabled={busy}
              className="w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition disabled:opacity-50 mt-2"
            >
              {busy ? "Looking up your order…" : "Access Downloads →"}
            </button>
          </form>

          {/* Help note */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Can't find your order reference?{" "}
            <a href="/contact" className="text-primary hover:underline">
              Contact support
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
