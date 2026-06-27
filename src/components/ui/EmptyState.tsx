"use client";

import type { ReactNode } from "react";

// Estado vacío reutilizable con marca: filigrana "0", icono, copy y acción.
// Mantiene un mismo lenguaje visual en todos los módulos.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border glass-card px-6 py-12 text-center ${className}`}
    >
      {/* Filigrana de marca */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] font-black leading-none text-accent/[0.06]"
      >
        0
      </span>

      <div className="relative mx-auto flex max-w-sm flex-col items-center">
        {icon && (
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl glass-inset text-accent">
            {icon}
          </div>
        )}
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
