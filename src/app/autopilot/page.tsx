"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Rocket, Play, Loader2, Plug, Clock, Wrench } from "lucide-react";
import { runAgent, type AgentStep } from "@/lib/ai/agent";
import { useAi } from "@/lib/ai/store";

interface Routine {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompt: string;
  cadenceMin: number;
}

const ROUTINES: Routine[] = [
  {
    id: "daily",
    name: "Resumen diario",
    icon: "☀️",
    description: "Lo urgente del día a partir de correos, calendario y tareas.",
    prompt:
      "Analiza el estado de la agencia (correos no leídos, eventos próximos y tareas) y dame un resumen ejecutivo del día con las 3 prioridades. Sé breve.",
    cadenceMin: 720,
  },
  {
    id: "payments",
    name: "Seguimiento de pagos",
    icon: "💸",
    description: "Detecta facturas/pagos pendientes y propone recordatorios.",
    prompt:
      "Busca en Gmail correos sobre facturación, pagos o suscripciones (in:inbox factura OR pago OR invoice OR billing). Resume qué está pendiente y propone los recordatorios a enviar.",
    cadenceMin: 1440,
  },
  {
    id: "weekly",
    name: "Reporte semanal",
    icon: "📊",
    description: "Ejecuta analítica y guarda un reporte en el workspace.",
    prompt:
      "Ejecuta la analítica de la agencia (analyze_agency) y crea una nota titulada 'Reporte semanal' con métricas clave, qué funcionó y recomendaciones.",
    cadenceMin: 10080,
  },
  {
    id: "content",
    name: "Calendario de contenidos",
    icon: "🗓️",
    description: "Crea un plan de contenidos para redes de la semana.",
    prompt:
      "Crea una nota 'Calendario de contenidos' con un plan de publicaciones para redes de la próxima semana (lun-vie), con tema, formato y copy breve por día.",
    cadenceMin: 10080,
  },
  {
    id: "client-pack",
    name: "Alta de cliente (PPT + contrato + onboarding)",
    icon: "🤝",
    description: "Pre-configura el expediente administrativo completo de un cliente nuevo.",
    prompt:
      "Pre-configura el expediente de un cliente nuevo llamado '[Nuevo Cliente]' con create_client_pack. Luego busca en Drive plantillas o documentos de 'contrato' y 'propuesta' (drive_search) y, si encuentras contenido útil, enriquécelo en las subpáginas con append_to_note. Resume qué creaste.",
    cadenceMin: 100000,
  },
  {
    id: "landing",
    name: "Landing de propuesta",
    icon: "🌐",
    description: "Genera una landing page base para captar un cliente.",
    prompt:
      "Crea una página web (create_webpage) tipo landing moderna y responsive para una propuesta de servicios de marketing de Zero Agency, con hero, servicios, testimonios y CTA de contacto.",
    cadenceMin: 100000,
  },
];

interface RunState {
  busy: boolean;
  text?: string;
  steps?: AgentStep[];
  lastRun?: number;
}

export default function AutopilotPage() {
  const { apiKey } = useAi();
  const [state, setState] = useState<Record<string, RunState>>({});
  const [auto, setAuto] = useState<Set<string>>(new Set());
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const stateRef = useRef(state);
  stateRef.current = state;

  async function run(r: Routine) {
    setState((s) => ({ ...s, [r.id]: { ...s[r.id], busy: true, steps: [] } }));
    try {
      const res = await runAgent(r.prompt, [], (step) =>
        setState((s) => ({ ...s, [r.id]: { ...s[r.id], steps: [...(s[r.id]?.steps ?? []), step] } }))
      );
      setState((s) => ({ ...s, [r.id]: { busy: false, text: res.text, steps: res.steps, lastRun: Date.now() } }));
    } catch (e) {
      setState((s) => ({ ...s, [r.id]: { busy: false, text: `⚠️ ${(e as Error).message}`, lastRun: Date.now() } }));
    }
  }

  // Ticker del piloto automático: ejecuta rutinas activas cuando toca.
  useEffect(() => {
    const t = setInterval(() => {
      for (const r of ROUTINES) {
        if (!autoRef.current.has(r.id)) continue;
        const st = stateRef.current[r.id];
        if (st?.busy) continue;
        const due = !st?.lastRun || Date.now() - st.lastRun > r.cadenceMin * 60_000;
        if (due) run(r);
      }
    }, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAuto(id: string) {
    setAuto((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        const r = ROUTINES.find((x) => x.id === id)!;
        if (!stateRef.current[id]?.busy) run(r);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Rocket size={22} className="text-accent" /> Piloto automático
        </h1>
        <p className="mt-1 text-sm text-muted">
          Rutinas que ZERO ejecuta por ti con Gemini. Actívalas para que corran solas, o lánzalas
          al instante.
        </p>
      </header>

      {!apiKey && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <Plug size={15} /> Configura la API key de Gemini en{" "}
          <Link href="/connectors" className="font-medium underline">
            Conectores
          </Link>
          .
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {ROUTINES.map((r) => {
          const st = state[r.id];
          const on = auto.has(r.id);
          return (
            <div key={r.id} className="flex flex-col rounded-xl border bg-white p-4">
              <div className="flex items-start gap-2">
                <span className="text-2xl">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-ink">{r.name}</h2>
                  <p className="text-xs text-muted">{r.description}</p>
                </div>
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                  <input type="checkbox" checked={on} onChange={() => toggleAuto(r.id)} className="accent-accent" />
                  Auto
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => run(r)}
                  disabled={st?.busy || !apiKey}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {st?.busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Ejecutar ahora
                </button>
                {st?.lastRun && (
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <Clock size={11} /> {new Date(st.lastRun).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {on && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">activo</span>}
              </div>

              {st?.steps && st.steps.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {st.steps.map((s, j) => (
                    <span key={j} className="inline-flex items-center gap-1 rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] text-accent">
                      <Wrench size={10} /> {s.tool}
                    </span>
                  ))}
                </div>
              )}
              {st?.text && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg bg-bg-subtle px-3 py-2 text-xs text-ink">
                  <p className="whitespace-pre-wrap">{st.text}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
