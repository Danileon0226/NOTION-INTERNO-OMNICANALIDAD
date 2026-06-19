"use client";

import { collection, addDoc, onSnapshot, query, orderBy, limit as fblimit, serverTimestamp, type Unsubscribe } from "firebase/firestore";
import { firebaseDb, firebaseEnabled } from "@/lib/firebase/app";
import { listProfiles } from "@/lib/firebase/profiles";
import type { SileoCategory, SileoPriority } from "@/lib/sileo/store";

// Entrega de notificaciones SILEO entre personas (Firestore).
// Se guardan en users/{uid}/notifications y el SileoDaemon del destinatario las
// sincroniza en su centro local. No requiere que el OS esté abierto en ambos lados.

export interface RemoteNotification {
  id: string;
  ts: number;
  category: SileoCategory;
  priority: SileoPriority;
  title: string;
  body?: string;
  href?: string;
  actor?: string;
}

function db() {
  const d = firebaseDb();
  if (!d) throw new Error("Firebase no está configurado.");
  return d;
}

/** Envía una notificación a una persona concreta (por uid). */
export async function notifyUser(
  uid: string,
  n: { category: SileoCategory; priority: SileoPriority; title: string; body?: string; href?: string; actor?: string }
): Promise<void> {
  if (!firebaseEnabled || !uid) return;
  await addDoc(collection(db(), "users", uid, "notifications"), {
    category: n.category,
    priority: n.priority,
    title: n.title,
    body: n.body || "",
    href: n.href || "",
    actor: n.actor || "",
    ts: Date.now(),
    tsServer: serverTimestamp(),
  });
}

/** Difusión a todo el equipo (solo admin por reglas). Devuelve a cuántos llegó. */
export async function broadcast(n: {
  category: SileoCategory;
  priority: SileoPriority;
  title: string;
  body?: string;
  href?: string;
  actor?: string;
}): Promise<number> {
  const people = await listProfiles();
  const targets = people.filter((p) => p.enabled);
  await Promise.allSettled(targets.map((p) => notifyUser(p.uid, n)));
  return targets.length;
}

/** Suscripción en vivo a las notificaciones remotas propias. */
export function watchMyNotifications(uid: string, cb: (list: RemoteNotification[]) => void): Unsubscribe {
  const q = query(collection(db(), "users", uid, "notifications"), orderBy("ts", "desc"), fblimit(40));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ts: (data.ts as number) || 0,
            category: (data.category as SileoCategory) || "team",
            priority: (data.priority as SileoPriority) || "normal",
            title: (data.title as string) || "",
            body: (data.body as string) || "",
            href: (data.href as string) || "",
            actor: (data.actor as string) || "",
          };
        })
      ),
    () => cb([])
  );
}
