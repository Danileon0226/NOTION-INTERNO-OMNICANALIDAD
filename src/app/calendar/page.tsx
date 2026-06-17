"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Loader2, RefreshCw, Sparkles, ExternalLink } from "lucide-react";
import { useConnectors, googleTokenValid, CALENDAR_SCOPE } from "@/lib/connectors/store";
import { calendarEvents, type CalendarEvent } from "@/lib/connectors/google";
import { connectGoogle } from "@/lib/connectors/googleConnect";

export default function CalendarPage() {
  const conn = useConnectors();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const connected = googleTokenValid(conn.google, CALENDAR_SCOPE);

  const load = useCallback(async () => {
    const g = useConnectors.getState().google;
    if (!googleTokenValid(g, CALENDAR_SCOPE)) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      setEvents(await calendarEvents(g.accessToken, 25));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function connect() {
    setErr("");
    setLoading(true);
    try {
      await connectGoogle();
      await load();
    } catch (e) {
      setErr((e as Error).message);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  // Agrupa por día para una agenda legible.
  const groups = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const iso = ev.start?.dateTime || ev.start?.date || "";
    const day = iso ? new Date(iso).toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long" }) : "Sin fecha";
    (acc[day] ||= []).push(ev);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Calendar size={22} className="text-accent" /> Calendario
          </h1>
          <p className="mt-1 text-sm text-muted">Tus próximos eventos de Google Calendar, en vivo.</p>
        </div>
        {connected && (
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        )}
      </header>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>
      )}

      {!connected && !loading ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-6 py-12 text-center">
          <Sparkles size={28} className="text-accent" />
          <p className="text-sm font-semibold text-ink">Conecta Google Calendar</p>
          <p className="max-w-sm text-xs text-muted">
            Un clic conecta Gmail, Drive y Calendar. Gestiónalo también en{" "}
            <Link href="/connectors" className="font-medium text-accent underline">Conectores</Link>.
          </p>
          <button onClick={connect} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Conectar Google
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Cargando agenda…
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted">
          No hay eventos próximos.
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([day, evs]) => (
            <div key={day}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{day}</h2>
              <div className="space-y-2">
                {evs.map((ev) => (
                  <EventRow key={ev.id} ev={ev} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ ev }: { ev: CalendarEvent }) {
  const start = ev.start?.dateTime;
  const time = start
    ? new Date(start).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : "Todo el día";
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
        <Clock size={13} /> {time}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{ev.summary || "(sin título)"}</p>
        {ev.location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin size={11} /> {ev.location}
          </p>
        )}
      </div>
      {ev.htmlLink && (
        <a href={ev.htmlLink} target="_blank" rel="noreferrer" className="shrink-0 text-muted hover:text-accent">
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
