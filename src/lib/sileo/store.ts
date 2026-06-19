"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// SILEO · gestor de notificaciones internas de ZERO OS.
// (del latín "sileo": guardar silencio → incluye modo silencio y muteo por
// categoría.) Centraliza eventos del sistema y la entrega dirigida entre el
// equipo en un único centro de notificaciones, con prioridad y lectura.

export type SileoCategory = "system" | "lead" | "agent" | "report" | "monitor" | "team" | "mention";
export type SileoPriority = "low" | "normal" | "high";

export interface SileoNotification {
  id: string;
  ts: number;
  category: SileoCategory;
  priority: SileoPriority;
  title: string;
  body?: string;
  href?: string; // enlace profundo al recurso
  actor?: string; // quién/qué lo generó
  read: boolean;
  remote?: boolean; // entregada vía Firebase (entre personas)
}

export const CATEGORY_META: Record<SileoCategory, { label: string; icon: string; tone: string }> = {
  system: { label: "Sistema", icon: "⚙️", tone: "text-muted" },
  lead: { label: "Leads", icon: "🎯", tone: "text-accent" },
  agent: { label: "Agente IA", icon: "🤖", tone: "text-violet-500" },
  report: { label: "Reportes", icon: "📊", tone: "text-emerald-600" },
  monitor: { label: "Monitoreo", icon: "📡", tone: "text-amber-500" },
  team: { label: "Equipo", icon: "👥", tone: "text-sky-500" },
  mention: { label: "Menciones", icon: "💬", tone: "text-pink-500" },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as SileoCategory[];

interface SileoState {
  items: SileoNotification[];
  open: boolean;
  muted: SileoCategory[]; // categorías silenciadas (no entran)
  quiet: boolean; // modo silencio total: sin toasts ni sonido
  toast: SileoNotification | null;
  // Reenvío de alta prioridad a canales externos.
  forward: { telegram: boolean; whatsapp: boolean };
  whatsappAlertTo: string; // número E.164 destino de alertas WhatsApp

  setOpen: (b: boolean) => void;
  /** Crea una notificación. `id` para idempotencia; `silent` evita el toast. */
  notify: (n: Omit<SileoNotification, "id" | "ts" | "read"> & { id?: string; ts?: number; silent?: boolean }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  toggleMute: (c: SileoCategory) => void;
  toggleQuiet: () => void;
  dismissToast: () => void;
  setForward: (p: Partial<{ telegram: boolean; whatsapp: boolean }>) => void;
  setWhatsappAlertTo: (s: string) => void;
}

const CAP = 120;

export const useSileo = create<SileoState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      muted: [],
      quiet: false,
      toast: null,
      forward: { telegram: false, whatsapp: false },
      whatsappAlertTo: "",

      setOpen: (open) => set({ open }),

      notify: (n) => {
        const s = get();
        if (s.muted.includes(n.category)) return; // categoría silenciada → se ignora
        if (n.id && s.items.some((x) => x.id === n.id)) return; // idempotencia
        const item: SileoNotification = {
          id: n.id || Math.random().toString(36).slice(2),
          ts: n.ts || Date.now(),
          category: n.category,
          priority: n.priority,
          title: n.title,
          body: n.body,
          href: n.href,
          actor: n.actor,
          remote: n.remote,
          read: false,
        };
        const showToast = !n.silent && !s.quiet && (item.priority === "high" || item.category === "mention");
        set((st) => ({
          items: [item, ...st.items].slice(0, CAP),
          toast: showToast ? item : st.toast,
        }));
      },

      markRead: (id) => set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, read: true } : x)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((x) => ({ ...x, read: true })) })),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
      toggleMute: (c) =>
        set((s) => ({ muted: s.muted.includes(c) ? s.muted.filter((x) => x !== c) : [...s.muted, c] })),
      toggleQuiet: () => set((s) => ({ quiet: !s.quiet })),
      dismissToast: () => set({ toast: null }),
      setForward: (p) => set((s) => ({ forward: { ...s.forward, ...p } })),
      setWhatsappAlertTo: (whatsappAlertTo) => set({ whatsappAlertTo }),
    }),
    {
      name: "zero-agency-sileo",
      partialize: (s) => ({ items: s.items, muted: s.muted, quiet: s.quiet, forward: s.forward, whatsappAlertTo: s.whatsappAlertTo }),
    }
  )
);

/** Atajo para emitir una notificación SILEO desde cualquier parte del código. */
export function sileoNotify(n: Omit<SileoNotification, "id" | "ts" | "read"> & { id?: string; ts?: number; silent?: boolean }) {
  useSileo.getState().notify(n);
}

export function unreadCount(items: SileoNotification[]): number {
  return items.filter((x) => !x.read).length;
}
