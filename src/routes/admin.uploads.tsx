import { createFileRoute } from "@tanstack/react-router";
import { formatKES, uid, type Pack, useAdminAuth } from "@/lib/store";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/uploads")({ component: AdminUploads });

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function AdminUploads() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [token] = useAdminAuth();

  useEffect(() => {
    async function loadPacks() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;

        const mapped: Pack[] = (data || []).map((row) => ({
          id: row.id,
          title: row.name,
          description: row.description || "",
          price: row.price_kes,
          coverDataUrl: row.r2_preview_url || undefined,
          fileName: row.slug ? `${row.slug}.wav` : undefined,
          fileDataUrl: row.r2_product_url || undefined,
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(1500);
  const [cover, setCover] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return alert("You must be logged in to upload files.");

    setBusy(true);
    try {
      let coverUrl = undefined;
      if (cover) {
        setStatusText("Uploading cover image...");
        const uRes = await fetch("/.netlify/functions/get-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: cover.name, contentType: cover.type, token }),
        });
        const res = await uRes.json();
        if (res.success && res.uploadUrl) {
          await fetch(res.uploadUrl, {
            method: "PUT",
            body: cover,
            headers: { "Content-Type": cover.type },
          });
          coverUrl = res.publicUrl;
        } else {
          console.warn("Cloudflare upload failed, falling back to local base64", res.error);
          coverUrl = await fileToDataUrl(cover);
        }
      }

      let fileUrl = undefined;
      if (file) {
        setStatusText("Uploading main file (this may take a while)...");
        const uRes = await fetch("/.netlify/functions/get-upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            token,
          }),
        });
        const res = await uRes.json();
        if (res.success && res.uploadUrl) {
          await fetch(res.uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });
          fileUrl = res.publicUrl;
        } else {
          console.warn("Cloudflare upload failed, falling back to local base64", res.error);
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(
              "File is too large for local fallback. Please configure Cloudflare R2.",
            );
          }
          fileUrl = await fileToDataUrl(file);
        }
      }

      setStatusText("Saving pack...");
      const pRes = await fetch("/.netlify/functions/create-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          coverUrl,
          fileName: file?.name,
          fileUrl,
          token,
        }),
      });
      const res = await pRes.json();
      if (!res.success) throw new Error(res.error || "Failed to save pack to Supabase");

      const savedProduct = res.product;
      const pack: Pack = {
        id: savedProduct.id,
        title: savedProduct.name,
        description: savedProduct.description || "",
        price: savedProduct.price_kes,
        coverDataUrl: savedProduct.r2_preview_url || undefined,
        fileName: file?.name,
        fileDataUrl: savedProduct.r2_product_url || undefined,
        createdAt: new Date(savedProduct.created_at).getTime(),
      };

      setPacks((arr) => [pack, ...arr]);
      setTitle("");
      setDescription("");
      setPrice(1500);
      setCover(null);
      setFile(null);
      (document.getElementById("upload-form") as HTMLFormElement)?.reset();
    } catch (err: unknown) {
      alert("Upload error: " + (err as Error).message);
    } finally {
      setBusy(false);
      setStatusText("");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this pack?")) return;
    try {
      const dRes = await fetch("/.netlify/functions/delete-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token }),
      });
      const res = await dRes.json();
      if (!res.success) throw new Error(res.error || "Failed to delete pack");
      setPacks((arr) => arr.filter((p) => p.id !== id));
    } catch (err: unknown) {
      alert("Error deleting pack: " + (err as Error).message);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      <section>
        <h2 className="font-display text-2xl font-bold">Upload a pack</h2>
        <form id="upload-form" onSubmit={submit} className="mt-6 grid gap-4">
          <input
            required
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
          />
          <textarea
            required
            rows={3}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
          />
          <label className="text-sm font-medium text-foreground">
            Price (KES)
            <input
              required
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Cover image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-secondary-foreground hover:file:opacity-90"
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Pack file (any type, direct upload to R2)
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-secondary-foreground hover:file:opacity-90"
            />
          </label>
          <button
            disabled={busy}
            className="mt-4 rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? statusText || "Processing…" : "Publish Pack"}
          </button>
        </form>
      </section>
      <section>
        <h2 className="font-display text-2xl font-bold">Existing packs ({packs.length})</h2>
        <ul className="mt-6 space-y-4">
          {loading ? (
            <li className="text-center py-6 text-muted-foreground">Loading packs...</li>
          ) : packs.length === 0 ? (
            <li className="text-center py-6 text-muted-foreground">No packs uploaded yet.</li>
          ) : (
            packs.map((p) => (
              <li
                key={p.id}
                className="flex flex-col sm:flex-row items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm"
              >
              <div className="flex gap-4">
                {p.coverDataUrl ? (
                  <img
                    src={p.coverDataUrl}
                    alt={p.title}
                    className="h-20 w-20 rounded-lg object-cover bg-muted"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{p.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-primary">
                      {formatKES(p.price)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {p.fileName ?? "no file"}
                    </span>
                  </div>
                  {p.fileDataUrl && (
                    <a
                      href={p.fileDataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Download / Export File
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(p.id)}
                className="text-sm font-medium text-destructive hover:underline shrink-0"
              >
                Delete
              </button>
            </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
