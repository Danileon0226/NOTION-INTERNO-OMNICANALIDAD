// Cliente de Google Gemini del lado del cliente (API REST).
// Coherente con los demás conectores: la clave vive en el navegador
// (localStorage) y la llamada va directo a generativelanguage.googleapis.com.

import { useAi } from "@/lib/ai/store";

export interface AskAiOptions {
  system?: string;
  model?: string;
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Convierte errores crípticos de Google en guía accionable. */
export function geminiError(raw: string): Error {
  if (/are blocked|blocked|API_KEY_HTTP_REFERRER|PERMISSION_DENIED|restricted/i.test(raw)) {
    return new Error(
      "Tu API key de Gemini está restringida (la Generative Language API está bloqueada para esta key). " +
        "Solución: crea una key SIN restricciones en aistudio.google.com/apikey, o en Google Cloud Console " +
        "habilita 'Generative Language API' y pon la key en 'No restringir' / referrers que incluyan este dominio."
    );
  }
  return new Error(raw);
}

/** Envía un prompt a Gemini y devuelve el texto generado. */
export async function askAi(prompt: string, opts: AskAiOptions = {}): Promise<string> {
  const { apiKey, model, temperature } = useAi.getState();
  if (!apiKey) throw new Error("Falta la API key de Gemini. Pégala en Conectores → Asistente IA.");
  const m = opts.model || model;
  const res = await fetch(`${ENDPOINT}/${m}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature },
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw geminiError(data?.error?.message || `Gemini ${res.status}`);
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

// ── Catálogo de modelos (ListModels de Google) ──────────────────────

export interface GeminiModel {
  id: string; // p. ej. "gemini-2.5-flash"
  label: string; // nombre legible que da Google
}

/**
 * Trae los modelos disponibles para TU key directamente desde Google y deja
 * solo los que soportan generación de contenido (chat). Requiere key válida.
 */
export async function listModels(): Promise<GeminiModel[]> {
  const { apiKey } = useAi.getState();
  if (!apiKey) throw new Error("Falta la API key de Gemini.");
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}&pageSize=200`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini ${res.status}`);
  }
  const models = (data?.models ?? []) as Array<{
    name: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }>;
  return models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => {
      const id = m.name.replace(/^models\//, "");
      return { id, label: m.displayName || id };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ── Chat del asistente (conversación multi-turno con contexto) ───────

export type ChatRole = "user" | "model";
export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface ChatAiOptions {
  /** Snapshot del banco de datos para anclar las respuestas (grounding). */
  context?: string;
  system?: string;
  model?: string;
}

/** Envía el historial de conversación + contexto y devuelve la respuesta. */
export async function chatAi(messages: ChatMessage[], opts: ChatAiOptions = {}): Promise<string> {
  const { apiKey, model, temperature } = useAi.getState();
  if (!apiKey) throw new Error("Falta la API key de Gemini. Pégala en Conectores → Asistente IA.");
  const m = opts.model || model;
  // El contexto del banco de datos se inyecta en la instrucción de sistema.
  const systemInstruction = [opts.system, opts.context].filter(Boolean).join("\n\n");
  const res = await fetch(`${ENDPOINT}/${m}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages.map((msg) => ({ role: msg.role, parts: [{ text: msg.text }] })),
      generationConfig: { temperature },
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini ${res.status}`);
  }
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? ""
  );
}
