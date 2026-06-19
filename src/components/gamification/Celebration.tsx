"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@/lib/gamification/progress";

// Momento inmersivo (rápido) al subir de nivel o desbloquear un logro.
// Auto-descarta; respeta reduced-motion (entonces es un toast sobrio).
export function Celebration() {
  const celebrations = useProgress((s) => s.celebrations);
  const dismiss = useProgress((s) => s.dismissCelebration);
  const current = celebrations[0];
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!current) return;
    setLeaving(false);
    // Haptic sutil en móvil.
    try {
      navigator.vibrate?.(current.kind === "level" ? [18, 40, 18] : 14);
    } catch {
      /* sin soporte */
    }
    const out = setTimeout(() => setLeaving(true), 2400);
    const gone = setTimeout(() => dismiss(), 2750);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, [current, dismiss]);

  if (!current) return null;
  const isLevel = current.kind === "level";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div
        className={`celebrate-card pointer-events-auto flex items-center gap-3 rounded-2xl border glass-pop px-4 py-3 ${
          leaving ? "celebrate-out" : "celebrate-in"
        }`}
        onClick={() => dismiss()}
        role="status"
      >
        {isLevel && <span className="celebrate-aura" aria-hidden />}
        <span className={`celebrate-badge grid h-11 w-11 place-items-center rounded-xl text-xl ${isLevel ? "brand-gradient text-white" : "glass-inset"}`}>
          {current.icon}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            {isLevel ? "Subiste de nivel" : "Logro desbloqueado"}
          </div>
          <div className="truncate text-sm font-bold text-ink">{current.title}</div>
          <div className="truncate text-xs text-muted">{current.subtitle}</div>
        </div>
      </div>
    </div>
  );
}
