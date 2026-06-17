"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Slack: notificaciones del equipo vía Incoming Webhook. Igual que Telegram,
// pero hacia un canal de Slack. POST fire-and-forget (no-cors) desde el navegador.

interface SlackState {
  webhookUrl: string;
  setUrl: (u: string) => void;
}

export const useSlack = create<SlackState>()(
  persist(
    (set) => ({
      webhookUrl: "",
      setUrl: (webhookUrl) => set({ webhookUrl }),
    }),
    { name: "zero-agency-slack" }
  )
);

/** Envía un mensaje al canal de Slack configurado. */
export async function sendSlack(text: string): Promise<void> {
  const url = useSlack.getState().webhookUrl.trim();
  if (!url) throw new Error("Configura el Incoming Webhook de Slack en Conectores.");
  if (!/^https:\/\/hooks\.slack\.com\//i.test(url)) {
    throw new Error("La URL no parece un Incoming Webhook de Slack (https://hooks.slack.com/services/...).");
  }
  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ text }),
  });
}
