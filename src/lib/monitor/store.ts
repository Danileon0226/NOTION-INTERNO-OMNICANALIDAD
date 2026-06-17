"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Check {
  ts: number;
  ok: boolean;
  ms: number; // latencia
}

export interface Site {
  id: string;
  url: string;
  label: string;
  checks: Check[];
}

const CHECKS_CAP = 60;

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

interface MonitorState {
  enabled: boolean;
  intervalMin: number;
  sites: Site[];
  setEnabled: (b: boolean) => void;
  setInterval: (m: number) => void;
  addSite: (url: string, label?: string) => void;
  removeSite: (id: string) => void;
  recordCheck: (id: string, c: Check) => void;
}

export const useMonitor = create<MonitorState>()(
  persist(
    (set) => ({
      enabled: true,
      intervalMin: 5,
      // Sitio de la agencia monitoreado por defecto.
      sites: [
        { id: "zeroagency", url: "https://zeroagency.com.co", label: "zeroagency.com.co", checks: [] },
      ],
      setEnabled: (enabled) => set({ enabled }),
      setInterval: (intervalMin) => set({ intervalMin }),
      addSite: (url, label) =>
        set((s) => {
          const clean = url.trim();
          if (!/^https?:\/\//i.test(clean)) return s;
          if (s.sites.some((x) => x.url === clean)) return s;
          return {
            sites: [
              ...s.sites,
              { id: Math.random().toString(36).slice(2, 9), url: clean, label: label || host(clean), checks: [] },
            ],
          };
        }),
      removeSite: (id) => set((s) => ({ sites: s.sites.filter((x) => x.id !== id) })),
      recordCheck: (id, c) =>
        set((s) => ({
          sites: s.sites.map((x) => (x.id === id ? { ...x, checks: [...x.checks, c].slice(-CHECKS_CAP) } : x)),
        })),
    }),
    { name: "zero-agency-monitor" }
  )
);

// ── Derivados (sin red) ───────────────────────────────────────

export function latest(site: Site): Check | null {
  return site.checks[site.checks.length - 1] ?? null;
}

export function uptime(site: Site): number {
  if (!site.checks.length) return 1;
  return site.checks.filter((c) => c.ok).length / site.checks.length;
}

export function avgLatency(site: Site): number {
  const ok = site.checks.filter((c) => c.ok);
  if (!ok.length) return 0;
  return Math.round(ok.reduce((a, c) => a + c.ms, 0) / ok.length);
}

export type SiteStatus = "up" | "slow" | "down" | "unknown";
const SLOW_MS = 2500;

export function statusOf(site: Site): SiteStatus {
  const l = latest(site);
  if (!l) return "unknown";
  if (!l.ok) return "down";
  return l.ms > SLOW_MS ? "slow" : "up";
}
