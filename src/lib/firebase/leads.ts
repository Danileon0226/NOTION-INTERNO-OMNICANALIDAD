"use client";

import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit as fblimit,
  type Unsubscribe,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/app";

// Acceso a la colección `leads` de Firestore (escrita por n8n; el OS es el cockpit).

export type LeadStatus =
  | "received"
  | "processing"
  | "qualifying"
  | "awaiting_customer"
  | "qualified"
  | "documenting"
  | "ready_to_distribute"
  | "assigned"
  | "won"
  | "lost"
  | "discarded";

export interface Lead {
  id: string;
  leadId?: string;
  receivedAt?: string;
  status: LeadStatus;
  source?: { channel?: string; campaign?: string; adId?: string };
  contact?: { fullName?: string; phone?: string; email?: string; consent?: boolean; preferredChannel?: string };
  intent?: {
    rawMessage?: string;
    vehicleOfInterest?: string;
    newOrUsed?: string;
    budget?: number | null;
    financing?: boolean;
    tradeIn?: boolean;
    timeframe?: string;
  };
  ownerId?: string;
  ownerName?: string;
  notes?: string;
  score?: number;
  lastAgentReply?: string;
}

export const LEAD_STATUS: { id: LeadStatus; label: string; tone: string }[] = [
  { id: "received", label: "Recibido", tone: "bg-sky-500/15 text-sky-500" },
  { id: "processing", label: "Procesando", tone: "bg-violet-500/15 text-violet-500" },
  { id: "qualifying", label: "Calificando", tone: "bg-violet-500/15 text-violet-500" },
  { id: "awaiting_customer", label: "Esperando cliente", tone: "bg-amber-500/15 text-amber-500" },
  { id: "qualified", label: "Calificado", tone: "bg-emerald-500/15 text-emerald-600" },
  { id: "documenting", label: "Documentando", tone: "bg-emerald-500/15 text-emerald-600" },
  { id: "ready_to_distribute", label: "Listo para asignar", tone: "bg-emerald-500/15 text-emerald-600" },
  { id: "assigned", label: "Asignado", tone: "bg-accent/15 text-accent" },
  { id: "won", label: "Ganado", tone: "bg-emerald-600/20 text-emerald-700" },
  { id: "lost", label: "Perdido", tone: "bg-red-500/15 text-red-500" },
  { id: "discarded", label: "Descartado", tone: "bg-gray-400/15 text-gray-400" },
];

export const CHANNEL_LABEL: Record<string, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  meta_fb: "Facebook",
  meta_ig: "Instagram",
  google: "Google",
  email: "Email",
  call: "Llamada",
};

export function statusMeta(id?: string) {
  return LEAD_STATUS.find((s) => s.id === id) || LEAD_STATUS[0];
}

function db() {
  const d = firebaseDb();
  if (!d) throw new Error("Firebase no está configurado.");
  return d;
}

function normalize(id: string, data: Record<string, unknown>): Lead {
  return { id, ...(data as object), status: (data.status as LeadStatus) || "received" } as Lead;
}

/** Suscripción en vivo a los leads más recientes. */
export function watchLeads(cb: (leads: Lead[]) => void, max = 150): Unsubscribe {
  const q = query(collection(db(), "leads"), orderBy("receivedAt", "desc"), fblimit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => normalize(d.id, d.data()))),
    () => cb([])
  );
}

/** Actualiza campos del lead (estado, asignación, notas, score). */
export async function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  await updateDoc(doc(db(), "leads", id), patch as Record<string, unknown>);
}
