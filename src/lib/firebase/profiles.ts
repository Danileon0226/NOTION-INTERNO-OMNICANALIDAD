"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  limit as fblimit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { firebaseDb, ADMIN_EMAILS } from "@/lib/firebase/app";
import type { Role } from "@/lib/rbac";
import { getPendingInvite, clearPendingInvite, readInvite, bumpInviteUses, inviteStatus } from "@/lib/firebase/invites";

// Perfil de cada persona dentro de la app, almacenado en Firestore (users/{uid}).
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  providers: string[];
  role: Role;
  enabled: boolean; // el admin aprueba/bloquea el acceso
  modules: Record<string, boolean>; // overrides por módulo (true=permitido, false=bloqueado)
  title?: string; // cargo
  notes?: string; // notas internas del admin
  createdAt: number;
  lastLoginAt: number;
}

export interface ActivityRecord {
  id: string;
  ts: number;
  type: string; // "login" | "view" | "agent" | ...
  label: string;
  path?: string;
}

function db() {
  const d = firebaseDb();
  if (!d) throw new Error("Firebase no está configurado.");
  return d;
}

function providersOf(user: User): string[] {
  return user.providerData.map((p) => p.providerId);
}

/**
 * Garantiza que exista el perfil del usuario tras iniciar sesión.
 * - Si no existe: lo crea. Los correos admin entran como admin habilitado; el
 *   resto entra como "dev" deshabilitado (pendiente de aprobación del admin).
 * - Si existe: actualiza datos de proveedor y la última conexión (sin tocar
 *   rol/enabled/modules, que solo cambia el admin).
 */
export async function ensureProfile(user: User): Promise<UserProfile> {
  const ref = doc(db(), "users", user.uid);
  const snap = await getDoc(ref);
  const email = (user.email || "").toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(email);

  // ¿Vino por un QR de vinculación? El rol/habilitación los marca la invitación.
  const pendingCode = getPendingInvite();
  const invite = pendingCode ? await readInvite(pendingCode) : null;
  const inviteOk = !!invite && inviteStatus(invite).ok && !isAdmin; // los admin se rigen por su correo

  if (!snap.exists()) {
    const role: Role = isAdmin ? "admin" : inviteOk ? invite!.role : "dev";
    const enabled = isAdmin ? true : inviteOk ? invite!.autoEnable : false;
    const profile: UserProfile = {
      uid: user.uid,
      email,
      displayName: user.displayName || email || "Usuario",
      photoURL: user.photoURL || "",
      providers: providersOf(user),
      role,
      enabled,
      modules: {},
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    const extra = inviteOk ? { invite: pendingCode, invitedRole: invite!.role } : {};
    await setDoc(ref, { ...profile, ...extra, createdAtTs: serverTimestamp(), lastLoginTs: serverTimestamp() });
    if (inviteOk) {
      void bumpInviteUses(pendingCode);
      clearPendingInvite();
    }
    return profile;
  }

  // Usuario existente que escanea un QR: aplica rol/habilitación de la invitación.
  const cur = normalize(snap.data(), user.uid);
  if (inviteOk && (cur.role !== invite!.role || (invite!.autoEnable && !cur.enabled))) {
    await updateDoc(ref, {
      role: invite!.role,
      enabled: invite!.autoEnable ? true : cur.enabled,
      modules: snap.data().modules || {},
      invite: pendingCode,
      invitedRole: invite!.role,
      lastLoginAt: Date.now(),
      lastLoginTs: serverTimestamp(),
    }).catch(() => {});
    void bumpInviteUses(pendingCode);
    clearPendingInvite();
    const fresh = await getDoc(ref);
    return normalize(fresh.data() as Record<string, unknown>, user.uid);
  }

  // Actualiza solo campos propios permitidos por las reglas.
  await updateDoc(ref, {
    photoURL: user.photoURL || "",
    displayName: user.displayName || snap.data().displayName || email,
    providers: providersOf(user),
    lastLoginAt: Date.now(),
    lastLoginTs: serverTimestamp(),
  }).catch(() => {});
  return cur;
}

/** Reaplica la invitación pendiente para una sesión ya iniciada (pantalla /unirse). */
export async function claimPendingInvite(): Promise<UserProfile | null> {
  const { firebaseAuth } = await import("@/lib/firebase/app");
  const user = firebaseAuth()?.currentUser;
  if (!user) return null;
  return ensureProfile(user);
}

function normalize(data: Record<string, unknown>, uid: string): UserProfile {
  return {
    uid,
    email: (data.email as string) || "",
    displayName: (data.displayName as string) || "",
    photoURL: (data.photoURL as string) || "",
    providers: (data.providers as string[]) || [],
    role: (data.role as Role) || "dev",
    enabled: !!data.enabled,
    modules: (data.modules as Record<string, boolean>) || {},
    title: (data.title as string) || "",
    notes: (data.notes as string) || "",
    createdAt: (data.createdAt as number) || 0,
    lastLoginAt: (data.lastLoginAt as number) || 0,
  };
}

/** Suscripción en vivo al perfil propio (refleja al instante cambios del admin). */
export function watchProfile(uid: string, cb: (p: UserProfile | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db(), "users", uid),
    (snap) => cb(snap.exists() ? normalize(snap.data(), uid) : null),
    () => cb(null)
  );
}

/** Lista todos los perfiles (solo admin por reglas). */
export async function listProfiles(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db(), "users"));
  return snap.docs.map((d) => normalize(d.data(), d.id)).sort((a, b) => b.lastLoginAt - a.lastLoginAt);
}

/** Suscripción en vivo a todos los perfiles (panel de admin). */
export function watchProfiles(cb: (list: UserProfile[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db(), "users"),
    (snap) => cb(snap.docs.map((d) => normalize(d.data(), d.id)).sort((a, b) => b.lastLoginAt - a.lastLoginAt)),
    () => cb([])
  );
}

/** Actualiza campos administrables de un perfil (rol, enabled, módulos, cargo, notas). */
export async function adminUpdateProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, "role" | "enabled" | "modules" | "title" | "notes">>
): Promise<void> {
  await updateDoc(doc(db(), "users", uid), patch);
}

/** Registra un evento de actividad de una persona (seguimiento del admin). */
export async function logActivity(uid: string, type: string, label: string, path?: string): Promise<void> {
  try {
    await addDoc(collection(db(), "users", uid, "activity"), {
      type,
      label,
      path: path || "",
      ts: Date.now(),
      tsServer: serverTimestamp(),
    });
  } catch {
    /* el seguimiento es best-effort */
  }
}

/** Lee la actividad reciente de una persona (admin o el propio usuario). */
export async function listActivity(uid: string, n = 50): Promise<ActivityRecord[]> {
  const q = query(collection(db(), "users", uid, "activity"), orderBy("ts", "desc"), fblimit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ts: (data.ts as number) || 0, type: (data.type as string) || "", label: (data.label as string) || "", path: (data.path as string) || "" };
  });
}
