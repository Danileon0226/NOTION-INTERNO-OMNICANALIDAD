"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Circle, ShieldCheck, Play, ExternalLink } from "lucide-react";
import { useAi } from "@/lib/ai/store";
import { askAi } from "@/lib/ai/client";
import { useConnectors, googleTokenValid, GMAIL_SCOPE, DRIVE_SCOPE, CALENDAR_SCOPE } from "@/lib/connectors/store";
import { gmailProfile, driveList, calendarEvents } from "@/lib/connectors/google";
import {
  useGoogleInsights,
  searchConsoleSummary,
  ga4Summary,
  SEARCH_CONSOLE_SCOPE,
  ANALYTICS_SCOPE,
} from "@/lib/connectors/googleInsights";
import { useSetup, enableUrl, classifyGoogleError } from "@/lib/setup";
import { ModuleHeader } from "@/components/ModuleHeader";
import { authRequired, useAuth } from "@/lib/auth";
import { ROLE_LIST, roleMeta } from "@/lib/rbac";
import { Users } from "lucide-react";

type Status = "idle" | "running" | "ok" | "warn" | "fail";
interface Result {
  status: Status;
  detail: string;
  fixUrl?: string;
  fixLabel?: string;
}

interface Check {
  id: string;
  label: string;
  apiHost?: string;
  run: () => Promise<Omit<Result, "status"> & { ok: boolean; warn?: boolean }>;
}

export default function SetupPage() {
  const { apiKey } = useAi();
  const conn = useConnectors();
  const insights = useGoogleInsights();
  const { projectId, setProjectId } = useSetup();
  const role = useAuth((s) => s.role);
  const userName = useAuth((s) => s.name);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);

  const checks: Check[] = [
    {
      id: "gemini",
      label: "Gemini · Generative Language API",
      apiHost: "generativelanguage.googleapis.com",
      run: async () => {
        if (!apiKey) return { ok: false, detail: "Falta la API key de Gemini (Conectores → Asistente IA)." };
        await askAi("ok");
        return { ok: true, detail: "La IA responde correctamente." };
      },
    },
    {
      id: "oauth",
      label: "Google · OAuth Client ID",
      run: async () => {
        const cid = conn.google.clientId.trim();
        if (!cid) return { ok: false, detail: "Falta el Client ID de OAuth (Conectores → Google)." };
        if (!cid.endsWith(".apps.googleusercontent.com"))
          return { ok: false, detail: "El Client ID no tiene el formato correcto (.apps.googleusercontent.com)." };
        const connected = googleTokenValid(conn.google, GMAIL_SCOPE);
        return { ok: true, warn: !connected, detail: connected ? "Client ID válido y sesión activa." : "Client ID válido (aún sin conectar la cuenta)." };
      },
    },
    {
      id: "gmail",
      label: "Gmail API",
      apiHost: "gmail.googleapis.com",
      run: async () => {
        if (!googleTokenValid(conn.google, GMAIL_SCOPE)) return { ok: false, warn: true, detail: "Sin conectar. Conecta Google en /connectors." };
        const p = await gmailProfile(conn.google.accessToken);
        return { ok: true, detail: `Bandeja accesible (${p.messagesTotal.toLocaleString("es-CO")} mensajes).` };
      },
    },
    {
      id: "drive",
      label: "Google Drive API",
      apiHost: "drive.googleapis.com",
      run: async () => {
        if (!googleTokenValid(conn.google, DRIVE_SCOPE)) return { ok: false, warn: true, detail: "Sin conectar." };
        const f = await driveList(conn.google.accessToken, 1);
        return { ok: true, detail: `Drive accesible (${f.length ? "con archivos" : "vacío/ok"}).` };
      },
    },
    {
      id: "calendar",
      label: "Google Calendar API",
      apiHost: "calendar-json.googleapis.com",
      run: async () => {
        if (!googleTokenValid(conn.google, CALENDAR_SCOPE)) return { ok: false, warn: true, detail: "Sin conectar." };
        await calendarEvents(conn.google.accessToken, 1);
        return { ok: true, detail: "Calendar accesible." };
      },
    },
    {
      id: "searchconsole",
      label: "Search Console API",
      apiHost: "searchconsole.googleapis.com",
      run: async () => {
        if (!googleTokenValid(conn.google, SEARCH_CONSOLE_SCOPE)) return { ok: false, warn: true, detail: "Sin conectar (Conectores → Search Console + Analytics)." };
        const s = await searchConsoleSummary(conn.google.accessToken, insights.scSite.trim());
        return { ok: true, detail: `SEO accesible (${s.clicks} clics / 28d).` };
      },
    },
    {
      id: "analytics",
      label: "Analytics Data API (GA4)",
      apiHost: "analyticsdata.googleapis.com",
      run: async () => {
        if (!insights.gaProperty.trim()) return { ok: false, warn: true, detail: "Opcional: añade el GA4 Property ID en Conectores." };
        if (!googleTokenValid(conn.google, ANALYTICS_SCOPE)) return { ok: false, warn: true, detail: "Sin conectar." };
        const g = await ga4Summary(conn.google.accessToken, insights.gaProperty.trim());
        return { ok: true, detail: `Analytics accesible (${g.sessions} sesiones / 28d).` };
      },
    },
  ];

  async function runOne(c: Check) {
    setResults((r) => ({ ...r, [c.id]: { status: "running", detail: "Probando…" } }));
    try {
      const res = await c.run();
      setResults((r) => ({
        ...r,
        [c.id]: { status: res.ok ? (res.warn ? "warn" : "ok") : "warn", detail: res.detail },
      }));
    } catch (e) {
      const msg = (e as Error).message;
      const kind = classifyGoogleError(msg);
      const fix =
        kind === "disabled" && c.apiHost
          ? { fixUrl: enableUrl(c.apiHost, projectId), fixLabel: "Habilitar API" }
          : kind === "restricted"
            ? { fixUrl: "https://aistudio.google.com/apikey", fixLabel: "Revisar key" }
            : {};
      setResults((r) => ({
        ...r,
        [c.id]: { status: "fail", detail: kind === "disabled" ? "API no habilitada en el proyecto." : msg, ...fix },
      }));
    }
  }

  async function runAll() {
    setRunning(true);
    for (const c of checks) await runOne(c);
    setRunning(false);
  }

  const okCount = Object.values(results).filter((r) => r.status === "ok").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<ShieldCheck size={20} />}
        title="Estado de configuración"
        subtitle="Prueba en vivo cada API de Google y la IA, y te da el enlace para habilitar lo que falte."
      />

      {/* Acceso por roles (multi-tenant por perfil) */}
      <div className="mb-4 rounded-xl border glass-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Users size={16} className="text-accent" />
          <span className="text-sm font-semibold text-ink">Acceso por roles</span>
          {authRequired ? (
            <span className="ml-auto text-xs text-muted">
              Sesión: <span className="font-medium text-ink">{userName || "—"}</span> ·{" "}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${roleMeta(role).badge}`}>{roleMeta(role).label}</span>
            </span>
          ) : (
            <span className="ml-auto text-xs text-amber-500">Login no configurado (modo admin abierto)</span>
          )}
        </div>
        <div className="grid gap-1.5 sm:grid-cols-3">
          {ROLE_LIST.map((r) => (
            <div key={r.id} className="rounded-lg border glass-inset p-2.5">
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${r.badge}`}>{r.label}</span>
              <p className="mt-1 text-[11px] text-muted">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-muted">
          Configura el equipo con la variable <code className="rounded bg-bg-subtle px-1 py-0.5 text-[10px]">NEXT_PUBLIC_APP_USERS</code> (JSON
          con <code className="text-[10px]">name</code>, <code className="text-[10px]">role</code> y <code className="text-[10px]">pass</code> o{" "}
          <code className="text-[10px]">sha256</code> por persona). Ver{" "}
          <Link href="/docs" className="text-accent underline">Documentación</Link>.
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-xs text-muted">
          Project ID de Google Cloud (para los enlaces de habilitación)
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="zero-agency-499717"
            className="mt-1 w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={runAll}
          disabled={running}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          Probar todo
        </button>
      </div>

      {okCount > 0 && (
        <p className="mb-3 text-xs text-muted">
          {okCount} de {checks.length} verificaciones en verde.
        </p>
      )}

      <div className="space-y-2">
        {checks.map((c) => {
          const r = results[c.id] ?? { status: "idle" as Status, detail: "Sin probar." };
          return (
            <div key={c.id} className="flex items-start gap-3 rounded-xl border glass-card p-3">
              <StatusIcon status={r.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{c.label}</span>
                  <button onClick={() => runOne(c)} className="shrink-0 text-[11px] text-accent hover:underline">
                    Probar
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted">{r.detail}</p>
                {r.fixUrl && (
                  <a
                    href={r.fixUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    {r.fixLabel} <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-muted">
        ¿Falta conectar algo? Ve a{" "}
        <Link href="/connectors" className="text-accent underline">Conectores</Link>. Mantén todo en un
        mismo proyecto de Google Cloud (Client ID, API key y APIs habilitadas).
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "running") return <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-accent" />;
  if (status === "ok") return <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />;
  if (status === "warn") return <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />;
  if (status === "fail") return <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />;
  return <Circle size={18} className="mt-0.5 shrink-0 text-gray-300" />;
}
