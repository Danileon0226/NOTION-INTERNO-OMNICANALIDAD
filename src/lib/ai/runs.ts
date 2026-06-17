"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Historial de ejecuciones del agente (gestión agéntica / trazabilidad):
// cada vez que ZERO actúa se registra el prompt, las herramientas usadas y el
// resultado. Da observabilidad y auditoría sobre lo que hace el agente.

export interface RunStep {
  tool: string;
  args: unknown;
}

export interface AgentRun {
  id: string;
  ts: number;
  source: string; // copiloto, voz, anticipación, autonomía, rutina…
  prompt: string;
  steps: RunStep[];
  text: string;
  ok: boolean;
  ms: number;
}

const CAP = 80;

interface RunsState {
  runs: AgentRun[];
  push: (r: Omit<AgentRun, "id" | "ts">) => void;
  clear: () => void;
}

export const useRuns = create<RunsState>()(
  persist(
    (set) => ({
      runs: [],
      push: (r) =>
        set((s) => ({
          runs: [{ ...r, id: Math.random().toString(36).slice(2, 10), ts: Date.now() }, ...s.runs].slice(0, CAP),
        })),
      clear: () => set({ runs: [] }),
    }),
    { name: "zero-agency-runs" }
  )
);
