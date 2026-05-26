import { Link } from "@tanstack/react-router";
import { useSiteConfig, useCart } from "@/lib/store";

export function SiteHeader() {
  const [config] = useSiteConfig();
  const [cart] = useCart();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-lg font-bold tracking-tight">
          <span className="text-primary">▌</span> {config.brandName}
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition"
          >
            Home
          </Link>
          <Link
            to="/store"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition"
          >
            Store
          </Link>
          <Link
            to="/about"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition"
          >
            About
          </Link>
          <Link
            to="/contact"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition"
          >
            Contact
          </Link>
          <Link
            to="/announcements"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition"
          >
            News
          </Link>
        </nav>
        <Link
          to="/store"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition"
        >
          Cart{" "}
          {cart.length > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-2">{cart.length}</span>
          )}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const [config] = useSiteConfig();
  return (
    <footer className="mt-32 border-t border-border/60 py-10 text-center text-sm text-muted-foreground">
      © {new Date().getFullYear()} {config.brandName} · Made in Kenya 🇰🇪
    </footer>
  );
}
