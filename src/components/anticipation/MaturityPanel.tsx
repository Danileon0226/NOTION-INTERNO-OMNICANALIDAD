"use client";

import { TrendingUp, ArrowRight, Check } from "lucide-react";
import { useConnectors, googleTokenValid, GMAIL_SCOPE, DRIVE_SCOPE, CALENDAR_SCOPE } from "@/lib/connectors/store";
import { useAnticipation } from "@/lib/anticipation/store";
import { useAutonomy } from "@/lib/anticipation/autonomy";
import { useMonitor } from "@/lib/monitor/store";
import { computeMaturity, MATURITY_STEPS } from "@/lib/anticipation/maturity";

export function MaturityPanel() {
  const conn = useConnectors();
  const ant = useAnticipation();
  const aut = useAutonomy();
  const mon = useMonitor();

  const connectors = [
    googleTokenValid(conn.google, GMAIL_SCOPE),
    googleTokenValid(conn.google, DRIVE_SCOPE),
    googleTokenValid(conn.google, CALENDAR_SCOPE),
    !!conn.github.account || !!conn.github.token,
    !!conn.telegram.botToken,
  ].filter(Boolean).length;

  const m = computeMaturity({
    connectors,
    anticipationEnabled: ant.enabled,
    decisions: ant.decisions.length,
    monitoring: mon.enabled && mon.sites.length > 0,
    autonomyActive: aut.active,
    autoMode: ant.defaultMode === "auto",
  });

  return (
    <div className="rounded-xl border glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp size={16} className="text-accent" />
        <span className="text-sm font-semibold text-ink">Madurez de ZERO</span>
        <span className="ml-auto rounded bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
          {MATURITY_STEPS[m.index].label}
        </span>
      </div>

      {/* Escalera */}
      <div className="flex items-center gap-1">
        {MATURITY_STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-1">
            <div className="flex-1">
              <div
                className={`h-1.5 rounded-full ${i <= m.index ? "bg-accent" : "bg-bg-subtle"}`}
              />
              <div className={`mt-1 flex items-center gap-1 text-[10px] ${i <= m.index ? "text-ink" : "text-muted"}`}>
                {i < m.index && <Check size={10} className="text-accent" />}
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">{MATURITY_STEPS[m.index].desc}</p>

      {m.nextStep && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-bg-subtle px-3 py-2 text-xs text-ink">
          <ArrowRight size={13} className="mt-0.5 shrink-0 text-accent" />
          <span>
            <span className="font-medium">Siguiente paso:</span> {m.nextStep}
          </span>
        </div>
      )}
    </div>
  );
}
