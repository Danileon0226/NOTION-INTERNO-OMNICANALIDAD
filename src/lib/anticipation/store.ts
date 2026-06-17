"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Escalera de confianza del blueprint: shadow (mide, no actúa) →
// suggest (propone al humano) → auto (actúa con guardrails).
export type TrustMode = "shadow" | "suggest" | "auto";

export type FeedbackValue = "accepted" | "dismissed";

export interface Decision {
  key: string;
  type: string;
  value: FeedbackValue;
  ts: number;
}

export interface AuditEntry {
  explainId: string;
  ts: number;
  type: string;
  title: string;
  reason: string;
  confidence: number;
  mode: TrustMode;
}

const SNOOZE_MS = 12 * 60 * 60 * 1000; // descartar = posponer 12 h
const AUDIT_CAP = 60;
const DECISIONS_CAP = 200;

interface AnticipationState {
  /** Opt-out de gobernanza: el cliente puede apagar el aprendizaje/anticipación. */
  enabled: boolean;
  /** Posición global en la escalera de confianza. */
  defaultMode: TrustMode;
  /** Override por tipo de capacidad. */
  modeByType: Record<string, TrustMode>;
  /** Tipos pospuestos (descartados) hasta cierto timestamp. */
  snooze: Record<string, number>;
  /** Registro de decisiones (métricas: acceptance_rate). */
  decisions: Decision[];
  /** Auditoría/explicabilidad de lo emitido. */
  audit: AuditEntry[];

  setEnabled: (b: boolean) => void;
  setDefaultMode: (m: TrustMode) => void;
  setModeForType: (type: string, m: TrustMode | null) => void;
  modeFor: (type: string) => TrustMode;
  isSnoozed: (type: string) => boolean;
  recordFeedback: (key: string, type: string, value: FeedbackValue) => void;
  logAudit: (e: AuditEntry) => void;
  resetMemory: () => void;
}

export const useAnticipation = create<AnticipationState>()(
  persist(
    (set, get) => ({
      enabled: true,
      defaultMode: "suggest",
      modeByType: {},
      snooze: {},
      decisions: [],
      audit: [],

      setEnabled: (enabled) => set({ enabled }),
      setDefaultMode: (defaultMode) => set({ defaultMode }),
      setModeForType: (type, m) =>
        set((s) => {
          const modeByType = { ...s.modeByType };
          if (m === null) delete modeByType[type];
          else modeByType[type] = m;
          return { modeByType };
        }),

      modeFor: (type) => get().modeByType[type] ?? get().defaultMode,
      isSnoozed: (type) => (get().snooze[type] ?? 0) > Date.now(),

      recordFeedback: (key, type, value) =>
        set((s) => ({
          decisions: [{ key, type, value, ts: Date.now() }, ...s.decisions].slice(0, DECISIONS_CAP),
          snooze: value === "dismissed" ? { ...s.snooze, [type]: Date.now() + SNOOZE_MS } : s.snooze,
        })),

      logAudit: (e) => set((s) => ({ audit: [e, ...s.audit].slice(0, AUDIT_CAP) })),

      resetMemory: () => set({ snooze: {}, decisions: [], audit: [] }),
    }),
    { name: "zero-agency-anticipation" }
  )
);

/** acceptance_rate y demás métricas a partir de las decisiones registradas. */
export function anticipationMetrics(decisions: Decision[]) {
  const total = decisions.length;
  const accepted = decisions.filter((d) => d.value === "accepted").length;
  const dismissed = total - accepted;
  return {
    total,
    accepted,
    dismissed,
    acceptanceRate: total ? accepted / total : 0,
  };
}
