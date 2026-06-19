"use client";

import { Flame, Trophy, Lock, Sparkles, Zap } from "lucide-react";
import {
  useProgress,
  levelFromXp,
  rankFor,
  RANKS,
  ACHIEVEMENTS,
  XP,
} from "@/lib/gamification/progress";
import { XpRing } from "@/components/gamification/XpRing";

export default function ProgresoPage() {
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak);
  const bestStreak = useProgress((s) => s.bestStreak);
  const unlocked = useProgress((s) => s.unlocked);
  const info = levelFromXp(xp);
  const nextRank = RANKS.find((r) => r.min > info.level);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      {/* Héroe inmersivo */}
      <div className="hero-sheen zero-rise relative mb-5 overflow-hidden rounded-3xl border p-6 sm:p-8" >
        <span className="hero-aura" aria-hidden />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
          <XpRing pct={info.pct} size={132} stroke={9} glow>
            <div className="text-center leading-none">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Nivel</div>
              <div className="text-4xl font-black text-ink">{info.level}</div>
            </div>
          </XpRing>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full glass-chip px-2.5 py-1 text-[11px] font-semibold text-accent">
              <Sparkles size={12} /> {rankFor(info.level)}
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              <span className="brand-text">{xp.toLocaleString("es-CO")}</span> XP de conciencia
            </h1>
            <p className="mt-1 text-sm text-muted">
              {info.into}/{info.span} XP para el nivel {info.level + 1}
              {nextRank ? <> · próximo rango “{nextRank.title}” en el nivel {nextRank.min}</> : <> · rango máximo alcanzado</>}
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-bg-subtle">
              <div className="xp-bar h-full rounded-full brand-gradient" style={{ width: `${Math.round(info.pct * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Racha + resumen */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Flame size={18} className={streak >= 3 ? "streak-flicker text-orange-500" : "text-orange-500"} />}
          label="Racha actual"
          value={`${streak} día${streak === 1 ? "" : "s"}`}
          sub={`Mejor: ${bestStreak}`}
        />
        <Stat icon={<Trophy size={18} className="text-amber-500" />} label="Logros" value={`${unlocked.length}/${ACHIEVEMENTS.length}`} sub="desbloqueados" />
        <Stat icon={<Zap size={18} className="text-accent" />} label="Rango" value={rankFor(info.level)} sub={`Nivel ${info.level}`} />
      </div>

      {/* Cómo ganas XP */}
      <div className="mb-5 rounded-2xl border glass-card p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Cómo ganas XP</div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <XpRow amount={XP.run} label="Cada orden al agente (Asistente / voz / autonomía)" />
          <XpRow amount={XP.report} label="Cada reporte generado" />
          <XpRow amount={XP.orchestration} label="Cada orquestación completada" />
          <XpRow amount={XP.day} label="Cada día activo (mantiene la racha)" />
          <XpRow amount={XP.integrated} label="Cada elemento integrado por la IA" />
        </div>
      </div>

      {/* Logros */}
      <div className="rounded-2xl border glass-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Trophy size={16} className="text-amber-500" /> Logros
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const has = unlocked.includes(a.id);
            return (
              <div
                key={a.id}
                className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 transition ${
                  has ? "glass-inset hover-lift" : "border-dashed opacity-60"
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg ${has ? "brand-gradient" : "bg-bg-subtle grayscale"}`}>
                  {has ? a.icon : <Lock size={14} className="text-muted" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-ink">{a.label}</div>
                  <div className="truncate text-[11px] text-muted">{a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border glass-card p-4 hover-lift">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        {icon} {label}
      </div>
      <div className="mt-1.5 text-2xl font-black text-ink">{value}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}

function XpRow({ amount, label }: { amount: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg glass-inset px-2.5 py-1.5">
      <span className="shrink-0 rounded-md brand-gradient px-1.5 py-0.5 text-[11px] font-bold text-white">+{amount}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}
