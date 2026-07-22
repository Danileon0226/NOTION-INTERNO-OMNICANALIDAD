"use client";

// Campañas IG — módulo autónomo: ZERO genera el contenido (Gemini), lo deja
// en el Drive del usuario ("ZERO Campañas"), el usuario diseña/elige la imagen
// final y publica en Instagram con el conector de Meta. Todo client-side,
// como el resto del OS.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Sparkles,
  Loader2,
  Instagram,
  CloudUpload,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Send,
  FolderOpen,
  ClipboardList,
  Globe2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { askAi } from "@/lib/ai/client";
import { useAi } from "@/lib/ai/store";
import { igInfo, igPublishImage, type IgInfo } from "@/lib/connectors/meta";
import { useConnectors, googleTokenValid, DRIVE_WRITE_SCOPE } from "@/lib/connectors/store";
import { connectGoogle } from "@/lib/connectors/googleConnect";
import {
  ensureFolder,
  driveUploadText,
  driveUpdateText,
  driveMakePublic,
  webContentUrl,
  driveExtractFileId,
  CAMPAIGNS_FOLDER,
} from "@/lib/connectors/driveWrite";
import {
  useCampaigns,
  piezaId,
  ESTADO_LABEL,
  type Campaign,
  type CampaignPiece,
  type CampaignEstado,
} from "@/lib/campaigns/store";
import { useWorkspace } from "@/lib/store";
import { useActivity } from "@/lib/activity";
import type { Block } from "@/lib/types";

// ── Página ───────────────────────────────────────────────────

export default function CampaignsPage() {
  const campaigns = useCampaigns((s) => s.campaigns);
  const [selected, setSelected] = useState<string | null>(null);
  const current = campaigns.find((c) => c.id === selected) || null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<Megaphone size={20} />}
        title="Campañas IG"
        subtitle="ZERO genera el contenido, lo deja en tu Drive y tú lo publicas en Instagram."
        right={<ConnectorBadges />}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Wizard onCreated={setSelected} />
          <CampaignList campaigns={campaigns} selected={selected} onSelect={setSelected} />
        </div>

        {current ? (
          <Detail key={current.id} campaign={current} />
        ) : (
          <EmptyState
            icon={<Megaphone size={22} />}
            title="Crea una campaña o elige una del historial"
            description={
              <>
                El flujo completo: ZERO genera captions, hashtags y briefs visuales → las piezas se
                dejan en la carpeta &quot;{CAMPAIGNS_FOLDER}&quot; de tu Drive → diseñas la imagen
                final → la haces pública → publicas en Instagram.
              </>
            }
          />
        )}
      </div>
    </div>
  );
}

// ── Estado de conectores (cabecera) ──────────────────────────

function ConnectorBadges() {
  const meta = useConnectors((s) => s.meta);
  const google = useConnectors((s) => s.google);
  const [ig, setIg] = useState<IgInfo | null>(null);
  const [igErr, setIgErr] = useState(false);

  const metaReady = !!(meta.accessToken && meta.igUserId);
  const driveOk = googleTokenValid(google, DRIVE_WRITE_SCOPE);

  useEffect(() => {
    let alive = true;
    if (!metaReady) {
      setIg(null);
      setIgErr(false);
      return;
    }
    igInfo(meta)
      .then((i) => {
        if (!alive) return;
        setIg(i);
        setIgErr(false);
      })
      .catch(() => {
        if (alive) setIgErr(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaReady, meta.accessToken, meta.igUserId]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip
        ok={metaReady && !igErr}
        icon={<Instagram size={12} />}
        label={
          ig
            ? `@${ig.username} · ${ig.followers_count ?? 0} seg.`
            : metaReady
              ? igErr
                ? "Meta: token con error"
                : "Verificando IG…"
              : "IG sin conectar"
        }
      />
      <Chip
        ok={driveOk}
        icon={<FolderOpen size={12} />}
        label={driveOk ? "Drive listo (escritura)" : "Drive sin permiso de escritura"}
      />
    </div>
  );
}

function Chip({ ok, icon, label }: { ok: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
        ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "glass-card text-muted"
      }`}
    >
      {icon}
      {label}
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-muted/50"}`} />
    </span>
  );
}

// ── Wizard "Nueva campaña" ───────────────────────────────────

const TONOS = ["cercano y profesional", "inspirador", "premium / elegante", "divertido", "educativo"];

function Wizard({ onCreated }: { onCreated: (id: string) => void }) {
  const aiReady = useAi((s) => !!s.apiKey);
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [publico, setPublico] = useState("");
  const [tono, setTono] = useState(TONOS[0]);
  const [n, setN] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canRun = nombre.trim() && objetivo.trim() && aiReady && !busy;

  async function generar() {
    if (!canRun) return;
    setBusy(true);
    setErr("");
    try {
      const raw = await askAi(promptPiezas({ nombre, objetivo, publico, tono, n }), {
        system: SYSTEM_ZERO,
      });
      const piezas = parsePiezas(raw);
      const { create, setPiezas, patch } = useCampaigns.getState();
      const id = create({ nombre: nombre.trim(), objetivo: objetivo.trim(), publico: publico.trim(), tono });
      setPiezas(
        id,
        piezas.map((p) => ({ id: piezaId(), ...p }))
      );
      patch(id, { estado: "contenido" });
      useActivity.getState().push({
        source: "ai",
        kind: "integrate",
        label: `Campaña "${nombre.trim()}": ${piezas.length} piezas generadas por ZERO`,
        count: piezas.length,
      });
      setNombre("");
      setObjetivo("");
      setPublico("");
      onCreated(id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border glass-card p-4">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Sparkles size={14} className="text-accent" /> Nueva campaña
      </div>
      <div className="space-y-2.5">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la campaña"
          className="w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          placeholder="Objetivo (p. ej. lanzar el nuevo servicio y captar leads)…"
          rows={2}
          className="w-full resize-y rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <input
          value={publico}
          onChange={(e) => setPublico(e.target.value)}
          placeholder="Público objetivo (p. ej. pymes de Quebec)"
          className="w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">Piezas</label>
          <input
            type="range"
            min={3}
            max={10}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="flex-1 accent-[var(--accent,#2383e2)]"
          />
          <span className="w-6 text-center text-sm font-semibold text-ink">{n}</span>
        </div>
        <select
          value={tono}
          onChange={(e) => setTono(e.target.value)}
          className="w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          {TONOS.map((t) => (
            <option key={t} value={t}>
              Tono: {t}
            </option>
          ))}
        </select>

        {!aiReady && (
          <p className="rounded-md glass-inset px-3 py-2 text-[11px] text-muted">
            Falta la API key de Gemini. Configúrala en{" "}
            <Link href="/connectors" className="font-medium text-accent underline">
              Conectores → Asistente IA
            </Link>
            .
          </p>
        )}
        {err && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">{err}</p>
        )}

        <button
          onClick={generar}
          disabled={!canRun}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? "ZERO está creando…" : "Generar con ZERO"}
        </button>
      </div>
    </div>
  );
}

// ── Historial de campañas ────────────────────────────────────

function CampaignList({
  campaigns,
  selected,
  onSelect,
}: {
  campaigns: Campaign[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const remove = useCampaigns((s) => s.remove);
  if (!campaigns.length) return null;
  return (
    <div className="rounded-xl border glass-card p-2">
      <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Campañas ({campaigns.length})
      </div>
      <div className="space-y-1">
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-bg-subtle ${
              selected === c.id ? "bg-bg-subtle" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{c.nombre}</p>
              <p className="truncate text-[11px] text-muted">
                {c.piezas.length} piezas · {new Date(c.updatedAt).toLocaleDateString("es-CO")}
              </p>
            </div>
            <EstadoBadge estado={c.estado} />
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                remove(c.id);
                if (selected === c.id) onSelect(null);
              }}
              onKeyDown={(e) => e.stopPropagation()}
              className="hidden shrink-0 text-muted hover:text-red-500 group-hover:block"
              title="Eliminar campaña"
            >
              <Trash2 size={13} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const ESTADO_STYLE: Record<CampaignEstado, string> = {
  draft: "glass-card text-muted",
  contenido: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  publicando: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  activa: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
};

function EstadoBadge({ estado }: { estado: CampaignEstado }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ESTADO_STYLE[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  );
}

// ── Detalle de campaña ───────────────────────────────────────

function Detail({ campaign }: { campaign: Campaign }) {
  const patch = useCampaigns((s) => s.patch);
  const patchPieza = useCampaigns((s) => s.patchPieza);
  const meta = useConnectors((s) => s.meta);
  const google = useConnectors((s) => s.google);

  const metaReady = !!(meta.accessToken && meta.igUserId);
  const driveOk = googleTokenValid(google, DRIVE_WRITE_SCOPE);

  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busyDrive, setBusyDrive] = useState(false);
  const [busyPublica, setBusyPublica] = useState("");
  const [busyPub, setBusyPub] = useState("");
  const [busyConnect, setBusyConnect] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const publicadas = campaign.piezas.filter((p) => p.publicado).length;

  function toggleSel(id: string) {
    setSel((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function notify(m: string) {
    setErr("");
    setMsg(m);
  }
  function fail(e: unknown) {
    setMsg("");
    setErr((e as Error).message);
  }

  async function conectarDrive() {
    setBusyConnect(true);
    setErr("");
    try {
      await connectGoogle([DRIVE_WRITE_SCOPE]);
      notify("Google Drive conectado con permiso de escritura.");
    } catch (e) {
      fail(e);
    } finally {
      setBusyConnect(false);
    }
  }

  // Sube cada pieza como archivo de texto a la carpeta "ZERO Campañas".
  async function dejarEnDrive() {
    if (!campaign.piezas.length || busyDrive) return;
    setBusyDrive(true);
    setErr("");
    setMsg("");
    try {
      const token = await connectGoogle([DRIVE_WRITE_SCOPE]);
      const folderId = campaign.driveFolderId || (await ensureFolder(token));
      patch(campaign.id, { driveFolderId: folderId });
      let subidas = 0;
      for (let i = 0; i < campaign.piezas.length; i++) {
        const p = campaign.piezas[i];
        const texto = piezaComoTexto(campaign, p, i);
        // Si la pieza ya está en Drive, actualiza el contenido (no duplica archivos).
        const file = p.driveFileId
          ? await driveUpdateText(token, p.driveFileId, texto)
          : await driveUploadText(token, folderId, nombreArchivo(campaign, i), texto);
        patchPieza(campaign.id, p.id, { driveFileId: file.id });
        subidas++;
      }
      notify(`${subidas} pieza(s) guardadas en la carpeta "${CAMPAIGNS_FOLDER}" de tu Drive.`);
      useActivity.getState().push({
        source: "google-drive",
        kind: "sync",
        label: `Campaña "${campaign.nombre}": ${subidas} piezas en Drive`,
        count: subidas,
      });
    } catch (e) {
      fail(e);
    } finally {
      setBusyDrive(false);
    }
  }

  // Hace público el archivo de Drive de la imagen final y deja la URL directa.
  async function hacerPublica(p: CampaignPiece) {
    const fileId = driveExtractFileId(p.imageUrl || "");
    if (!fileId) {
      fail(
        new Error(
          "Pega primero en 'URL de imagen' el enlace de Drive de la imagen final (Compartir → Copiar enlace, o el id del archivo) y vuelve a pulsar 'Hacer pública'."
        )
      );
      return;
    }
    setBusyPublica(p.id);
    setErr("");
    try {
      const token = await connectGoogle([DRIVE_WRITE_SCOPE]);
      await driveMakePublic(token, fileId);
      patchPieza(campaign.id, p.id, { imageUrl: webContentUrl(fileId) });
      notify("Imagen pública: la URL directa quedó lista para publicar en IG.");
    } catch (e) {
      fail(e);
    } finally {
      setBusyPublica("");
    }
  }

  // Publica una pieza en Instagram (contenedor + publish) y guarda el igId.
  async function publicar(p: CampaignPiece) {
    if (!metaReady) {
      fail(new Error("Configura el conector de Meta (token + Instagram Business ID) en Conectores."));
      return;
    }
    const url = (p.imageUrl || "").trim();
    if (!/^https?:\/\//.test(url)) {
      fail(new Error("Falta la URL pública de la imagen final (usa 'Hacer pública' si está en Drive)."));
      return;
    }
    setBusyPub(p.id);
    setErr("");
    patch(campaign.id, { estado: "publicando" });
    try {
      const caption =
        p.caption.trim() + (p.hashtags.length ? `\n\n${p.hashtags.join(" ")}` : "");
      const r = await igPublishImage(meta, url, caption);
      patchPieza(campaign.id, p.id, { publicado: true, igId: r.id });
      patch(campaign.id, { estado: "activa" });
      notify(`Pieza publicada en Instagram (id ${r.id}).`);
      useActivity.getState().push({
        source: "ai",
        kind: "integrate",
        label: `Campaña "${campaign.nombre}": pieza publicada en Instagram`,
        count: 1,
      });
    } catch (e) {
      const alguna = useCampaigns
        .getState()
        .campaigns.find((c) => c.id === campaign.id)
        ?.piezas.some((x) => x.publicado);
      patch(campaign.id, { estado: alguna ? "activa" : "contenido" });
      fail(e);
    } finally {
      setBusyPub("");
    }
  }

  // Publica en orden las piezas seleccionadas que aún no están publicadas.
  async function publicarSeleccionadas() {
    const pendientes = campaign.piezas.filter((p) => sel.has(p.id) && !p.publicado);
    for (const p of pendientes) {
      // Secuencial a propósito: la Graph API limita publicaciones simultáneas.
      // eslint-disable-next-line no-await-in-loop
      await publicar(p);
    }
  }

  // Crea en el workspace la página "Campaña: {nombre}" con el checklist del proyecto.
  function crearProyecto() {
    const pageId = useWorkspace
      .getState()
      .createPageFromTemplate(bloquesProyecto(campaign), {
        title: `Campaña: ${campaign.nombre}`,
        icon: "📣",
      });
    patch(campaign.id, { workspacePageId: pageId });
    notify("Proyecto creado en el workspace: abre 'Páginas' para trabajar el checklist.");
  }

  return (
    <div className="space-y-4">
      {/* Cabecera de la campaña */}
      <div className="rounded-xl border glass-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold text-ink">{campaign.nombre}</h2>
              <EstadoBadge estado={campaign.estado} />
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {campaign.objetivo}
              {campaign.publico ? ` · Público: ${campaign.publico}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {campaign.piezas.length} piezas · {publicadas} publicadas · tono {campaign.tono}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              onClick={dejarEnDrive}
              disabled={busyDrive || !campaign.piezas.length}
              className="flex items-center gap-1.5 rounded-md border glass-card px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle disabled:opacity-50"
            >
              {busyDrive ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
              Dejar en mi Drive
            </button>
            <button
              onClick={crearProyecto}
              className="flex items-center gap-1.5 rounded-md border glass-card px-3 py-1.5 text-sm text-ink hover:bg-bg-subtle"
            >
              <ClipboardList size={14} /> Crear proyecto completo
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          {campaign.driveFolderId && (
            <a
              href={`https://drive.google.com/drive/folders/${campaign.driveFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-accent hover:underline"
            >
              <FolderOpen size={12} /> Carpeta &quot;{CAMPAIGNS_FOLDER}&quot; en Drive{" "}
              <ExternalLink size={10} />
            </a>
          )}
          {campaign.workspacePageId && (
            <Link href="/pages" className="flex items-center gap-1 text-accent hover:underline">
              <ClipboardList size={12} /> Proyecto en Páginas
            </Link>
          )}
        </div>
      </div>

      {/* Avisos de conectores */}
      {!metaReady && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Para publicar falta el conector de Meta: pega el token de larga duración y el Instagram
            Business ID en{" "}
            <Link href="/connectors" className="font-medium underline">
              Conectores → Meta
            </Link>
            .
          </span>
        </div>
      )}
      {!driveOk && (
        <div className="flex flex-col gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-[13px] text-sky-700 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2">
            <Globe2 size={15} className="mt-0.5 shrink-0" />
            Para dejar las piezas en tu Drive y hacer públicas las imágenes hace falta el permiso de
            escritura de Google Drive (se pide una sola vez).
          </span>
          <button
            onClick={conectarDrive}
            disabled={busyConnect}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busyConnect && <Loader2 size={13} className="animate-spin" />} Conectar Google
          </button>
        </div>
      )}

      {msg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-700">
          <CheckCircle2 size={14} className="shrink-0" /> {msg}
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
          <AlertTriangle size={14} className="shrink-0" /> {err}
        </div>
      )}

      {/* Barra de selección */}
      {sel.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border glass-card px-3 py-2">
          <span className="text-sm text-muted">{sel.size} pieza(s) seleccionadas</span>
          <button
            onClick={publicarSeleccionadas}
            disabled={!!busyPub || !metaReady}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busyPub ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Publicar seleccionadas en IG
          </button>
        </div>
      )}

      {/* Grid de piezas */}
      <div className="grid gap-3 xl:grid-cols-2">
        {campaign.piezas.map((p, i) => (
          <PiezaCard
            key={p.id}
            pieza={p}
            index={i}
            selected={sel.has(p.id)}
            onToggle={() => toggleSel(p.id)}
            onCaption={(v) => patchPieza(campaign.id, p.id, { caption: v })}
            onImageUrl={(v) => patchPieza(campaign.id, p.id, { imageUrl: v })}
            onPublica={() => hacerPublica(p)}
            onPublicar={() => publicar(p)}
            busyPublica={busyPublica === p.id}
            busyPub={busyPub === p.id}
            pubDisabled={!!busyPub}
          />
        ))}
      </div>
    </div>
  );
}

// ── Tarjeta de pieza ─────────────────────────────────────────

function PiezaCard({
  pieza,
  index,
  selected,
  onToggle,
  onCaption,
  onImageUrl,
  onPublica,
  onPublicar,
  busyPublica,
  busyPub,
  pubDisabled,
}: {
  pieza: CampaignPiece;
  index: number;
  selected: boolean;
  onToggle: () => void;
  onCaption: (v: string) => void;
  onImageUrl: (v: string) => void;
  onPublica: () => void;
  onPublicar: () => void;
  busyPublica: boolean;
  busyPub: boolean;
  pubDisabled: boolean;
}) {
  return (
    <div
      className={`rounded-xl border glass-card p-4 transition-colors ${
        selected ? "border-accent" : ""
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 accent-[var(--accent,#2383e2)]"
          aria-label={`Seleccionar pieza ${index + 1}`}
        />
        <span className="text-sm font-semibold text-ink">Pieza {index + 1}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {pieza.driveFileId && (
            <a
              href={`https://drive.google.com/file/d/${pieza.driveFileId}/view`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 hover:underline"
            >
              <FolderOpen size={10} /> En Drive
            </a>
          )}
          {pieza.publicado && (
            <span
              className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600"
              title={pieza.igId ? `Media id: ${pieza.igId}` : undefined}
            >
              <CheckCircle2 size={10} /> Publicada
            </span>
          )}
        </div>
      </div>

      {/* Caption editable inline */}
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        Caption
      </label>
      <textarea
        value={pieza.caption}
        onChange={(e) => onCaption(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />

      {/* Hashtags */}
      {pieza.hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {pieza.hashtags.map((h) => (
            <span key={h} className="rounded-full glass-inset px-2 py-0.5 text-[10px] text-accent">
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Brief visual */}
      <details className="mt-2 rounded-md glass-inset px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-muted">
          Brief de imagen
        </summary>
        <p className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted">
          {pieza.briefImagen}
        </p>
      </details>

      {/* Imagen final */}
      <label className="mb-1 mt-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <ImageIcon size={11} /> URL de imagen
      </label>
      <input
        value={pieza.imageUrl || ""}
        onChange={(e) => onImageUrl(e.target.value)}
        placeholder="https://… (imagen final, pública)"
        className="w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Pega la URL pública de la imagen final; si está en Drive, pega el enlace de compartir y usa
        &quot;Hacer pública&quot; para convertirla en URL directa.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={onPublica}
          disabled={busyPublica}
          className="flex items-center gap-1.5 rounded-md border glass-card px-3 py-1.5 text-[13px] text-ink hover:bg-bg-subtle disabled:opacity-50"
        >
          {busyPublica ? <Loader2 size={13} className="animate-spin" /> : <Globe2 size={13} />}
          Hacer pública
        </button>
        <button
          onClick={onPublicar}
          disabled={pubDisabled || pieza.publicado}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busyPub ? <Loader2 size={13} className="animate-spin" /> : <Instagram size={13} />}
          {pieza.publicado ? "Ya publicada" : "Publicar en IG"}
        </button>
      </div>
    </div>
  );
}

// ── Generación con ZERO (Gemini) ─────────────────────────────

const SYSTEM_ZERO =
  "Eres ZERO, el estratega creativo de ZERO Agency. Creas contenido para Instagram en español, " +
  "listo para publicar, con captions que convierten y briefs visuales accionables para un diseñador. " +
  "Respondes EXCLUSIVAMENTE con JSON válido, sin markdown, sin comentarios y sin texto adicional.";

function promptPiezas(input: {
  nombre: string;
  objetivo: string;
  publico: string;
  tono: string;
  n: number;
}): string {
  const n = Math.min(10, Math.max(3, input.n));
  return `Genera ${n} piezas para una campaña de Instagram.

Campaña: ${input.nombre}
Objetivo: ${input.objetivo}
Público objetivo: ${input.publico || "(general)"}
Tono: ${input.tono}

Devuelve SOLO este JSON (sin \`\`\`):
{"piezas":[{"caption":"texto listo para IG en español: gancho inicial, 2-3 párrafos cortos con emojis y llamada a la acción clara","hashtags":["#ejemplo"],"briefImagen":"brief visual DETALLADO para diseñar la imagen: concepto, composición, elementos, paleta de colores, tipografía sugerida y texto sobre la imagen; formato cuadrado 1080x1080"}]}

Reglas:
- Exactamente ${n} elementos en "piezas", cada una con un ángulo distinto del objetivo.
- 8 a 15 hashtags por pieza, en español, mezclando amplios y de nicho; NO incluyas hashtags dentro del caption.
- El caption NO lleva comillas de apertura/cierre ni numeración.`;
}

/** Extrae y valida el JSON de piezas que devuelve Gemini. */
function parsePiezas(raw: string): Pick<CampaignPiece, "caption" | "hashtags" | "briefImagen">[] {
  const clean = raw.replace(/```json|```/gi, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("ZERO no devolvió JSON válido. Vuelve a intentar 'Generar con ZERO'.");
  }
  let obj: unknown;
  try {
    obj = JSON.parse(clean.slice(start, end + 1));
  } catch {
    throw new Error("El JSON de ZERO llegó incompleto o malformado. Reintenta la generación.");
  }
  const arr = (obj as { piezas?: unknown }).piezas;
  if (!Array.isArray(arr) || !arr.length) {
    throw new Error("ZERO no devolvió piezas. Reintenta la generación.");
  }
  return arr.map((p) => {
    const x = p as { caption?: unknown; hashtags?: unknown; briefImagen?: unknown; brief?: unknown };
    return {
      caption: String(x.caption ?? "").trim(),
      hashtags: Array.isArray(x.hashtags)
        ? x.hashtags.map((h) => String(h).trim()).filter(Boolean)
        : [],
      briefImagen: String(x.briefImagen ?? x.brief ?? "").trim(),
    };
  });
}

// ── Piezas → Drive ───────────────────────────────────────────

function nombreArchivo(c: Campaign, i: number): string {
  const base = c.nombre.replace(/[\\/:*?"<>|]/g, "-").trim() || "Campaña";
  return `${base} · pieza ${String(i + 1).padStart(2, "0")}.txt`;
}

function piezaComoTexto(c: Campaign, p: CampaignPiece, i: number): string {
  return [
    `CAMPAÑA: ${c.nombre}`,
    `PIEZA ${i + 1} de ${c.piezas.length}`,
    `Objetivo: ${c.objetivo}`,
    c.publico ? `Público: ${c.publico}` : "",
    `Tono: ${c.tono}`,
    "",
    "── CAPTION (listo para IG) ──",
    p.caption,
    "",
    "── HASHTAGS ──",
    p.hashtags.join(" "),
    "",
    "── BRIEF DE IMAGEN ──",
    p.briefImagen,
    "",
    `Generado por ZERO Agency OS · ${new Date().toLocaleString("es-CO")}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

// ── Proyecto completo en el workspace ────────────────────────

function bloquesProyecto(c: Campaign): Block[] {
  const resumen = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s);
  const blocks: Block[] = [
    {
      id: "t-callout",
      type: "callout",
      content: `Objetivo: ${c.objetivo}${c.publico ? ` · Público: ${c.publico}` : ""} · Tono: ${c.tono}`,
    },
    { id: "t-h-check", type: "heading2", content: "Checklist del proyecto" },
    { id: "t-td1", type: "todo", content: "Brief de campaña aprobado", checked: true },
    {
      id: "t-td2",
      type: "todo",
      content: `Diseño de las ${c.piezas.length} piezas (briefs en la carpeta "${CAMPAIGNS_FOLDER}" de Drive)`,
    },
    { id: "t-td3", type: "todo", content: "Aprobación del contenido (caption + imagen final)" },
    { id: "t-td4", type: "todo", content: "Publicación en Instagram (módulo Campañas IG)" },
    { id: "t-td5", type: "todo", content: "Reporte de resultados (alcance, interacción, seguidores)" },
    { id: "t-div", type: "divider", content: "" },
    { id: "t-h-piezas", type: "heading2", content: "Piezas de la campaña" },
    ...c.piezas.map((p, i) => ({
      id: `t-pz-${i}`,
      type: "numbered" as const,
      content: `${resumen(p.caption.replace(/\n+/g, " "))}${p.publicado ? " · ✅ publicada" : ""}`,
    })),
  ];
  return blocks;
}
