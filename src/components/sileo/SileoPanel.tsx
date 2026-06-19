"use client";

import Link from "next/link";
import { X, CheckCheck, Trash2, BellOff, Bell, Settings2, ExternalLink } from "lucide-react";
import { useSileo, CATEGORY_META, type SileoNotification } from "@/lib/sileo/store";

export function SileoPanel() {
  const open = useSileo((s) => s.open);
  const setOpen = useSileo((s) => s.setOpen);
  const items = useSileo((s) => s.items);
  const quiet = useSileo((s) => s.quiet);
  const markAllRead = useSileo((s) => s.markAllRead);
  const markRead = useSileo((s) => s.markRead);
  const clear = useSileo((s) => s.clear);
  const toggleQuiet = useSileo((s) => s.toggleQuiet);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={() => setOpen(false)}>
      <div
        className="zero-pop flex h-full w-full max-w-sm flex-col border-l glass-card shadow-2xl"
        style={{ transformOrigin: "right" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="zero-monogram grid h-7 w-7 place-items-center rounded-lg text-[11px]">S</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">SILEO</div>
            <div className="text-[10px] text-muted">Notificaciones internas</div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleQuiet}
              title={quiet ? "Salir de modo silencio" : "Modo silencio"}
              className={`rounded p-1 hover:bg-bg-subtle ${quiet ? "text-amber-500" : "text-muted hover:text-ink"}`}
            >
              {quiet ? <BellOff size={15} /> : <Bell size={15} />}
            </button>
            {items.length > 0 && (
              <>
                <button onClick={markAllRead} className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-ink" title="Marcar todo leído">
                  <CheckCheck size={15} />
                </button>
                <button onClick={clear} className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-red-500" title="Limpiar">
                  <Trash2 size={15} />
                </button>
              </>
            )}
            <button onClick={() => setOpen(false)} className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-ink">
              <X size={16} />
            </button>
          </div>
        </div>

        {quiet && (
          <div className="border-b bg-amber-400/5 px-4 py-1.5 text-[11px] text-amber-600">Modo silencio activo · no verás avisos emergentes.</div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted">Sin notificaciones por ahora.</p>
          ) : (
            <div className="space-y-1">
              {items.map((n) => (
                <Row key={n.id} n={n} onRead={() => markRead(n.id)} onClose={() => setOpen(false)} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-3 py-2">
          <Link
            href="/notificaciones"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-accent hover:bg-bg-subtle"
          >
            <Settings2 size={13} /> Centro de notificaciones
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ n, onRead, onClose }: { n: SileoNotification; onRead: () => void; onClose: () => void }) {
  const meta = CATEGORY_META[n.category];
  const body = (
    <div className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm ${n.read ? "opacity-65" : ""} ${n.priority === "high" ? "bg-red-500/5" : "hover:bg-bg-subtle"}`}>
      <span className="mt-0.5 text-base leading-none">{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`${n.priority === "high" ? "font-medium text-ink" : "text-ink"} ${n.read ? "" : "font-medium"}`}>{n.title}</p>
        {n.body && <p className="truncate text-[11px] text-muted">{n.body}</p>}
        <p className="mt-0.5 text-[10px] text-muted">
          {meta.label}
          {n.actor ? ` · ${n.actor}` : ""} · {relTime(n.ts)}
          {n.href && <ExternalLink size={9} className="ml-1 inline" />}
        </p>
      </div>
      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
    </div>
  );
  if (n.href) {
    return (
      <Link href={n.href} onClick={() => { onRead(); onClose(); }}>
        {body}
      </Link>
    );
  }
  return (
    <button className="w-full text-left" onClick={onRead}>
      {body}
    </button>
  );
}

function relTime(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "ahora";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(ts).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}
