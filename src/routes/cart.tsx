import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import {
  useCart,
  useLastReceipt,
  usePurchases,
  formatKES,
  uid,
  makeLicenseKey,
  useEmails,
  useSiteConfig,
  type Pack,
} from "@/lib/store";
import { useMemo, useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PesaPalPortal } from "@/components/PesaPalPortal";
import { DownloadManager } from "@/components/DownloadManager";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Your Cart — Kelele Sound" }],
  }),
  component: CartPage,
});

function CartPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useCart();

  useEffect(() => {
    async function loadPacks() {
      if (cart.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .in("id", cart);

        if (error) throw error;

        const mapped: Pack[] = (data || []).map((row) => ({
          id: row.id,
          title: row.name,
          description: row.description || "",
          price: row.price_kes,
          coverDataUrl: row.r2_preview_url || undefined,
          files: Array.isArray(row.r2_product_urls) ? row.r2_product_urls : [],
          createdAt: new Date(row.created_at).getTime(),
        }));

        setPacks(mapped);
      } catch (err) {
        console.error("Failed to load cart products:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPacks();
  }, [cart]);

  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  // Read orderId from URL query parameters on mount (e.g. from confirmation email)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlOrderId = params.get("orderId");
      if (urlOrderId) {
        setCompletedOrderId(urlOrderId);
      }
    }
  }, []);
  const [, setPurchases] = usePurchases();
  const [, setReceipt] = useLastReceipt();
  const [, setEmails] = useEmails();
  const [config] = useSiteConfig();
  const [showCheckout, setShowCheckout] = useState(false);
  const [pesapalUrl, setPesapalUrl] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>("");
  const navigate = useNavigate();

  const cartPacks = useMemo(() => packs.filter((p) => cart.includes(p.id)), [packs, cart]);
  const total = cartPacks.reduce((s, p) => s + p.price, 0);

  const handlePaymentSuccess = useCallback(
    (orderId: string, _downloadToken?: string) => {
      // Record purchases locally
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
          status: "sent" as const,
          createdAt: Date.now(),
        },
        ...arr,
      ]);
      setReceipt(email);
      setPesapalUrl("");
      setCompletedOrderId(orderId);
    },
    [cartPacks, name, email, config.brandName, setPurchases, setEmails, setReceipt],
  );

  const handleDownloadClose = useCallback(() => {
    setCompletedOrderId(null);
    setCart([]);
    navigate({ to: "/" });
  }, [setCart, navigate]);

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || cartPacks.length === 0) return;

    setBusy(true);
    try {
      // 1. If total is 0, process as a free order directly without PesaPal
      if (total === 0) {
        const res = await fetch("/.netlify/functions/process-free-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            productId: cartPacks[0]?.id,
          }),
        });

        const data = await res.json();
        if (data.success && data.orderId) {
          handlePaymentSuccess(data.orderId, data.downloadToken);
        } else {
          alert("Failed to process free order: " + (data.error || "Unknown error"));
        }
        return;
      }

      // 2. Otherwise process via PesaPal
      const res = await fetch("/.netlify/functions/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          description: `${config.brandName} - ${cartPacks.length} packs`,
          email,
          name,
          productId: cartPacks[0]?.id, // For single-product orders; multi-product needs expansion
          callbackUrl: `${window.location.origin}/.netlify/functions/pesapal-callback`,
        }),
      });

      const data = await res.json();

      if (data.success && data.redirectUrl) {
        setCurrentOrderId(data.orderId);
        setPesapalUrl(data.redirectUrl);
      } else {
        alert("Failed to initialize payment: " + (data.error || "Unknown error"));
      }
    } catch (err: unknown) {
      alert("Checkout error: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Show Download Manager after successful payment
  if (completedOrderId) {
    return (
      <DownloadManager orderId={completedOrderId} onClose={handleDownloadClose} />
    );
  }

  // Show PesaPal Portal when we have a redirect URL
  if (pesapalUrl) {
    return (
      <PesaPalPortal
        pesapalUrl={pesapalUrl}
        orderId={currentOrderId}
        onSuccess={handlePaymentSuccess}
        onClose={() => {
          setPesapalUrl("");
          setCurrentOrderId("");
        }}
      />
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
          {loading ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Loading cart items...</p>
            </div>
          ) : cartPacks.length === 0 ? (
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
                      Payment is processed securely via PesaPal. You will complete payment inside a
                      secure checkout window without leaving this site.
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    className="mt-2 rounded-full bg-primary py-4 text-lg font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition disabled:opacity-50"
                  >
                    {busy ? "Connecting to PesaPal..." : `Pay ${formatKES(total)}`}
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
