import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useAnnouncements } from "@/lib/store";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Kelele Sound" },
      { name: "description", content: "Latest news, releases and updates from Kelele Sound." },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const [announcements] = useAnnouncements();
  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          // Updates
        </span>
        <h1 className="font-display mt-2 text-4xl font-bold">Announcements</h1>
        <div className="mt-10 space-y-6">
          {announcements.length === 0 && (
            <p className="text-muted-foreground">Nothing posted yet.</p>
          )}
          {announcements.map((a) => (
            <article key={a.id} className="bg-card-grad rounded-2xl border border-border/60 p-6">
              <time className="font-mono text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString("en-KE", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <h2 className="font-display mt-2 text-xl font-semibold">{a.title}</h2>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">{a.body}</p>
            </article>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
