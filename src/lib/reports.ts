"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { runAgent } from "@/lib/ai/agent";
import { useAi } from "@/lib/ai/store";
import { useActivity } from "@/lib/activity";

// Reportes periódicos del estado general de la agencia, generados por ZERO con
// todas las señales (anticipación, analítica, SEO, sitio, correo, GitHub).

export type Period = "daily" | "weekly" | "monthly";

export const PERIODS: { id: Period; label: string; icon: string }[] = [
  { id: "daily", label: "Diario", icon: "☀️" },
  { id: "weekly", label: "Semanal", icon: "📊" },
  { id: "monthly", label: "Mensual", icon: "🗓️" },
];

export interface Report {
  id: string;
  period: Period;
  title: string;
  content: string;
  ts: number;
}

const PROMPTS: Record<Period, string> = {
  daily: `Genera el REPORTE DIARIO del estado de la agencia. Usa anticipate (prioridades),
site_status, seo_status si hay datos, y revisa correos no leídos/urgentes y eventos de hoy.
Estructura en secciones claras: "Resumen", "Prioridades del día", "Riesgos/alertas", "Métricas clave".
Conciso y accionable. No inventes datos; omite lo que no esté disponible.`,
  weekly: `Genera el REPORTE SEMANAL del estado de la agencia. Usa analyze_agency, anticipate,
site_status (uptime de la semana), seo_status (clics/impresiones), y github_overview/github_commits.
Estructura: "Resumen ejecutivo", "Logros de la semana", "Pendientes", "Métricas (correo, SEO, sitio, repos)",
"Recomendaciones para la próxima semana". No inventes datos.`,
  monthly: `Genera el REPORTE MENSUAL (visión estratégica) del estado de la agencia. Usa analyze_agency,
seo_status (tendencia del mes), site_status (uptime), el estado de clientes/leads desde Gmail y la salud
de proyectos en GitHub. Estructura: "Resumen del mes", "KPIs", "Tendencias", "Riesgos y oportunidades",
"Plan del próximo mes". Estratégico pero conciso. No inventes datos.`,
};

interface ReportsState {
  reports: Report[];
  lastGenerated: Partial<Record<Period, string>>; // clave de periodo ya generado
  add: (r: Report) => void;
  remove: (id: string) => void;
  clear: () => void;
  markGenerated: (period: Period, key: string) => void;
}

const CAP = 60;

export const useReports = create<ReportsState>()(
  persist(
    (set) => ({
      reports: [],
      lastGenerated: {},
      add: (r) => set((s) => ({ reports: [r, ...s.reports].slice(0, CAP) })),
      remove: (id) => set((s) => ({ reports: s.reports.filter((x) => x.id !== id) })),
      clear: () => set({ reports: [] }),
      markGenerated: (period, key) => set((s) => ({ lastGenerated: { ...s.lastGenerated, [period]: key } })),
    }),
    { name: "zero-agency-reports" }
  )
);

// ── Claves de periodo (para no duplicar) ─────────────────────
function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function periodKey(period: Period, d = new Date()): string {
  if (period === "daily") return d.toISOString().slice(0, 10);
  if (period === "weekly") return isoWeek(d);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function titleFor(period: Period, d = new Date()): string {
  const label = PERIODS.find((p) => p.id === period)!.label;
  return `Reporte ${label} · ${d.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}`;
}

let running = false;

/** Genera un reporte del periodo indicado con el agente y lo guarda. */
export async function generateReport(period: Period): Promise<Report | null> {
  if (running) return null;
  if (!useAi.getState().apiKey) throw new Error("Falta la API key de Gemini (Conectores → Asistente IA).");
  running = true;
  try {
    const res = await runAgent(PROMPTS[period], [], undefined, `reporte ${period}`);
    const report: Report = {
      id: Math.random().toString(36).slice(2, 10),
      period,
      title: titleFor(period),
      content: res.text,
      ts: Date.now(),
    };
    useReports.getState().add(report);
    useReports.getState().markGenerated(period, periodKey(period));
    useActivity.getState().push({ source: "ai", kind: "sync", label: `Reporte ${period} generado`, count: 0 });
    return report;
  } finally {
    running = false;
  }
}

/** Autogeneración: genera el reporte del periodo si aún no se hizo en este ciclo. */
export async function runDueReports(): Promise<void> {
  if (!useAi.getState().apiKey) return;
  const now = new Date();
  const st = useReports.getState();
  // Diario a partir de las 7; semanal los lunes; mensual el día 1. Idempotente por clave.
  const due: Period[] = [];
  if (now.getHours() >= 7 && st.lastGenerated.daily !== periodKey("daily")) due.push("daily");
  if (now.getDay() === 1 && st.lastGenerated.weekly !== periodKey("weekly")) due.push("weekly");
  if (now.getDate() === 1 && st.lastGenerated.monthly !== periodKey("monthly")) due.push("monthly");
  for (const p of due) {
    try {
      await generateReport(p);
    } catch {
      /* reintenta en el próximo ciclo */
    }
  }
}
