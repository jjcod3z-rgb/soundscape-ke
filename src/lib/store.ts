import { useEffect, useState, useCallback } from "react";

export type Pack = {
  id: string;
  title: string;
  description: string;
  price: number; // KES
  coverDataUrl?: string;
  files?: { name: string; url: string }[];
  createdAt: number;
};

export type Purchase = {
  id: string;
  packId: string;
  packTitle: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  licenseKey: string;
  createdAt: number;
};

export type Email = {
  id: string;
  to: string;
  subject: string;
  body: string;
  status: "draft" | "sent";
  createdAt: number;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

export type SiteConfig = {
  heroQuip: string;
  heroSubtitle: string;
  brandName: string;
  aboutDescription: string;
  heroImageUrl: string;
  contactNumber: string;
  logoUrl: string;
};

const KEYS = {
  packs: "ks_packs",
  purchases: "ks_purchases",
  emails: "ks_emails",
  announcements: "ks_announcements",
  config: "ks_site_config",
  cart: "ks_cart",
  adminAuth: "ks_admin_auth",
  lastReceipt: "ks_last_receipt",
};

const DEFAULT_CONFIG: SiteConfig = {
  brandName: "The-Sound-Scape",
  heroQuip: "Sound that hits like Nairobi at night.",
  heroSubtitle:
    "Premium sound packs and audio loops, crafted in Kenya. Pay in KES, download instantly.",
  aboutDescription:
    "Our unique approach to sound design leverages cutting-edge technology to craft immersive audio experiences. We sell premium audio loops specifically engineered for your projects.\n\nWe utilize advanced synthesis and audio generation techniques to construct highly specific, atmospheric, and punchy audio textures that fit perfectly into interactive environments.\n\nEvery loop is meticulously curated to ensure it meets the rigorous standards of modern productions. Whether you need the ambiance of a bustling Nairobi night or the intense foley of a savanna sequence, our process ensures unparalleled quality and immersion.",
  heroImageUrl: "",
  contactNumber: "+254700213500",
  logoUrl: "",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("ks-store-change", { detail: { key } }));
}

function usePersistent<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(fallback);
  useEffect(() => {
    setState(read<T>(key, fallback));
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<{ key: string }>;
      if (!ev.detail || ev.detail.key === key) setState(read<T>(key, fallback));
    };
    window.addEventListener("ks-store-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ks-store-change", onChange);
      window.removeEventListener("storage", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        write(key, value);
        return value;
      });
    },
    [key],
  );
  return [state, set] as const;
}

export const usePacks = () => usePersistent<Pack[]>(KEYS.packs, seedPacks());
export const usePurchases = () => usePersistent<Purchase[]>(KEYS.purchases, []);
export const useEmails = () => usePersistent<Email[]>(KEYS.emails, []);
export const useAnnouncements = () =>
  usePersistent<Announcement[]>(KEYS.announcements, seedAnnouncements());
export const useSiteConfig = () => usePersistent<SiteConfig>(KEYS.config, DEFAULT_CONFIG);
export const useCart = () => usePersistent<string[]>(KEYS.cart, []);
export const useAdminAuth = () => usePersistent<string | null>(KEYS.adminAuth, null);
export const useLastReceipt = () => usePersistent<string | null>(KEYS.lastReceipt, null);

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function makeLicenseKey() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KS-${part()}-${part()}-${part()}`;
}

export function formatKES(n: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);
}

function seedPacks(): Pack[] {
  return [
    {
      id: "seed-1",
      title: "Savanna Combat FX",
      description: "120 punchy weapon, impact and foley samples mixed for action games.",
      price: 2500,
      files: [],
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: "seed-2",
      title: "Nairobi Night UI",
      description: "Sleek UI clicks, notifications and menu transitions with neon character.",
      price: 1800,
      files: [],
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: "seed-3",
      title: "Maasai Drums Loops",
      description: "Authentic percussion loops in 90/120/140 BPM, ready for adaptive scoring.",
      price: 3200,
      files: [],
      createdAt: Date.now() - 86400000,
    },
  ];
}

function seedAnnouncements(): Announcement[] {
  return [
    {
      id: "a1",
      title: "We're live!",
      body: "Kelele Sound is officially open. Three flagship packs available now.",
      createdAt: Date.now() - 86400000 * 2,
    },
  ];
}

// Read helpers (non-hook) — used in routes that need one-shot reads
export function readPacks(): Pack[] {
  return read<Pack[]>(KEYS.packs, seedPacks());
}
export function readPurchaseById(id: string): Purchase | null {
  return read<Purchase[]>(KEYS.purchases, []).find((p) => p.id === id) ?? null;
}
export function readPackById(id: string): Pack | null {
  return read<Pack[]>(KEYS.packs, seedPacks()).find((p) => p.id === id) ?? null;
}
