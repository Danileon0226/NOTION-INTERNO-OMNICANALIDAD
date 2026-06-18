"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { checkPassword, useAuth } from "@/lib/auth";

export function LoginGate() {
  const setAuthed = useAuth((s) => s.setAuthed);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (await checkPassword(pass)) {
        setAuthed(true);
      } else {
        setErr("Clave incorrecta.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="brand-halo flex min-h-screen items-center justify-center px-4">
      <div className="zero-rise w-full max-w-sm">
        <div className="surface surface-glow p-7">
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="zero-monogram mb-3 h-14 w-14 text-2xl">Z</span>
            <h1 className="text-lg font-bold tracking-[0.18em] text-ink">ZERO AGENCY</h1>
            <p className="mt-1 text-sm text-muted">Acceso al OS Omnicanal</p>
          </div>

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
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} Entrar
            </button>
          </form>
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
