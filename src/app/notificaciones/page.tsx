"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, Trash2, Megaphone, Loader2, Check, ExternalLink } from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSileo, CATEGORY_META, CATEGORIES, type SileoCategory, type SileoPriority } from "@/lib/sileo/store";
import { authMode, useAccount } from "@/lib/account";
import { broadcast } from "@/lib/sileo/remote";
import { useConnectors } from "@/lib/connectors/store";

export default function NotificacionesPage() {
  const account = useAccount();
  const items = useSileo((s) => s.items);
  const muted = useSileo((s) => s.muted);
  const quiet = useSileo((s) => s.quiet);
  const markAllRead = useSileo((s) => s.markAllRead);
  const markRead = useSileo((s) => s.markRead);
  const remove = useSileo((s) => s.remove);
  const clear = useSileo((s) => s.clear);
  const toggleMute = useSileo((s) => s.toggleMute);
  const toggleQuiet = useSileo((s) => s.toggleQuiet);
  const [filter, setFilter] = useState<"all" | "unread" | SileoCategory>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => !n.read);
    return items.filter((n) => n.category === filter);
  }, [items, filter]);

  const present = CATEGORIES.filter((c) => items.some((n) => n.category === c));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<Bell size={20} />}
        title="SILEO · Notificaciones"
        subtitle="Centro de notificaciones internas: eventos del sistema, agente, leads y avisos del equipo."
        right={
          <button
            onClick={toggleQuiet}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
              quiet ? "border-amber-400/40 bg-amber-400/10 text-amber-600" : "text-ink hover:bg-bg-subtle"
            }`}
          >
            {quiet ? <BellOff size={15} /> : <Bell size={15} />} {quiet ? "Silencio ON" : "Modo silencio"}
          </button>
        }
      />

      {/* Difusión (solo admin) */}
      {account.role === "admin" && <Broadcast actor={account.name} />}

      {/* Filtros + acciones */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Todas ({items.length})
        </Chip>
        <Chip active={filter === "unread"} onClick={() => setFilter("unread")}>
          Sin leer ({items.filter((n) => !n.read).length})
        </Chip>
        {present.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {CATEGORY_META[c].icon} {CATEGORY_META[c].label}
          </Chip>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-ink hover:bg-bg-subtle">
            <CheckCheck size={13} /> Marcar leído
          </button>
          <button onClick={clear} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted hover:text-red-500">
            <Trash2 size={13} /> Limpiar
          </button>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Bell size={22} />} title="Nada por aquí" description="Cuando lleguen avisos del equipo o de ZERO, aparecerán en este centro." />
      ) : (
        <div className="rounded-xl border glass-card">
          <div className="divide-y">
            {filtered.map((n) => {
              const meta = CATEGORY_META[n.category];
              const content = (
                <div className={`flex items-start gap-3 px-4 py-3 ${n.read ? "opacity-65" : ""} ${n.priority === "high" ? "bg-red-500/5" : ""}`}>
                  <span className="text-lg leading-none">{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read ? "text-ink" : "font-medium text-ink"}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-muted">
                      {meta.label}
                      {n.actor ? ` · ${n.actor}` : ""} · {new Date(n.ts).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {n.href && <ExternalLink size={10} className="ml-1 inline" />}
                    </p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      remove(n.id);
                    }}
                    className="shrink-0 rounded p-1 text-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
              return n.href ? (
                <Link key={n.id} href={n.href} onClick={() => markRead(n.id)} className="group block">
                  {content}
                </Link>
              ) : (
                <button key={n.id} onClick={() => markRead(n.id)} className="group block w-full text-left">
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Preferencias de silencio por categoría */}
      <div className="mt-4 rounded-xl border glass-card p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Silenciar categorías</div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const isMuted = muted.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleMute(c)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                  isMuted ? "border-dashed text-muted line-through" : "glass-card text-ink hover:border-accent/40"
                }`}
              >
                {CATEGORY_META[c].icon} {CATEGORY_META[c].label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted">Las categorías silenciadas no entran a tu centro. {authMode === "open" && "Activa Firebase para recibir avisos del equipo."}</p>
      </div>

      <ForwardSettings />
    </div>
  );
}

function ForwardSettings() {
  const forward = useSileo((s) => s.forward);
  const whatsappAlertTo = useSileo((s) => s.whatsappAlertTo);
  const setForward = useSileo((s) => s.setForward);
  const setWhatsappAlertTo = useSileo((s) => s.setWhatsappAlertTo);
  const telegram = useConnectors((s) => s.telegram);
  const meta = useConnectors((s) => s.meta);

  const tgReady = !!telegram.botToken && !!telegram.chatId;
  const waReady = !!meta.accessToken && !!meta.phoneNumberId;

  return (
    <div className="mt-4 rounded-xl border glass-card p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Reenviar alta prioridad a canales externos</div>
      <p className="mb-2.5 text-[11px] text-muted">Los avisos de prioridad <strong>alta</strong> también se envían por estos canales (mientras el OS esté abierto).</p>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={forward.telegram} onChange={(e) => setForward({ telegram: e.target.checked })} className="accent-accent" disabled={!tgReady} />
          Telegram {tgReady ? <span className="text-[11px] text-emerald-600">· listo</span> : <span className="text-[11px] text-amber-500">· conéctalo en Conectores</span>}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={forward.whatsapp} onChange={(e) => setForward({ whatsapp: e.target.checked })} className="accent-accent" disabled={!waReady} />
          WhatsApp {waReady ? <span className="text-[11px] text-emerald-600">· listo</span> : <span className="text-[11px] text-amber-500">· conecta Meta</span>}
        </label>
        {forward.whatsapp && (
          <input
            value={whatsappAlertTo}
            onChange={(e) => setWhatsappAlertTo(e.target.value)}
            placeholder="Número destino de alertas (E.164, p. ej. 573001234567)"
            className="w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        )}
      </div>
    </div>
  );
}

function Broadcast({ actor }: { actor: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<SileoCategory>("team");
  const [priority, setPriority] = useState<SileoPriority>("normal");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");
  const [err, setErr] = useState("");

  const canBroadcast = authMode === "firebase";

  async function send() {
    if (!title.trim()) return;
    setBusy(true);
    setSent("");
    setErr("");
    try {
      const n = await broadcast({ title: title.trim(), body: body.trim(), category, priority, actor });
      setSent(`Aviso enviado a ${n} persona(s).`);
      setTitle("");
      setBody("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border glass-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <Megaphone size={16} className="text-accent" /> Difundir al equipo
      </div>
      {!canBroadcast ? (
        <p className="text-xs text-muted">
          La difusión entre personas requiere Firebase. Configúralo (<code className="rounded bg-bg-subtle px-1 py-0.5 text-[11px]">NEXT_PUBLIC_FIREBASE_*</code>) para enviar avisos a todo el equipo.
        </p>
      ) : (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del aviso"
            className="w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Mensaje (opcional)"
            className="w-full resize-y rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as SileoCategory)} className="rounded-md border glass-card px-2 py-1.5 text-sm text-ink outline-none focus:border-accent">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value as SileoPriority)} className="rounded-md border glass-card px-2 py-1.5 text-sm text-ink outline-none focus:border-accent">
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
            <button onClick={send} disabled={busy || !title.trim()} className="btn-brand inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />} Enviar
            </button>
            {sent && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check size={13} /> {sent}
              </span>
            )}
            {err && <span className="text-xs text-red-500">{err}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs ${active ? "border-accent bg-accent/10 font-medium text-accent" : "glass-card text-muted hover:border-accent/40"}`}
    >
      {children}
    </button>
  );
}
