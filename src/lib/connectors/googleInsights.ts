"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Search Console (SEO) y Google Analytics 4 (tráfico) del sitio de la agencia.
// Scopes adicionales que se piden bajo demanda (no en la conexión básica).
export const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

interface InsightsState {
  scSite: string; // p. ej. "sc-domain:zeroagency.com.co" o "https://zeroagency.com.co/"
  gaProperty: string; // ID numérico de la propiedad GA4
  setScSite: (v: string) => void;
  setGaProperty: (v: string) => void;
}

export const useGoogleInsights = create<InsightsState>()(
  persist(
    (set) => ({
      scSite: "sc-domain:zeroagency.com.co",
      gaProperty: "",
      setScSite: (scSite) => set({ scSite }),
      setGaProperty: (gaProperty) => set({ gaProperty }),
    }),
    { name: "zero-agency-insights" }
  )
);

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

async function gpost<T>(url: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: { message?: string } })?.error?.message || `Google ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Search Console ───────────────────────────────────────────

export interface ScSummary {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: { query: string; clicks: number; impressions: number }[];
}

export async function searchConsoleSummary(token: string, site: string): Promise<ScSummary> {
  const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const range = { startDate: isoDaysAgo(28), endDate: isoDaysAgo(1) };
  const [totals, queries] = await Promise.all([
    gpost<{ rows?: { clicks: number; impressions: number; ctr: number; position: number }[] }>(base, token, range),
    gpost<{ rows?: { keys: string[]; clicks: number; impressions: number }[] }>(base, token, {
      ...range,
      dimensions: ["query"],
      rowLimit: 5,
    }),
  ]);
  const t = totals.rows?.[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return {
    clicks: t.clicks,
    impressions: t.impressions,
    ctr: t.ctr,
    position: t.position,
    topQueries: (queries.rows ?? []).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
  };
}

// ── Google Analytics 4 ───────────────────────────────────────

export interface GaSummary {
  sessions: number;
  users: number;
  views: number;
}

export async function ga4Summary(token: string, property: string): Promise<GaSummary> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runReport`;
  const data = await gpost<{ rows?: { metricValues: { value: string }[] }[] }>(url, token, {
    dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
  });
  const v = data.rows?.[0]?.metricValues ?? [];
  return {
    sessions: Number(v[0]?.value ?? 0),
    users: Number(v[1]?.value ?? 0),
    views: Number(v[2]?.value ?? 0),
  };
}
