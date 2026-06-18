"use client";

import { useEffect } from "react";
import { runDueReports } from "@/lib/reports";

// Demonio headless: revisa cada 5 min si toca generar el reporte diario/semanal/
// mensual (idempotente por periodo). Corre mientras haya una pestaña abierta.
export function ReportsDaemon() {
  useEffect(() => {
    const tick = () => void runDueReports();
    const kick = setTimeout(tick, 20_000);
    const t = setInterval(tick, 5 * 60_000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, []);
  return null;
}
