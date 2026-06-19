"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSileo, CATEGORY_META } from "@/lib/sileo/store";

// Aviso emergente (rápido) para notificaciones de alta prioridad / menciones.
// Respeta el modo silencio (no se crea el toast si quiet está activo).
export function SileoToast() {
  const toast = useSileo((s) => s.toast);
  const dismiss = useSileo((s) => s.dismissToast);
  const setOpen = useSileo((s) => s.setOpen);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setLeaving(false);
    const out = setTimeout(() => setLeaving(true), 4200);
    const gone = setTimeout(() => dismiss(), 4600);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, [toast, dismiss]);

  if (!toast) return null;
  const meta = CATEGORY_META[toast.category];

  const inner = (
    <div
      className={`celebrate-card flex items-start gap-2.5 rounded-2xl border glass-pop px-3.5 py-3 ${leaving ? "celebrate-out" : "celebrate-in"}`}
      onClick={() => {
        setOpen(true);
        dismiss();
      }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl glass-inset text-lg">{meta.icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">SILEO · {meta.label}</div>
        <div className="truncate text-sm font-semibold text-ink">{toast.title}</div>
        {toast.body && <div className="truncate text-xs text-muted">{toast.body}</div>}
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[65] w-full max-w-xs">
      <div className="pointer-events-auto cursor-pointer">
        {toast.href ? (
          <Link href={toast.href} onClick={() => dismiss()}>
            {inner}
          </Link>
        ) : (
          inner
        )}
      </div>
    </div>
  );
}
