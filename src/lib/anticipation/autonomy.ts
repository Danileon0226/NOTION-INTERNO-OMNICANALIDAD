"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveAnticipations } from "@/lib/anticipation/engine";
import { useAnticipation } from "@/lib/anticipation/store";
import { useAi } from "@/lib/ai/store";
import { useActivity } from "@/lib/activity";
import { runAgent } from "@/lib/ai/agent";

// Nivel "Autónomo" del modelo de madurez: ZERO actúa solo, con guardrails.
// El maestro de autonomía PROMUEVE a ejecución las anticipaciones suggest/auto
// por encima del umbral de confianza, respetando opt-out, cooldown y topes.

export interface AutoAction {
  id: string;
  ts: number;
  key: string;
  type: string;
  title: string;
  ok: boolean;
  result: string;
}

interface AutonomyState {
  active: boolean; // interruptor maestro de autonomía total
  intervalMin: number; // cadencia del ciclo
  autoConfidence: number; // guardrail: confianza mínima para actuar
  maxPerCycle: number; // guardrail: tope de acciones por ciclo
  cooldownMin: number; // guardrail: enfriamiento por anticipación
  lastRunAt: number;
  lastActed: Record<string, number>;
  log: AutoAction[];

  setActive: (b: boolean) => void;
  patch: (p: Partial<Pick<AutonomyState, "intervalMin" | "autoConfidence" | "maxPerCycle" | "cooldownMin">>) => void;
  canAct: (key: string) => boolean;
  markActed: (key: string) => void;
  pushLog: (a: AutoAction) => void;
  setLastRun: (ts: number) => void;
  clearLog: () => void;
}

const LOG_CAP = 60;

export const useAutonomy = create<AutonomyState>()(
  persist(
    (set, get) => ({
      active: false,
      intervalMin: 15,
      autoConfidence: 0.8,
      maxPerCycle: 2,
      cooldownMin: 180,
      lastRunAt: 0,
      lastActed: {},
      log: [],

      setActive: (active) => set({ active }),
      patch: (p) => set(p),
      canAct: (key) => (get().lastActed[key] ?? 0) < Date.now() - get().cooldownMin * 60_000,
      markActed: (key) => set((s) => ({ lastActed: { ...s.lastActed, [key]: Date.now() } })),
      pushLog: (a) => set((s) => ({ log: [a, ...s.log].slice(0, LOG_CAP) })),
      setLastRun: (lastRunAt) => set({ lastRunAt }),
      clearLog: () => set({ log: [], lastActed: {} }),
    }),
    { name: "zero-agency-autonomy" }
  )
);

// Evita ciclos solapados (el demonio puede dispararse desde varios sitios).
let cycleRunning = false;

/**
 * Un ciclo autónomo: anticipa → filtra por guardrails → ejecuta con el agente
 * → registra resultado y feedback. Acciones reversibles (notas, resúmenes,
 * alertas); nada destructivo. Devuelve cuántas acciones ejecutó.
 */
export async function runAutonomyCycle(): Promise<number> {
  if (cycleRunning) return 0;
  const aut = useAutonomy.getState();
  const ant = useAnticipation.getState();
  if (!aut.active || !ant.enabled) return 0;
  // Sin API key no hay agente: no insistimos (evita ruido de errores).
  if (!useAi.getState().apiKey) return 0;

  cycleRunning = true;
  let acted = 0;
  try {
    const res = await resolveAnticipations();
    const candidates = res.visible
      .filter((a) => a.suggestPrompt && a.confidence >= aut.autoConfidence)
      .sort((a, b) => b.confidence - a.confidence);

    for (const a of candidates) {
      if (acted >= aut.maxPerCycle) break;
      if (!useAutonomy.getState().canAct(a.key)) continue;
      useAutonomy.getState().markActed(a.key);
      useActivity.getState().push({
        source: "ai",
        kind: "info",
        label: `Autonomía: ZERO actúa sobre "${a.title}"`,
        count: 0,
      });
      try {
        const r = await runAgent(a.suggestPrompt!, [], undefined, "autonomía");
        ant.recordFeedback(a.key, a.type, "accepted");
        useAutonomy.getState().pushLog({
          id: a.explainId || Math.random().toString(36).slice(2),
          ts: Date.now(),
          key: a.key,
          type: a.type,
          title: a.title,
          ok: true,
          result: r.text.slice(0, 600),
        });
      } catch (e) {
        useAutonomy.getState().pushLog({
          id: Math.random().toString(36).slice(2),
          ts: Date.now(),
          key: a.key,
          type: a.type,
          title: a.title,
          ok: false,
          result: (e as Error).message,
        });
      }
      acted += 1;
    }
    useAutonomy.getState().setLastRun(Date.now());
  } finally {
    cycleRunning = false;
  }
  return acted;
}

/** Activa la autonomía TOTAL: opt-in, modo auto global e interruptor maestro. */
export function activateTotalAutonomy() {
  useAnticipation.getState().setEnabled(true);
  useAnticipation.getState().setDefaultMode("auto");
  useAutonomy.getState().setActive(true);
}
