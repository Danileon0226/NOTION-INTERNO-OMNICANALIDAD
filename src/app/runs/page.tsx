"use client";

import { useState } from "react";
import { History, Trash2, Wrench, CheckCircle2, XCircle, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { useRuns, type AgentRun } from "@/lib/ai/runs";
import { ModuleHeader } from "@/components/ModuleHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function RunsPage() {
  const { runs, clear } = useRuns();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<History size={20} />}
        title="Actividad agéntica"
        subtitle="Trazabilidad de todo lo que ejecuta ZERO: petición, herramientas y resultado."
        right={
          runs.length > 0 ? (
            <button onClick={clear} className="rounded-md border px-3 py-1.5 text-sm text-muted hover:bg-bg-subtle hover:text-red-500">
              <Trash2 size={14} className="mr-1 inline" /> Limpiar
            </button>
          ) : undefined
        }
      />

      {runs.length === 0 ? (
        <EmptyState icon={<Zap size={22} />} title="Aún no hay ejecuciones" description="Cuando ZERO actúe —responda, redacte o ejecute herramientas— cada paso quedará registrado aquí." />
      ) : (
        <div className="space-y-2">
          {runs.map((r) => (
            <RunRow key={r.id} run={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({ run, open, onToggle }: { run: AgentRun; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border glass-card">
      <button onClick={onToggle} className="flex w-full items-start gap-2.5 p-3 text-left">
        {run.ok ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{run.prompt}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <span className="rounded bg-bg-subtle px-1.5 py-0.5">{run.source}</span>
            {run.steps.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Wrench size={10} /> {run.steps.length}
              </span>
            )}
            <span>{(run.ms / 1000).toFixed(1)}s</span>
            <span>· {new Date(run.ts).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
        {open ? <ChevronDown size={15} className="mt-0.5 shrink-0 text-muted" /> : <ChevronRight size={15} className="mt-0.5 shrink-0 text-muted" />}
      </button>

      {open && (
        <div className="border-t px-3 py-2.5">
          {run.steps.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {run.steps.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] text-accent"
                  title={JSON.stringify(s.args)}
                >
                  <Wrench size={9} /> {s.tool}
                </span>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap text-xs text-ink">{run.text}</p>
        </div>
      )}
    </div>
  );
}
