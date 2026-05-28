import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/store";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncements,
});

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [token] = useAdminAuth();

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setAnnouncements(data || []);
      } catch (err) {
        console.error("Error loading announcements:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAnnouncements();
  }, []);

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return alert("You must be logged in to post updates.");
    if (!title || !body) return alert("Title and body are required.");

    setBusy(true);
    try {
      const res = await fetch("/.netlify/functions/create-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, token }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to post announcement");

      setAnnouncements((prev) => [data.announcement, ...prev]);
      setTitle("");
      setBody("");
    } catch (err) {
      alert("Error posting announcement: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeAnnouncement(id: string) {
    if (!confirm("Delete this announcement?")) return;
    if (!token) return alert("You must be logged in.");

    try {
      const res = await fetch("/.netlify/functions/delete-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete");

      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert("Error deleting announcement: " + (err as Error).message);
    }
  }

  if (loading) return <div>Loading announcements...</div>;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1.8fr]">
      <section>
        <h2 className="font-display text-2xl font-bold">Post New Announcement</h2>
        <form onSubmit={postAnnouncement} className="mt-6 grid gap-4">
          <input
            required
            placeholder="Announcement Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
          />
          <textarea
            required
            rows={5}
            placeholder="Announcement Details..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
          />
          <button
            disabled={busy}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? "Posting..." : "Publish Announcement"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Existing Announcements ({announcements.length})</h2>
        <div className="mt-6 space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {announcements.length === 0 && (
            <p className="text-muted-foreground text-sm">No announcements posted yet.</p>
          )}
          {announcements.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between rounded-xl border border-border bg-card p-5"
            >
              <div className="space-y-1">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString("en-KE")}
                </span>
                <h4 className="font-semibold">{a.title}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
              </div>
              <button
                onClick={() => removeAnnouncement(a.id)}
                className="text-xs text-destructive hover:underline font-semibold"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
