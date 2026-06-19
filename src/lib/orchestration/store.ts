"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrchRun, OrchStage, OrchLogEntry, OrchStatus } from "@/lib/orchestration/areas";

interface OrchState {
  runs: OrchRun[];
  create: (input: Pick<OrchRun, "title" | "request" | "areas" | "constraints" | "language">) => string;
  remove: (id: string) => void;
  clear: () => void;
  patch: (id: string, patch: Partial<OrchRun>) => void;
  setArtifact: (id: string, stage: OrchStage, content: string) => void;
  pushLog: (id: string, entry: Omit<OrchLogEntry, "ts">) => void;
  setStatus: (id: string, status: OrchStatus, stage?: OrchStage) => void;
}

const CAP = 40;

export const useOrchestration = create<OrchState>()(
  persist(
    (set) => ({
      runs: [],
      create: (input) => {
        const id = Math.random().toString(36).slice(2, 10);
        const now = Date.now();
        const run: OrchRun = {
          id,
          ...input,
          status: "draft",
          artifacts: {},
          log: [],
          iterations: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ runs: [run, ...s.runs].slice(0, CAP) }));
        return id;
      },
      remove: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
      clear: () => set({ runs: [] }),
      patch: (id, patch) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)),
        })),
      setArtifact: (id, stage, content) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === id ? { ...r, artifacts: { ...r.artifacts, [stage]: content }, updatedAt: Date.now() } : r
          ),
        })),
      pushLog: (id, entry) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === id ? { ...r, log: [...r.log, { ...entry, ts: Date.now() }].slice(-50), updatedAt: Date.now() } : r
          ),
        })),
      setStatus: (id, status, stage) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === id ? { ...r, status, currentStage: stage, updatedAt: Date.now() } : r)),
        })),
    }),
    { name: "zero-agency-orchestration" }
  )
);
