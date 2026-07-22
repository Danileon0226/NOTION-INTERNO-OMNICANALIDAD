"use client";

import { useEffect } from "react";
import { authMode, useAccount } from "@/lib/account";
import { firebaseEnabled } from "@/lib/firebase/app";
import { watchWebEvents, eventParams, NOTABLE_EVENTS, SITE_LABEL, siteOf, type WebEvent } from "@/lib/firebase/webEvents";
import { useWebPulse } from "@/lib/webpulse";
import { useActivity, type ActivityKind } from "@/lib/activity";
import { usePrefs } from "@/lib/prefs";
import { notify } from "@/lib/notify";
import { announceEs } from "@/lib/voice/announce";

const HOUR = 3_600_000;

function pulseOf(events: WebEvent[]) {
  const now = Date.now();
  const recent = events.filter((e) => now - e.ts < HOUR);
  return {
    views: recent.filter((e) => e.name === "page_view").length,
    sessions: new Set(recent.map((e) => e.session)).size,
    leads: recent.filter((e) => e.name === "lead_submit").length,
    subs: recent.filter((e) => e.name === "blog_subscribe").length,
    whatsapp: recent.filter((e) => e.name === "whatsapp_click").length,
    errors: recent.filter((e) => e.name === "js_error").length,
  };
}

function activityLabel(e: WebEvent): { kind: ActivityKind; label: string } {
  const p = eventParams(e);
  switch (e.name) {
    case "lead_submit":
      return { kind: "alert", label: `Lead nuevo desde la web (${e.path})` };
    case "blog_subscribe":
      return { kind: "info", label: "Nueva suscripción al blog desde la web" };
    case "whatsapp_click":
      return { kind: "info", label: `Clic a WhatsApp en el sitio (${String(p.cta_location || e.path)})` };
    case "js_error":
      return { kind: "alert", label: `Error JS en el sitio: ${String(p.message || "").slice(0, 60)}` };
    case "share":
      return { kind: "info", label: `Compartieron contenido del sitio (${e.path})` };
    default:
      return { kind: "info", label: `Evento web: ${e.name}` };
  }
}

// Mensaje corto (español) para notificación del navegador y anuncio de voz.
// Solo los eventos que ameritan interrumpir; null = no se anuncia.
function pushMessage(e: WebEvent): string | null {
  switch (e.name) {
    case "lead_submit":
      return "Lead nuevo desde la web";
    case "blog_subscribe":
      return "Nueva suscripción al blog";
    case "js_error":
      return "Error de JavaScript en el sitio web";
    default:
      return null;
  }
}

/**
 * Demonio del 360 web: se suscribe en vivo a `web_events` (Firestore),
 * mantiene el pulso de la última hora (señales para Anticipación) y anuncia
 * los eventos notables (leads, WhatsApp, errores) en el feed de actividad.
 */
export function WebPulseDaemon() {
  const account = useAccount();
  const authed = account.authed;
  const enabled = account.enabled;

  useEffect(() => {
    if (authMode !== "firebase" || !firebaseEnabled || !authed || !enabled) return;
    const unsub = watchWebEvents((events) => {
      const pulse = useWebPulse.getState();
      pulse.setPulse(pulseOf(events));
      if (!events.length) return;

      const newest = events[0].ts;
      // Primer arranque: no inundar el feed con el histórico; solo marcar.
      if (!pulse.lastSeenTs) {
        pulse.markSeen(newest);
        return;
      }
      const fresh = events.filter((e) => e.ts > pulse.lastSeenTs && NOTABLE_EVENTS.has(e.name));
      // Prefijo del sitio emisor cuando no es el sitio principal (multi-sitio).
      const conSitio = (e: WebEvent, texto: string) =>
        siteOf(e) === "zeroagency" ? texto : `${SITE_LABEL[siteOf(e)] || siteOf(e)}: ${texto}`;
      for (const e of fresh.slice(0, 8).reverse()) {
        const { kind, label } = activityLabel(e);
        useActivity.getState().push({ source: "web", kind, label: conSitio(e, label), count: 1 });
      }

      // Notificación del navegador + anuncio de voz (según Ajustes; máx. 3
      // por ciclo para no saturar si llega una ráfaga de eventos).
      const { notifyEnabled, voiceAnnounce } = usePrefs.getState();
      if (notifyEnabled || voiceAnnounce) {
        const push = fresh
          .map((e) => ({ e, msg: pushMessage(e) }))
          .filter((x): x is { e: WebEvent; msg: string } => !!x.msg)
          .map((x) => ({ e: x.e, msg: conSitio(x.e, x.msg) }))
          .slice(0, 3);
        if (notifyEnabled) {
          for (const { e, msg } of push) notify("ZERO · Web en vivo", msg, { tag: `web:${e.id}`, href: "/web" });
        }
        if (voiceAnnounce && push.length) {
          announceEs([...new Set(push.map((x) => x.msg))].join(". ") + ".");
        }
      }

      pulse.markSeen(newest);
    });
    return () => unsub();
  }, [authed, enabled]);

  return null;
}
