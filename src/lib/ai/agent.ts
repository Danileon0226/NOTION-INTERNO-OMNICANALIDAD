"use client";

// Agente Gemini con function calling: Gemini es el gestor único que decide
// qué conector usar, ejecuta la herramienta client-side y responde.

import { useAi } from "@/lib/ai/store";
import { toolDeclarations, runTool } from "@/lib/ai/tools";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM = `Eres "Zero", el gestor de conciencia único de "Zero Agency OS", una plataforma
omnicanal tipo Notion. Automatizas TODAS las operaciones de la agencia mediante herramientas.

Capacidades (encadena varias herramientas para completar la tarea):
- Datos en vivo: gmail_search, drive_search, calendar_upcoming, github_overview.
- Analítica de datos: analyze_agency (métricas consolidadas) → resume hallazgos y, si procede,
  guarda un reporte con create_note.
- Creación de páginas web: create_webpage (genera tú el HTML COMPLETO, moderno y responsive,
  con <style> embebido; landing pages, propuestas, one-pagers de cliente).
- Documentación/operaciones: create_note (briefs, actas, planes, reportes), list_notes.
- Comunicación: telegram_alert para avisar al equipo.

Reglas:
- Usa herramientas siempre que necesites datos reales o ejecutar una acción; nunca inventes datos.
- Para "crea una web/landing", llama create_webpage con un HTML autónomo y bien diseñado.
- Para "analiza/ reporte", usa analyze_agency y luego create_note con el informe.
- Si un conector no está conectado, dilo y sugiere conectarlo en /connectors.
- Responde en español, conciso y accionable; confirma lo que creaste (con su título).`;

export interface ChatMsg {
  role: "user" | "model";
  text: string;
}
export interface AgentStep {
  tool: string;
  args: any;
}
export interface AgentResult {
  text: string;
  steps: AgentStep[];
}

export async function runAgent(
  userText: string,
  history: ChatMsg[] = [],
  onStep?: (s: AgentStep) => void
): Promise<AgentResult> {
  const { apiKey, model } = useAi.getState();
  if (!apiKey) throw new Error("Falta la API key de Gemini. Configúrala en Conectores → Asistente IA.");

  const contents: any[] = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];
  const tools = [{ functionDeclarations: toolDeclarations }];
  const steps: AgentStep[] = [];

  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        tools,
        systemInstruction: { parts: [{ text: SYSTEM }] },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `Gemini ${res.status}`);

    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);

    if (!calls.length) {
      const text = parts.map((p) => p.text ?? "").join("").trim();
      return { text: text || "(sin respuesta)", steps };
    }

    // Turno del modelo (con las llamadas) + respuestas de las herramientas.
    contents.push({ role: "model", parts });
    const responseParts: any[] = [];
    for (const call of calls) {
      const step: AgentStep = { tool: call.name, args: call.args || {} };
      steps.push(step);
      onStep?.(step);
      let result: unknown;
      try {
        result = await runTool(call.name, call.args || {});
      } catch (e) {
        result = { error: (e as Error).message };
      }
      responseParts.push({ functionResponse: { name: call.name, response: { result } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return { text: "No pude completar la tarea en los pasos disponibles.", steps };
}
