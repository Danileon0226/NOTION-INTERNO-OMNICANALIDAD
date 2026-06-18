"use client";

import { firebaseEnabled } from "@/lib/firebase/app";
import { useFirebaseSession } from "@/lib/firebase/session";
import { logActivity } from "@/lib/firebase/profiles";

// Registro de actividad best-effort para el seguimiento del admin.
// No hace nada si Firebase no está activo o no hay sesión.
export function track(type: string, label: string, path?: string): void {
  if (!firebaseEnabled) return;
  const uid = useFirebaseSession.getState().uid;
  if (!uid) return;
  void logActivity(uid, type, label, path);
}
