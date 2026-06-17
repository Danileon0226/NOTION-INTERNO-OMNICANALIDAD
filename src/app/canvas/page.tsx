"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Pause, Play, RefreshCw, Sparkles, Trash2, Wifi } from "lucide-react";
import { useActivity, sourceMeta, type ActivitySource } from "@/lib/activity";
import {
  useConnectors,
  googleTokenValid,
  GMAIL_SCOPE,
  DRIVE_SCOPE,
} from "@/lib/connectors/store";
import { ghFetchAll } from "@/lib/connectors/github";
import { gmailProfile, driveList } from "@/lib/connectors/google";
import { GraphView } from "@/components/canvas/GraphView";

type Src = "gmail" | "google-drive" | "github" | "telegram";
const SRCS: Src[] = ["gmail", "github", "google-drive", "telegram"];

const TICK_MS = 3500;

// Posiciones del grafo (viewBox 400x300).
const POS: Record<Src, { x: number; y: number }> = {
  gmail: { x: 64, y: 60 },
  github: { x: 336, y: 60 },
  "google-drive": { x: 64, y: 240 },
  telegram: { x: 336, y: 240 },
};
const HUB = { x: 200, y: 150 };

const VERBS: Record<Src, string> = {
  gmail: "integró correos de Gmail",
  github: "sincronizó actividad de GitHub",
  "google-drive": "indexó archivos de Drive",
  telegram: "registró mensajes de Telegram",
};

interface Flow {
  id: string;
  src: Src;
}

export default function CanvasPage() {
  const conn = useConnectors();
  const { events, integrated, push, clear } = useActivity();

  const [running, setRunning] = useState(true);
  const [view, setView] = useState<"grafo" | "flujo">("grafo");
  const [counts, setCounts] = useState<Record<Src, number>>({
    gmail: 0,
    github: 0,
    "google-drive": 0,
    telegram: 0,
  });
  const [samples, setSamples] = useState<Record<Src, number[]>>({
    gmail: [],
    github: [],
    "google-drive": [],
    telegram: [],
  });
  const [flows, setFlows] = useState<Flow[]>([]);
  const rr = useRef(0);

  const connected: Record<Src, boolean> = {
    gmail: googleTokenValid(conn.google, GMAIL_SCOPE),
    "google-drive": googleTokenValid(conn.google, DRIVE_SCOPE),
    github: !!conn.github.account || !!conn.github.token,
    telegram: !!conn.telegram.botToken,
  };
  const anyLive = Object.values(connected).some(Boolean);

  const spawnFlow = useCallback((src: Src) => {
    const id = Math.random().toString(36).slice(2);
    setFlows((f) => [...f, { id, src }]);
    setTimeout(() => setFlows((f) => f.filter((x) => x.id !== id)), 1100);
  }, []);

  const bump = useCallback(
    (src: Src, delta: number, total: number) => {
      setCounts((c) => ({ ...c, [src]: total }));
      setSamples((s) => ({ ...s, [src]: [...s[src], total].slice(-24) }));
      spawnFlow(src);
      push({
        source: src as ActivitySource,
        kind: "integrate",
        label: `La IA ${VERBS[src]}${delta > 0 ? ` · +${delta}` : ""}`,
        count: delta,
      });
    },
    [push, spawnFlow]
  );

  /** Lectura real (suave) de un conector para sembrar/actualizar su contador. */
  const probe = useCallback(
    async (src: Src): Promise<number | null> => {
      try {
        if (src === "gmail" && connected.gmail)
          return (await gmailProfile(conn.google.accessToken)).messagesTotal;
        if (src === "google-drive" && connected["google-drive"])
          return (await driveList(conn.google.accessToken, 20)).length;
        if (src === "github" && connected.github) {
          const d = await ghFetchAll(conn.github.account.trim(), conn.github.token.trim() || undefined);
          return d.repos.length + d.openPRs + d.openIssues;
        }
      } catch {
        return null;
      }
      return null;
    },
    [conn, connected]
  );

  // Siembra inicial con datos reales de los conectores conectados.
  const seed = useCallback(async () => {
    for (const src of SRCS) {
      if (connected[src]) {
        const v = await probe(src);
        if (v != null) {
          setCounts((c) => ({ ...c, [src]: v }));
          setSamples((s) => ({ ...s, [src]: [v] }));
        }
      }
    }
    push({ source: "ai", kind: "sync", label: "Pipeline de integración iniciado", count: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    seed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ticker en tiempo real: SOLO lee conectores reales conectados.
  useEffect(() => {
    if (!running || !anyLive) return;
    const pool = SRCS.filter((s) => connected[s]);
    if (!pool.length) return;
    const t = setInterval(async () => {
      const src = pool[rr.current % pool.length];
      rr.current += 1;
      const v = await probe(src);
      if (v == null) return;
      setCounts((prev) => {
        const delta = Math.max(0, v - (prev[src] ?? 0));
        bump(src, delta, v);
        return prev; // bump ya actualiza counts
      });
    }, TICK_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, anyLive, conn.github.account, conn.github.token, conn.google.accessToken, conn.telegram.botToken]);

  const total = SRCS.reduce((a, s) => a + counts[s], 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Activity size={22} className="text-accent" /> Canvas de datos en tiempo real
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                anyLive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
              }`}
            >
              <Wifi size={11} /> {anyLive ? "En vivo" : "Sin conectar"}
            </span>
            Lo que la IA va integrando desde tus conectores, actualizado solo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle"
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Pausar" : "Reanudar"}
          </button>
          <button
            onClick={() => seed()}
            className="flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle"
          >
            <RefreshCw size={14} /> Re-sincronizar
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Integrado por la IA" value={integrated} accent />
        <Kpi label="Elementos en canvas" value={total} />
        <Kpi label="Conectores activos" value={Object.values(connected).filter(Boolean).length} />
        <Kpi label="Eventos registrados" value={events.length} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Grafo */}
        <section className="lg:col-span-2">
          <div className="mb-2 inline-flex rounded-md border bg-white p-0.5 text-sm">
            <button
              onClick={() => setView("grafo")}
              className={`rounded px-3 py-1 ${view === "grafo" ? "bg-bg-subtle font-medium text-ink" : "text-muted"}`}
            >
              Grafo de conocimiento
            </button>
            <button
              onClick={() => setView("flujo")}
              className={`rounded px-3 py-1 ${view === "flujo" ? "bg-bg-subtle font-medium text-ink" : "text-muted"}`}
            >
              Flujo de conectores
            </button>
          </div>
          {view === "grafo" ? (
            <GraphView />
          ) : (
            <Graph counts={counts} connected={connected} flows={flows} running={running} />
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {SRCS.map((s) => (
              <Tile key={s} src={s} count={counts[s]} samples={samples[s]} live={connected[s]} />
            ))}
          </div>
        </section>

        {/* Stream */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Sparkles size={15} className="text-accent" /> Actividad en vivo
            </h2>
            <button onClick={clear} className="flex items-center gap-1 text-xs text-muted hover:text-red-500">
              <Trash2 size={12} /> Limpiar
            </button>
          </div>
          <div className="max-h-[28rem] space-y-1.5 overflow-y-auto rounded-lg border bg-white p-2">
            {events.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted">Esperando actividad…</p>
            )}
            {events.map((e, i) => (
              <div
                key={e.id}
                className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                  i === 0 ? "bg-bg-subtle" : ""
                }`}
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: sourceMeta[e.source].color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{e.label}</p>
                  <p className="text-[11px] text-muted">
                    {sourceMeta[e.source].label} · {relTime(e.ts)}
                  </p>
                </div>
                {!!e.count && e.count > 0 && (
                  <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                    +{e.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border bg-white p-4 ${accent ? "ring-1 ring-accent/30" : ""}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${accent ? "text-accent" : "text-ink"}`}>
        {value.toLocaleString("es-CO")}
      </div>
    </div>
  );
}

function Graph({
  counts,
  connected,
  flows,
  running,
}: {
  counts: Record<Src, number>;
  connected: Record<Src, boolean>;
  flows: Flow[];
  running: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-2">
      <svg viewBox="0 0 400 300" className="w-full" style={{ maxHeight: 340 }}>
        {/* edges */}
        {SRCS.map((s) => (
          <line
            key={s}
            x1={POS[s].x}
            y1={POS[s].y}
            x2={HUB.x}
            y2={HUB.y}
            stroke={connected[s] ? sourceMeta[s].color : "#e5e7eb"}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.5}
          />
        ))}

        {/* flows (animated dots node → hub) */}
        {flows.map((f) => (
          <circle key={f.id} r={4} fill={sourceMeta[f.src].color}>
            <animateMotion
              dur="1s"
              fill="freeze"
              path={`M ${POS[f.src].x} ${POS[f.src].y} L ${HUB.x} ${HUB.y}`}
            />
            <animate attributeName="opacity" from="1" to="0" dur="1s" fill="freeze" />
          </circle>
        ))}

        {/* hub */}
        <circle cx={HUB.x} cy={HUB.y} r={34} fill="#2383e2" opacity={0.12} />
        <circle cx={HUB.x} cy={HUB.y} r={26} fill="#2383e2">
          {running && (
            <animate attributeName="r" values="26;29;26" dur="2s" repeatCount="indefinite" />
          )}
        </circle>
        <text x={HUB.x} y={HUB.y + 4} textAnchor="middle" fill="white" fontSize="13" fontWeight="700">
          IA
        </text>

        {/* nodes */}
        {SRCS.map((s) => (
          <g key={s}>
            <circle
              cx={POS[s].x}
              cy={POS[s].y}
              r={24}
              fill="white"
              stroke={connected[s] ? sourceMeta[s].color : "#d1d5db"}
              strokeWidth={2}
            />
            <text x={POS[s].x} y={POS[s].y - 2} textAnchor="middle" fontSize="9" fill="#37352f" fontWeight="600">
              {sourceMeta[s].label}
            </text>
            <text x={POS[s].x} y={POS[s].y + 10} textAnchor="middle" fontSize="11" fill={sourceMeta[s].color} fontWeight="700">
              {counts[s]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Tile({
  src,
  count,
  samples,
  live,
}: {
  src: Src;
  count: number;
  samples: number[];
  live: boolean;
}) {
  const color = sourceMeta[src].color;
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-medium text-ink">{sourceMeta[src].label}</span>
        <span className={`ml-auto text-[10px] ${live ? "text-emerald-600" : "text-muted"}`}>
          {live ? "en vivo" : "sin conectar"}
        </span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{count}</div>
      <Spark samples={samples} color={color} />
    </div>
  );
}

function Spark({ samples, color }: { samples: number[]; color: string }) {
  if (samples.length < 2) return <div className="h-6" />;
  const w = 100;
  const h = 24;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = max - min || 1;
  const pts = samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-6 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

function relTime(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return "ahora";
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  return new Date(ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
