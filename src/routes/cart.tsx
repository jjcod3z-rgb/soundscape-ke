import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import {
  usePacks,
  useCart,
  useLastReceipt,
  usePurchases,
  formatKES,
  uid,
  makeLicenseKey,
  useEmails,
  useSiteConfig,
} from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import { createPesapalOrderFn } from "@/lib/server-actions";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Your Cart — Kelele Sound" }],
  }),
  component: CartPage,
});

function CartPage() {
  const [packs] = usePacks();
  const [cart, setCart] = useCart();
  const [, setPurchases] = usePurchases();
  const [, setReceipt] = useLastReceipt();
  const [, setEmails] = useEmails();
  const [config] = useSiteConfig();
  const [showCheckout, setShowCheckout] = useState(false);
  const [iframeUrl, setIframeUrl] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const cartPacks = useMemo(() => packs.filter((p) => cart.includes(p.id)), [packs, cart]);
  const total = cartPacks.reduce((s, p) => s + p.price, 0);

  useEffect(() => {
    if (window !== window.parent) {
      const params = new URLSearchParams(window.location.search);
      const trackingId = params.get("OrderTrackingId");
      if (trackingId) {
        window.parent.postMessage({ type: "PESAPAL_COMPLETE", trackingId }, window.location.origin);
      }
      return;
    }

    const handleMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "PESAPAL_COMPLETE") {
        if (cartPacks.length > 0 && name && email) {
          completeOrder();
        }
      }
    };
    window.addEventListener("message", handleMessage);

    const params = new URLSearchParams(window.location.search);
    const trackingId = params.get("OrderTrackingId");
    if (trackingId && cartPacks.length > 0 && name && email) {
      completeOrder();
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [cartPacks, name, email]);

  function completeOrder() {
    const created = cartPacks.map((p) => ({
      id: uid(),
      packId: p.id,
      packTitle: p.title,
      customerName: name,
      customerEmail: email,
      amount: p.price,
      licenseKey: makeLicenseKey(),
      createdAt: Date.now(),
    }));
    setPurchases((arr) => [...created, ...arr]);
    setEmails((arr) => [
      {
        id: uid(),
        to: email,
        subject: `Your ${config.brandName} order — ${created.length} pack(s)`,
        body: `Hi ${name},\n\nThanks for your purchase. Your packs and license keys:\n\n${created
          .map((c) => `• ${c.packTitle} — License: ${c.licenseKey}`)
          .join("\n")}\n\n— ${config.brandName}`,
        status: "sent",
        createdAt: Date.now(),
      },
      ...arr,
    ]);
    setReceipt(email);
    setCart([]);
    navigate({ to: "/thank-you" });
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || cartPacks.length === 0) return;

    setBusy(true);
    try {
      const orderId = uid();
      const res = await createPesapalOrderFn({
        data: {
          amount: total,
          description: `${config.brandName} - ${cartPacks.length} packs`,
          email,
          name,
          reference: orderId,
          callbackUrl: window.location.href,
        },
      });

      if (res.success && res.redirectUrl) {
        setIframeUrl(res.redirectUrl);
      } else {
        alert("Failed to initialize Pesapal payment: " + res.error);
      }
    } catch (err: unknown) {
      alert("Checkout error: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (iframeUrl) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          <iframe
            src={iframeUrl}
            className="h-[800px] w-full border-none bg-white"
            title="Pesapal Checkout"
            sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-popups"
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          // Checkout
        </span>
        <h1 className="font-display mt-2 text-4xl font-bold">Your cart</h1>

        <div className="mt-10 rounded-2xl border border-border/60 bg-card p-8">
          {cartPacks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Link to="/store" className="mt-4 inline-block text-primary hover:underline">
                ← Back to Store
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border/60">
                {cartPacks.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-4">
                    <span className="font-medium text-lg">{p.title}</span>
                    <span className="font-mono text-muted-foreground">{formatKES(p.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-6">
                <span className="text-lg text-muted-foreground">Total</span>
                <span className="font-mono text-3xl font-bold text-primary">
                  {formatKES(total)}
                </span>
              </div>

              {!showCheckout ? (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="mt-10 w-full rounded-full bg-primary py-4 text-lg font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition"
                >
                  Continue to secure checkout →
                </button>
              ) : (
                <form
                  onSubmit={checkout}
                  className="mt-10 grid gap-4 bg-background/50 p-6 rounded-xl border border-border/60"
                >
                  <h3 className="font-display text-xl font-semibold mb-2">Billing Information</h3>
                  <input
                    required
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email address for license & downloads"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
                  />
                  <div className="mt-2 text-sm text-muted-foreground bg-accent/20 p-4 rounded-lg flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-primary shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <p>
                      You will be redirected to Pesapal's secure checkout page to complete your
                      payment.
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    className="mt-2 rounded-full bg-primary py-4 text-lg font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition disabled:opacity-50"
                  >
                    {busy ? "Connecting to Pesapal..." : `Pay ${formatKES(total)}`}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
