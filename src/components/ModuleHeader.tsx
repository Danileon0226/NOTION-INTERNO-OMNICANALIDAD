"use client";

import type { ReactNode } from "react";

// Cabecera de módulo elevada (cristal de marca + monograma). Da una identidad
// visual consistente y premium a cada sección del OS.
export function ModuleHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="module-head zero-rise mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <span className="zero-monogram h-11 w-11 shrink-0">{icon}</span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
