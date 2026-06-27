"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users2,
  Loader2,
  Phone,
  Mail,
  MessageCircle,
  Car,
  UserCheck,
  Send,
  Check,
} from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { authMode, useAccount } from "@/lib/account";
import { useConnectors } from "@/lib/connectors/store";
import { waSendText } from "@/lib/connectors/meta";
import {
  watchLeads,
  updateLead,
  statusMeta,
  LEAD_STATUS,
  CHANNEL_LABEL,
  type Lead,
  type LeadStatus,
} from "@/lib/firebase/leads";

export default function LeadsPage() {
  const account = useAccount();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine" | LeadStatus>("all");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (authMode !== "firebase") {
      setLoading(false);
      return;
    }
    const unsub = watchLeads((list) => {
      setLeads(list);
      setLoading(false);
      setSelected((cur) => cur ?? list[0]?.id ?? null);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return leads;
    if (filter === "mine") return leads.filter((l) => l.ownerId === account.uid);
    return leads.filter((l) => l.status === filter);
  }, [leads, filter, account.uid]);

  const current = leads.find((l) => l.id === selected) || null;

  if (authMode !== "firebase") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <ModuleHeader icon={<Users2 size={20} />} title="Leads" subtitle="Bandeja omnicanal de prospectos." />
        <div className="rounded-xl border glass-card p-6 text-sm text-muted">
          La bandeja de Leads lee la colección <code className="rounded bg-bg-subtle px-1 py-0.5 text-[11px]">leads</code> de Firestore (la
          escriben los workflows de n8n). Configura Firebase (<code className="text-[11px]">NEXT_PUBLIC_FIREBASE_*</code>) para activarla.
        </div>
      </div>
    );
  }

  const counts = LEAD_STATUS.map((s) => ({ ...s, n: leads.filter((l) => l.status === s.id).length })).filter((s) => s.n > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<Users2 size={20} />}
        title="Leads"
        subtitle="Bandeja omnicanal: prospectos de web, WhatsApp, Facebook e Instagram en un solo lugar."
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Todos ({leads.length})
        </Chip>
        <Chip active={filter === "mine"} onClick={() => setFilter("mine")}>
          Míos ({leads.filter((l) => l.ownerId === account.uid).length})
        </Chip>
        {counts.map((s) => (
          <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
            {s.label} ({s.n})
          </Chip>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={6} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Users2 size={22} />}
          title="Aún no hay leads"
          description="En cuanto los workflows de n8n reciban un formulario, un WhatsApp o un Lead Ad, aparecerán aquí en vivo."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          {/* Lista */}
          <div className="space-y-1.5">
            {filtered.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l.id)}
                className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left ${
                  selected === l.id ? "border-accent/50 bg-accent/5" : "glass-card hover:border-accent/30"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-ink">{l.contact?.fullName || l.contact?.phone || "(sin nombre)"}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted">{CHANNEL_LABEL[l.source?.channel || ""] || l.source?.channel}</span>
                  </div>
                  <div className="truncate text-[11px] text-muted">{l.intent?.vehicleOfInterest || l.intent?.rawMessage || "—"}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusMeta(l.status).tone}`}>{statusMeta(l.status).label}</span>
                    {typeof l.score === "number" && <span className="text-[9px] text-muted">score {l.score}</span>}
                    {l.ownerId === account.uid && <UserCheck size={11} className="text-accent" />}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {current && <Detail key={current.id} lead={current} myUid={account.uid} myName={account.name} />}
        </div>
      )}
    </div>
  );
}

function Detail({ lead, myUid, myName }: { lead: Lead; myUid?: string; myName: string }) {
  const meta = useConnectors((s) => s.meta);
  const [notes, setNotes] = useState(lead.notes || "");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const canWhatsapp = !!meta.accessToken && !!meta.phoneNumberId && !!lead.contact?.phone;

  async function sendWhatsapp() {
    if (!reply.trim()) return;
    setBusy(true);
    setOk("");
    setErr("");
    try {
      await waSendText(meta, lead.contact!.phone!, reply.trim());
      await updateLead(lead.id, { lastAgentReply: reply.trim() }).catch(() => {});
      setOk("Mensaje enviado por WhatsApp.");
      setReply("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border glass-card p-4">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-semibold text-ink">{lead.contact?.fullName || "(sin nombre)"}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted">
            {lead.contact?.phone && (
              <span className="flex items-center gap-1">
                <Phone size={12} /> {lead.contact.phone}
              </span>
            )}
            {lead.contact?.email && (
              <span className="flex items-center gap-1">
                <Mail size={12} /> {lead.contact.email}
              </span>
            )}
            <span>{CHANNEL_LABEL[lead.source?.channel || ""] || lead.source?.channel}</span>
            {lead.source?.campaign && <span>· {lead.source.campaign}</span>}
          </div>
        </div>
        {typeof lead.score === "number" && (
          <div className="rounded-lg glass-inset px-2.5 py-1 text-center">
            <div className="text-lg font-black text-ink">{lead.score}</div>
            <div className="text-[10px] text-muted">score</div>
          </div>
        )}
      </div>

      {!lead.contact?.consent && (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 px-2.5 py-1.5 text-[11px] text-amber-600">
          ⚠️ Sin consentimiento (habeas data): no contactar hasta confirmar opt-in.
        </div>
      )}

      {/* Intención */}
      <div className="rounded-lg glass-inset p-3 text-sm">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Car size={13} /> Interés
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <Kv k="Vehículo" v={lead.intent?.vehicleOfInterest} />
          <Kv k="Nuevo/Usado" v={lead.intent?.newOrUsed} />
          <Kv k="Presupuesto" v={lead.intent?.budget ? `$${lead.intent.budget.toLocaleString("es-CO")}` : ""} />
          <Kv k="Financiación" v={lead.intent?.financing ? "Sí" : ""} />
          <Kv k="Plazo" v={lead.intent?.timeframe} />
        </div>
        {lead.intent?.rawMessage && <p className="mt-2 border-t pt-2 text-xs text-ink/80">“{lead.intent.rawMessage}”</p>}
      </div>

      {/* Estado + asignación */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted">Estado</label>
        <select
          value={lead.status}
          onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
          className="rounded-md border glass-card px-2 py-1 text-sm text-ink outline-none focus:border-accent"
        >
          {LEAD_STATUS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {lead.ownerId === myUid ? (
          <span className="flex items-center gap-1 text-xs text-accent">
            <UserCheck size={13} /> Asignado a ti
          </span>
        ) : (
          <button
            onClick={() => updateLead(lead.id, { ownerId: myUid, ownerName: myName, status: lead.status === "received" ? "assigned" : lead.status })}
            className="rounded-md border px-2.5 py-1 text-xs font-medium text-ink hover:bg-bg-subtle"
          >
            Asignármelo
          </button>
        )}
        {lead.ownerName && lead.ownerId !== myUid && <span className="text-xs text-muted">Asignado a {lead.ownerName}</span>}
      </div>

      {/* Responder por WhatsApp */}
      {canWhatsapp && (
        <div className="rounded-lg border glass-inset p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink">
            <MessageCircle size={14} className="text-emerald-500" /> Responder por WhatsApp
          </div>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Escribe la respuesta…"
            className="w-full resize-y rounded-md border glass-card px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={sendWhatsapp}
              disabled={busy || !reply.trim()}
              className="btn-brand inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
            </button>
            {ok && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check size={13} /> {ok}
              </span>
            )}
            {err && <span className="text-xs text-red-500">{err}</span>}
          </div>
          {lead.lastAgentReply && <p className="mt-2 text-[11px] text-muted">Último mensaje: “{lead.lastAgentReply}”</p>}
        </div>
      )}

      {/* Notas internas */}
      <label className="block text-xs text-muted">
        Notas internas
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (lead.notes || "") && updateLead(lead.id, { notes })}
          rows={2}
          placeholder="Visible para el equipo comercial"
          className="mt-1 w-full resize-y rounded-md border glass-card px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
        />
      </label>
    </div>
  );
}

function Kv({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <div className="text-xs">
      <span className="text-muted">{k}: </span>
      <span className="text-ink">{v}</span>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs ${
        active ? "border-accent bg-accent/10 font-medium text-accent" : "glass-card text-muted hover:border-accent/40"
      }`}
    >
      {children}
    </button>
  );
}
