import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useSiteConfig, formatKES, getPublicUrl, type Pack } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kelele Sound — Game Sound Packs from Kenya" },
      {
        name: "description",
        content:
          "Premium game-ready sound packs crafted in Kenya. Pay in KES, download instantly with full commercial license.",
      },
    ],
  }),
  component: HomePage,
});

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

function HomePage() {
  const [config] = useSiteConfig();
  const [featured, setFeatured] = useState<Pack[]>([]);
  const [latestNews, setLatestNews] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        // Fetch featured packs
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(3);

        if (prodErr) throw prodErr;

        const mapped: Pack[] = (prodData || []).map((row) => ({
          id: row.id,
          title: row.name,
          description: row.description || "",
          price: row.price_kes,
          coverDataUrl: row.r2_preview_url || undefined,
          files: Array.isArray(row.r2_product_urls) ? row.r2_product_urls : [],
          createdAt: new Date(row.created_at).getTime(),
        }));
        setFeatured(mapped);

        // Fetch latest announcement
        const { data: annData, error: annErr } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1);

        if (annErr) throw annErr;

        if (annData && annData.length > 0) {
          setLatestNews(annData[0] as Announcement);
        }
      } catch (err) {
        console.error("Error loading homepage data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  return (
    <div>
      <SiteHeader />
      <section
        className="relative overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: config.heroImageUrl
            ? `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.4)), url(${getPublicUrl(config.heroImageUrl)})`
            : "var(--gradient-hero)",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36 relative z-10">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            Kenyan Sound Studio
          </span>
          <h1 className="font-display mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            {config.heroQuip}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{config.heroSubtitle}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/store"
              className="rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition"
            >
              Browse the store →
            </Link>
            <Link
              to="/announcements"
              className="rounded-full border border-border px-7 py-3 font-semibold hover:bg-card transition backdrop-blur-sm bg-background/20"
            >
              Latest news
            </Link>
          </div>
        </div>
        {!config.heroImageUrl && (
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl z-0" />
        )}
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Featured
            </span>
            <h2 className="font-display mt-2 text-3xl font-bold">Fresh sound packs</h2>
          </div>
          <Link to="/store" className="text-sm text-primary hover:underline">
            See all →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center text-muted-foreground py-8">
              Loading featured sound packs...
            </div>
          ) : featured.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8">
              No featured sound packs available.
            </div>
          ) : (
            featured.map((p) => (
              <Link
                key={p.id}
                to="/store"
                className="bg-card-grad group flex flex-col rounded-2xl border border-border/60 p-6 transition hover:border-primary/60"
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
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-4 font-mono text-primary">{formatKES(p.price)}</p>
              </Link>
            ))
          )}
        </div>
      </section>

      {!loading && latestNews && (
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="bg-card-grad rounded-2xl border border-border/60 p-8 md:p-12">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              Latest announcement
            </span>
            <h3 className="font-display mt-3 text-2xl font-bold">{latestNews.title}</h3>
            <p className="mt-2 text-muted-foreground whitespace-pre-line">{latestNews.body}</p>
            <Link
              to="/announcements"
              className="mt-6 inline-block text-sm text-primary hover:underline"
            >
              All updates →
            </Link>
          </div>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}
