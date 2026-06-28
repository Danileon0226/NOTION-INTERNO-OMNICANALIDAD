"use client";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  type Unsubscribe,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/app";
import type { Role } from "@/lib/rbac";

// Vinculación de personas por QR: cada invitación lleva un ROL y opcionalmente
// habilita el acceso al instante. Solo el admin las crea (reglas de Firestore);
// la persona la "reclama" al iniciar sesión escaneando el QR.

export interface Invite {
  code: string;
  role: Role;
  label: string; // nombre de la invitación (p. ej. "Comerciales Bogotá")
  active: boolean;
  autoEnable: boolean; // true = entra habilitada; false = queda pendiente con el rol preasignado
  expiresAt: number | null; // epoch ms o null
  maxUses: number | null; // límite de usos o null
  uses: number;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

function db() {
  const d = firebaseDb();
  if (!d) throw new Error("Firebase no está configurado.");
  return d;
}

function normalize(data: Record<string, unknown>, code: string): Invite {
  return {
    code,
    role: (data.role as Role) || "dev",
    label: (data.label as string) || "",
    active: data.active !== false,
    autoEnable: !!data.autoEnable,
    expiresAt: (data.expiresAt as number) ?? null,
    maxUses: (data.maxUses as number) ?? null,
    uses: (data.uses as number) || 0,
    createdBy: (data.createdBy as string) || "",
    createdByName: (data.createdByName as string) || "",
    createdAt: (data.createdAt as number) || 0,
  };
}

// Código corto, legible y difícil de adivinar (sin caracteres ambiguos).
function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  for (const n of arr) s += alphabet[n % alphabet.length];
  return `${s.slice(0, 5)}-${s.slice(5, 10)}`;
}

export interface NewInvite {
  role: Role;
  label: string;
  autoEnable: boolean;
  expiresAt?: number | null;
  maxUses?: number | null;
}

/** Crea una invitación (solo admin por reglas). Devuelve el código. */
export async function createInvite(input: NewInvite, by: { uid: string; name: string }): Promise<string> {
  const code = genCode();
  await setDoc(doc(db(), "invites", code), {
    role: input.role,
    label: input.label.trim() || `Invitación ${input.role}`,
    active: true,
    autoEnable: input.autoEnable,
    expiresAt: input.expiresAt ?? null,
    maxUses: input.maxUses ?? null,
    uses: 0,
    createdBy: by.uid,
    createdByName: by.name,
    createdAt: Date.now(),
    createdAtTs: serverTimestamp(),
  });
  return code;
}

/** Suscripción en vivo a todas las invitaciones (panel admin). */
export function watchInvites(cb: (list: Invite[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db(), "invites"),
    (snap) => cb(snap.docs.map((d) => normalize(d.data(), d.id)).sort((a, b) => b.createdAt - a.createdAt)),
    () => cb([])
  );
}

export async function setInviteActive(code: string, active: boolean): Promise<void> {
  await updateDoc(doc(db(), "invites", code), { active });
}

export async function deleteInvite(code: string): Promise<void> {
  await deleteDoc(doc(db(), "invites", code));
}

/** Lee una invitación por código (para la pantalla de unión). */
export async function readInvite(code: string): Promise<Invite | null> {
  try {
    const snap = await getDoc(doc(db(), "invites", code));
    return snap.exists() ? normalize(snap.data(), code) : null;
  } catch {
    return null;
  }
}

/** Estado de validez de una invitación, para mensajes claros en la UI. */
export function inviteStatus(inv: Invite | null): { ok: boolean; reason?: string } {
  if (!inv) return { ok: false, reason: "La invitación no existe." };
  if (!inv.active) return { ok: false, reason: "La invitación está desactivada." };
  if (inv.expiresAt && inv.expiresAt < Date.now()) return { ok: false, reason: "La invitación expiró." };
  if (inv.maxUses != null && inv.uses >= inv.maxUses) return { ok: false, reason: "La invitación alcanzó su límite de usos." };
  return { ok: true };
}

/** Incrementa el contador de usos (best-effort; permitido por reglas a +1). */
export async function bumpInviteUses(code: string): Promise<void> {
  try {
    await updateDoc(doc(db(), "invites", code), { uses: increment(1) });
  } catch {
    /* best-effort */
  }
}

// ── Invitación pendiente (entre escaneo y alta de perfil) ──────
// La pantalla /unirse la fija ANTES de iniciar sesión; el AuthListener la
// consume al crear/actualizar el perfil.
const PENDING_KEY = "zero-agency-pending-invite";

export function setPendingInvite(code: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, code);
  } catch {
    /* sin sessionStorage: se ignora */
  }
}

export function getPendingInvite(): string {
  try {
    return sessionStorage.getItem(PENDING_KEY) || "";
  } catch {
    return "";
  }
}

export function clearPendingInvite(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* noop */
  }
}

/** URL absoluta del QR/enlace de vinculación para un código. */
export function inviteUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${base}/unirse?invite=${encodeURIComponent(code)}`;
}
