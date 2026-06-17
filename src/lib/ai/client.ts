// Cliente de Google Gemini del lado del cliente (API REST).
// Coherente con los demás conectores: la clave vive en el navegador
// (localStorage) y la llamada va directo a generativelanguage.googleapis.com.

import { useAi } from "@/lib/ai/store";

export interface AskAiOptions {
  system?: string;
  model?: string;
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Envía un prompt a Gemini y devuelve el texto generado. */
export async function askAi(prompt: string, opts: AskAiOptions = {}): Promise<string> {
  const { apiKey, model } = useAi.getState();
  if (!apiKey) throw new Error("Falta la API key de Gemini. Pégala en Conectores → Asistente IA.");
  const m = opts.model || model;
  const res = await fetch(`${ENDPOINT}/${m}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini ${res.status}`);
  }
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return text;
}

/** Estado de configuración para la UI. */
export function getAiStatus(): { configured: boolean; model: string } {
  const { apiKey, model } = useAi.getState();
  return { configured: !!apiKey, model };
}
