"use client";

import { Bell, X, Trash2, AlertTriangle } from "lucide-react";
import { useActivity, sourceMeta } from "@/lib/activity";
import { useNotifications } from "@/lib/ui/notifications";

export function NotificationsPanel() {
  const open = useNotifications((s) => s.open);
  const setOpen = useNotifications((s) => s.setOpen);
  const events = useActivity((s) => s.events);
  const clear = useActivity((s) => s.clear);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={() => setOpen(false)}>
      <div
        className="zero-pop flex h-full w-full max-w-sm flex-col border-l glass-card shadow-2xl"
        style={{ transformOrigin: "right" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Bell size={16} className="text-accent" />
          <span className="text-sm font-semibold text-ink">Notificaciones</span>
          <div className="ml-auto flex items-center gap-1">
            {events.length > 0 && (
              <button onClick={clear} className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-red-500" title="Limpiar">
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-ink">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {events.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted">Sin notificaciones por ahora.</p>
          ) : (
            <div className="space-y-1">
              {events.map((e) => {
                const alert = e.kind === "alert";
                return (
                  <div
                    key={e.id}
                    className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm ${
                      alert ? "bg-red-50" : "hover:bg-bg-subtle"
                    }`}
                  >
                    {alert ? (
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
                    ) : (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: sourceMeta[e.source].color }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate ${alert ? "text-red-700" : "text-ink"}`}>{e.label}</p>
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
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
