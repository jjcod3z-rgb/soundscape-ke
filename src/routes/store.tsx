import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useCart, formatKES, getPublicUrl, type Pack } from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "Store — Kelele Sound" },
      { name: "description", content: "Browse game sound packs. Pay in KES via Pesapal." },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useCart();

  useEffect(() => {
    async function loadPacks() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;

        // Map Supabase product rows to front-end Pack type
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
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPacks();
  }, []);

  const cartPacks = useMemo(() => packs.filter((p) => cart.includes(p.id)), [packs, cart]);
  const total = cartPacks.reduce((s, p) => s + p.price, 0);

  function toggle(id: string) {
    setCart((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          Catalogue
        </span>
        <h1 className="font-display mt-2 text-4xl font-bold">Sound packs</h1>
        <p className="mt-2 text-muted-foreground">
          Tap to add to cart. Checkout via Pesapal at the bottom.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Loading sound packs...
            </div>
          ) : packs.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No sound packs available at the moment.
            </div>
          ) : (
            packs.map((p) => {
              const inCart = cart.includes(p.id);
              return (
                <div
                  key={p.id}
                  className="bg-card-grad flex flex-col rounded-2xl border border-border/60 p-6"
                >
                  <div
                    className="mb-4 aspect-video rounded-lg bg-gradient-to-br from-primary/40 to-accent/20"
                    style={
                      p.coverDataUrl
                        ? {
                            backgroundImage: `url(${getPublicUrl(p.coverDataUrl)})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  />
                  <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-primary">{formatKES(p.price)}</span>
                    <button
                      onClick={() => toggle(p.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        inCart
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {inCart ? "Remove" : "Add to cart"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cartPacks.length > 0 && (
          <div id="cart" className="mt-16 rounded-2xl border border-border/60 bg-card p-8">
            <h2 className="font-display text-2xl font-bold">Your cart ({cartPacks.length})</h2>
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 w-full text-left">
                <p className="text-muted-foreground">
                  You have {cartPacks.length} pack(s) in your cart.
                </p>
                <div className="mt-2 font-mono text-2xl font-bold text-primary">
                  {formatKES(total)}
                </div>
              </div>
              <Link
                to="/cart"
                className="w-full md:w-auto text-center rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition"
              >
                Go to Checkout →
              </Link>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Need help?{" "}
          <Link to="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
