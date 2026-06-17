"use client";

import Link from "next/link";
import { Activity, Radar, Plug, Globe, Bot } from "lucide-react";
import {
  useConnectors,
  googleTokenValid,
  GMAIL_SCOPE,
  DRIVE_SCOPE,
  CALENDAR_SCOPE,
} from "@/lib/connectors/store";
import { useAnticipation, anticipationMetrics } from "@/lib/anticipation/store";
import { useAutonomy } from "@/lib/anticipation/autonomy";
import { useMonitor, uptime, statusOf } from "@/lib/monitor/store";
import { computeMaturity, MATURITY_STEPS } from "@/lib/anticipation/maturity";

// Torre de control: reúne madurez, conectores, anticipación, monitoreo y
// autonomía en una sola tira de un vistazo. Sin red: lee de los stores.
export function SystemHealthPanel() {
  const conn = useConnectors();
  const ant = useAnticipation();
  const aut = useAutonomy();
  const mon = useMonitor();

  const connectorsList = [
    googleTokenValid(conn.google, GMAIL_SCOPE),
    googleTokenValid(conn.google, DRIVE_SCOPE),
    googleTokenValid(conn.google, CALENDAR_SCOPE),
    !!conn.github.account || !!conn.github.token,
    !!conn.telegram.botToken,
  ];
  const connectors = connectorsList.filter(Boolean).length;

  const maturity = computeMaturity({
    connectors,
    anticipationEnabled: ant.enabled,
    decisions: ant.decisions.length,
    monitoring: mon.enabled && mon.sites.length > 0,
    autonomyActive: aut.active,
    autoMode: ant.defaultMode === "auto",
  });

  const m = anticipationMetrics(ant.decisions);
  const mainSite = mon.sites[0];
  const siteUp = mainSite ? Math.round(uptime(mainSite) * 100) : null;
  const siteStatus = mainSite ? statusOf(mainSite) : "unknown";
  const todayActs = aut.log.filter((a) => Date.now() - a.ts < 86_400_000).length;

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Tile
        href="/anticipation"
        icon={<Activity size={16} />}
        label="Madurez"
        value={MATURITY_STEPS[maturity.index].label}
        hint={`nivel ${maturity.index + 1}/4`}
      />
      <Tile
        href="/connectors"
        icon={<Plug size={16} />}
        label="Conectores"
        value={`${connectors}/5`}
        hint={connectors ? "conectados" : "sin conectar"}
        tone={connectors ? "ok" : "warn"}
      />
      <Tile
        href="/anticipation"
        icon={<Radar size={16} />}
        label="Anticipación"
        value={ant.enabled ? `${Math.round(m.acceptanceRate * 100)}%` : "off"}
        hint={ant.enabled ? "aceptación" : "desactivada"}
        tone={ant.enabled ? "ok" : "warn"}
      />
      <Tile
        href="/monitor"
        icon={<Globe size={16} />}
        label="Sitio web"
        value={siteUp != null ? `${siteUp}%` : "—"}
        hint={siteUp != null ? "uptime" : "sin datos"}
        tone={siteStatus === "down" ? "down" : siteStatus === "slow" ? "warn" : "ok"}
      />
      <Tile
        href="/anticipation"
        icon={<Bot size={16} />}
        label="Autonomía"
        value={aut.active ? "ON" : "OFF"}
        hint={aut.active ? `${todayActs} acción(es) hoy` : "en espera"}
        tone={aut.active ? "ok" : undefined}
      />
    </section>
  );
}

function Tile({
  href,
  icon,
  label,
  value,
  hint,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "ok" | "warn" | "down";
}) {
  const dot =
    tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : tone === "down" ? "bg-red-500" : "bg-gray-300";
  return (
    <Link href={href} className="hover-lift rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted">
        <span className="text-accent">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
        {tone && <span className={`ml-auto h-2 w-2 rounded-full ${dot}`} />}
      </div>
      <div className="mt-1 truncate text-lg font-bold text-ink">{value}</div>
      <div className="truncate text-[11px] text-muted">{hint}</div>
    </Link>
  );
}
