// Cliente de Google Gemini del lado del cliente (API REST).
// Coherente con los demás conectores: la clave vive en el navegador
// (localStorage) y la llamada va directo a generativelanguage.googleapis.com.

import { useAi } from "@/lib/ai/store";

export interface AskAiOptions {
  system?: string;
  model?: string;
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Desactiva la fase de "thinking" en modelos 2.5/3.x (thinkingBudget: 0) para
 * acelerar drásticamente la respuesta. Devuelve {} para modelos que no lo soportan.
 */
export function speedConfig(model: string): Record<string, unknown> {
  if (/2\.5|gemini-3|flash-latest|pro-latest/i.test(model)) {
    return { thinkingConfig: { thinkingBudget: 0 } };
  }
  return {};
}

/** Convierte errores crípticos de Google en guía accionable. */
export function geminiError(raw: string): Error {
  if (/API key not valid|API_KEY_INVALID|invalid.*api key|api key.*invalid/i.test(raw)) {
    return new Error(
      "La API key no es válida. Cópiala completa (sin espacios ni saltos de línea) desde aistudio.google.com/apikey y pégala de nuevo."
    );
  }
  // La API no está habilitada en el proyecto (distinto de "key restringida").
  if (/SERVICE_DISABLED|has not been used in project|it is disabled|API .* disabled|enable it by visiting/i.test(raw)) {
    return new Error(
      "La 'Generative Language API' no está habilitada en el proyecto de tu key. Actívala en " +
        "console.cloud.google.com/apis/library/generativelanguage.googleapis.com (elige el MISMO proyecto de la key), " +
        "espera 1-2 min y reintenta. Lo más simple: usa una key de aistudio.google.com/apikey, que ya viene habilitada."
    );
  }
  // Restricción por referrer/origen HTTP (típico de keys creadas en Cloud Console).
  if (/API_KEY_HTTP_REFERRER|referer|referrer|requests from referer/i.test(raw)) {
    return new Error(
      "Tu API key tiene restricción por 'Referrers HTTP' y este dominio no está permitido. En " +
        "console.cloud.google.com/apis/credentials abre la key → Restricciones de aplicación: pon 'Ninguna' " +
        "(o añade este dominio, p. ej. https://danileon0226.github.io/*). Alternativa: usa una key SIN restricciones de aistudio.google.com/apikey."
    );
  }
  if (/are blocked|blocked|PERMISSION_DENIED|restricted|API_KEY_SERVICE_BLOCKED/i.test(raw)) {
    return new Error(
      "Tu API key está restringida para la Generative Language API. En console.cloud.google.com/apis/credentials abre la key → " +
        "'Restricciones de API': elige 'No restringir la clave' (o incluye 'Generative Language API'). " +
        "Lo más simple: crea una key SIN restricciones en aistudio.google.com/apikey."
    );
  }
  if (/not found|NOT_FOUND|is not supported|not supported for|models\/.*is not/i.test(raw)) {
    return new Error(
      "El modelo seleccionado no está disponible para tu API key. En Conectores → Asistente IA pulsa 'Cargar de Google' en el selector de modelos y elige uno disponible (p. ej. gemini-2.5-flash)."
    );
  }
  return new Error(raw);
}

/** Envía un prompt a Gemini y devuelve el texto generado. */
export async function askAi(prompt: string, opts: AskAiOptions = {}): Promise<string> {
  const { apiKey, model, temperature } = useAi.getState();
  if (!apiKey) throw new Error("Falta la API key de Gemini. Pégala en Conectores → Asistente IA.");
  const m = opts.model || model;
  const res = await fetch(`${ENDPOINT}/${m}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey.trim() },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature, ...speedConfig(m) },
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
  const res = await fetch(`${ENDPOINT}?pageSize=200`, { headers: { "X-goog-api-key": apiKey.trim() } });
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
  const res = await fetch(`${ENDPOINT}/${m}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey.trim() },
    body: JSON.stringify({
      contents: messages.map((msg) => ({ role: msg.role, parts: [{ text: msg.text }] })),
      generationConfig: { temperature, ...speedConfig(m) },
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw geminiError(data?.error?.message || `Gemini ${res.status}`);
  }
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? ""
  );
}
