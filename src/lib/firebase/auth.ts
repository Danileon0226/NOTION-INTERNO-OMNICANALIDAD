"use client";

import {
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
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

/** Cierra la sesión de Firebase. */
export async function signOutFirebase(): Promise<void> {
  const auth = firebaseAuth();
  if (auth) await fbSignOut(auth);
}
