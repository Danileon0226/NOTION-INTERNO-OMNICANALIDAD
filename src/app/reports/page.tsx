"use client";

import { useState } from "react";
import Link from "next/link";
import { FileBarChart, Loader2, FileDown, FileText, Trash2, Plug, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useReports, generateReport, PERIODS, type Period, type Report } from "@/lib/reports";
import { exportReportPdf } from "@/lib/reportPdf";
import { downloadText } from "@/lib/export";
import { useAi } from "@/lib/ai/store";
import { ModuleHeader } from "@/components/ModuleHeader";

export default function ReportsPage() {
  const { reports, remove, clear } = useReports();
  const apiKey = useAi((s) => s.apiKey);
  const [busy, setBusy] = useState<Period | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  async function gen(period: Period) {
    setErr("");
    setBusy(period);
    try {
      const r = await generateReport(period);
      if (r) setOpen(r.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<FileBarChart size={20} />}
        title="Reportes"
        subtitle="Estado general diario, semanal y mensual. ZERO los genera y exporta a PDF con la marca."
        right={
          reports.length > 0 ? (
            <button onClick={clear} className="rounded-md border px-3 py-1.5 text-sm text-muted hover:bg-bg-subtle hover:text-red-500">
              Vaciar
            </button>
          ) : undefined
        }
      />

      {!apiKey && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <Plug size={15} /> Configura la API key de Gemini en{" "}
          <Link href="/connectors" className="font-medium underline">Conectores</Link>.
        </div>
      )}

      {/* Generar */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => gen(p.id)}
            disabled={busy !== null || !apiKey}
            className="hover-lift flex items-center gap-3 rounded-xl border glass-card p-4 text-left disabled:opacity-50"
          >
            <span className="text-2xl">{p.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Reporte {p.label.toLowerCase()}</span>
              <span className="block text-[11px] text-muted">Generar ahora</span>
            </span>
            {busy === p.id ? <Loader2 size={16} className="animate-spin text-accent" /> : null}
          </button>
        ))}
      </div>

      {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}

      {reports.length === 0 ? (
        <EmptyState icon={<FileBarChart size={22} />} title="Aún no hay reportes" description="Genera un reporte diario, semanal o mensual con los botones de arriba. Quedarán guardados aquí." />
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              open={open === r.id}
              onToggle={() => setOpen(open === r.id ? null : r.id)}
              onDelete={() => remove(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportRow({
  report,
  open,
  onToggle,
  onDelete,
}: {
  report: Report;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const icon = PERIODS.find((p) => p.id === report.period)?.icon ?? "📄";
  return (
    <div className="rounded-xl border glass-card">
      <div className="flex items-center gap-2.5 p-3">
        <span className="text-xl">{icon}</span>
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-ink">{report.title}</p>
          <p className="text-[11px] text-muted">
            {new Date(report.ts).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </button>
        <button onClick={() => exportReportPdf(report)} title="Exportar PDF (marca)" className="rounded p-1.5 text-muted hover:bg-bg-subtle hover:text-accent">
          <FileDown size={15} />
        </button>
        <button
          onClick={() => downloadText(`${report.period}-${report.id}.md`, `# ${report.title}\n\n${report.content}\n`)}
          title="Exportar Markdown"
          className="rounded p-1.5 text-muted hover:bg-bg-subtle hover:text-ink"
        >
          <FileText size={15} />
        </button>
        <button onClick={onDelete} title="Eliminar" className="rounded p-1.5 text-muted hover:bg-bg-subtle hover:text-red-500">
          <Trash2 size={15} />
        </button>
        <button onClick={onToggle} className="rounded p-1 text-muted">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {open && (
        <div className="border-t px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-ink">{report.content}</p>
        </div>
      )}
    </div>
  );
}
