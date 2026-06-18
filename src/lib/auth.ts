"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Login por clave desde variable de entorno.
// - NEXT_PUBLIC_APP_PASSWORD: clave en claro (simple).
// - NEXT_PUBLIC_APP_PASSWORD_SHA256: hash SHA-256 de la clave (recomendado: la
//   clave en claro no queda en el bundle, solo su hash).
// Nota: al ser una app client-side/estática, esto es una PUERTA de acceso, no
// seguridad fuerte. Tus datos siguen viviendo solo en tu navegador.

const PLAIN = process.env.NEXT_PUBLIC_APP_PASSWORD || "";
const HASH = (process.env.NEXT_PUBLIC_APP_PASSWORD_SHA256 || "").toLowerCase();

/** ¿Hay que pedir clave para entrar? */
export const authRequired = !!(PLAIN || HASH);

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comprueba la clave introducida contra la configuración de entorno. */
export async function checkPassword(input: string): Promise<boolean> {
  if (HASH) {
    try {
      return (await sha256hex(input)).toLowerCase() === HASH;
    } catch {
      return false;
    }
  }
  if (PLAIN) return input === PLAIN;
  return true; // sin clave configurada → acceso abierto
}

interface AuthState {
  authed: boolean;
  setAuthed: (b: boolean) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      authed: false,
      setAuthed: (authed) => set({ authed }),
      logout: () => set({ authed: false }),
    }),
    { name: "zero-agency-auth" }
  )
);
