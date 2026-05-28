import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  pendingBriefs: number;
}

interface Brief {
  id: string;
  genre: string;
  duration: string;
  lyrics_notes: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  created_at: string;
}

function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    pendingBriefs: 0,
  });
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Get paid orders count and sum
        const { data: orders, error: ordersErr } = await supabase
          .from("orders")
          .select("amount_kes, status");
        
        if (ordersErr) throw ordersErr;

        const paidOrders = orders?.filter(o => o.status === "paid") || [];
        const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount_kes, 0);
        
        // Get total products count
        const { count: productCount, error: prodErr } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        if (prodErr) throw prodErr;

        // Get custom briefs
        const { data: songBriefs, error: briefErr } = await supabase
          .from("song_briefs")
          .select("*")
          .order("created_at", { ascending: false });

        if (briefErr) throw briefErr;

        const typedBriefs = (songBriefs || []).map((b: any) => b as Brief);
        const pendingBriefsCount = typedBriefs.filter(b => b.status === "pending").length;

        setStats({
          totalRevenue,
          totalOrders: paidOrders.length,
          totalProducts: productCount || 0,
          pendingBriefs: pendingBriefsCount,
        });
        setBriefs(typedBriefs.slice(0, 5)); // show top 5 recent briefs
      } catch (err) {
        console.error("Error loading admin overview stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  async function updateBriefStatus(id: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("song_briefs")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      setBriefs(prev =>
        prev.map(b => (b.id === id ? { ...b, status: newStatus } : b))
      );
      
      // Update pending count if necessary
      if (newStatus !== "pending") {
        setStats(prev => ({
          ...prev,
          pendingBriefs: Math.max(0, prev.pendingBriefs - 1),
        }));
      }
    } catch (err) {
      alert("Error updating brief status: " + (err as Error).message);
    }
  }

  if (loading) return <div>Loading dashboard stats...</div>;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
          <h3 className="mt-2 font-display text-3xl font-bold text-primary">
            {formatKES(stats.totalRevenue)}
          </h3>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <span className="text-sm font-medium text-muted-foreground">Completed Sales</span>
          <h3 className="mt-2 font-display text-3xl font-bold">
            {stats.totalOrders}
          </h3>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <span className="text-sm font-medium text-muted-foreground">Active Catalog</span>
          <h3 className="mt-2 font-display text-3xl font-bold">
            {stats.totalProducts} packs
          </h3>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <span className="text-sm font-medium text-muted-foreground">Pending Briefs</span>
          <h3 className="mt-2 font-display text-3xl font-bold text-yellow-500">
            {stats.pendingBriefs}
          </h3>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold">Recent Custom Commission Briefs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review customer briefs submitted for custom music compositions.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 font-semibold">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Genre / Duration</th>
                <th className="px-6 py-4">Brief Notes</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {briefs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    No custom briefs submitted yet.
                  </td>
                </tr>
              )}
              {briefs.map((b) => (
                <tr key={b.id} className="hover:bg-muted/10">
                  <td className="px-6 py-4">
                    <div className="font-medium">{b.customer_email}</div>
                    <div className="text-xs text-muted-foreground">{b.customer_phone || "No phone"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs">{b.genre}</div>
                    <div className="text-xs text-muted-foreground">{b.duration} mins</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate" title={b.lyrics_notes}>
                    {b.lyrics_notes || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      b.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : b.status === "accepted"
                        ? "bg-green-500/10 text-green-500"
                        : b.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted-foreground/10 text-muted-foreground"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={b.status}
                      onChange={(e) => updateBriefStatus(b.id, e.target.value)}
                      className="rounded border border-border bg-input px-2 py-1 text-xs outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
