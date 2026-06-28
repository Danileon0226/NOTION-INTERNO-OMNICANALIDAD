"use client";

import { useEffect, useState } from "react";
import {
  QrCode as QrIcon,
  Plus,
  Copy,
  Check,
  Download,
  Power,
  Trash2,
  Link2,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { QrCode, downloadQr } from "@/components/QrCode";
import { authMode, useAccount } from "@/lib/account";
import { ROLE_LIST, roleMeta, type Role } from "@/lib/rbac";
import {
  createInvite,
  watchInvites,
  setInviteActive,
  deleteInvite,
  inviteUrl,
  inviteStatus,
  type Invite,
} from "@/lib/firebase/invites";

const EXPIRIES: { label: string; days: number | null }[] = [
  { label: "Sin caducidad", days: null },
  { label: "1 día", days: 1 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
];

export default function VincularPage() {
  const account = useAccount();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authMode !== "firebase") {
      setLoading(false);
      return;
    }
    const unsub = watchInvites((list) => {
      setInvites(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (authMode !== "firebase") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <ModuleHeader icon={<QrIcon size={20} />} title="Vinculación por QR" subtitle="Da de alta personas con un rol, escaneando un QR." />
        <div className="rounded-xl border glass-card p-6 text-sm text-muted">
          La vinculación por QR requiere el backend de Firebase (perfiles y roles centralizados). Configúralo
          (<code className="rounded bg-bg-subtle px-1 py-0.5 text-[11px]">NEXT_PUBLIC_FIREBASE_*</code>) para usarla.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<QrIcon size={20} />}
        title="Vinculación por QR"
        subtitle="Genera un QR por rol. Quien lo escanee inicia sesión y queda vinculado con ese rol — sin pasar credenciales."
      />

      <Creator by={{ uid: account.uid || "", name: account.name }} />

      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Invitaciones</div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl border glass-card" />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <EmptyState
            icon={<QrIcon size={22} />}
            title="Aún no hay invitaciones"
            description="Crea una arriba: elige el rol, ponle un nombre y comparte el QR con la persona."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {invites.map((inv) => (
              <InviteCard key={inv.code} inv={inv} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Creator({ by }: { by: { uid: string; name: string } }) {
  const [role, setRole] = useState<Role>("comercial");
  const [label, setLabel] = useState("");
  const [autoEnable, setAutoEnable] = useState(true);
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    setErr("");
    setBusy(true);
    try {
      const days = EXPIRIES[expiryIdx].days;
      await createInvite(
        { role, label: label.trim(), autoEnable, expiresAt: days ? Date.now() + days * 86_400_000 : null },
        by
      );
      setLabel("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border glass-card p-4">
      <div className="mb-3 text-sm font-semibold text-ink">Nueva invitación</div>

      <div className="mb-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Rol</div>
        <div className="flex flex-wrap gap-2">
          {ROLE_LIST.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                role === r.id ? "border-accent bg-accent/10 font-medium text-accent" : "glass-card text-ink hover:border-accent/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted">{roleMeta(role).desc}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted">
          Nombre de la invitación
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={`p. ej. ${roleMeta(role).label}s nuevos`}
            className="mt-1 w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block text-xs text-muted">
          Caducidad
          <select
            value={expiryIdx}
            onChange={(e) => setExpiryIdx(Number(e.target.value))}
            className="mt-1 w-full rounded-md border glass-card px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            {EXPIRIES.map((x, i) => (
              <option key={i} value={i}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={() => setAutoEnable((v) => !v)}
        className="mt-3 inline-flex items-center gap-2 text-xs text-muted hover:text-ink"
      >
        <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${autoEnable ? "btn-brand" : "border bg-bg-subtle"}`}>
          <span className={`mx-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoEnable ? "translate-x-4" : ""}`} />
        </span>
        {autoEnable ? "Acceso inmediato al escanear" : "Queda pendiente de tu aprobación"}
      </button>

      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}

      <button
        onClick={create}
        disabled={busy}
        className="btn-brand mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        <Plus size={15} /> Crear QR
      </button>
    </div>
  );
}

function InviteCard({ inv }: { inv: Invite }) {
  const url = inviteUrl(inv.code);
  const status = inviteStatus(inv);
  const rm = roleMeta(inv.role);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={`rounded-2xl border glass-card p-4 ${!status.ok ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <QrCode value={url} size={104} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${rm.badge}`}>{rm.label}</span>
            {inv.autoEnable ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                <ShieldCheck size={11} /> inmediato
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                <Clock size={11} /> aprobación
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-sm font-medium text-ink">{inv.label || "Invitación"}</div>
          <code className="mt-0.5 block truncate text-[11px] text-muted">{inv.code}</code>
          <div className="mt-1 text-[11px] text-muted">
            {inv.uses} uso(s){inv.maxUses ? ` / ${inv.maxUses}` : ""}
            {inv.expiresAt ? ` · vence ${new Date(inv.expiresAt).toLocaleDateString("es-CO")}` : ""}
          </div>
          {!status.ok && <div className="mt-0.5 text-[11px] text-red-500">{status.reason}</div>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button onClick={copy} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-ink hover:bg-bg-subtle">
          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar enlace"}
        </button>
        <button
          onClick={() => downloadQr(url, `zero-qr-${inv.role}-${inv.code}`)}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-ink hover:bg-bg-subtle"
        >
          <Download size={12} /> PNG
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-ink hover:bg-bg-subtle">
          <Link2 size={12} /> Abrir
        </a>
        <button
          onClick={() => setInviteActive(inv.code, !inv.active)}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${inv.active ? "text-amber-600 hover:bg-amber-500/10" : "text-emerald-600 hover:bg-emerald-500/10"}`}
        >
          <Power size={12} /> {inv.active ? "Desactivar" : "Activar"}
        </button>
        <button
          onClick={() => {
            if (confirm("¿Eliminar esta invitación? Los QR impresos dejarán de funcionar.")) deleteInvite(inv.code);
          }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-red-500 hover:bg-red-500/10"
        >
          <Trash2 size={12} /> Eliminar
        </button>
      </div>
    </div>
  );
}
