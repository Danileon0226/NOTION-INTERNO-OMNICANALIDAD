"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth, firebaseEnabled } from "@/lib/firebase/app";
import { useFirebaseSession } from "@/lib/firebase/session";
import { ensureProfile, watchProfile, logActivity } from "@/lib/firebase/profiles";

// Escucha el estado de autenticación de Firebase y mantiene el perfil del
// usuario en vivo (refleja al instante cambios de rol/permisos hechos por el
// admin). Se monta una sola vez en el AppShell.
export function AuthListener() {
  useEffect(() => {
    if (!firebaseEnabled) return;
    const auth = firebaseAuth();
    if (!auth) return;

    let unwatch: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, async (user) => {
      unwatch?.();
      unwatch = undefined;
      if (!user) {
        useFirebaseSession.getState().setAnon();
        return;
      }
      try {
        const profile = await ensureProfile(user);
        useFirebaseSession.getState().setProfile(user.uid, profile);
        void logActivity(user.uid, "login", "Inicio de sesión");
        unwatch = watchProfile(user.uid, (live) => {
          useFirebaseSession.getState().setProfile(user.uid, live);
        });
      } catch {
        // Autenticado pero sin perfil accesible (reglas/red) → estado bloqueado.
        useFirebaseSession.getState().setProfile(user.uid, null);
      }
    });

    return () => {
      unsub();
      unwatch?.();
    };
  }, []);

  return null;
}
