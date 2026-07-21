"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Pulso del sitio web público: resumen de la última hora de `web_events`,
// mantenido por WebPulseDaemon. El motor de anticipación lo lee SIN red
// (mismo patrón que el monitoreo de disponibilidad).

export interface WebPulseHour {
  views: number;
  sessions: number;
  leads: number;
  subs: number;
  whatsapp: number;
  errors: number;
}

const EMPTY_HOUR: WebPulseHour = { views: 0, sessions: 0, leads: 0, subs: 0, whatsapp: 0, errors: 0 };

interface WebPulseState {
  /** Última actualización del pulso (0 = nunca; sin datos frescos no hay señal). */
  updatedAt: number;
  /** ts del evento más reciente ya anunciado en el feed de actividad (dedupe). */
  lastSeenTs: number;
  hour: WebPulseHour;
  setPulse: (hour: WebPulseHour) => void;
  markSeen: (ts: number) => void;
}

export const useWebPulse = create<WebPulseState>()(
  persist(
    (set) => ({
      updatedAt: 0,
      lastSeenTs: 0,
      hour: EMPTY_HOUR,
      setPulse: (hour) => set({ hour, updatedAt: Date.now() }),
      markSeen: (ts) => set((s) => ({ lastSeenTs: Math.max(s.lastSeenTs, ts) })),
    }),
    { name: "zero-agency-webpulse" }
  )
);
