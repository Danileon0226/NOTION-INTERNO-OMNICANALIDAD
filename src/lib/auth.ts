"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/rbac";

// Login multi-usuario por rol, configurado desde variables de entorno.
//
// Opción A — multi-usuario (recomendada para equipo):
//   NEXT_PUBLIC_APP_USERS = JSON con una entrada por persona, p. ej.:
//   [
//     {"name":"Daniel","role":"admin","sha256":"<hash de la clave>"},
//     {"name":"Comercial","role":"comercial","pass":"clave-comercial"},
//     {"name":"Dev","role":"dev","sha256":"<hash de la clave>"}
//   ]
//   Cada entrada usa "pass" (clave en claro) o "sha256" (hash SHA-256, recomendado).
//
// Opción B — clave única (compat, equivale a un admin):
//   NEXT_PUBLIC_APP_PASSWORD        → clave en claro
//   NEXT_PUBLIC_APP_PASSWORD_SHA256 → hash SHA-256 de la clave
//
// Nota: al ser una app client-side/estática, esto es una PUERTA de acceso por
// rol, no seguridad fuerte. Los datos siguen viviendo solo en cada navegador.

const PLAIN = process.env.NEXT_PUBLIC_APP_PASSWORD || "";
const HASH = (process.env.NEXT_PUBLIC_APP_PASSWORD_SHA256 || "").toLowerCase();

interface UserCfg {
  name: string;
  role: Role;
  pass?: string;
  sha256?: string;
}

const VALID_ROLES: Role[] = ["admin", "comercial", "dev"];

function parseUsers(): UserCfg[] {
  const users: UserCfg[] = [];
  const raw = process.env.NEXT_PUBLIC_APP_USERS;
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const u of arr) {
          if (!u || (!u.pass && !u.sha256)) continue;
          const role: Role = VALID_ROLES.includes(u.role) ? u.role : "admin";
          users.push({
            name: String(u.name || u.role || "Usuario"),
            role,
            pass: u.pass ? String(u.pass) : undefined,
            sha256: u.sha256 ? String(u.sha256).toLowerCase() : undefined,
          });
        }
      }
    } catch {
      /* JSON inválido → se ignora */
    }
  }
  // Compat: clave única = un único administrador.
  if (PLAIN || HASH) {
    users.push({ name: "Administrador", role: "admin", pass: PLAIN || undefined, sha256: HASH || undefined });
  }
  return users;
}

const USERS = parseUsers();

/** ¿Hay que pedir clave para entrar? */
export const authRequired = USERS.length > 0;

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface Session {
  name: string;
  role: Role;
}

/** Autentica una clave contra los usuarios configurados. Devuelve la sesión o null. */
export async function login(input: string): Promise<Session | null> {
  let inputHash: string | null = null;
  for (const u of USERS) {
    if (u.sha256) {
      if (inputHash === null) {
        try {
          inputHash = (await sha256hex(input)).toLowerCase();
        } catch {
          inputHash = "";
        }
      }
      if (inputHash && inputHash === u.sha256) return { name: u.name, role: u.role };
    } else if (u.pass && input === u.pass) {
      return { name: u.name, role: u.role };
    }
  }
  return null;
}

interface AuthState {
  authed: boolean;
  role: Role;
  name: string;
  setSession: (s: Session) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      authed: false,
      // Sin login configurado, el modo solo es administrador (acceso total).
      role: "admin",
      name: "",
      setSession: (s) => set({ authed: true, name: s.name, role: s.role }),
      logout: () => set({ authed: false }),
    }),
    { name: "zero-agency-auth" }
  )
);
