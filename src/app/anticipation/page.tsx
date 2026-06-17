"use client";

import { useState } from "react";
import { Radar, ShieldCheck, History, Gauge, Bot, Zap, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { AnticipationPanel } from "@/components/anticipation/AnticipationPanel";
import { MaturityPanel } from "@/components/anticipation/MaturityPanel";
import { TrustByCapability } from "@/components/anticipation/TrustByCapability";
import { useAnticipation, anticipationMetrics, type TrustMode } from "@/lib/anticipation/store";
import { useAutonomy, runAutonomyCycle, activateTotalAutonomy } from "@/lib/anticipation/autonomy";
import { useAi } from "@/lib/ai/store";

const MODES: { id: TrustMode; label: string; desc: string }[] = [
  { id: "shadow", label: "Shadow", desc: "Calcula y mide, no muestra ni actúa." },
  { id: "suggest", label: "Suggest", desc: "Propone; tú decides." },
  { id: "auto", label: "Auto", desc: "Actúa con guardrails (acciones reversibles)." },
];

export default function AnticipationPage() {
  const enabled = useAnticipation((s) => s.enabled);
  const setEnabled = useAnticipation((s) => s.setEnabled);
  const defaultMode = useAnticipation((s) => s.defaultMode);
  const setDefaultMode = useAnticipation((s) => s.setDefaultMode);
  const decisions = useAnticipation((s) => s.decisions);
  const audit = useAnticipation((s) => s.audit);
  const resetMemory = useAnticipation((s) => s.resetMemory);
  const m = anticipationMetrics(decisions);

  const aut = useAutonomy();
  const apiKey = useAi((s) => s.apiKey);
  const [running, setRunning] = useState(false);

  async function runNow() {
    setRunning(true);
    try {
      await runAutonomyCycle();
    } finally {
      setRunning(false);
    }
  }

  const totalOn = aut.active && enabled && defaultMode === "auto";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Radar size={22} className="text-accent" /> Anticipación
        </h1>
        <p className="mt-1 text-sm text-muted">
          ZERO se adelanta a tus necesidades leyendo señales reales de tus conectores. Reglas
          deterministas y explicables (Nivel 1), gobernadas por la escalera de confianza.
        </p>
      </header>

      {/* Madurez */}
      <div className="mb-5">
        <MaturityPanel />
      </div>

      {/* Gobernanza */}
      <div className="mb-5 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            <span className="text-sm font-semibold text-ink">Aprendizaje anticipatorio</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-accent" />
            {enabled ? "Activado" : "Desactivado (opt-out)"}
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">
          Los patrones se quedan contigo: todo se calcula en tu navegador y nada se envía a terceros
          salvo a las APIs oficiales de tus conectores. Puedes excluirte cuando quieras.
        </p>

        {/* Escalera de confianza */}
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Gauge size={13} /> Escalera de confianza (modo global)
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDefaultMode(mode.id)}
                disabled={!enabled}
                className={`rounded-lg border p-3 text-left transition disabled:opacity-50 ${
                  defaultMode === mode.id ? "border-accent bg-accent/5 ring-1 ring-accent/30" : "hover:bg-bg-subtle"
                }`}
              >
                <div className="text-sm font-medium text-ink">{mode.label}</div>
                <div className="mt-0.5 text-[11px] text-muted">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Autonomía TOTAL */}
      <div className="mb-5 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-accent" />
            <span className="text-sm font-semibold text-ink">Autonomía total</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                totalOn ? "bg-emerald-100 text-emerald-700" : "bg-bg-subtle text-muted"
              }`}
            >
              {totalOn ? "Autónomo · activo" : aut.active ? "Parcial" : "En espera"}
            </span>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={aut.active} onChange={(e) => aut.setActive(e.target.checked)} className="accent-accent" />
            Demonio {aut.active ? "encendido" : "apagado"}
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">
          Con la autonomía activa, ZERO ejecuta solo las anticipaciones por encima del umbral de
          confianza, con guardrails: tope por ciclo, enfriamiento por acción y solo acciones
          reversibles (notas, resúmenes, alertas). Todo queda auditado abajo.
        </p>

        {!totalOn && (
          <button
            onClick={activateTotalAutonomy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Zap size={14} /> Activar autonomía TOTAL
          </button>
        )}

        {!apiKey && aut.active && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            La autonomía necesita la API key de Gemini (Conectores) para ejecutar acciones.
          </p>
        )}

        {/* Guardrails */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Slider
            label={`Confianza mínima: ${Math.round(aut.autoConfidence * 100)}%`}
            min={0.5}
            max={0.95}
            step={0.05}
            value={aut.autoConfidence}
            onChange={(v) => aut.patch({ autoConfidence: v })}
          />
          <Slider
            label={`Acciones por ciclo: ${aut.maxPerCycle}`}
            min={1}
            max={5}
            step={1}
            value={aut.maxPerCycle}
            onChange={(v) => aut.patch({ maxPerCycle: v })}
          />
          <Slider
            label={`Cada ${aut.intervalMin} min`}
            min={5}
            max={60}
            step={5}
            value={aut.intervalMin}
            onChange={(v) => aut.patch({ intervalMin: v })}
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={runNow}
            disabled={running || !aut.active}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle disabled:opacity-50"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Ejecutar ciclo ahora
          </button>
          {aut.lastRunAt > 0 && (
            <span className="text-[11px] text-muted">
              Último ciclo: {new Date(aut.lastRunAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Confianza por capacidad */}
      <div className="mb-5">
        <TrustByCapability />
      </div>

      {/* Métricas */}
      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Aceptación" value={`${Math.round(m.acceptanceRate * 100)}%`} accent />
        <Metric label="Aceptadas" value={m.accepted} />
        <Metric label="Descartadas" value={m.dismissed} />
        <Metric label="Decisiones" value={m.total} />
      </section>

      {/* Anticipaciones en vivo */}
      <section className="mb-6">
        <AnticipationPanel />
      </section>

      {/* Acciones autónomas ejecutadas */}
      {aut.log.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Bot size={15} className="text-accent" /> Acciones autónomas de ZERO
            </h2>
            <button onClick={aut.clearLog} className="text-xs text-muted hover:text-red-500">
              Limpiar
            </button>
          </div>
          <div className="space-y-2">
            {aut.log.slice(0, 10).map((a) => (
              <div key={a.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  {a.ok ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle size={14} className="shrink-0 text-red-500" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{a.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {new Date(a.ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap pl-6 text-xs text-muted">{a.result}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Auditoría / explicabilidad */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <History size={15} className="text-accent" /> Auditoría (explicabilidad)
          </h2>
          {(audit.length > 0 || decisions.length > 0) && (
            <button onClick={resetMemory} className="text-xs text-muted hover:text-red-500">
              Limpiar memoria
            </button>
          )}
        </div>
        {audit.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-card px-3 py-6 text-center text-sm text-muted">
            Aún no se han emitido anticipaciones.
          </p>
        ) : (
          <div className="divide-y rounded-lg border bg-card text-sm">
            {audit.slice(0, 20).map((e) => (
              <div key={e.explainId} className="flex items-center gap-2 px-3 py-2">
                <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] uppercase text-muted">{e.mode}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{e.title}</p>
                  <p className="truncate text-[11px] text-muted">
                    {e.reason} · {e.explainId}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted">{Math.round(e.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-accent"
      />
    </label>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${accent ? "ring-1 ring-accent/30" : ""}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-accent" : "text-ink"}`}>{value}</div>
    </div>
  );
}
