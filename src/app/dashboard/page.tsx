"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Inbox,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  Wifi,
  Radar,
  Mail,
  Calendar,
  Plug,
} from "lucide-react";
import type { DashboardMetric, EmailCategory, EmailItem } from "@/lib/types";
import { categoryColors, categoryLabels } from "@/lib/data/emails";
import { emptyEmailsData, buildEmailsData, type EmailsData } from "@/lib/clientData";
import { useConnectors, googleTokenValid, GMAIL_SCOPE, DRIVE_SCOPE, CALENDAR_SCOPE } from "@/lib/connectors/store";
import { gmailProfile, gmailFetchInbox } from "@/lib/connectors/google";
import { connectGoogle } from "@/lib/connectors/googleConnect";
import { AnticipationPanel } from "@/components/anticipation/AnticipationPanel";

export default function DashboardPage() {
  const [data, setData] = useState<EmailsData | null>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const conn = useConnectors();

  async function load() {
    setLoading(true);
    setErr("");
    // La bandeja llega SIEMPRE en vivo desde Gmail. Sin datos de ejemplo.
    if (googleTokenValid(conn.google, GMAIL_SCOPE)) {
      try {
        const token = conn.google.accessToken;
        const emails = await gmailFetchInbox(token);
        let email = "Gmail conectado";
        try {
          email = (await gmailProfile(token)).emailAddress;
        } catch {
          /* perfil opcional */
        }
        setData(buildEmailsData(emails, email));
        setLive(true);
        setLoading(false);
        return;
      } catch {
        /* token expirado → pide reconectar */
      }
    }
    setData(emptyEmailsData());
    setLive(false);
    setLoading(false);
  }

  async function connect() {
    setErr("");
    setLoading(true);
    try {
      // Un clic = Gmail + Drive + Calendar.
      await connectGoogle();
      await load();
    } catch (e) {
      setErr((e as Error).message);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveConnectors = [
    {
      id: "gmail",
      name: "Gmail",
      connected: googleTokenValid(conn.google, GMAIL_SCOPE),
      detail: googleTokenValid(conn.google, GMAIL_SCOPE) ? "Bandeja en vivo" : "Sin conectar",
    },
    {
      id: "drive",
      name: "Google Drive",
      connected: googleTokenValid(conn.google, DRIVE_SCOPE),
      detail: googleTokenValid(conn.google, DRIVE_SCOPE) ? "Archivos sincronizados" : "Sin conectar",
    },
    {
      id: "calendar",
      name: "Google Calendar",
      connected: googleTokenValid(conn.google, CALENDAR_SCOPE),
      detail: googleTokenValid(conn.google, CALENDAR_SCOPE) ? "Eventos en vivo" : "Sin conectar",
    },
    {
      id: "github",
      name: "GitHub",
      connected: !!conn.github.account || !!conn.github.token,
      detail: conn.github.account ? `@${conn.github.account}` : conn.github.token ? "Token configurado" : "Sin conectar",
    },
    {
      id: "telegram",
      name: "Telegram",
      connected: !!conn.telegram.botToken,
      detail: conn.telegram.botToken ? "Bot configurado" : "Sin conectar",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard de la agencia</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                live ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
              }`}
            >
              <Wifi size={11} /> {live ? "En vivo" : "Sin conectar"}
            </span>
            <span className="font-medium text-ink">{data?.email || "tu correo"}</span> ·{" "}
            {data ? new Date(data.syncedAt).toLocaleString("es-CO") : "sincronizando…"}
          </p>
        </div>
        <button
          onClick={live ? load : connect}
          className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {live ? "Sincronizar" : "Conectar Google"}
        </button>
      </header>

      {!live && !loading && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-semibold text-ink">Conecta tu Google para alimentar el dashboard</p>
              <p className="text-xs text-muted">
                Un solo clic conecta Gmail, Drive y Calendar. Sin datos de ejemplo: todo en vivo.
              </p>
            </div>
          </div>
          <button
            onClick={connect}
            className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Conectar Gmail + Drive + Calendar
          </button>
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>
      )}

      {/* Accesos rápidos (navegación de un toque, mobile-first) */}
      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/anticipation" icon={<Radar size={18} />} label="Anticipación" hint="ZERO se adelanta" />
        <QuickLink href="/inbox" icon={<Mail size={18} />} label="Bandeja" hint="Correo en vivo" />
        <QuickLink href="/calendar" icon={<Calendar size={18} />} label="Calendario" hint="Tu agenda" />
        <QuickLink href="/connectors" icon={<Plug size={18} />} label="Conectores" hint="Integraciones" />
      </section>

      {/* Métricas */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(data?.metrics ?? []).map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </section>

      {/* Anticipación: ZERO se adelanta */}
      <section className="mt-6">
        <AnticipationPanel limit={4} />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Acciones sugeridas */}
        <section className="lg:col-span-2">
          <SectionTitle icon={<Sparkles size={16} />} title="Acciones sugeridas por IA" />
          <div className="space-y-2">
            {(data?.actions ?? []).map((a) => (
              <ActionRow key={a.id} email={a} />
            ))}
            {data && data.actions.length === 0 && (
              <EmptyState text="Sin acciones pendientes. ¡Bandeja al día!" />
            )}
          </div>

          <SectionTitle icon={<Inbox size={16} />} title="Correos recientes" className="mt-7" />
          <div className="divide-y rounded-lg border bg-card">
            {(data?.emails ?? []).slice(0, 8).map((e) => (
              <EmailRow key={e.id} email={e} />
            ))}
          </div>
        </section>

        {/* Sidebar derecho */}
        <section className="space-y-6">
          <div>
            <SectionTitle title="Por categoría" />
            <div className="space-y-2 rounded-lg border bg-card p-4">
              {(data?.categories ?? []).map((c) => (
                <CategoryBar
                  key={c.category}
                  category={c.category}
                  count={c.count}
                  total={data?.emails.length ?? 1}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionTitle title="Conectores" />
            <div className="space-y-2">
              {liveConnectors.map((c) => (
                <ConnectorMini key={c.id} name={c.name} connected={c.connected} detail={c.detail} />
              ))}
              <Link
                href="/connectors"
                className="flex items-center justify-center gap-1 rounded-md border border-dashed py-2 text-xs text-muted hover:bg-bg-subtle"
              >
                Gestionar integraciones <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="hover-lift flex items-center gap-3 rounded-xl border bg-card p-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{label}</span>
        <span className="block truncate text-[11px] text-muted">{hint}</span>
      </span>
    </Link>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const TrendIcon =
    metric.trend === "up" ? TrendingUp : metric.trend === "down" ? TrendingDown : Minus;
  const trendColor =
    metric.trend === "up" ? "text-emerald-600" : metric.trend === "down" ? "text-red-500" : "text-muted";
  return (
    <div className="hover-lift rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{metric.label}</span>
        {metric.trend && <TrendIcon size={14} className={trendColor} />}
      </div>
      <div className="mt-1 text-3xl font-bold text-ink">{metric.value}</div>
      {metric.hint && <div className="mt-0.5 text-xs text-muted">{metric.hint}</div>}
    </div>
  );
}

function SectionTitle({
  title,
  icon,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-ink ${className}`}>
      {icon && <span className="text-accent">{icon}</span>}
      {title}
    </h2>
  );
}

function ActionRow({ email }: { email: EmailItem }) {
  const danger = email.priority === "alta";
  return (
    <div className="flex items-start gap-2.5 rounded-lg border bg-card p-3">
      {danger ? (
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
      ) : (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{email.actionItem}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {email.senderName} · {email.subject}
        </p>
      </div>
      <PriorityTag priority={email.priority} />
    </div>
  );
}

function EmailRow({ email }: { email: EmailItem }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-bg-subtle">
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: categoryColors[email.category] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm ${email.unread ? "font-semibold text-ink" : "text-ink/80"}`}>
            {email.subject}
          </span>
        </div>
        <p className="truncate text-xs text-muted">{email.snippet}</p>
      </div>
      <span className="shrink-0 text-[11px] text-muted">
        {new Date(email.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
      </span>
    </div>
  );
}

function CategoryBar({
  category,
  count,
  total,
}: {
  category: EmailCategory;
  count: number;
  total: number;
}) {
  const pct = Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink">{categoryLabels[category]}</span>
        <span className="text-muted">{count}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: categoryColors[category] }} />
      </div>
    </div>
  );
}

function ConnectorMini({ name, connected, detail }: { name: string; connected: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border bg-card px-3 py-2">
      <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-gray-300"}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-ink">{name}</div>
        <div className="truncate text-[11px] text-muted">{detail}</div>
      </div>
    </div>
  );
}

function PriorityTag({ priority }: { priority: EmailItem["priority"] }) {
  const styles = {
    alta: "bg-red-50 text-red-600",
    media: "bg-amber-50 text-amber-600",
    baja: "bg-gray-100 text-gray-500",
  } as const;
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted">{text}</div>;
}
