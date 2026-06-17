"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { runAgent } from "@/lib/ai/agent";
import { useAi } from "@/lib/ai/store";
import { useConnectors } from "@/lib/connectors/store";
import { tgSendMessage } from "@/lib/connectors/telegram";
import { useSlack, sendSlack } from "@/lib/connectors/slack";
import { fireWebhooks } from "@/lib/connectors/webhooks";
import { useActivity } from "@/lib/activity";

// Briefing programado: cada mañana ZERO arma el resumen ejecutivo y lo envía a
// los canales del equipo (Telegram / Slack / webhooks). Client-side: corre
// mientras haya una pestaña abierta a la hora indicada.

const PROMPT = `Genera un BRIEFING EJECUTIVO matutino para el equipo, en TEXTO PLANO listo para mensajería
(sin markdown pesado). Usa anticipate (prioridades), site_status y seo_status si hay datos, y revisa
correos urgentes/eventos si hay acceso. Empieza con "☀️ Briefing ZERO" y luego 3-5 viñetas con "•",
ordenadas por prioridad y muy concisas. No inventes datos; omite lo que no esté disponible.`;

interface BriefingState {
  enabled: boolean;
  hour: number; // 0-23, hora local a partir de la cual se envía
  toTelegram: boolean;
  toSlack: boolean;
  toWebhooks: boolean;
  lastSent: string; // YYYY-MM-DD
  setEnabled: (b: boolean) => void;
  setHour: (h: number) => void;
  setChannels: (c: Partial<Pick<BriefingState, "toTelegram" | "toSlack" | "toWebhooks">>) => void;
  markSent: () => void;
}

export const useScheduledBriefing = create<BriefingState>()(
  persist(
    (set) => ({
      enabled: false,
      hour: 8,
      toTelegram: true,
      toSlack: false,
      toWebhooks: false,
      lastSent: "",
      setEnabled: (enabled) => set({ enabled }),
      setHour: (hour) => set({ hour }),
      setChannels: (c) => set(c),
      markSent: () => set({ lastSent: new Date().toISOString().slice(0, 10) }),
    }),
    { name: "zero-agency-briefing" }
  )
);

let running = false;

/** Ejecuta el briefing y lo envía a los canales activos. force ignora la hora. */
export async function runScheduledBriefing(force = false): Promise<{ text: string; sent: string[] }> {
  if (running) return { text: "", sent: [] };
  const s = useScheduledBriefing.getState();
  const today = new Date().toISOString().slice(0, 10);
  if (!force) {
    if (!s.enabled) return { text: "", sent: [] };
    if (s.lastSent === today) return { text: "", sent: [] };
    if (new Date().getHours() < s.hour) return { text: "", sent: [] };
  }
  if (!useAi.getState().apiKey) return { text: "", sent: [] };

  running = true;
  try {
    const res = await runAgent(PROMPT, [], undefined, "briefing programado");
    const text = res.text;
    const sent: string[] = [];
    const conn = useConnectors.getState();

    if (s.toTelegram && conn.telegram.botToken && conn.telegram.chatId) {
      try {
        await tgSendMessage(conn.telegram.botToken, conn.telegram.chatId, text);
        sent.push("Telegram");
      } catch {
        /* canal opcional */
      }
    }
    if (s.toSlack && useSlack.getState().webhookUrl) {
      try {
        await sendSlack(text);
        sent.push("Slack");
      } catch {
        /* canal opcional */
      }
    }
    if (s.toWebhooks) {
      const n = await fireWebhooks("briefing", { message: text });
      if (n) sent.push(`${n} webhook(s)`);
    }

    useScheduledBriefing.getState().markSent();
    useActivity.getState().push({
      source: "ai",
      kind: "info",
      label: `Briefing enviado${sent.length ? ` · ${sent.join(", ")}` : " (sin canales)"}`,
      count: 0,
    });
    return { text, sent };
  } finally {
    running = false;
  }
}
