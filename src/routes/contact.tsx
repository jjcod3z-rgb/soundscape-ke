import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact Me — The Sound Scape" }] }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          // Get In Touch
        </span>
        <h1 className="font-display mt-2 text-4xl font-bold">Contact Me</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Looking for custom sounds for your game, film, or creative project? Let's talk.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card-grad p-10 text-center transition hover:border-primary/60">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold">Phone Call</h3>
            <p className="mt-2 text-muted-foreground">
              Call me directly to discuss your custom audio needs.
            </p>
            <a
              href="tel:+254700213500"
              className="mt-6 font-mono text-lg text-foreground hover:text-primary transition"
            >
              +254 700 213 500
            </a>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card-grad p-10 text-center transition hover:border-primary/60">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold">WhatsApp</h3>
            <p className="mt-2 text-muted-foreground">
              Send a message to get a quick quote on custom loops.
            </p>
            <a
              href="https://wa.me/254700213500"
              target="_blank"
              rel="noreferrer"
              className="mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition"
            >
              Message on WhatsApp
            </a>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
