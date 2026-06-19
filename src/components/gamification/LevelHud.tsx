"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useProgress, levelFromXp, rankFor } from "@/lib/gamification/progress";
import { XpRing } from "@/components/gamification/XpRing";

// HUD compacto de nivel para la barra lateral: anillo de XP + rango + racha.
export function LevelHud() {
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak);
  const info = levelFromXp(xp);

  return (
    <Link
      href="/progreso"
      className="group mx-2 mb-1 flex items-center gap-2.5 rounded-xl border glass-card px-2.5 py-2 hover-lift"
      title={`Nivel ${info.level} · ${rankFor(info.level)} · ${info.into}/${info.span} XP`}
    >
      <XpRing pct={info.pct} size={38} stroke={4}>
        <span className="text-[11px] font-bold text-ink">{info.level}</span>
      </XpRing>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-xs font-semibold text-ink">{rankFor(info.level)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
          <span className="brand-text font-semibold">{info.into}</span>/{info.span} XP
        </div>
      </div>
      {streak > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-orange-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-orange-500">
          <Flame size={11} className={streak >= 3 ? "streak-flicker" : ""} /> {streak}
        </span>
      )}
    </Link>
  );
}

/** Chip compacto de nivel para la barra superior móvil. */
export function LevelChip() {
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak);
  const info = levelFromXp(xp);
  return (
    <Link href="/progreso" className="flex items-center gap-1 rounded-full glass-chip px-1 py-0.5" title={`Nivel ${info.level} · ${rankFor(info.level)}`}>
      <XpRing pct={info.pct} size={22} stroke={3}>
        <span className="text-[9px] font-bold text-ink">{info.level}</span>
      </XpRing>
      {streak > 0 && (
        <span className="flex items-center gap-0.5 pr-1 text-[10px] font-semibold text-orange-500">
          <Flame size={10} className={streak >= 3 ? "streak-flicker" : ""} />
          {streak}
        </span>
      )}
    </Link>
  );
}
