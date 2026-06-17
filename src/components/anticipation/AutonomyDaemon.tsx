"use client";

import { useEffect } from "react";
import { useAutonomy, runAutonomyCycle } from "@/lib/anticipation/autonomy";

// Demonio headless: cuando la autonomía está activa, ejecuta un ciclo al
// arrancar y luego cada `intervalMin`. Montado una vez en el AppShell.
export function AutonomyDaemon() {
  const active = useAutonomy((s) => s.active);
  const intervalMin = useAutonomy((s) => s.intervalMin);

  useEffect(() => {
    if (!active) return;
    // Pequeño retardo inicial para no competir con la hidratación.
    const kick = setTimeout(() => {
      void runAutonomyCycle();
    }, 8000);
    const t = setInterval(() => {
      void runAutonomyCycle();
    }, Math.max(2, intervalMin) * 60_000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [active, intervalMin]);

  return null;
}
