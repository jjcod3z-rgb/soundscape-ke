import { Link } from "@tanstack/react-router";
import { useSiteConfig, useCart, getPublicUrl } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export function SiteHeader() {
  const [config, setConfig] = useSiteConfig();
  const [cart] = useCart();

  useEffect(() => {
    async function loadGlobalConfig() {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("*")
          .eq("id", "global")
          .single();
        if (error && error.code !== "PGRST116") throw error; // ignore no rows error
        if (data) {
          setConfig({
            brandName: data.brand_name || config.brandName,
            heroQuip: data.hero_quip || config.heroQuip,
            heroSubtitle: data.hero_subtitle || config.heroSubtitle,
            aboutDescription: data.about_description || config.aboutDescription,
            heroImageUrl: data.hero_image_url || config.heroImageUrl,
            contactNumber: data.contact_number || config.contactNumber,
            logoUrl: data.logo_url || config.logoUrl,
          });
        }
      } catch (err) {
        console.error("Failed to load global site config", err);
      }
    }
    loadGlobalConfig();
  }, []);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
          {config.logoUrl ? (
            <img src={getPublicUrl(config.logoUrl)} alt={config.brandName} className="h-10 md:h-12 w-auto object-contain max-h-12" />
          ) : (
            <><span className="text-primary">▌</span> {config.brandName}</>
          )}
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
      <p>© {new Date().getFullYear()} {config.brandName} · Made in Kenya 🇰🇪</p>
      <p className="mt-2">
        <Link to="/redownload" className="hover:text-foreground transition underline underline-offset-4">
          Re-download your files
        </Link>
        {" · "}
        <Link to="/contact" className="hover:text-foreground transition underline underline-offset-4">
          Support
        </Link>
      </p>
    </footer>
  );
}
