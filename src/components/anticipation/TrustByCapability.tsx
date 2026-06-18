"use client";

import { SlidersHorizontal } from "lucide-react";
import { useAnticipation, typeCalibration, type TrustMode } from "@/lib/anticipation/store";

// Catálogo de capacidades (tipos que emite el motor) con etiqueta legible.
const CAPABILITIES: { type: string; label: string }[] = [
  { type: "error.prevention", label: "Prevención de incidentes" },
  { type: "right.sizing", label: "Finanzas / dimensionamiento" },
  { type: "next.best.feature", label: "Seguimiento de leads" },
  { type: "onboarding.autoconfig", label: "Preparación / onboarding" },
  { type: "smart.defaults", label: "Triage de bandeja" },
];

const OPTIONS: { id: TrustMode | "global"; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "shadow", label: "Shadow" },
  { id: "suggest", label: "Suggest" },
  { id: "auto", label: "Auto" },
];

export function TrustByCapability() {
  const defaultMode = useAnticipation((s) => s.defaultMode);
  const modeByType = useAnticipation((s) => s.modeByType);
  const setModeForType = useAnticipation((s) => s.setModeForType);
  const decisions = useAnticipation((s) => s.decisions);

  return (
    <div className="rounded-xl border glass-card p-4">
      <div className="mb-1 flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-accent" />
        <span className="text-sm font-semibold text-ink">Confianza por capacidad</span>
      </div>
      <p className="mb-3 text-xs text-muted">
        Ajusta la escalera por tipo (anula el modo global). La calibración refleja cuánto sueles
        aceptar cada capacidad.
      </p>

      <div className="space-y-2">
        {CAPABILITIES.map((c) => {
          const current = modeByType[c.type] ?? "global";
          const cal = typeCalibration(decisions, c.type);
          const calPct = Math.round((cal - 1) * 100);
          return (
            <div key={c.type} className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-ink">{c.label}</span>
                {calPct !== 0 && (
                  <span
                    className={`ml-1.5 text-[10px] ${calPct > 0 ? "text-emerald-600" : "text-amber-600"}`}
                    title="Calibración por tu feedback"
                  >
                    {calPct > 0 ? "+" : ""}
                    {calPct}%
                  </span>
                )}
              </div>
              <div className="inline-flex overflow-hidden rounded-md border text-[11px]">
                {OPTIONS.map((o) => {
                  const active = o.id === "global" ? !modeByType[c.type] : current === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setModeForType(c.type, o.id === "global" ? null : (o.id as TrustMode))}
                      className={`px-2 py-1 ${
                        active ? "bg-accent text-white" : "glass-card text-muted hover:bg-bg-subtle"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted">Modo global actual: <span className="font-medium text-ink">{defaultMode}</span></p>
    </div>
  );
}
