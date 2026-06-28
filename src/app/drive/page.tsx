"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Folder,
  FileText,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Home,
} from "lucide-react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConnectors, googleTokenValid, DRIVE_SCOPE } from "@/lib/connectors/store";
import { driveList, isFolder, type DriveFile } from "@/lib/connectors/google";
import { connectGoogle } from "@/lib/connectors/googleConnect";

interface Crumb {
  id?: string;
  name: string;
}

export default function DrivePage() {
  const conn = useConnectors();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [trail, setTrail] = useState<Crumb[]>([{ name: "Mi unidad" }]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const connected = googleTokenValid(conn.google, DRIVE_SCOPE);

  const load = useCallback(async (parentId?: string) => {
    const g = useConnectors.getState().google;
    if (!googleTokenValid(g, DRIVE_SCOPE)) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      setFiles(await driveList(g.accessToken, 100, parentId ? { parentId } : {}));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function connect() {
    setErr("");
    setLoading(true);
    try {
      await connectGoogle();
      await load();
    } catch (e) {
      setErr((e as Error).message);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  function openFolder(f: DriveFile) {
    setTrail((t) => [...t, { id: f.id, name: f.name }]);
    load(f.id);
  }

  function goTo(index: number) {
    const next = trail.slice(0, index + 1);
    setTrail(next);
    load(next[next.length - 1].id);
  }

  const folders = files.filter(isFolder);
  const docs = files.filter((f) => !isFolder(f));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <FolderOpen size={22} className="text-accent" /> Drive
          </h1>
          <p className="mt-1 text-sm text-muted">Navega los archivos y carpetas reales de tu Google Drive.</p>
        </div>
        {connected && (
          <button
            onClick={() => load(trail[trail.length - 1].id)}
            className="flex items-center gap-1.5 rounded-md border glass-card px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        )}
      </header>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>
      )}

      {!connected && !loading ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-6 py-12 text-center">
          <Sparkles size={28} className="text-accent" />
          <p className="text-sm font-semibold text-ink">Conecta Google Drive</p>
          <p className="max-w-sm text-xs text-muted">
            Un clic conecta Gmail, Drive y Calendar. Gestiónalo también en{" "}
            <Link href="/connectors" className="font-medium text-accent underline">Conectores</Link>.
          </p>
          <button onClick={connect} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Conectar Google
          </button>
        </div>
      ) : (
        <>
          {/* Breadcrumb */}
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted">
            {trail.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <button
                  onClick={() => goTo(i)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-bg-subtle hover:text-ink"
                >
                  {i === 0 && <Home size={13} />}
                  {c.name}
                </button>
                {i < trail.length - 1 && <ChevronRight size={12} />}
              </span>
            ))}
          </nav>

          {loading ? (
            <SkeletonList rows={6} />
          ) : files.length === 0 ? (
            <EmptyState icon={<Folder size={22} />} title="Carpeta vacía" description="Esta carpeta no tiene archivos ni subcarpetas." />
          ) : (
            <div className="space-y-4">
              {folders.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => openFolder(f)}
                      className="flex items-center gap-2 rounded-lg border glass-card p-3 text-left hover:bg-bg-subtle"
                    >
                      <Folder size={18} className="shrink-0 text-accent" />
                      <span className="truncate text-sm text-ink">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {docs.length > 0 && (
                <div className="divide-y rounded-lg border glass-card">
                  {docs.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-subtle">
                      <FileText size={16} className="shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{f.name}</p>
                        <p className="truncate text-[11px] text-muted">
                          {new Date(f.modifiedTime).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      {f.webViewLink && (
                        <a href={f.webViewLink} target="_blank" rel="noreferrer" className="shrink-0 text-muted hover:text-accent">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
