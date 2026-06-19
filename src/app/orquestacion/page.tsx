"use client";

import { useState } from "react";
import {
  Workflow,
  Play,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  Code2,
  TestTube2,
  ClipboardList,
  GitBranch,
} from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { useOrchestration } from "@/lib/orchestration/store";
import { runOrchestration } from "@/lib/orchestration/engine";
import { STAGES, TECH_AREAS, type OrchRun, type OrchStage } from "@/lib/orchestration/areas";

const STAGE_ICON: Record<OrchStage, React.ReactNode> = {
  plan: <Workflow size={14} />,
  documentation: <FileText size={14} />,
  code: <Code2 size={14} />,
  e2e: <TestTube2 size={14} />,
  review: <ClipboardList size={14} />,
};

export default function OrchestrationPage() {
  const runs = useOrchestration((s) => s.runs);
  const create = useOrchestration((s) => s.create);
  const remove = useOrchestration((s) => s.remove);
  const [selected, setSelected] = useState<string | null>(null);

  const current = runs.find((r) => r.id === selected) || null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<Workflow size={20} />}
        title="Orquestación"
        subtitle="Orquestador → Documentación → Código → Prueba E2E, con bucle de feedback técnico."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <NewRun
            onCreate={(input) => {
              const id = create(input);
              setSelected(id);
              void runOrchestration(id);
            }}
          />
          <RunList runs={runs} selected={selected} onSelect={setSelected} onRemove={remove} />
        </div>

        {current ? (
          <Detail key={current.id} run={current} />
        ) : (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border glass-card text-sm text-muted">
            Crea una orquestación o selecciona una del historial.
          </div>
        )}
      </div>
    </div>
  );
}

function NewRun({ onCreate }: { onCreate: (i: Pick<OrchRun, "title" | "request" | "areas" | "constraints" | "language">) => void }) {
  const [title, setTitle] = useState("");
  const [request, setRequest] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [constraints, setConstraints] = useState("");
  const [language, setLanguage] = useState("");

  function toggle(id: string) {
    setAreas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  const canRun = title.trim() && request.trim();

  return (
    <div className="rounded-xl border glass-card p-4">
      <div className="mb-2 text-sm font-semibold text-ink">Nueva orquestación</div>
      <div className="space-y-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del requerimiento"
          className="w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="Describe qué necesitas construir…"
          rows={3}
          className="w-full resize-y rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Áreas técnicas</div>
          <div className="flex flex-wrap gap-1.5">
            {TECH_AREAS.map((a) => (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                title={a.hint}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  areas.includes(a.id) ? "border-accent bg-accent/10 font-medium text-accent" : "glass-card text-muted hover:border-accent/40"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          placeholder="Restricciones técnicas (stack, límites, estándares, seguridad…)"
          rows={2}
          className="w-full resize-y rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <input
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="Stack/lenguaje objetivo (p. ej. TypeScript + Next.js)"
          className="w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={() => canRun && onCreate({ title: title.trim(), request: request.trim(), areas, constraints: constraints.trim(), language: language.trim() })}
          disabled={!canRun}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Play size={15} /> Orquestar
        </button>
      </div>
    </div>
  );
}

function RunList({
  runs,
  selected,
  onSelect,
  onRemove,
}: {
  runs: OrchRun[];
  selected: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!runs.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Historial</div>
      {runs.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`group flex w-full items-center gap-2 rounded-lg border p-2 text-left ${
            selected === r.id ? "border-accent/50 bg-accent/5" : "glass-card hover:border-accent/30"
          }`}
        >
          <StatusDot run={r} />
          <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.title}</span>
          <Trash2
            size={13}
            className="shrink-0 text-muted opacity-0 transition hover:text-red-500 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(r.id);
            }}
          />
        </button>
      ))}
    </div>
  );
}

function StatusDot({ run }: { run: OrchRun }) {
  if (run.status === "running") return <Loader2 size={14} className="shrink-0 animate-spin text-accent" />;
  if (run.status === "failed") return <AlertTriangle size={14} className="shrink-0 text-red-500" />;
  if (run.status === "done")
    return run.reviewPassed ? (
      <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
    ) : (
      <AlertTriangle size={14} className="shrink-0 text-amber-500" />
    );
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted/40" />;
}

function Detail({ run }: { run: OrchRun }) {
  const [tab, setTab] = useState<OrchStage>("plan");
  const rerun = () => runOrchestration(run.id);

  const tabs = STAGES.filter((s) => run.artifacts[s.id] || run.currentStage === s.id);
  const activeTab = tabs.find((t) => t.id === tab) ? tab : tabs[0]?.id ?? "plan";

  return (
    <div className="space-y-4 rounded-xl border glass-card p-4">
      {/* Cabecera + estado */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-semibold text-ink">{run.title}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-muted">{run.request}</div>
        </div>
        <button
          onClick={rerun}
          disabled={run.status === "running"}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle disabled:opacity-50"
        >
          {run.status === "running" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Reejecutar
        </button>
      </div>

      {/* Pipeline */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((s, i) => {
          const done = !!run.artifacts[s.id];
          const active = run.status === "running" && run.currentStage === s.id;
          return (
            <span key={s.id} className="flex items-center gap-1.5">
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : done
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : "glass-card text-muted"
                }`}
              >
                {active ? <Loader2 size={12} className="animate-spin" /> : STAGE_ICON[s.id]}
                {s.short}
              </span>
              {i < STAGES.length - 1 && <span className="text-muted/50">→</span>}
            </span>
          );
        })}
      </div>

      {/* Veredicto del bucle de feedback */}
      {run.status === "done" && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
            run.reviewPassed ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700" : "border-amber-500/30 bg-amber-500/5 text-amber-700"
          }`}
        >
          {run.reviewPassed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span className="flex items-center gap-1">
            <GitBranch size={13} /> {run.reviewPassed ? "Aprobado por la revisión técnica" : "Quedan cambios pendientes"} · {run.iterations} iteración(es) de feedback
          </span>
        </div>
      )}
      {run.error && <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 text-sm text-red-600">{run.error}</div>}

      {/* Artefactos */}
      {tabs.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5 border-b pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
                  activeTab === t.id ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-bg-subtle hover:text-ink"
                }`}
              >
                {STAGE_ICON[t.id]} {t.short}
              </button>
            ))}
          </div>
          <Artifact content={run.artifacts[activeTab] || ""} loading={run.status === "running" && run.currentStage === activeTab} />
        </div>
      )}
    </div>
  );
}

function Artifact({ content, loading }: { content: string; loading: boolean }) {
  const [copied, setCopied] = useState(false);
  if (loading && !content) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 size={16} className="animate-spin text-accent" /> Generando…
      </div>
    );
  }
  return (
    <div className="relative">
      <button
        onClick={() => {
          navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border glass-card px-2 py-1 text-[11px] text-muted hover:text-ink"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
      </button>
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border glass-inset p-3 pt-9 text-[12.5px] leading-relaxed text-ink/90">
        {content}
      </pre>
    </div>
  );
}
