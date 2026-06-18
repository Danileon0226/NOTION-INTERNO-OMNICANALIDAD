"use client";

import { useState } from "react";
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import {
  useMonitor,
  statusOf,
  uptime,
  avgLatency,
  latest,
  type Site,
  type SiteStatus,
} from "@/lib/monitor/store";
import { runMonitorCycle } from "@/components/monitor/MonitorDaemon";
import { runAgent } from "@/lib/ai/agent";
import { useAi } from "@/lib/ai/store";

export default function MonitorPage() {
  const { sites, enabled, intervalMin, setEnabled, setInterval, addSite, removeSite } = useMonitor();
  const apiKey = useAi((s) => s.apiKey);
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [analysis, setAnalysis] = useState<{ id: string; text: string } | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  async function checkNow() {
    setChecking(true);
    try {
      await runMonitorCycle();
    } finally {
      setChecking(false);
    }
  }

  async function analyze(site: Site) {
    setAnalyzing(site.id);
    setAnalysis(null);
    try {
      const res = await runAgent(
        `Analiza el sitio web ${site.url}: léelo con fetch_url y dame un diagnóstico breve de contenido, mensajes clave y 3 mejoras de SEO/conversión accionables. Si no puedes leerlo, dilo.`,
        [],
        undefined,
        "monitor"
      );
      setAnalysis({ id: site.id, text: res.text });
    } catch (e) {
      setAnalysis({ id: site.id, text: `⚠️ ${(e as Error).message}` });
    } finally {
      setAnalyzing(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Globe size={22} className="text-accent" /> Monitoreo web
          </h1>
          <p className="mt-1 text-sm text-muted">
            ZERO vigila el sitio de la agencia: disponibilidad, latencia y, si algo falla, lo
            convierte en una anticipación accionable.
          </p>
        </div>
        <button
          onClick={checkNow}
          className="flex items-center gap-1.5 rounded-md border glass-card px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Chequear ahora
        </button>
      </header>

      {/* Ajustes */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border glass-card p-4">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-accent" />
          Monitoreo {enabled ? "activo" : "pausado"}
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <Gauge size={13} /> Cada
          <select
            value={intervalMin}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="rounded-md border glass-card px-2 py-1 text-ink"
          >
            {[1, 5, 10, 15, 30].map((n) => (
              <option key={n} value={n}>
                {n} min
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Añadir sitio */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) {
            addSite(url.trim());
            setUrl("");
          }
        }}
        className="mb-5 flex gap-2"
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://otro-sitio.com"
          className="flex-1 rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={14} /> Añadir
        </button>
      </form>

      {sites.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted">
          Sin sitios monitoreados. Añade uno arriba.
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => (
            <div key={site.id} className="hover-lift rounded-xl border glass-card p-4">
              <div className="flex items-center gap-2">
                <StatusDot status={statusOf(site)} />
                <a href={site.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold text-ink hover:text-accent">
                  {site.label}
                </a>
                <StatusBadge status={statusOf(site)} />
                <button
                  onClick={() => removeSite(site.id)}
                  className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-red-500"
                  title="Quitar"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <Stat label="Uptime" value={`${Math.round(uptime(site) * 100)}%`} />
                <Stat label="Latencia" value={avgLatency(site) ? `${avgLatency(site)} ms` : "—"} />
                <Stat label="Último" value={lastSeen(latest(site)?.ts)} />
              </div>

              <Spark checks={site.checks} />

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => analyze(site)}
                  disabled={analyzing === site.id || !apiKey}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  title={apiKey ? "" : "Configura la API key de Gemini"}
                >
                  {analyzing === site.id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  Analizar con ZERO
                </button>
              </div>

              {analysis?.id === site.id && (
                <div className="mt-2 rounded-lg bg-bg-subtle px-3 py-2 text-xs text-ink">
                  <p className="whitespace-pre-wrap">{analysis.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: SiteStatus }) {
  const color =
    status === "up" ? "bg-emerald-500" : status === "slow" ? "bg-amber-500" : status === "down" ? "bg-red-500" : "bg-gray-300";
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />;
}

function StatusBadge({ status }: { status: SiteStatus }) {
  const map: Record<SiteStatus, { label: string; cls: string; icon?: React.ReactNode }> = {
    up: { label: "Operativo", cls: "bg-emerald-50 text-emerald-600", icon: <CheckCircle2 size={11} /> },
    slow: { label: "Lento", cls: "bg-amber-50 text-amber-600", icon: <AlertTriangle size={11} /> },
    down: { label: "Caído", cls: "bg-red-50 text-red-600", icon: <AlertTriangle size={11} /> },
    unknown: { label: "Sin datos", cls: "bg-gray-100 text-gray-500" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-subtle px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function Spark({ checks }: { checks: { ok: boolean; ms: number }[] }) {
  if (checks.length < 2) return <div className="mt-3 h-8" />;
  const w = 100;
  const h = 28;
  const ms = checks.map((c) => (c.ok ? c.ms : 0));
  const max = Math.max(...ms, 1);
  const pts = ms
    .map((v, i) => `${((i / (ms.length - 1)) * w).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-8 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
      {checks.map((c, i) =>
        c.ok ? null : (
          <circle key={i} cx={(i / (ms.length - 1)) * w} cy={h - 2} r={1.6} fill="#ef4444" />
        )
      )}
    </svg>
  );
}

function lastSeen(ts?: number): string {
  if (!ts) return "—";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "ahora";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return new Date(ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
