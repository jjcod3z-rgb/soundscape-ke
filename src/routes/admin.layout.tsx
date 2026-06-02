import { createFileRoute } from "@tanstack/react-router";
import { useSiteConfig, useAdminAuth } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/admin/layout")({ component: AdminLayoutEditor });

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function AdminLayoutEditor() {
  const [config, setConfig] = useSiteConfig();
  const [token] = useAdminAuth();

  const [brandName, setBrandName] = useState(config.brandName || "");
  const [heroQuip, setHeroQuip] = useState(config.heroQuip || "");
  const [heroSubtitle, setHeroSubtitle] = useState(config.heroSubtitle || "");
  const [contactNumber, setContactNumber] = useState(config.contactNumber || "");
  const [aboutDescription, setAboutDescription] = useState(config.aboutDescription || "");
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return alert("You must be logged in to save layout changes.");

    setBusy(true);
    setStatusText("Saving layout...");

    try {
      let heroImageUrl = config.heroImageUrl;

      if (heroImage) {
        setStatusText("Uploading new hero image...");
        const uRes = await fetch("/.netlify/functions/get-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: heroImage.name, contentType: heroImage.type, token }),
        });
        const res = await uRes.json();
        if (res.success && res.uploadUrl) {
          try {
            await fetch(res.uploadUrl, {
              method: "PUT",
              body: heroImage,
              headers: { "Content-Type": heroImage.type },
            });
            heroImageUrl = res.publicUrl || "";
          } catch (putErr) {
            console.warn("R2 PUT upload failed for hero image, falling back to base64", putErr);
            heroImageUrl = await fileToDataUrl(heroImage);
          }
        } else {
          console.warn("Cloudflare upload failed, falling back to local base64", res.error);
          heroImageUrl = await fileToDataUrl(heroImage);
        }
      }

      let logoUrl = config.logoUrl || "";

      if (logoImage) {
        setStatusText("Uploading site logo...");
        const uRes = await fetch("/.netlify/functions/get-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: logoImage.name, contentType: logoImage.type, token }),
        });
        const res = await uRes.json();
        if (res.success && res.uploadUrl) {
          try {
            await fetch(res.uploadUrl, {
              method: "PUT",
              body: logoImage,
              headers: { "Content-Type": logoImage.type },
            });
            logoUrl = res.publicUrl || "";
          } catch (putErr) {
            console.warn("R2 PUT upload failed for logo, falling back to base64", putErr);
            logoUrl = await fileToDataUrl(logoImage);
          }
        } else {
          console.warn("Cloudflare upload failed, falling back to local base64", res.error);
          logoUrl = await fileToDataUrl(logoImage);
        }
      }

      const newSettings = {
        brandName,
        heroQuip,
        heroSubtitle,
        contactNumber,
        aboutDescription,
        heroImageUrl,
        logoUrl,
      };

      // 1. Save globally to Supabase
      setStatusText("Saving to global database...");
      const updateRes = await fetch("/.netlify/functions/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, settings: newSettings }),
      });
      const updateData = await updateRes.json();
      
      if (!updateData.success) {
        throw new Error(updateData.error || "Failed to save settings globally");
      }

      // 2. Update local state
      setConfig(newSettings);

      setStatusText("Saved successfully!");
      setHeroImage(null);
      setLogoImage(null);
      setTimeout(() => setStatusText(""), 3000);
    } catch (err: unknown) {
      alert("Error saving layout: " + (err as Error).message);
      setStatusText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-10">
      <section>
        <h2 className="font-display text-2xl font-bold">Site Layout Editor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes made here are applied instantly to the public site.
        </p>

        <form onSubmit={saveConfig} className="mt-8 grid gap-6 max-w-3xl">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Brand Name</label>
            <input
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Contact Phone Number</label>
            <input
              required
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Homepage Hero Main Title</label>
            <input
              required
              value={heroQuip}
              onChange={(e) => setHeroQuip(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Homepage Hero Subtitle</label>
            <textarea
              required
              rows={2}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">About Page Description</label>
            <textarea
              required
              rows={8}
              value={aboutDescription}
              onChange={(e) => setAboutDescription(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              You can use line breaks to separate paragraphs.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">
              Homepage Hero Background Image
            </label>
            {config.heroImageUrl && !heroImage && (
              <div
                className="mb-2 h-32 w-48 rounded-lg bg-cover bg-center border border-border"
                style={{ backgroundImage: `url(${config.heroImageUrl})` }}
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setHeroImage(e.target.files?.[0] ?? null)}
              className="w-full text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-secondary-foreground hover:file:opacity-90"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to keep the current image. Uploading a new image will replace the old one.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">
              Site Logo (Optional)
            </label>
            {config.logoUrl && !logoImage && (
              <div className="mb-2 h-16 w-32 rounded-lg border border-border flex items-center justify-center bg-card">
                <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoImage(e.target.files?.[0] ?? null)}
              className="w-full text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-secondary-foreground hover:file:opacity-90"
            />
            <p className="text-xs text-muted-foreground">
              Upload a logo image to display in the header instead of the brand name text.
            </p>
          </div>

          <button
            disabled={busy}
            className="mt-4 w-full md:w-auto md:px-8 rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? statusText || "Saving…" : "Save Layout Changes"}
          </button>

          {!busy && statusText && <p className="text-sm text-primary font-medium">{statusText}</p>}
        </form>
      </section>
    </div>
  );
}
