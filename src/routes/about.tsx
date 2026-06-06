import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { useSiteConfig } from "@/lib/store";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About Us — The Sound Scape" }] }),
  component: AboutPage,
});

function AboutPage() {
  const [config] = useSiteConfig();

  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          // Our Story
        </span>
        <h1 className="font-display mt-2 text-4xl font-bold">About {config.brandName}</h1>

        <div className="mt-10 space-y-6 text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {config.aboutDescription || "About description has not been set."}
        </div>

        <div className="mt-12 rounded-2xl border border-border/60 bg-card-grad p-8">
          <p className="text-lg text-muted-foreground">
            <strong>What we can do for you:</strong> If you are a creative or producer looking for a
            specific sonic identity, our studio can craft bespoke audio solutions tailored strictly
            to your project's narrative and atmospheric needs.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
