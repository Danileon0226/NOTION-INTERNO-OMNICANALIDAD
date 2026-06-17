"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivitySource = "gmail" | "google-drive" | "github" | "telegram" | "ai" | "system";
export type ActivityKind = "integrate" | "sync" | "connect" | "alert" | "info";

export interface ActivityEvent {
  id: string;
  ts: number;
  source: ActivitySource;
  kind: ActivityKind;
  label: string;
  count?: number;
}

interface ActivityState {
  events: ActivityEvent[];
  /** Total acumulado de elementos integrados por la IA. */
  integrated: number;
  push: (e: Omit<ActivityEvent, "id" | "ts">) => void;
  clear: () => void;
}

const CAP = 80;

export const useActivity = create<ActivityState>()(
  persist(
    (set) => ({
      events: [],
      integrated: 0,
      push: (e) =>
        set((s) => ({
          events: [
            { ...e, id: Math.random().toString(36).slice(2), ts: Date.now() },
            ...s.events,
          ].slice(0, CAP),
          integrated: s.integrated + (e.count ?? 0),
        })),
      clear: () => set({ events: [], integrated: 0 }),
    }),
    { name: "zero-agency-activity" }
  )
);

export const sourceMeta: Record<ActivitySource, { label: string; color: string }> = {
  gmail: { label: "Gmail", color: "#ea4335" },
  "google-drive": { label: "Drive", color: "#1fa463" },
  github: { label: "GitHub", color: "#6e40c9" },
  telegram: { label: "Telegram", color: "#2aabee" },
  ai: { label: "IA", color: "#2383e2" },
  system: { label: "Sistema", color: "#6b7280" },
};
