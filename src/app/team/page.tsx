"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle2, Circle, Loader2, ShieldAlert } from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { authMode } from "@/lib/account";
import { ROLE_LIST, MODULES, roleMeta, canAccess, type Role } from "@/lib/rbac";
import {
  watchProfiles,
  adminUpdateProfile,
  listActivity,
  type UserProfile,
  type ActivityRecord,
} from "@/lib/firebase/profiles";

export default function TeamPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (authMode !== "firebase") {
      setLoading(false);
      return;
    }
    const unsub = watchProfiles((list) => {
      setProfiles(list);
      setLoading(false);
      setSelected((cur) => cur ?? list[0]?.uid ?? null);
    });
    return () => unsub();
  }, []);

  if (authMode !== "firebase") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <ModuleHeader icon={<Users size={20} />} title="Equipo" subtitle="Gestión de personas, roles y permisos." />
        <div className="rounded-xl border glass-card p-6 text-sm text-muted">
          La consola de equipo requiere el backend de Firebase. Configúralo (variables{" "}
          <code className="rounded bg-bg-subtle px-1 py-0.5 text-[11px]">NEXT_PUBLIC_FIREBASE_*</code>) para gestionar
          perfiles, permisos y seguimiento de cada persona. Ver la documentación.
        </div>
      </div>
    );
  }

  const current = profiles.find((p) => p.uid === selected) || null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<Users size={20} />}
        title="Equipo"
        subtitle="Aprueba accesos, asigna roles, activa o bloquea módulos por persona y revisa su actividad."
      />

      {loading ? (
        <SkeletonList rows={5} />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Aún no hay personas registradas"
          description="Comparte el enlace de acceso y pídeles que inicien sesión. Aparecerán aquí para que apruebes su acceso y asignes roles."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Lista de personas */}
          <div className="space-y-1.5">
            {profiles.map((p) => (
              <button
                key={p.uid}
                onClick={() => setSelected(p.uid)}
                className={`flex w-full items-center gap-2.5 rounded-lg border p-2 text-left ${
                  selected === p.uid ? "border-accent/50 bg-accent/5" : "glass-card hover:border-accent/30"
                }`}
              >
                {p.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoURL} alt={p.displayName} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="zero-monogram h-8 w-8 text-xs">{(p.displayName || "?").charAt(0).toUpperCase()}</span>
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-medium text-ink">{p.displayName}</div>
                  <div className="truncate text-[11px] text-muted">{p.email}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    p.enabled ? roleMeta(p.role).badge : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {p.enabled ? roleMeta(p.role).label : "Pendiente"}
                </span>
              </button>
            ))}
          </div>

          {/* Detalle / edición */}
          {current && <Detail key={current.uid} profile={current} />}
        </div>
      )}
    </div>
  );
}

function Detail({ profile }: { profile: UserProfile }) {
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<ActivityRecord[] | null>(null);
  const [title, setTitle] = useState(profile.title || "");
  const [notes, setNotes] = useState(profile.notes || "");

  async function save(patch: Parameters<typeof adminUpdateProfile>[1]) {
    setSaving(true);
    try {
      await adminUpdateProfile(profile.uid, patch);
    } finally {
      setSaving(false);
    }
  }

  async function loadActivity() {
    setActivity([]);
    const recs = await listActivity(profile.uid, 50);
    setActivity(recs);
  }

  return (
    <div className="space-y-4 rounded-xl border glass-card p-4">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        {profile.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoURL} alt={profile.displayName} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="zero-monogram h-12 w-12 text-lg">{(profile.displayName || "?").charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-ink">{profile.displayName}</div>
          <div className="truncate text-xs text-muted">{profile.email}</div>
          <div className="mt-0.5 text-[11px] text-muted">
            {profile.providers.map((p) => p.replace(".com", "")).join(", ") || "—"} · alta{" "}
            {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("es-CO") : "—"}
          </div>
        </div>
        {saving && <Loader2 size={16} className="ml-auto animate-spin text-accent" />}
      </div>

      {/* Estado de acceso */}
      <div className="flex items-center justify-between rounded-lg border glass-inset p-3">
        <div>
          <div className="text-sm font-medium text-ink">Acceso</div>
          <div className="text-[11px] text-muted">{profile.enabled ? "Habilitado: puede entrar." : "Bloqueado / pendiente."}</div>
        </div>
        <button
          onClick={() => save({ enabled: !profile.enabled })}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            profile.enabled ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
          }`}
        >
          {profile.enabled ? "Bloquear" : "Aprobar / habilitar"}
        </button>
      </div>

      {/* Rol */}
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Rol</div>
        <div className="flex flex-wrap gap-2">
          {ROLE_LIST.map((r) => (
            <button
              key={r.id}
              onClick={() => save({ role: r.id as Role })}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                profile.role === r.id ? "border-accent bg-accent/10 font-medium text-accent" : "glass-card text-ink hover:border-accent/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Módulos: overrides por persona sobre el permiso del rol */}
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Módulos permitidos</div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {MODULES.map((m) => {
            const override = profile.modules?.[m.href];
            const effective = override !== undefined ? override : canAccess(profile.role, m.href);
            return (
              <button
                key={m.href}
                onClick={() => {
                  const next = { ...(profile.modules || {}) };
                  // Alterna el acceso efectivo guardándolo como override explícito.
                  next[m.href] = !effective;
                  save({ modules: next });
                }}
                className="flex items-center gap-2 rounded-lg border glass-inset px-2.5 py-1.5 text-left text-sm hover:border-accent/40"
              >
                {effective ? (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                ) : (
                  <Circle size={16} className="shrink-0 text-muted" />
                )}
                <span className={effective ? "text-ink" : "text-muted"}>{m.label}</span>
                {override !== undefined && <span className="ml-auto text-[9px] text-accent">override</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">El override por persona manda sobre el permiso del rol. Sin override, hereda del rol.</p>
      </div>

      {/* Cargo y notas internas */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-muted">
          Cargo
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== (profile.title || "") && save({ title })}
            placeholder="p. ej. Ejecutivo comercial"
            className="mt-1 w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block text-xs text-muted">
          Notas internas
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (profile.notes || "") && save({ notes })}
            placeholder="Visible solo para administradores"
            className="mt-1 w-full rounded-md border glass-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      </div>

      {/* Seguimiento de actividad */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Actividad reciente</span>
          <button onClick={loadActivity} className="text-[11px] text-accent hover:underline">
            {activity === null ? "Cargar" : "Actualizar"}
          </button>
        </div>
        {activity === null ? (
          <p className="text-[11px] text-muted">Última conexión: {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString("es-CO") : "—"}</p>
        ) : activity.length === 0 ? (
          <p className="text-[11px] text-muted">Sin actividad registrada.</p>
        ) : (
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded border glass-inset px-2 py-1 text-[11px]">
                <span className="truncate text-ink">{a.label}</span>
                <span className="shrink-0 text-muted">{new Date(a.ts).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <ShieldAlert size={12} /> Los cambios de rol y permisos se aplican al instante en la sesión de la persona.
      </p>
    </div>
  );
}
