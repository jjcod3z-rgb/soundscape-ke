import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/admin/purchases")({
  component: AdminPurchases,
});

interface OrderRow {
  id: string;
  customer_email: string;
  customer_phone: string | null;
  amount_kes: number;
  pesapal_order_id: string | null;
  status: string;
  download_token: string | null;
  created_at: string;
  product_name?: string;
}

function AdminPurchases() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadPurchases() {
      try {
        const { data: rawOrders, error } = await supabase
          .from("orders")
          .select("*, products(name)")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formatted: OrderRow[] = (rawOrders || []).map((row: any) => ({
          id: row.id,
          customer_email: row.customer_email,
          customer_phone: row.customer_phone,
          amount_kes: row.amount_kes,
          pesapal_order_id: row.pesapal_order_id,
          status: row.status,
          download_token: row.download_token,
          created_at: row.created_at,
          product_name: row.products?.name || "Unknown Product",
        }));

        setOrders(formatted);
      } catch (err) {
        console.error("Error loading purchases:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPurchases();
  }, []);

  const filtered = orders.filter((o) => {
    const matchesStatus = filterStatus === "all" || o.status === filterStatus;
    const matchesSearch =
      o.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      (o.product_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.pesapal_order_id || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) return <div>Loading purchases...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          placeholder="Search by email, product, or order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-border bg-input px-4 py-2 text-sm outline-none focus:border-primary"
        />

        <div className="flex gap-2">
          {["all", "paid", "pending", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                filterStatus === status
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 font-semibold">
              <th className="px-6 py-4">Order Details</th>
              <th className="px-6 py-4">Product Purchased</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                  No purchases found.
                </td>
              </tr>
            )}
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-muted/10">
                <td className="px-6 py-4">
                  <div className="font-medium">{o.customer_email}</div>
                  <div className="text-xs text-muted-foreground font-mono">ID: {o.pesapal_order_id || o.id}</div>
                  {o.customer_phone && <div className="text-xs text-muted-foreground">Phone: {o.customer_phone}</div>}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium">{o.product_name}</div>
                </td>
                <td className="px-6 py-4 font-mono text-primary font-semibold">
                  {formatKES(o.amount_kes)}
                </td>
                <td className="px-6 py-4">
                  {new Date(o.created_at).toLocaleDateString("en-KE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    o.status === "paid"
                      ? "bg-green-500/10 text-green-500"
                      : o.status === "pending"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-red-500/10 text-red-500"
                  }`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
