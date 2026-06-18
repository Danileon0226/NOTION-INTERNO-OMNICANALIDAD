"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  useConnectors,
  googleTokenValid,
  GMAIL_SCOPE,
  CALENDAR_SCOPE,
  DRIVE_SCOPE,
} from "@/lib/connectors/store";
import { gmailFetchInbox, calendarEvents, driveList } from "@/lib/connectors/google";
import { ghFetchAll } from "@/lib/connectors/github";
import { useMonitor, statusOf, uptime } from "@/lib/monitor/store";

// Banco de datos: caché client-side de la información de la agencia que se
// mantiene caliente en segundo plano. El agente lo inyecta como contexto para
// responder al instante, sin esperar round-trips a cada API.

interface GmailSnap {
  unread: number;
  recent: { subject: string; from: string; unread: boolean; category: string }[];
}
interface CalendarSnap {
  events: { summary: string; inHours: number }[];
}
interface GithubSnap {
  repos: number;
  openPRs: number;
  openIssues: number;
  top: string[];
}
interface DriveSnap {
  files: string[];
}

interface DataBankState {
  gmail?: GmailSnap;
  calendar?: CalendarSnap;
  github?: GithubSnap;
  drive?: DriveSnap;
  lastRefresh: number;
  refreshing: boolean;
  set: (p: Partial<DataBankState>) => void;
}

export const useDataBank = create<DataBankState>()(
  persist(
    (set) => ({
      lastRefresh: 0,
      refreshing: false,
      set: (p) => set(p),
    }),
    { name: "zero-agency-databank" }
  )
);

function hoursUntil(iso?: string): number {
  if (!iso) return 999;
  return Math.round(((new Date(iso).getTime() - Date.now()) / 3_600_000) * 10) / 10;
}

let inflight = false;

/** Refresca el banco con todas las fuentes conectadas (best-effort, en paralelo). */
export async function refreshDataBank(force = false): Promise<void> {
  if (inflight) return;
  const bank = useDataBank.getState();
  // No machaca si se refrescó hace < 60s (salvo force).
  if (!force && Date.now() - bank.lastRefresh < 60_000) return;

  const c = useConnectors.getState();
  const g = c.google;
  inflight = true;
  useDataBank.getState().set({ refreshing: true });
  try {
    const patch: Partial<DataBankState> = {};
    await Promise.allSettled([
      googleTokenValid(g, GMAIL_SCOPE)
        ? gmailFetchInbox(g.accessToken, 15).then((m) => {
            patch.gmail = {
              unread: m.filter((e) => e.unread).length,
              recent: m.slice(0, 8).map((e) => ({ subject: e.subject, from: e.senderName, unread: e.unread, category: e.category })),
            };
          })
        : Promise.resolve(),
      googleTokenValid(g, CALENDAR_SCOPE)
        ? calendarEvents(g.accessToken, 8).then((evs) => {
            patch.calendar = {
              events: evs.map((e) => ({ summary: e.summary || "(evento)", inHours: hoursUntil(e.start?.dateTime || e.start?.date) })),
            };
          })
        : Promise.resolve(),
      googleTokenValid(g, DRIVE_SCOPE)
        ? driveList(g.accessToken, 12).then((f) => {
            patch.drive = { files: f.slice(0, 10).map((x) => x.name) };
          })
        : Promise.resolve(),
      c.github.account || c.github.token
        ? ghFetchAll(c.github.account, c.github.token || undefined).then((d) => {
            patch.github = {
              repos: d.repos.length,
              openPRs: d.openPRs,
              openIssues: d.openIssues,
              top: d.repos.slice(0, 5).map((r) => r.full_name),
            };
          })
        : Promise.resolve(),
    ]);
    useDataBank.getState().set({ ...patch, lastRefresh: Date.now(), refreshing: false });
  } finally {
    inflight = false;
    useDataBank.getState().set({ refreshing: false });
  }
}

/** Contexto compacto y token-eficiente del estado actual para el agente. */
export function bankContext(): string {
  const b = useDataBank.getState();
  const lines: string[] = [];
  if (b.gmail) {
    const top = b.gmail.recent.map((e) => `${e.unread ? "•" : ""}${e.subject} (${e.from}, ${e.category})`).join(" | ");
    lines.push(`Gmail: ${b.gmail.unread} no leídos. Recientes: ${top}`);
  }
  if (b.calendar?.events.length) {
    const ev = b.calendar.events
      .filter((e) => e.inHours >= 0 && e.inHours <= 72)
      .map((e) => `${e.summary} (en ${e.inHours}h)`)
      .join(" | ");
    if (ev) lines.push(`Calendario próximo: ${ev}`);
  }
  if (b.github) lines.push(`GitHub: ${b.github.repos} repos, ${b.github.openPRs} PRs abiertos, ${b.github.openIssues} issues. Top: ${b.github.top.join(", ")}`);
  if (b.drive?.files.length) lines.push(`Drive reciente: ${b.drive.files.slice(0, 8).join(", ")}`);

  // Monitoreo (sin red).
  const sites = useMonitor.getState().sites;
  if (sites.length) {
    const s = sites.map((x) => `${x.label}: ${statusOf(x)} (${Math.round(uptime(x) * 100)}% uptime)`).join("; ");
    lines.push(`Sitio: ${s}`);
  }

  if (!lines.length) return "";
  const age = b.lastRefresh ? Math.round((Date.now() - b.lastRefresh) / 60_000) : 0;
  return `## BANCO DE DATOS (estado actual, hace ${age} min — úsalo directamente sin volver a consultar si basta)\n${lines.join("\n")}`;
}
