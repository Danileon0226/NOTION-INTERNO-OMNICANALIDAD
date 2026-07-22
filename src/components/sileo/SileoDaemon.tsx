"use client";

import { useEffect, useRef } from "react";
import { useActivity, type ActivityEvent } from "@/lib/activity";
import { useSileo, type SileoCategory, type SileoPriority } from "@/lib/sileo/store";
import { firebaseEnabled } from "@/lib/firebase/app";
import { useFirebaseSession } from "@/lib/firebase/session";
import { watchMyNotifications, type RemoteNotification } from "@/lib/sileo/remote";
import { notify } from "@/lib/notify";
import { announceEs } from "@/lib/voice/announce";
import { useConnectors } from "@/lib/connectors/store";
import { tgSendMessage, alertText } from "@/lib/connectors/telegram";
import { waSendText } from "@/lib/connectors/meta";

// Mapea un evento del feed de actividad a una notificación SILEO.
function mapActivity(e: ActivityEvent): { category: SileoCategory; priority: SileoPriority; title: string } {
  if (e.kind === "alert") return { category: "monitor", priority: "high", title: e.label };
  const category: SileoCategory =
    e.source === "ai" ? "agent" : e.source === "telegram" ? "team" : "system";
  return { category, priority: "normal", title: e.label };
}

// Demonio de SILEO: alimenta el centro de notificaciones desde (1) el feed de
// actividad local y (2) las notificaciones remotas dirigidas a la persona.
export function SileoDaemon() {
  const uid = useFirebaseSession((s) => s.uid);
  const forwardedIds = useRef<Set<string>>(new Set());

  // (3) Reenvío de alta prioridad a Telegram/WhatsApp (canales externos).
  useEffect(() => {
    const mountTs = Date.now();
    const unsub = useSileo.subscribe((state) => {
      const { forward, whatsappAlertTo } = state;
      if (!forward.telegram && !forward.whatsapp) return;
      for (const n of state.items) {
        if (n.priority !== "high" || n.ts < mountTs || forwardedIds.current.has(n.id)) continue;
        forwardedIds.current.add(n.id);
        const c = useConnectors.getState();
        const text = `${n.title}${n.body ? ` — ${n.body}` : ""}`;
        if (forward.telegram && c.telegram.botToken && c.telegram.chatId) {
          tgSendMessage(c.telegram.botToken, c.telegram.chatId, alertText("SILEO · alta prioridad", text)).catch(() => {});
        }
        if (forward.whatsapp && whatsappAlertTo && c.meta.accessToken && c.meta.phoneNumberId) {
          waSendText(c.meta, whatsappAlertTo, `🔔 SILEO: ${text}`).catch(() => {});
        }
      }
    });
    return () => unsub();
  }, []);

  // (1) Puente desde el feed de actividad → SILEO.
  useEffect(() => {
    let lastTs = useActivity.getState().events[0]?.ts ?? 0; // baseline: no reproduce histórico
    const unsub = useActivity.subscribe((state) => {
      const fresh = state.events.filter((e) => e.ts > lastTs);
      if (!fresh.length) return;
      lastTs = state.events[0]?.ts ?? lastTs;
      for (const e of fresh.reverse()) {
        useSileo.getState().notify({ id: `act:${e.id}`, ts: e.ts, ...mapActivity(e) });
      }
    });
    return () => unsub();
  }, []);

  // (2) Entrega remota (entre personas) → SILEO.
  useEffect(() => {
    if (!firebaseEnabled || !uid) return;
    const seeded = { done: false };
    const seen = new Set<string>();
    const unsub = watchMyNotifications(uid, (list) => {
      const entrantes: RemoteNotification[] = [];
      for (const r of list) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          if (seeded.done) entrantes.push(r); // recién llegada (no histórico)
        }
        useSileo.getState().notify({
          id: `r:${r.id}`,
          ts: r.ts,
          category: r.category,
          priority: r.priority,
          title: r.title,
          body: r.body,
          href: r.href,
          actor: r.actor,
          remote: true,
          silent: !seeded.done, // la primera carga no dispara toasts
        });
      }

      // Notificación del navegador + anuncio de voz para lo recién entrante
      // (según Ajustes; respeta el modo silencio de SILEO; máx. 3 por lote).
      if (entrantes.length && !useSileo.getState().quiet) {
        const top = entrantes.slice(0, 3);
        for (const r of top) {
          notify(`SILEO · ${r.actor || "Equipo"}`, r.title, { tag: `sileo:${r.id}`, href: "/notificaciones" });
        }
        const titulos = top.map((r) => r.title).join(". ");
        announceEs(top.length === 1 ? `Notificación nueva: ${titulos}` : `${top.length} notificaciones nuevas: ${titulos}`);
      }

      seeded.done = true;
    });
    return () => unsub();
  }, [uid]);

  return null;
}
