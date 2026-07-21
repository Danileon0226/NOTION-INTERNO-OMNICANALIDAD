"use client";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit as fblimit,
  type Unsubscribe,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/app";

// Acceso a la colección `web_events` de Firestore: el 360 del sitio público.
// Los escribe el navegador de cada visitante de zeroagency.com.co (módulo
// src/seo/omni.js del sitio); el OS los lee en vivo aquí.

export interface WebEvent {
  id: string;
  /** Nombre del evento: page_view, whatsapp_click, lead_submit, … */
  name: string;
  /** Epoch ms del momento del evento en el navegador del visitante. */
  ts: number;
  /** Sesión de visita (sessionStorage; no es un identificador persistente). */
  session: string;
  path: string;
  title?: string;
  lang?: string;
  ref?: string;
  utm?: string;
  device?: string;
  vw?: number;
  /** Parámetros extra del evento, serializados como JSON. */
  params?: string;
}

export const WEB_EVENT_META: Record<string, { label: string; tone: string }> = {
  page_view: { label: "Vista de página", tone: "bg-sky-500/15 text-sky-500" },
  session_start: { label: "Nueva visita", tone: "bg-violet-500/15 text-violet-500" },
  whatsapp_click: { label: "Clic a WhatsApp", tone: "bg-emerald-500/15 text-emerald-600" },
  lead_submit: { label: "Lead (formulario)", tone: "bg-accent/15 text-accent" },
  blog_subscribe: { label: "Suscripción al blog", tone: "bg-accent/15 text-accent" },
  share: { label: "Compartió contenido", tone: "bg-emerald-500/15 text-emerald-600" },
  click_out: { label: "Clic saliente", tone: "bg-amber-500/15 text-amber-600" },
  scroll_depth: { label: "Scroll", tone: "bg-gray-400/15 text-muted" },
  page_leave: { label: "Salida de página", tone: "bg-gray-400/15 text-muted" },
  web_vitals: { label: "Web Vitals", tone: "bg-sky-500/15 text-sky-500" },
  js_error: { label: "Error JS", tone: "bg-red-500/15 text-red-500" },
};

export function webEventMeta(name: string) {
  return WEB_EVENT_META[name] || { label: name, tone: "bg-gray-400/15 text-muted" };
}

/** Eventos que ameritan aparecer en el feed de actividad / generar señal. */
export const NOTABLE_EVENTS = new Set(["lead_submit", "blog_subscribe", "whatsapp_click", "js_error", "share"]);

function db() {
  const d = firebaseDb();
  if (!d) throw new Error("Firebase no está configurado.");
  return d;
}

function normalize(id: string, data: Record<string, unknown>): WebEvent {
  return {
    id,
    ...(data as object),
    name: String(data.name ?? ""),
    ts: Number(data.ts ?? 0),
    session: String(data.session ?? ""),
    path: String(data.path ?? "/"),
  } as WebEvent;
}

/** Suscripción en vivo a los últimos eventos del sitio (orden: más recientes). */
export function watchWebEvents(cb: (events: WebEvent[]) => void, max = 300): Unsubscribe {
  const q = query(collection(db(), "web_events"), orderBy("ts", "desc"), fblimit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => normalize(d.id, d.data() as Record<string, unknown>))),
    () => cb([])
  );
}

/** params (JSON string) → objeto, tolerante a basura. */
export function eventParams(e: WebEvent): Record<string, unknown> {
  if (!e.params) return {};
  try {
    const v = JSON.parse(e.params);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
