"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, ArrowRight, Loader2, BookOpen, Mail, User, Check } from "lucide-react";
import { login, useAuth } from "@/lib/auth";
import { ROLE_LIST } from "@/lib/rbac";
import { authMode } from "@/lib/account";
import {
  ENABLED_PROVIDERS,
  signInWith,
  registerWithEmail,
  signInWithEmail,
  resetPassword,
  authErrorMessage,
  type ProviderId,
} from "@/lib/firebase/auth";
import zeroMark from "@/brand/zero-mark.png";

export function LoginGate() {
  if (authMode === "firebase") return <SocialLogin />;
  return <PasswordLogin />;
}

// ── Login social (Firebase) ────────────────────────────────
function ProviderIcon({ id }: { id: ProviderId }) {
  if (id === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
      </svg>
    );
  }
  if (id === "github") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
        <path d="M12 1.5A10.5 10.5 0 0 0 8.68 22a.55.55 0 0 0 .73-.53v-2c-3 .65-3.6-1.27-3.6-1.27-.5-1.24-1.2-1.57-1.2-1.57-.98-.67.08-.66.08-.66 1.08.08 1.65 1.11 1.65 1.11.96 1.65 2.53 1.17 3.14.9.1-.7.38-1.17.68-1.44-2.4-.27-4.92-1.2-4.92-5.34 0-1.18.42-2.14 1.1-2.9-.1-.27-.48-1.37.11-2.85 0 0 .9-.29 2.96 1.1a10.3 10.3 0 0 1 5.4 0c2.06-1.39 2.96-1.1 2.96-1.1.59 1.48.21 2.58.1 2.85.69.76 1.1 1.72 1.1 2.9 0 4.15-2.52 5.06-4.93 5.33.39.34.73 1 .73 2.02v3c0 .29.19.63.74.52A10.5 10.5 0 0 0 12 1.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.96h-1.52c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0 0 24 12Z" />
    </svg>
  );
}

function SocialLogin() {
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [err, setErr] = useState("");

  async function go(id: ProviderId) {
    setErr("");
    setBusy(id);
    try {
      await signInWith(id);
    } catch (e) {
      const msg = (e as Error).message || "";
      setErr(/popup-closed|cancelled/i.test(msg) ? "Inicio cancelado." : "No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell>
      <div className="space-y-2.5">
        {ENABLED_PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => go(p.id)}
            disabled={!!busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border glass-card px-4 py-2.5 text-sm font-medium text-ink hover:border-accent/50 disabled:opacity-50"
          >
            {busy === p.id ? <Loader2 size={16} className="animate-spin" /> : <ProviderIcon id={p.id} />}
            Continuar con {p.label}
          </button>
        ))}
      </div>
      {err && <p className="mt-3 text-center text-xs text-red-500">{err}</p>}

      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted/60">
        <span className="h-px flex-1 bg-border" /> o con tu correo <span className="h-px flex-1 bg-border" />
      </div>

      <EmailAuth />

      <p className="mt-4 text-center text-[11px] text-muted">
        Al entrar por primera vez, tu cuenta queda <strong>pendiente</strong> hasta que el administrador la apruebe.
      </p>
    </Shell>
  );
}

type EmailMode = "signin" | "register" | "reset";

// Acceso/registro con correo y contraseña (Firebase).
function EmailAuth() {
  const [mode, setMode] = useState<EmailMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    setBusy(true);
    try {
      if (mode === "register") {
        await registerWithEmail(email, pass, name);
        // El AuthListener crea el perfil y entra automáticamente.
      } else if (mode === "signin") {
        await signInWithEmail(email, pass);
      } else {
        await resetPassword(email);
        setOk("Te enviamos un correo para restablecer tu contraseña.");
      }
    } catch (e2) {
      setErr(authErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  const cta = mode === "register" ? "Crear cuenta" : mode === "reset" ? "Enviar enlace" : "Iniciar sesión";

  return (
    <form onSubmit={submit} className="space-y-2.5">
      {mode === "register" && (
        <Field icon={<User size={13} />} label="Nombre">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="name"
            className="w-full rounded-lg border glass-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </Field>
      )}
      <Field icon={<Mail size={13} />} label="Correo">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@empresa.com"
          autoComplete="email"
          required
          className="w-full rounded-lg border glass-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
      </Field>
      {mode !== "reset" && (
        <Field icon={<Lock size={13} />} label="Contraseña">
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={mode === "register" ? "Mínimo 6 caracteres" : "••••••••"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            className="w-full rounded-lg border glass-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </Field>
      )}

      {err && <p className="text-xs text-red-500">{err}</p>}
      {ok && (
        <p className="flex items-center gap-1 text-xs text-emerald-600">
          <Check size={13} /> {ok}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !email || (mode !== "reset" && !pass)}
        className="btn-brand flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-95 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} {cta}
      </button>

      <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted">
        {mode === "signin" ? (
          <>
            <button type="button" onClick={() => { setMode("register"); setErr(""); setOk(""); }} className="hover:text-ink">
              Crear cuenta nueva
            </button>
            <button type="button" onClick={() => { setMode("reset"); setErr(""); setOk(""); }} className="hover:text-ink">
              ¿Olvidaste tu contraseña?
            </button>
          </>
        ) : (
          <button type="button" onClick={() => { setMode("signin"); setErr(""); setOk(""); }} className="hover:text-ink">
            ← Ya tengo cuenta · Iniciar sesión
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}

// ── Login por clave (compat / sin Firebase) ────────────────
function PasswordLogin() {
  const setSession = useAuth((s) => s.setSession);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const session = await login(pass);
      if (session) setSession(session);
      else setErr("Clave incorrecta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Lock size={13} /> Clave de acceso
          </span>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
            placeholder="••••••••"
            className="w-full rounded-lg border glass-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <button
          type="submit"
          disabled={busy || !pass}
          className="btn-brand flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-95 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Entrar
        </button>
      </form>

      <div className="mt-5 border-t pt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted/70">Perfiles del equipo</p>
        <div className="space-y-1.5">
          {ROLE_LIST.map((r) => (
            <div key={r.id} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${r.badge}`}>{r.label}</span>
              <span className="text-muted">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand-halo flex min-h-screen items-center justify-center px-4">
      <div className="zero-rise w-full max-w-sm">
        <div className="surface surface-glow p-7">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--night)] shadow-lg">
              <Image src={zeroMark} alt="ZERO AGENCY" width={34} height={34} className="h-[34px] w-[34px] rounded-lg" />
            </div>
            <h1 className="text-lg font-bold tracking-[0.18em] text-ink">ZERO AGENCY</h1>
            <p className="mt-1 text-sm text-muted">Acceso al OS Omnicanal</p>
          </div>
          {children}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted">
          <Link href="/" className="hover:text-ink">Inicio</Link>
          <Link href="/docs" className="flex items-center gap-1 hover:text-ink">
            <BookOpen size={12} /> Documentación
          </Link>
        </div>
      </div>
    </div>
  );
}
