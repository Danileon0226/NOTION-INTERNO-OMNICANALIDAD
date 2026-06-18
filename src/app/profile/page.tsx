"use client";

import { useState } from "react";
import { UserCircle, LogOut, CheckCircle2 } from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { authMode, useAccount, signOutAccount } from "@/lib/account";
import { MODULES, roleMeta, canAccessWith } from "@/lib/rbac";

export default function ProfilePage() {
  const account = useAccount();
  const rm = roleMeta(account.role);
  const [signing, setSigning] = useState(false);

  const myModules = MODULES.filter((m) => canAccessWith(account.role, m.href, account.modules));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader icon={<UserCircle size={20} />} title="Mi perfil" subtitle="Tu identidad, rol y acceso dentro del OS." />

      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl border glass-card p-4">
          {account.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.photoURL} alt={account.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="zero-monogram h-16 w-16 text-2xl">{(account.name || "Z").charAt(0).toUpperCase()}</span>
          )}
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-ink">{account.name || "Usuario"}</div>
            {account.email && <div className="truncate text-sm text-muted">{account.email}</div>}
            <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${rm.badge}`}>{rm.label}</span>
          </div>
          <button
            onClick={async () => {
              setSigning(true);
              await signOutAccount();
            }}
            disabled={signing}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-ink hover:bg-bg-subtle disabled:opacity-50"
          >
            <LogOut size={15} /> Salir
          </button>
        </div>

        <div className="rounded-xl border glass-card p-4">
          <div className="mb-1 text-sm font-semibold text-ink">{rm.label}</div>
          <p className="text-sm text-muted">{rm.desc}</p>
        </div>

        <div className="rounded-xl border glass-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Módulos a los que tienes acceso</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {myModules.map((m) => (
              <div key={m.href} className="flex items-center gap-2 rounded-lg border glass-inset px-2.5 py-1.5 text-sm">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span className="text-ink">{m.label}</span>
              </div>
            ))}
          </div>
          {authMode === "firebase" && (
            <p className="mt-2.5 text-[11px] text-muted">
              ¿Necesitas acceso a otro módulo? Pídele al administrador que lo habilite para tu cuenta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
