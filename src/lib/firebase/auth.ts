"use client";

import {
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  type AuthProvider,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/app";

export type ProviderId = "google" | "github" | "facebook";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
}

// Proveedores ofrecidos en el login (filtrados por NEXT_PUBLIC_AUTH_PROVIDERS).
const ALL_PROVIDERS: ProviderMeta[] = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "facebook", label: "Facebook" },
];

export const ENABLED_PROVIDERS: ProviderMeta[] = (() => {
  const raw = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS || "google,github,facebook")
    .split(",")
    .map((s) => s.trim().toLowerCase());
  const list = ALL_PROVIDERS.filter((p) => raw.includes(p.id));
  return list.length ? list : ALL_PROVIDERS;
})();

function providerFor(id: ProviderId): AuthProvider {
  if (id === "github") return new GithubAuthProvider();
  if (id === "facebook") return new FacebookAuthProvider();
  const g = new GoogleAuthProvider();
  g.setCustomParameters({ prompt: "select_account" });
  return g;
}

/** Inicia sesión con un proveedor social mediante popup. */
export async function signInWith(id: ProviderId): Promise<void> {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Firebase no está configurado.");
  await signInWithPopup(auth, providerFor(id));
}

/** Crea una cuenta con correo y contraseña (el perfil queda pendiente de aprobación). */
export async function registerWithEmail(email: string, password: string, displayName: string): Promise<void> {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Firebase no está configurado.");
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const name = displayName.trim();
  if (name) await updateProfile(cred.user, { displayName: name }).catch(() => {});
}

/** Inicia sesión con correo y contraseña. */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Firebase no está configurado.");
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

/** Envía un correo para restablecer la contraseña. */
export async function resetPassword(email: string): Promise<void> {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Firebase no está configurado.");
  await sendPasswordResetEmail(auth, email.trim());
}

/** Traduce los códigos de error de Firebase Auth a mensajes claros en español. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-email": "El correo no es válido.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
    "auth/popup-closed-by-user": "Inicio cancelado.",
    "auth/network-request-failed": "Sin conexión. Revisa tu red.",
    "auth/operation-not-allowed": "Este método de acceso no está habilitado en Firebase.",
  };
  return map[code] || "No se pudo completar. Inténtalo de nuevo.";
}

/** Cierra la sesión de Firebase. */
export async function signOutFirebase(): Promise<void> {
  const auth = firebaseAuth();
  if (auth) await fbSignOut(auth);
}
