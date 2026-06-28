"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Clock, AlertTriangle, Loader2, ArrowRight, UserPlus } from "lucide-react";
import { LoginGate } from "@/components/LoginGate";
import { authMode, useAccount } from "@/lib/account";
import { roleMeta } from "@/lib/rbac";
import { readInvite, inviteStatus, setPendingInvite, type Invite } from "@/lib/firebase/invites";
import { claimPendingInvite } from "@/lib/firebase/profiles";
import zeroMark from "@/brand/zero-mark.png";

export default function UnirsePage() {
  return (
    <Suspense fallback={<Centered><Loader2 className="animate-spin text-white/70" /></Centered>}>
      <Join />
    </Suspense>
  );
}

function Join() {
  const params = useSearchParams();
  const router = useRouter();
  const account = useAccount();
  const code = (params.get("invite") || params.get("c") || "").trim();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Carga la invitación y la deja pendiente para el alta de perfil.
  useEffect(() => {
    if (authMode !== "firebase" || !code) {
      setLoading(false);
      return;
    }
    setPendingInvite(code);
    readInvite(code).then((inv) => {
      setInvite(inv);
      setLoading(false);
    });
  }, [code]);

  const status = inviteStatus(invite);

  // Ya autenticado: reclama la invitación y entra.
  useEffect(() => {
    if (authMode !== "firebase" || !account.authed || !status.ok || claiming) return;
    setClaiming(true);
    claimPendingInvite().finally(() => router.replace("/dashboard"));
  }, [account.authed, status.ok, claiming, router]);

  if (authMode !== "firebase") {
    return (
      <Centered>
        <Card>
          <Header />
          <p className="mt-3 text-sm text-white/70">
            La vinculación por QR requiere el backend de Firebase. Pide al administrador que lo configure.
          </p>
          <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
            Ir al inicio <ArrowRight size={14} />
          </Link>
        </Card>
      </Centered>
    );
  }

  if (!code) {
    return (
      <Centered>
        <Card>
          <Header />
          <Bad text="Falta el código de invitación. Escanea de nuevo el QR que te compartieron." />
        </Card>
      </Centered>
    );
  }

  if (loading) {
    return (
      <Centered>
        <Loader2 className="animate-spin text-white/70" />
      </Centered>
    );
  }

  if (!status.ok) {
    return (
      <Centered>
        <Card>
          <Header />
          <Bad text={status.reason || "Invitación no válida."} />
          <p className="mt-3 text-[12px] text-white/55">Pide al administrador una invitación nueva.</p>
        </Card>
      </Centered>
    );
  }

  if (account.authed || claiming) {
    return (
      <Centered>
        <Card>
          <Header />
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-white/80">
            <Loader2 size={15} className="animate-spin" /> Vinculando tu cuenta…
          </p>
        </Card>
      </Centered>
    );
  }

  // Anónimo con invitación válida: inicia sesión con el contexto del rol.
  const rm = roleMeta(invite!.role);
  return (
    <LoginGate
      intro={
        <div className="mb-5 rounded-xl border border-accent/30 bg-accent/5 p-3 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <UserPlus size={13} /> Invitación para unirte
          </div>
          <div className="mt-1 text-sm text-ink">
            Te unirás como <span className="font-semibold">{rm.label}</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted">
            {invite!.autoEnable ? (
              <>
                <ShieldCheck size={12} className="text-emerald-600" /> Acceso inmediato al iniciar sesión
              </>
            ) : (
              <>
                <Clock size={12} className="text-amber-600" /> Quedará pendiente de aprobación
              </>
            )}
          </div>
        </div>
      }
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-[var(--night)] px-4">{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="brand-halo w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-7 text-center backdrop-blur-xl">{children}</div>;
}

function Header() {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
        <Image src={zeroMark} alt="ZERO AGENCY" width={32} height={32} className="h-8 w-8 rounded-lg" />
      </div>
      <h1 className="text-base font-semibold tracking-wide text-white">ZERO AGENCY</h1>
      <p className="mt-0.5 text-xs text-white/55">Vinculación al OS</p>
    </div>
  );
}

function Bad({ text }: { text: string }) {
  return (
    <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
      <AlertTriangle size={15} /> {text}
    </p>
  );
}
