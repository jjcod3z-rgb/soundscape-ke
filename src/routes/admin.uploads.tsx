import { createFileRoute } from "@tanstack/react-router";
import { formatKES, useAdminAuth } from "@/lib/store";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/uploads")({ component: AdminUploads });

interface AdminPack {
  id: string;
  title: string;
  description: string;
  price: number;
  coverDataUrl?: string;
  files: { name: string; url: string }[];
  createdAt: number;
  isActive: boolean;
  maxPurchases: number | null;
  totalPurchases: number;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function uploadFile(file: File, token: string): Promise<string> {
  const uRes = await fetch("/.netlify/functions/get-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", token }),
  });
  const res = await uRes.json();
  if (res.success && res.uploadUrl) {
    try {
      await fetch(res.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      return res.publicUrl;
    } catch {
      return fileToDataUrl(file);
    }
  }
  return fileToDataUrl(file);
}

// ─── EDIT MODAL ────────────────────────────────────────────────────────────────
function EditModal({ pack, token, onSave, onClose }: {
  pack: AdminPack;
  token: string;
  onSave: (updated: Partial<AdminPack>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(pack.title);
  const [description, setDescription] = useState(pack.description);
  const [price, setPrice] = useState(pack.price);
  const [maxPurchases, setMaxPurchases] = useState<number | null>(pack.maxPurchases);
  const [inventoryMode, setInventoryMode] = useState<"unlimited" | "fixed">(
    pack.maxPurchases === null ? "unlimited" : "fixed"
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("Saving…");
    try {
      let coverUrl: string | undefined = undefined;
      if (coverFile) {
        setStatus("Uploading cover image…");
        coverUrl = await uploadFile(coverFile, token);
      }

      const body: Record<string, unknown> = {
        id: pack.id,
        title,
        description,
        price,
        maxPurchases: inventoryMode === "unlimited" ? null : (maxPurchases ?? null),
        token,
      };
      if (coverUrl) body.coverUrl = coverUrl;

      const res = await fetch("/.netlify/functions/update-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update pack");

      onSave({
        title,
        description,
        price,
        maxPurchases: inventoryMode === "unlimited" ? null : (maxPurchases ?? null),
        ...(coverUrl ? { coverDataUrl: coverUrl } : {}),
      });
      onClose();
    } catch (err: unknown) {
      alert("Error: " + (err as Error).message);
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h3 className="font-display text-lg font-bold">Edit Pack</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">✕</button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4 overflow-y-auto max-h-[80vh]">
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-4 py-2.5 outline-none focus:border-primary text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-4 py-2.5 outline-none focus:border-primary text-sm resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Price (KES)</label>
            <input
              required
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-input px-4 py-2.5 outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Inventory */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Inventory</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInventoryMode("unlimited")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${inventoryMode === "unlimited" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                ∞ Unlimited
              </button>
              <button
                type="button"
                onClick={() => setInventoryMode("fixed")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${inventoryMode === "fixed" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                Fixed Stock
              </button>
            </div>
            {inventoryMode === "fixed" && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={pack.totalPurchases}
                  value={maxPurchases ?? ""}
                  onChange={(e) => setMaxPurchases(Number(e.target.value) || null)}
                  placeholder="e.g. 50"
                  className="flex-1 rounded-lg border border-border bg-input px-4 py-2.5 outline-none focus:border-primary text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{pack.totalPurchases} sold so far</span>
              </div>
            )}
          </div>

          {/* Cover image */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Replace Cover Image (optional)</label>
            {pack.coverDataUrl && !coverFile && (
              <img src={pack.coverDataUrl} alt="" className="h-20 w-20 rounded-lg object-cover bg-muted mb-1" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-1.5 file:text-sm file:font-semibold hover:file:opacity-90"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-accent transition"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? status || "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
function AdminUploads() {
  const [packs, setPacks] = useState<AdminPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [token] = useAdminAuth();
  const [editingPack, setEditingPack] = useState<AdminPack | null>(null);

  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(1500);
  const [cover, setCover] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [inventoryMode, setInventoryMode] = useState<"unlimited" | "fixed">("unlimited");
  const [maxPurchases, setMaxPurchases] = useState<number>(100);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");

  // Filter for admin list
  const [filter, setFilter] = useState<"all" | "active" | "hidden">("all");

  useEffect(() => {
    async function loadPacks() {
      try {
        // Load ALL products regardless of is_active
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped: AdminPack[] = (data || []).map((row) => ({
          id: row.id,
          title: row.name,
          description: row.description || "",
          price: row.price_kes,
          coverDataUrl: row.r2_preview_url || undefined,
          files: Array.isArray(row.r2_product_urls) ? row.r2_product_urls : [],
          createdAt: new Date(row.created_at).getTime(),
          isActive: row.is_active,
          maxPurchases: row.max_purchases ?? null,
          totalPurchases: row.total_purchases ?? 0,
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return alert("You must be logged in to upload files.");

    setBusy(true);
    try {
      let coverUrl: string | undefined;
      if (cover) {
        setStatusText("Uploading cover image…");
        coverUrl = await uploadFile(cover, token);
      }

      const uploadedFiles: { name: string; url: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setStatusText(`Uploading file ${i + 1} of ${files.length}: ${f.name}`);
        const url = await uploadFile(f, token);
        uploadedFiles.push({ name: f.name, url });
      }

      setStatusText("Saving pack…");
      const pRes = await fetch("/.netlify/functions/create-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, price, coverUrl,
          files: uploadedFiles,
          maxPurchases: inventoryMode === "unlimited" ? null : maxPurchases,
          token,
        }),
      });
      const res = await pRes.json();
      if (!res.success) throw new Error(res.error || "Failed to save pack to Supabase");

      const saved = res.product;
      const newPack: AdminPack = {
        id: saved.id,
        title: saved.name,
        description: saved.description || "",
        price: saved.price_kes,
        coverDataUrl: saved.r2_preview_url || undefined,
        files: Array.isArray(saved.r2_product_urls) ? saved.r2_product_urls : [],
        createdAt: new Date(saved.created_at).getTime(),
        isActive: saved.is_active,
        maxPurchases: saved.max_purchases ?? null,
        totalPurchases: 0,
      };

      setPacks((arr) => [newPack, ...arr]);
      setTitle(""); setDescription(""); setPrice(1500);
      setCover(null); setFiles([]);
      setInventoryMode("unlimited");
      (document.getElementById("upload-form") as HTMLFormElement)?.reset();
    } catch (err: unknown) {
      alert("Upload error: " + (err as Error).message);
    } finally {
      setBusy(false); setStatusText("");
    }
  }

  async function toggleVisibility(pack: AdminPack) {
    const newState = !pack.isActive;
    try {
      const res = await fetch("/.netlify/functions/update-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pack.id, isActive: newState, token }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPacks((arr) => arr.map((p) => p.id === pack.id ? { ...p, isActive: newState } : p));
    } catch (err: unknown) {
      alert("Error: " + (err as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Permanently delete this pack? This cannot be undone.")) return;
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

  const filtered = packs.filter((p) => {
    if (filter === "active") return p.isActive;
    if (filter === "hidden") return !p.isActive;
    return true;
  });

  return (
    <>
      {editingPack && (
        <EditModal
          pack={editingPack}
          token={token || ""}
          onSave={(updated) => setPacks((arr) => arr.map((p) => p.id === editingPack.id ? { ...p, ...updated } : p))}
          onClose={() => setEditingPack(null)}
        />
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        {/* ── Upload Form ── */}
        <section>
          <h2 className="font-display text-2xl font-bold">Upload a pack</h2>
          <form id="upload-form" onSubmit={submit} className="mt-6 grid gap-4">
            <input
              required placeholder="Title" value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
            />
            <textarea
              required rows={3} placeholder="Description" value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary resize-none"
            />
            <label className="text-sm font-medium text-foreground">
              Price (KES)
              <input
                required type="number" min={0} value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
              />
            </label>

            {/* Inventory */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Inventory</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInventoryMode("unlimited")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${inventoryMode === "unlimited" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  ∞ Unlimited
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryMode("fixed")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${inventoryMode === "fixed" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  Fixed Stock
                </button>
              </div>
              {inventoryMode === "fixed" && (
                <input
                  type="number" min={1} value={maxPurchases}
                  onChange={(e) => setMaxPurchases(Number(e.target.value))}
                  placeholder="Max purchases (e.g. 50)"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 outline-none focus:border-primary text-sm"
                />
              )}
            </div>

            <label className="text-sm font-medium text-foreground">
              Cover image
              <input
                type="file" accept="image/*"
                onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold hover:file:opacity-90"
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Pack files (select multiple)
              <input
                type="file" multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="mt-1 w-full text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold hover:file:opacity-90"
              />
            </label>
            <button
              disabled={busy}
              className="mt-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? statusText || "Processing…" : "Publish Pack"}
            </button>
          </form>
        </section>

        {/* ── Pack List ── */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <h2 className="font-display text-2xl font-bold">Packs ({packs.length})</h2>
            <div className="flex gap-1 text-xs bg-muted/40 p-1 rounded-lg border border-border/40">
              {(["all", "active", "hidden"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md capitalize font-medium transition ${filter === f ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-4">
            {loading ? (
              <li className="text-center py-10 text-muted-foreground">Loading packs…</li>
            ) : filtered.length === 0 ? (
              <li className="text-center py-10 text-muted-foreground">No packs found.</li>
            ) : (
              filtered.map((p) => (
                <li
                  key={p.id}
                  className={`rounded-xl border border-border/60 bg-card p-4 shadow-sm transition ${!p.isActive ? "opacity-60" : ""}`}
                >
                  <div className="flex gap-4">
                    {/* Cover */}
                    {p.coverDataUrl ? (
                      <img src={p.coverDataUrl} alt={p.title} className="h-20 w-20 rounded-lg object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                        No img
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight">{p.title}</h3>
                        {!p.isActive && (
                          <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-700/50 px-2 py-0.5 rounded-full shrink-0">Hidden</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{formatKES(p.price)}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        {/* Inventory badge */}
                        {p.maxPurchases === null ? (
                          <span className="text-xs text-emerald-400 font-medium">∞ Unlimited</span>
                        ) : (
                          <span className={`text-xs font-medium ${p.totalPurchases >= p.maxPurchases ? "text-red-400" : "text-amber-400"}`}>
                            {p.totalPurchases}/{p.maxPurchases} sold
                            {p.totalPurchases >= p.maxPurchases && " · SOLD OUT"}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">· {p.files?.length || 0} file(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      onClick={() => setEditingPack(p)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => toggleVisibility(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${p.isActive ? "border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/20" : "border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/20"}`}
                    >
                      {p.isActive ? "👁 Hide from Store" : "✅ Show in Store"}
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition ml-auto"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
