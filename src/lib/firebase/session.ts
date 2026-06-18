"use client";

import { create } from "zustand";
import type { UserProfile } from "@/lib/firebase/profiles";

// Estado de sesión de Firebase, alimentado por el AuthListener (onAuthStateChanged
// + suscripción en vivo al perfil). El resto de la app lo consume vía useAccount.

export type SessionStatus = "loading" | "authed" | "anon";

interface SessionState {
  status: SessionStatus;
  uid: string | null;
  profile: UserProfile | null;
  setLoading: () => void;
  setAnon: () => void;
  setProfile: (uid: string, profile: UserProfile | null) => void;
}

export const useFirebaseSession = create<SessionState>((set) => ({
  status: "loading",
  uid: null,
  profile: null,
  setLoading: () => set({ status: "loading" }),
  setAnon: () => set({ status: "anon", uid: null, profile: null }),
  setProfile: (uid, profile) => set({ status: "authed", uid, profile }),
}));
