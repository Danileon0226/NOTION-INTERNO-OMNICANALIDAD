"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MousePointerClick,
  Eye,
  Users2,
  MessageCircle,
  UserPlus,
  AlertTriangle,
  Link2,
  Radio,
} from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { authMode } from "@/lib/account";
import {
  watchWebEvents,
  webEventMeta,
  eventParams,
  WEB_EVENT_META,
  type WebEvent,
} from "@/lib/firebase/webEvents";

const DAY = 86_400_000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function timeAgo(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < DAY / 1000) return `hace ${Math.round(s / 3600)} h`;
  return new Date(ts).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export default function Web360Page() {
  const [events, setEvents] = useState<WebEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (authMode !== "firebase") {
      setLoading(false);
      return;
    }
    const unsub = watchWebEvents((list) => {
      setEvents(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const today = useMemo(() => events.filter((e) => e.ts >= startOfToday()), [events]);

  const kpis = useMemo(
    () => ({
      sessions: new Set(today.map((e) => e.session)).size,
      views: today.filter((e) => e.name === "page_view").length,
      whatsapp: today.filter((e) => e.name === "whatsapp_click").length,
      leads: today.filter((e) => e.name === "lead_submit" || e.name === "blog_subscribe").length,
      errors: today.filter((e) => e.name === "js_error").length,
    }),
    [today]
  );

  const topPages = useMemo(() => {
    const by = new Map<string, number>();
    for (const e of today) if (e.name === "page_view") by.set(e.path, (by.get(e.path) || 0) + 1);
    return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [today]);

  const sources = useMemo(() => {
    const by = new Map<string, number>();
    for (const e of today) {
      if (e.name !== "session_start") continue;
      let label = "Directo";
      if (e.utm) label = `UTM: ${e.utm}`;
      else if (e.ref) {
        try {
          label = new URL(e.ref).host;
        } catch {
          label = e.ref.slice(0, 40);
        }
      }
      by.set(label, (by.get(label) || 0) + 1);
    }
    return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [today]);

  const names = useMemo(() => {
    const present = new Set(events.map((e) => e.name));
    return Object.keys(WEB_EVENT_META).filter((n) => present.has(n));
  }, [events]);

  const feed = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.name === filter)).slice(0, 120),
    [events, filter]
  );

  if (authMode !== "firebase") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <ModuleHeader icon={<MousePointerClick size={20} />} title="Web 360" subtitle="Todo lo que pasa en el sitio, en vivo." />
        <div className="rounded-xl border glass-card p-6 text-sm text-muted">
          Web 360 lee la colección <code className="rounded bg-bg-subtle px-1 py-0.5 text-[11px]">web_events</code> de Firestore (la escribe
          el propio sitio zeroagency.com.co). Configura Firebase (<code className="text-[11px]">NEXT_PUBLIC_FIREBASE_*</code>) para activarlo.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<MousePointerClick size={20} />}
        title="Web 360"
        subtitle="Cada visita, clic, formulario, scroll y error de zeroagency.com.co, comunicado en vivo a tu omnicanalidad."
      />

      {/* KPIs de hoy */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <Kpi icon={<Users2 size={15} />} label="Visitas hoy" value={kpis.sessions} />
        <Kpi icon={<Eye size={15} />} label="Vistas de página" value={kpis.views} />
        <Kpi icon={<MessageCircle size={15} />} label="Clics a WhatsApp" value={kpis.whatsapp} tone="text-emerald-600" />
        <Kpi icon={<UserPlus size={15} />} label="Leads + subs" value={kpis.leads} tone="text-accent" />
        <Kpi icon={<AlertTriangle size={15} />} label="Errores JS" value={kpis.errors} tone={kpis.errors ? "text-red-500" : undefined} />
      </div>

      {loading ? (
        <SkeletonList rows={6} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Radio size={22} />}
          title="Aún no llegan eventos del sitio"
          description="En cuanto un visitante acepte cookies en zeroagency.com.co, verás aquí sus vistas, clics, formularios y errores en tiempo real."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Feed en vivo */}
          <div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                Todo ({events.length})
              </Chip>
              {names.map((n) => (
                <Chip key={n} active={filter === n} onClick={() => setFilter(n)}>
                  {webEventMeta(n).label} ({events.filter((e) => e.name === n).length})
                </Chip>
              ))}
            </div>
            <div className="space-y-1.5">
              {feed.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </div>

          {/* Panorama del día */}
          <div className="space-y-4">
            <Panel title="Top páginas (hoy)" icon={<Eye size={13} />}>
              {topPages.length === 0 ? (
                <p className="text-xs text-muted">Sin vistas todavía.</p>
              ) : (
                topPages.map(([path, n]) => <Bar key={path} label={path} n={n} max={topPages[0][1]} />)
              )}
            </Panel>
            <Panel title="Fuentes de visita (hoy)" icon={<Link2 size={13} />}>
              {sources.length === 0 ? (
                <p className="text-xs text-muted">Sin visitas nuevas todavía.</p>
              ) : (
                sources.map(([label, n]) => <Bar key={label} label={label} n={n} max={sources[0][1]} />)
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: WebEvent }) {
  const meta = webEventMeta(event.name);
  const p = eventParams(event);
  const detail =
    event.name === "whatsapp_click"
      ? `desde ${String(p.cta_location || event.path)}`
      : event.name === "scroll_depth"
        ? `${String(p.depth)}% de ${event.path}`
        : event.name === "js_error"
          ? String(p.message || "").slice(0, 80)
          : event.name === "click_out"
            ? `→ ${String(p.host || "")}`
            : event.name === "page_leave"
              ? `${String(p.seconds ?? "?")} s en ${event.path}`
              : event.path;
  return (
    <div className="flex items-center gap-2.5 rounded-lg border glass-card px-2.5 py-2">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.tone}`}>{meta.label}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-ink/80">{detail}</span>
      <span className="hidden shrink-0 text-[10px] text-muted sm:inline">{event.device === "mobile" ? "📱" : "💻"} {event.lang || ""}</span>
      <span className="shrink-0 text-[10px] text-muted">{timeAgo(event.ts)}</span>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border glass-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {icon} {label}
      </div>
      <div className={`mt-1 text-xl font-black ${tone || "text-ink"}`}>{value}</div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border glass-card p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon} {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Bar({ label, n, max }: { label: string; n: number; max: number }) {
  return (
    <div className="text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-ink/80">{label}</span>
        <span className="shrink-0 text-muted">{n}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-bg-subtle">
        <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.max(8, (n / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs ${
        active ? "border-accent bg-accent/10 font-medium text-accent" : "glass-card text-muted hover:border-accent/40"
      }`}
    >
      {children}
    </button>
  );
}
