// Cliente de Google Gemini — SOLO se ejecuta en el servidor.
// La GEMINI_API_KEY nunca debe llegar al navegador, por eso este módulo
// se usa exclusivamente desde Route Handlers / Server Actions.

import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Modelo por defecto. Se puede sobreescribir con GEMINI_MODEL en .env.local
// sin tocar el código (p. ej. para subir a un modelo con "thinking").
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Cliente perezoso: no se crea hasta la primera llamada, así la app arranca
// aunque todavía no hayas pegado la API key.
let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Falta GEMINI_API_KEY. Copia .env.example a .env.local y pega tu clave de Google AI Studio.",
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export interface AskOptions {
  model?: string;
  /** Instrucción de sistema opcional (rol / contexto del asistente). */
  system?: string;
  /** Nivel de razonamiento para modelos con "thinking". */
  thinkingLevel?: "LOW" | "MEDIUM" | "HIGH";
}

/** Envía un prompt a Gemini y devuelve el texto de la respuesta. */
export async function ask(prompt: string, opts: AskOptions = {}): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: opts.model || DEFAULT_MODEL,
    contents: prompt,
    config: {
      ...(opts.system ? { systemInstruction: opts.system } : {}),
      ...(opts.thinkingLevel
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel[opts.thinkingLevel] } }
        : {}),
    },
  });
  return response.text ?? "";
}
