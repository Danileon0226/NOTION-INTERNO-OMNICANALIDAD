"use client";

import { authRequired, useAuth } from "@/lib/auth";
import { firebaseEnabled } from "@/lib/firebase/app";
import { useFirebaseSession } from "@/lib/firebase/session";
import { signOutFirebase } from "@/lib/firebase/auth";
import type { Role } from "@/lib/rbac";

// Capa unificada de "cuenta": abstrae el modo de autenticación activo.
// - firebase: login social con perfiles/permisos centralizados.
// - password: clave por rol desde variable de entorno (compat).
// - open: sin login (modo admin abierto).
export type AuthMode = "firebase" | "password" | "open";

export const authMode: AuthMode = firebaseEnabled ? "firebase" : authRequired ? "password" : "open";

export interface Account {
  status: "loading" | "authed" | "anon";
  authed: boolean;
  enabled: boolean; // aprobado para usar la app
  role: Role;
  name: string;
  email?: string;
  photoURL?: string;
  uid?: string;
  modules: Record<string, boolean>; // overrides por módulo
}

const EMPTY = { modules: {} as Record<string, boolean> };

/** Cuenta efectiva del usuario actual, sea cual sea el modo de autenticación. */
export function useAccount(): Account {
  const fb = useFirebaseSession();
  const pwAuthed = useAuth((s) => s.authed);
  const pwRole = useAuth((s) => s.role);
  const pwName = useAuth((s) => s.name);

  if (authMode === "firebase") {
    if (fb.status === "loading") return { status: "loading", authed: false, enabled: false, role: "dev", name: "", ...EMPTY };
    if (fb.status === "anon") return { status: "anon", authed: false, enabled: false, role: "dev", name: "", ...EMPTY };
    const p = fb.profile;
    // Autenticado pero sin perfil legible (pendiente/bloqueado por reglas).
    if (!p) return { status: "authed", authed: true, enabled: false, role: "dev", name: "", ...EMPTY };
    return {
      status: "authed",
      authed: true,
      enabled: p.enabled,
      role: p.role,
      name: p.displayName || p.email || "Usuario",
      email: p.email,
      photoURL: p.photoURL,
      uid: p.uid,
      modules: p.modules || {},
    };
  }

  if (authMode === "password") {
    return {
      status: pwAuthed ? "authed" : "anon",
      authed: pwAuthed,
      enabled: true,
      role: pwRole,
      name: pwName,
      ...EMPTY,
    };
  }

  // open: sin login configurado → admin con acceso total.
  return { status: "authed", authed: true, enabled: true, role: "admin", name: "", ...EMPTY };
}

/** Cierra sesión en el modo activo. */
export async function signOutAccount(): Promise<void> {
  if (authMode === "firebase") {
    await signOutFirebase();
    return;
  }
  useAuth.getState().logout();
}
