"use client";

import { useEffect } from "react";
import { useRuns } from "@/lib/ai/runs";
import { useActivity } from "@/lib/activity";
import { useReports } from "@/lib/reports";
import { useOrchestration } from "@/lib/orchestration/store";
import { useProgress } from "@/lib/gamification/progress";

// Demonio de progreso: reconcilia la XP a partir de los contadores reales del
// OS (agente, integración, reportes, orquestación) y actualiza la racha diaria.
// Barato: corre al montar y cada pocos segundos.
export function ProgressDaemon() {
  useEffect(() => {
    const tick = () => {
      const counts = {
        runs: useRuns.getState().runs.length,
        integrated: useActivity.getState().integrated,
        reports: useReports.getState().reports.length,
        orchestrations: useOrchestration.getState().runs.filter((r) => r.status === "done").length,
      };
      useProgress.getState().reconcile(counts);
    };
    useProgress.getState().touchStreak();
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, []);

  return null;
}
