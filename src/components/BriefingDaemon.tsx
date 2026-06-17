"use client";

import { useEffect } from "react";
import { useScheduledBriefing, runScheduledBriefing } from "@/lib/briefing";

// Demonio headless del briefing programado: revisa cada minuto si toca enviarlo.
export function BriefingDaemon() {
  const enabled = useScheduledBriefing((s) => s.enabled);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => void runScheduledBriefing();
    const t = setInterval(tick, 60_000);
    const kick = setTimeout(tick, 12_000);
    return () => {
      clearInterval(t);
      clearTimeout(kick);
    };
  }, [enabled]);

  return null;
}
