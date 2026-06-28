"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ensureIdentity, signMessage, capabilityFor, agentDid, runFingerprint, useIdentity } from "@/lib/identity";

// Historial de ejecuciones del agente (gestión agéntica / trazabilidad):
// cada vez que ZERO actúa se registra el prompt, las herramientas usadas y el
// resultado. Da observabilidad y auditoría sobre lo que hace el agente.
// Además cada acción se FIRMA con la identidad del dispositivo (did:jwk) con su
// cadena de delegación humano → agente, para poder probar quién hizo qué.

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
  // Identidad / auditoría firmada (se rellena tras crear el run).
  capability?: string; // capacidad ANS-style (p. ej. autonomy.act)
  signerDid?: string; // did:jwk del agente que firma (#capacidad)
  delegatedBy?: string; // humano que delega (cabeza de la cadena)
  sig?: string; // firma base64url de la huella del run
}

const CAP = 80;

interface RunsState {
  runs: AgentRun[];
  push: (r: Omit<AgentRun, "id" | "ts">) => void;
  patch: (id: string, patch: Partial<AgentRun>) => void;
  clear: () => void;
}

export const useRuns = create<RunsState>()(
  persist(
    (set) => ({
      runs: [],
      push: (r) => {
        const id = Math.random().toString(36).slice(2, 10);
        const ts = Date.now();
        set((s) => ({ runs: [{ ...r, id, ts }, ...s.runs].slice(0, CAP) }));
        void sealRun(id, { ...r, id, ts });
      },
      patch: (id, patch) =>
        set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      clear: () => set({ runs: [] }),
    }),
    { name: "zero-agency-runs" }
  )
);

/** Firma una acción del agente con la identidad del dispositivo (best-effort). */
async function sealRun(id: string, run: AgentRun): Promise<void> {
  try {
    const did = await ensureIdentity();
    const capability = capabilityFor(run.source);
    const signerDid = agentDid(did, capability);
    const delegatedBy = useIdentity.getState().ownerLabel || "Titular del dispositivo";
    const sig = await signMessage(
      runFingerprint({ source: run.source, capability, prompt: run.prompt, text: run.text, ok: run.ok, ts: run.ts, delegatedBy, signerDid })
    );
    useRuns.getState().patch(id, { capability, signerDid, delegatedBy, sig });
  } catch {
    /* sin WebCrypto/identidad: el run queda sin firmar, pero registrado */
  }
}
