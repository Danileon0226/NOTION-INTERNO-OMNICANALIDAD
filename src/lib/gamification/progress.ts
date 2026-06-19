"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Capa de gamificación de ZERO OS: la "conciencia" sube de nivel con el uso.
// XP derivada de señales reales (agente, integración, reportes, orquestación,
// racha diaria). Todo client-side y sin backend.

// ── Niveles y rangos ─────────────────────────────────────────
export interface LevelInfo {
  level: number;
  into: number; // XP dentro del nivel actual
  span: number; // XP que cuesta el nivel actual
  floor: number; // XP acumulada al inicio del nivel
  pct: number; // progreso 0-1 dentro del nivel
}

/** Curva escalonada: cada nivel cuesta ~35% más que el anterior. */
export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let need = 120;
  let acc = 0;
  while (xp >= acc + need) {
    acc += need;
    level += 1;
    need = Math.round(need * 1.35);
  }
  const into = xp - acc;
  return { level, into, span: need, floor: acc, pct: Math.max(0, Math.min(1, into / need)) };
}

export const RANKS: { min: number; title: string }[] = [
  { min: 1, title: "Iniciado" },
  { min: 3, title: "Operador" },
  { min: 6, title: "Estratega" },
  { min: 10, title: "Arquitecto" },
  { min: 15, title: "Visionario" },
  { min: 22, title: "Conciencia" },
];

export function rankFor(level: number): string {
  let title = RANKS[0].title;
  for (const r of RANKS) if (level >= r.min) title = r.title;
  return title;
}

// ── Recompensas de XP por señal ──────────────────────────────
export const XP = {
  run: 12, // comando al agente
  integrated: 2, // elemento integrado por la IA
  report: 40, // reporte generado
  orchestration: 60, // orquestación completada
  day: 25, // nuevo día activo (racha)
  welcome: 40, // bienvenida (una vez)
};

// ── Logros ───────────────────────────────────────────────────
export interface AchievementCtx {
  runs: number;
  integrated: number;
  reports: number;
  orchestrations: number;
  level: number;
  streak: number;
}
export interface Achievement {
  id: string;
  label: string;
  desc: string;
  icon: string;
  test: (c: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_run", label: "Primer impulso", desc: "Diste tu primera orden al agente", icon: "⚡", test: (c) => c.runs >= 1 },
  { id: "runs_25", label: "En racha", desc: "25 órdenes al agente", icon: "🚀", test: (c) => c.runs >= 25 },
  { id: "runs_100", label: "Piloto experto", desc: "100 órdenes al agente", icon: "🛸", test: (c) => c.runs >= 100 },
  { id: "triage_100", label: "Bandeja domada", desc: "100 elementos integrados", icon: "📥", test: (c) => c.integrated >= 100 },
  { id: "report_1", label: "Primer informe", desc: "Generaste tu primer reporte", icon: "📊", test: (c) => c.reports >= 1 },
  { id: "report_10", label: "Analista", desc: "10 reportes generados", icon: "📈", test: (c) => c.reports >= 10 },
  { id: "orch_1", label: "Orquestador", desc: "Completaste una orquestación", icon: "🎼", test: (c) => c.orchestrations >= 1 },
  { id: "orch_10", label: "Director técnico", desc: "10 orquestaciones", icon: "🏗️", test: (c) => c.orchestrations >= 10 },
  { id: "streak_3", label: "Constancia", desc: "Racha de 3 días", icon: "🔥", test: (c) => c.streak >= 3 },
  { id: "streak_7", label: "Semana perfecta", desc: "Racha de 7 días", icon: "🌟", test: (c) => c.streak >= 7 },
  { id: "streak_30", label: "Imparable", desc: "Racha de 30 días", icon: "💎", test: (c) => c.streak >= 30 },
  { id: "level_5", label: "Estratega", desc: "Alcanzaste el nivel 5", icon: "🧠", test: (c) => c.level >= 5 },
  { id: "level_10", label: "Arquitecto", desc: "Alcanzaste el nivel 10", icon: "👑", test: (c) => c.level >= 10 },
];

// ── Celebraciones (cola de momentos inmersivos) ──────────────
export interface Celebration {
  id: string;
  kind: "level" | "achievement";
  title: string;
  subtitle: string;
  icon: string;
}

// ── Estado persistido ────────────────────────────────────────
interface Counts {
  runs: number;
  integrated: number;
  reports: number;
  orchestrations: number;
}

interface ProgressState {
  xp: number;
  unlocked: string[]; // ids de logros
  streak: number;
  bestStreak: number;
  lastDay: string; // YYYY-MM-DD local
  seen: Counts; // baseline para calcular deltas
  welcomed: boolean;
  celebrations: Celebration[];

  award: (amount: number) => void;
  reconcile: (counts: Counts) => void;
  reconcileAchievements: () => void;
  touchStreak: () => void;
  dismissCelebration: () => void;
}

function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${String(d.getDate()).padStart(2, "0")}`;
}

function pushCelebration(list: Celebration[], c: Omit<Celebration, "id">): Celebration[] {
  return [...list, { ...c, id: Math.random().toString(36).slice(2) }].slice(-8);
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      xp: 0,
      unlocked: [],
      streak: 0,
      bestStreak: 0,
      lastDay: "",
      seen: { runs: 0, integrated: 0, reports: 0, orchestrations: 0 },
      welcomed: false,
      celebrations: [],

      award: (amount) => {
        if (amount <= 0) return;
        const before = levelFromXp(get().xp).level;
        const xp = get().xp + amount;
        const after = levelFromXp(xp).level;
        set((s) => ({
          xp,
          celebrations:
            after > before
              ? pushCelebration(s.celebrations, {
                  kind: "level",
                  title: `Nivel ${after}`,
                  subtitle: rankFor(after),
                  icon: "✦",
                })
              : s.celebrations,
        }));
        get().reconcileAchievements();
      },

      reconcile: (counts) => {
        const s = get();
        // Primera vez: fija baseline sin XP retroactiva (excepto bienvenida).
        if (!s.welcomed) {
          set({ seen: { ...counts }, welcomed: true });
          get().award(XP.welcome);
          return;
        }
        const d =
          Math.max(0, counts.runs - s.seen.runs) * XP.run +
          Math.max(0, counts.integrated - s.seen.integrated) * XP.integrated +
          Math.max(0, counts.reports - s.seen.reports) * XP.report +
          Math.max(0, counts.orchestrations - s.seen.orchestrations) * XP.orchestration;
        set({ seen: { ...counts } });
        if (d > 0) get().award(d);
        else get().reconcileAchievements();
      },

      // Interno: desbloquea logros nuevos según el contexto actual.
      reconcileAchievements: () => {
        const s = get();
        const ctx: AchievementCtx = {
          runs: s.seen.runs,
          integrated: s.seen.integrated,
          reports: s.seen.reports,
          orchestrations: s.seen.orchestrations,
          level: levelFromXp(s.xp).level,
          streak: s.streak,
        };
        const fresh = ACHIEVEMENTS.filter((a) => !s.unlocked.includes(a.id) && a.test(ctx));
        if (!fresh.length) return;
        set((st) => ({
          unlocked: [...st.unlocked, ...fresh.map((a) => a.id)],
          celebrations: fresh.reduce(
            (acc, a) => pushCelebration(acc, { kind: "achievement", title: a.label, subtitle: a.desc, icon: a.icon }),
            st.celebrations
          ),
        }));
      },

      touchStreak: () => {
        const today = localDay();
        const s = get();
        if (s.lastDay === today) return;
        const yesterday = localDay(new Date(Date.now() - 86_400_000));
        const streak = s.lastDay === yesterday ? s.streak + 1 : 1;
        set({ streak, bestStreak: Math.max(s.bestStreak, streak), lastDay: today });
        // Día activo: XP solo si ya hubo bienvenida (evita doble premio el día 1).
        if (s.welcomed) get().award(XP.day);
        else get().reconcileAchievements();
      },

      dismissCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
    } as ProgressState),
    {
      name: "zero-agency-progress",
      partialize: (s) => ({
        xp: s.xp,
        unlocked: s.unlocked,
        streak: s.streak,
        bestStreak: s.bestStreak,
        lastDay: s.lastDay,
        seen: s.seen,
        welcomed: s.welcomed,
      }),
    }
  )
);
