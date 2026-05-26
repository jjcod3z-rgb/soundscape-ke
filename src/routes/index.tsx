import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useSiteConfig, useAnnouncements, usePacks, formatKES } from "@/lib/store";

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

function HomePage() {
  const [config] = useSiteConfig();
  const [announcements] = useAnnouncements();
  const [packs] = usePacks();
  const featured = packs.slice(0, 3);
  const latestNews = announcements[0];

  return (
    <div>
      <SiteHeader />
      <section
        className="relative overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: config.heroImageUrl
            ? `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.4)), url(${config.heroImageUrl})`
            : "var(--gradient-hero)",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36 relative z-10">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            // Kenyan Sound Studio
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
              // Featured
            </span>
            <h2 className="font-display mt-2 text-3xl font-bold">Fresh sound packs</h2>
          </div>
          <Link to="/store" className="text-sm text-primary hover:underline">
            See all →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((p) => (
            <Link
              key={p.id}
              to="/store"
              className="bg-card-grad group rounded-2xl border border-border/60 p-6 transition hover:border-primary/60"
            >
              <div className="mb-4 aspect-video rounded-lg bg-gradient-to-br from-primary/40 to-accent/20" />
              <h3 className="font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              <p className="mt-4 font-mono text-primary">{formatKES(p.price)}</p>
            </Link>
          ))}
        </div>
      </section>

      {latestNews && (
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="bg-card-grad rounded-2xl border border-border/60 p-8 md:p-12">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              // Latest announcement
            </span>
            <h3 className="font-display mt-3 text-2xl font-bold">{latestNews.title}</h3>
            <p className="mt-2 text-muted-foreground">{latestNews.body}</p>
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
