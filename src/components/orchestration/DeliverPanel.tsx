"use client";

import { useMemo, useState } from "react";
import {
  Github,
  Loader2,
  Rocket,
  CheckCircle2,
  ExternalLink,
  Lock,
  Globe,
  FileCode2,
  GitCommitHorizontal,
  AlertTriangle,
} from "lucide-react";
import { useConnectors } from "@/lib/connectors/store";
import { useOrchestration } from "@/lib/orchestration/store";
import { parseFiles, fileTreeSummary } from "@/lib/orchestration/files";
import { publishToGithub } from "@/lib/orchestration/publish";
import { vercelDeploy, vercelImportUrl } from "@/lib/connectors/vercel";
import type { OrchRun } from "@/lib/orchestration/areas";

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "zero-proyecto";
}

// Entrega del proyecto generado: lo publica en GitHub y lo despliega en Vercel.
export function DeliverPanel({ run }: { run: OrchRun }) {
  const github = useConnectors((s) => s.github);
  const vercel = useConnectors((s) => s.vercel);
  const patch = useOrchestration((s) => s.patch);

  const files = useMemo(() => parseFiles(run.artifacts.code, run.artifacts.e2e), [run.artifacts.code, run.artifacts.e2e]);
  const summary = useMemo(() => fileTreeSummary(files), [files]);

  const [repo, setRepo] = useState(() => slug(run.title));
  const [isPrivate, setIsPrivate] = useState(true);
  const [busy, setBusy] = useState<"github" | "vercel" | null>(null);
  const [err, setErr] = useState("");

  const ghReady = !!github.token;
  const canPublish = ghReady && files.length > 0 && repo.trim();

  async function publish() {
    setErr("");
    setBusy("github");
    try {
      const res = await publishToGithub(files, {
        token: github.token,
        owner: github.account,
        repo: repo.trim(),
        private: isPrivate,
        description: run.title,
        message: `feat: ${run.title} — generado por ZERO Orquestación`,
      });
      patch(run.id, {
        publish: {
          repoFullName: res.repoFullName,
          htmlUrl: res.htmlUrl,
          commitUrl: res.commitUrl,
          branch: res.branch,
          filesPushed: res.filesPushed,
          at: Date.now(),
        },
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deploy() {
    if (!run.publish) return;
    setErr("");
    setBusy("vercel");
    try {
      const res = await vercelDeploy({
        token: vercel.token,
        teamId: vercel.teamId,
        projectName: run.publish.repoFullName.split("/")[1],
        repo: run.publish.repoFullName,
        branch: run.publish.branch,
      });
      patch(run.id, {
        deploy: {
          projectName: res.projectName,
          url: res.url,
          inspectorUrl: res.inspectorUrl,
          projectUrl: res.projectUrl,
          at: Date.now(),
        },
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Rocket size={16} className="text-accent" />
        <span className="text-sm font-semibold text-ink">Entregar proyecto</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted">
          <FileCode2 size={12} /> {files.length} archivo(s) · {(summary.totalBytes / 1024).toFixed(1)} KB
        </span>
      </div>

      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted">
          Aún no hay archivos detectables en la propuesta. Ejecuta la orquestación para generar el código.
        </p>
      ) : (
        <>
          {/* Resumen de archivos */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {Object.entries(summary.byExt)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([ext, n]) => (
                <span key={ext} className="rounded-full glass-inset px-2 py-0.5 text-[10px] text-muted">
                  .{ext} × {n}
                </span>
              ))}
          </div>

          {/* Paso 1 · GitHub */}
          <Step n={1} label="Publicar en GitHub" done={!!run.publish}>
            {run.publish ? (
              <div className="space-y-1 text-xs">
                <a href={run.publish.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
                  <Github size={13} /> {run.publish.repoFullName} <ExternalLink size={11} />
                </a>
                <div className="flex items-center gap-1 text-muted">
                  <GitCommitHorizontal size={12} />
                  <a href={run.publish.commitUrl} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
                    {run.publish.filesPushed} archivos en rama {run.publish.branch}
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[11px] text-muted">{github.account || "tu-cuenta"}/</span>
                  <input
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="nombre-del-repo"
                    className="min-w-0 flex-1 rounded-md border glass-card px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={() => setIsPrivate((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-ink"
                >
                  {isPrivate ? <Lock size={12} /> : <Globe size={12} />} {isPrivate ? "Privado" : "Público"} · cambiar
                </button>
                {!ghReady && (
                  <p className="flex items-center gap-1 text-[11px] text-amber-600">
                    <AlertTriangle size={12} /> Conecta GitHub (token) en Conectores.
                  </p>
                )}
                <button
                  onClick={publish}
                  disabled={!canPublish || busy !== null}
                  className="btn-brand flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {busy === "github" ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />} Publicar en GitHub
                </button>
              </div>
            )}
          </Step>

          {/* Paso 2 · Vercel */}
          <Step n={2} label="Desplegar en Vercel" done={!!run.deploy} disabled={!run.publish}>
            {run.deploy ? (
              <div className="space-y-1 text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                  <CheckCircle2 size={13} /> Proyecto «{run.deploy.projectName}» enlazado · auto-deploy en cada push
                </span>
                <div className="flex flex-wrap gap-3">
                  {run.deploy.url && (
                    <a href={run.deploy.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                      <Globe size={12} /> Ver sitio <ExternalLink size={11} />
                    </a>
                  )}
                  <a href={run.deploy.inspectorUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-ink">
                    Panel de Vercel <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : run.publish ? (
              <div className="space-y-2">
                {vercel.token && (
                  <button
                    onClick={deploy}
                    disabled={busy !== null}
                    className="btn-brand flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {busy === "vercel" ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Desplegar en Vercel
                  </button>
                )}
                <a
                  href={vercelImportUrl(run.publish.htmlUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${
                    vercel.token ? "border text-ink hover:bg-bg-subtle" : "btn-brand"
                  }`}
                >
                  <Rocket size={14} /> Importar a Vercel (1 clic)
                </a>
                {!vercel.token && (
                  <p className="text-[11px] text-muted">
                    Para despliegue 100% automático desde aquí, conecta Vercel (token) en Conectores.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted">Publica primero en GitHub.</p>
            )}
          </Step>

          {err && <p className="mt-2 flex items-center gap-1 text-xs text-red-500"><AlertTriangle size={13} /> {err}</p>}
        </>
      )}
    </div>
  );
}

function Step({ n, label, done, disabled, children }: { n: number; label: string; done?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className={`mb-3 rounded-lg border p-3 last:mb-0 ${disabled ? "opacity-55" : ""} ${done ? "border-emerald-500/30 bg-emerald-500/5" : "glass-inset"}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${done ? "bg-emerald-500 text-white" : "bg-accent/15 text-accent"}`}>
          {done ? <CheckCircle2 size={13} /> : n}
        </span>
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
      {children}
    </div>
  );
}
