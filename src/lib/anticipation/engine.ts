"use client";

// Motor de Anticipación — Nivel 1 (reglas deterministas, explicables).
// Lee SEÑALES REALES de los conectores conectados y produce "Next Best Actions"
// con confianza, lead-time y la señal que las justifica (explicabilidad).
// Mono-tenant y 100% local: los datos no salen del navegador (gobernanza).

import type { ActivitySource } from "@/lib/activity";
import {
  useConnectors,
  googleTokenValid,
  GMAIL_SCOPE,
  CALENDAR_SCOPE,
  DRIVE_SCOPE,
} from "@/lib/connectors/store";
import { gmailSearch, calendarEvents } from "@/lib/connectors/google";
import { ghFetchAll } from "@/lib/connectors/github";
import { useWorkspace } from "@/lib/store";
import { useMonitor, statusOf, latest, avgLatency, uptime } from "@/lib/monitor/store";
import { useAnticipation, typeCalibration, type TrustMode } from "@/lib/anticipation/store";

export interface Anticipation {
  /** Clave estable por capacidad (para feedback/snooze). */
  key: string;
  /** Tipo de capacidad (catálogo del blueprint). */
  type: string;
  title: string;
  /** La señal que la originó (explicabilidad). */
  reason: string;
  /** 0..1 */
  confidence: number;
  /** Lead-time humano, p. ej. "en 6 h". */
  leadTime?: string;
  source: ActivitySource;
  /** Prompt accionable para que ZERO lo ejecute. */
  suggestPrompt?: string;
  /** Asignado al resolver. */
  mode?: TrustMode;
  explainId?: string;
}

export interface Signals {
  gmail?: { unread: number; finance: number; security: number; leads: number };
  calendar?: { soon: { summary: string; inHours: number }[] };
  github?: { openPRs: number; openIssues: number };
  workspace: { openTodos: number };
  site?: {
    down: { label: string; url: string }[];
    slow: { label: string; url: string; ms: number }[];
    degraded: { label: string; url: string; up: number }[];
  };
  missing: string[]; // conectores sin conectar (cold-start)
}

function hoursUntil(iso?: string): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms / 3_600_000;
}

/** Recolecta señales reales en paralelo; cada fuente falla de forma aislada. */
export async function gatherSignals(): Promise<Signals> {
  const c = useConnectors.getState();
  const g = c.google;
  const missing: string[] = [];

  const gmailOk = googleTokenValid(g, GMAIL_SCOPE);
  const calOk = googleTokenValid(g, CALENDAR_SCOPE);
  const driveOk = googleTokenValid(g, DRIVE_SCOPE);
  const ghOk = !!c.github.account || !!c.github.token;
  const tgOk = !!c.telegram.botToken;
  if (!gmailOk) missing.push("Gmail");
  if (!calOk) missing.push("Google Calendar");
  if (!driveOk) missing.push("Google Drive");
  if (!ghOk) missing.push("GitHub");
  if (!tgOk) missing.push("Telegram");

  const pages = useWorkspace.getState().pages;
  const openTodos = pages.reduce(
    (n, p) => n + p.blocks.filter((b) => b.type === "todo" && !b.checked).length,
    0
  );

  // Estado del monitoreo del sitio web (sin red: lee los últimos chequeos).
  const mon = useMonitor.getState();
  const site = mon.enabled
    ? {
        down: mon.sites
          .filter((s) => statusOf(s) === "down" && latest(s))
          .map((s) => ({ label: s.label, url: s.url })),
        slow: mon.sites
          .filter((s) => statusOf(s) === "slow")
          .map((s) => ({ label: s.label, url: s.url, ms: avgLatency(s) })),
        degraded: mon.sites
          .filter((s) => s.checks.length >= 5 && uptime(s) < 0.98 && statusOf(s) !== "down")
          .map((s) => ({ label: s.label, url: s.url, up: Math.round(uptime(s) * 100) })),
      }
    : undefined;

  const [gmail, calendar, github] = await Promise.all([
    gmailOk
      ? (async () => {
          const [unread, finance, security, leads] = await Promise.all([
            gmailSearch(g.accessToken, "in:inbox is:unread", 25).then((r) => r.length).catch(() => 0),
            gmailSearch(g.accessToken, "in:inbox (factura OR invoice OR pago OR payment OR billing OR cobro) newer_than:30d", 15)
              .then((r) => r.length)
              .catch(() => 0),
            gmailSearch(g.accessToken, "in:inbox (alerta OR security OR verify OR sign-in OR contraseña OR password) newer_than:14d", 10)
              .then((r) => r.length)
              .catch(() => 0),
            gmailSearch(g.accessToken, "in:inbox (propuesta OR lead OR cotización OR quote OR demo OR cliente) newer_than:30d", 15)
              .then((r) => r.length)
              .catch(() => 0),
          ]);
          return { unread, finance, security, leads };
        })()
      : Promise.resolve(undefined),
    calOk
      ? calendarEvents(g.accessToken, 10)
          .then((evs) => ({
            soon: evs
              .map((e) => ({ summary: e.summary || "(evento)", inHours: hoursUntil(e.start?.dateTime || e.start?.date) }))
              .filter((e): e is { summary: string; inHours: number } => e.inHours != null && e.inHours >= 0 && e.inHours <= 48),
          }))
          .catch(() => undefined)
      : Promise.resolve(undefined),
    ghOk
      ? ghFetchAll(c.github.account, c.github.token || undefined)
          .then((d) => ({ openPRs: d.openPRs, openIssues: d.openIssues }))
          .catch(() => undefined)
      : Promise.resolve(undefined),
  ]);

  return { gmail, calendar, github, workspace: { openTodos }, site, missing };
}

// ── N1 · Reglas deterministas ─────────────────────────────────
// Cada regla traduce una señal en una anticipación con confianza explícita.
function rules(s: Signals): Anticipation[] {
  const out: Anticipation[] = [];

  if (s.gmail?.security) {
    out.push({
      key: "gmail.security",
      type: "error.prevention",
      title: `${s.gmail.security} alerta(s) de seguridad sin revisar`,
      reason: "Correos de seguridad/acceso recientes en la bandeja.",
      confidence: 0.92,
      source: "gmail",
      suggestPrompt:
        "Busca en Gmail los correos de seguridad/acceso recientes (in:inbox (alerta OR security OR verify OR sign-in) newer_than:14d), resume el riesgo y qué hacer.",
    });
  }

  if (s.gmail?.finance) {
    out.push({
      key: "gmail.finance",
      type: "right.sizing",
      title: `${s.gmail.finance} correo(s) de facturación/pago`,
      reason: "Mensajes de finanzas detectados en los últimos 30 días.",
      confidence: Math.min(0.6 + s.gmail.finance * 0.08, 0.9),
      source: "gmail",
      suggestPrompt:
        "Busca en Gmail correos de facturación/pago (factura OR invoice OR pago OR billing), resume qué está pendiente y propón los recordatorios a enviar.",
    });
  }

  if (s.gmail?.leads) {
    out.push({
      key: "gmail.leads",
      type: "next.best.feature",
      title: `${s.gmail.leads} lead(s) podrían necesitar seguimiento`,
      reason: "Correos de propuestas/leads recientes sin cerrar el ciclo.",
      confidence: Math.min(0.55 + s.gmail.leads * 0.06, 0.85),
      source: "gmail",
      suggestPrompt:
        "Busca en Gmail los leads/propuestas recientes y redacta un plan de seguimiento priorizado (a quién, cuándo y con qué mensaje).",
    });
  }

  for (const ev of s.calendar?.soon ?? []) {
    const h = Math.round(ev.inHours);
    out.push({
      key: `calendar.prep.${ev.summary}`,
      type: "onboarding.autoconfig",
      title: `Prepárate para "${ev.summary}"`,
      reason: `Evento del calendario ${h <= 1 ? "inminente" : `en ~${h} h`}.`,
      confidence: h <= 24 ? 0.8 : 0.65,
      leadTime: h <= 1 ? "ahora" : `en ${h} h`,
      source: "ai",
      suggestPrompt: `Crea una nota de preparación para la reunión "${ev.summary}" con agenda, objetivos y puntos a cubrir.`,
    });
  }

  if (s.github?.openPRs) {
    out.push({
      key: "github.prs",
      type: "error.prevention",
      title: `${s.github.openPRs} PR(s) abiertos esperando revisión`,
      reason: "Pull requests abiertos en tus repos.",
      confidence: Math.min(0.6 + s.github.openPRs * 0.05, 0.85),
      source: "github",
      suggestPrompt: "Dame un resumen de los pull requests abiertos y prioriza cuáles revisar primero.",
    });
  }

  if (s.workspace.openTodos >= 5) {
    out.push({
      key: "workspace.todos",
      type: "right.sizing",
      title: `${s.workspace.openTodos} tareas pendientes en tu workspace`,
      reason: "Acumulación de tareas sin completar en las páginas.",
      confidence: Math.min(0.5 + s.workspace.openTodos * 0.03, 0.8),
      source: "ai",
      suggestPrompt:
        "Revisa las tareas pendientes (todos) de mis páginas y propón un plan priorizado para hoy con las 3 más importantes.",
    });
  }

  for (const d of s.site?.down ?? []) {
    out.push({
      key: `site.down.${d.url}`,
      type: "error.prevention",
      title: `${d.label} no responde`,
      reason: "La sonda de disponibilidad no obtuvo respuesta del sitio.",
      confidence: 0.95,
      leadTime: "ahora",
      source: "system",
      suggestPrompt: `El sitio ${d.url} parece caído. Verifícalo con fetch_url; si confirmas la caída, redacta una alerta breve para el equipo (y envíala por Telegram si está conectado) y crea una nota de incidente con la hora y los siguientes pasos.`,
    });
  }
  if (s.gmail && s.gmail.unread >= 10) {
    out.push({
      key: "gmail.triage",
      type: "smart.defaults",
      title: `${s.gmail.unread}+ correos sin leer`,
      reason: "La bandeja acumula correos sin leer; conviene triagearlos.",
      confidence: Math.min(0.55 + s.gmail.unread * 0.01, 0.8),
      source: "gmail",
      suggestPrompt:
        "Revisa mis correos no leídos, agrúpalos por tema y dame un triage con qué responder hoy, qué delegar y qué archivar.",
    });
  }

  for (const dg of s.site?.degraded ?? []) {
    out.push({
      key: `site.degraded.${dg.url}`,
      type: "error.prevention",
      title: `${dg.label}: uptime ${dg.up}%`,
      reason: "La disponibilidad histórica cayó por debajo del umbral saludable.",
      confidence: 0.75,
      source: "system",
      suggestPrompt: `El sitio ${dg.url} tuvo caídas recientes (uptime ${dg.up}%). Analiza el patrón y propón medidas para estabilizarlo.`,
    });
  }

  for (const sl of s.site?.slow ?? []) {
    out.push({
      key: `site.slow.${sl.url}`,
      type: "right.sizing",
      title: `${sl.label} está lento (${sl.ms} ms)`,
      reason: "Latencia por encima del umbral saludable en los últimos chequeos.",
      confidence: 0.7,
      source: "system",
      suggestPrompt: `El sitio ${sl.url} responde lento (~${sl.ms} ms). Analiza posibles causas y propón optimizaciones de rendimiento priorizadas.`,
    });
  }

  // Cold-start (N1): si faltan conectores, anticipa el valor de conectarlos.
  if (s.missing.length) {
    out.push({
      key: "connect.missing",
      type: "onboarding.autoconfig",
      title: `Conecta ${s.missing.slice(0, 3).join(", ")} para anticipar más`,
      reason: "Cuantas más fuentes conectes, antes se adelanta ZERO a tus necesidades.",
      confidence: 0.5,
      source: "system",
      // sin prompt: la acción es ir a /connectors (se maneja en la UI).
    });
  }

  return out;
}

export interface ResolveResult {
  visible: Anticipation[]; // suggest + auto (lo que se muestra/actúa)
  shadow: number; // calculadas pero no mostradas (modo shadow)
  signals: Signals;
}

const CONFIDENCE_FLOOR = 0.45;

/**
 * Pipeline NBA: gather → reglas → umbral → escalera de confianza → auditoría.
 * Respeta opt-out, snooze por descarte y overrides de modo por tipo.
 */
export async function resolveAnticipations(): Promise<ResolveResult> {
  const a = useAnticipation.getState();
  if (!a.enabled) return { visible: [], shadow: 0, signals: { workspace: { openTodos: 0 }, missing: [] } };

  const signals = await gatherSignals();
  // Calibra la confianza con el feedback histórico por tipo (bucle §8.3).
  const decisions = a.decisions;
  const candidates = rules(signals)
    .map((c) => ({
      ...c,
      confidence: Math.min(0.99, c.confidence * typeCalibration(decisions, c.type)),
    }))
    .filter((c) => c.confidence >= CONFIDENCE_FLOOR);

  let shadow = 0;
  const visible: Anticipation[] = [];
  for (const c of candidates) {
    if (a.isSnoozed(c.type)) continue;
    const mode = a.modeFor(c.type);
    const explainId = `exp_${Math.random().toString(36).slice(2, 8)}`;
    // Explicabilidad/auditoría: TODO lo emitido se registra (también shadow).
    a.logAudit({
      explainId,
      ts: Date.now(),
      type: c.type,
      title: c.title,
      reason: c.reason,
      confidence: c.confidence,
      mode,
    });
    if (mode === "shadow") {
      shadow += 1;
      continue;
    }
    visible.push({ ...c, mode, explainId });
  }

  visible.sort((x, y) => y.confidence - x.confidence);
  return { visible, shadow, signals };
}
