"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Webhooks salientes: ZERO, el monitoreo y la autonomía pueden disparar eventos
// a Zapier / Make / n8n / Discord / cualquier endpoint. POST fire-and-forget
// (mode no-cors) para evitar problemas de CORS desde el navegador.

export type WebhookEvent = "monitor" | "autonomy" | "briefing" | "manual";

export const WEBHOOK_EVENTS: { id: WebhookEvent; label: string }[] = [
  { id: "monitor", label: "Monitoreo (caídas/recuperación)" },
  { id: "autonomy", label: "Acciones autónomas" },
  { id: "briefing", label: "Briefing" },
  { id: "manual", label: "Manual / ZERO" },
];

export interface Webhook {
  id: string;
  url: string;
  label: string;
  events: WebhookEvent[];
  enabled: boolean;
}

interface WebhooksState {
  hooks: Webhook[];
  add: (url: string, label: string, events: WebhookEvent[]) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
}

export const useWebhooks = create<WebhooksState>()(
  persist(
    (set) => ({
      hooks: [],
      add: (url, label, events) =>
        set((s) => {
          const clean = url.trim();
          if (!/^https:\/\//i.test(clean)) return s;
          return {
            hooks: [
              ...s.hooks,
              { id: Math.random().toString(36).slice(2, 9), url: clean, label: label.trim() || clean, events: events.length ? events : ["manual"], enabled: true },
            ],
          };
        }),
      remove: (id) => set((s) => ({ hooks: s.hooks.filter((h) => h.id !== id) })),
      toggle: (id) => set((s) => ({ hooks: s.hooks.map((h) => (h.id === id ? { ...h, enabled: !h.enabled } : h)) })),
    }),
    { name: "zero-agency-webhooks" }
  )
);

/** Dispara el evento a todos los webhooks activos suscritos a ese tipo. */
export async function fireWebhooks(event: WebhookEvent, payload: Record<string, unknown> = {}): Promise<number> {
  const hooks = useWebhooks
    .getState()
    .hooks.filter((h) => h.enabled && h.events.includes(event) && /^https:\/\//i.test(h.url));
  if (!hooks.length) return 0;
  const body = JSON.stringify({ event, source: "zero-agency-os", ts: Date.now(), ...payload });
  await Promise.allSettled(
    hooks.map((h) =>
      fetch(h.url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body, keepalive: true })
    )
  );
  return hooks.length;
}
