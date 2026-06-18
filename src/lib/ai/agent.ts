"use client";

// Agente Gemini con function calling: Gemini es el gestor único que decide
// qué conector usar, ejecuta la herramienta client-side y responde.

import { useAi } from "@/lib/ai/store";
import { geminiError } from "@/lib/ai/client";
import { toolDeclarations, runTool } from "@/lib/ai/tools";
import { useMemory, memoryContext } from "@/lib/ai/memory";
import { useRuns } from "@/lib/ai/runs";
import { bankContext, refreshDataBank } from "@/lib/ai/dataBank";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM = `Eres "Zero", el gestor de conciencia único de "Zero Agency OS", una plataforma
omnicanal tipo Notion. Automatizas TODAS las operaciones de la agencia mediante herramientas.

Capacidades (encadena varias herramientas para completar la tarea):
- Datos en vivo: gmail_search, gmail_profile, drive_search, drive_folder, calendar_upcoming, github_overview.
- Analítica de datos: analyze_agency (métricas consolidadas) → resume hallazgos y, si procede,
  guarda un reporte con create_note.
- Creación de páginas web: create_webpage (genera tú el HTML COMPLETO, moderno y responsive,
  con <style> embebido; landing pages, propuestas, one-pagers de cliente).
- Administración de clientes: create_client_pack (pre-configura propuesta/PPT, contrato y
  onboarding de un cliente). Para "dar de alta a un cliente" usa create_client_pack y luego,
  si hay material en Drive, enriquécelo con drive_read/drive_folder + append_to_note.
- Plantillas: list_templates (ver plantillas) y create_from_template (crear página desde una).
- Documentación/operaciones: create_note, create_subpage, read_note, append_to_note,
  search_notes, delete_note, list_notes, toggle_task (marcar tareas hechas).
- Drive avanzado: drive_read (lee un documento), drive_folder (contenido de una carpeta), drive_search.
- GitHub avanzado: github_commits, github_pulls (PRs abiertos), github_create_issue.
- Conocimiento (Obsidian): vault_overview y vault_search sobre la bóveda conectada.
- Investigación web: fetch_url (lee el texto de una página pública).
- Monitoreo web: site_status (disponibilidad/uptime/latencia del sitio de la agencia). Para
  diagnosticar contenido o caídas, combina site_status + fetch_url.
- SEO y tráfico: seo_status (Search Console + GA4 reales: clics, impresiones, posición, sesiones).
- Anticipación: anticipate (próximas mejores acciones a partir de señales reales). Úsalo cuando
  pidan "adelántate", "qué debería hacer ahora" o un resumen proactivo; explica la señal que justifica cada una.
- Memoria persistente: remember (guarda un hecho), recall (recupéralos), forget (olvida). Recuerda
  preferencias, datos de clientes y decisiones estables para usarlas en futuras conversaciones.
- Utilidades: now (fecha/hora), calc (cálculos para finanzas/métricas).
- Comunicación: telegram_alert (enviar), telegram_updates (leer), telegram_bot_info,
  slack_alert (avisar al canal de Slack), webhook_broadcast (disparar a sistemas externos).

Reglas:
- Si la sección "BANCO DE DATOS" ya contiene la respuesta (estado de correo, calendario, GitHub,
  Drive o sitio), respóndela directamente SIN llamar herramientas: es información ya cargada y veloz.
  Solo usa herramientas si necesitas datos no presentes en el banco o ejecutar una acción.
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
  onStep?: (s: AgentStep) => void,
  source = "agente"
): Promise<AgentResult> {
  const { apiKey, model, temperature } = useAi.getState();
  if (!apiKey) throw new Error("Falta la API key de Gemini. Configúrala en Conectores → Asistente IA.");

  const started = Date.now();
  const contents: any[] = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];
  const tools = [{ functionDeclarations: toolDeclarations }];
  const steps: AgentStep[] = [];

  // Mantén el banco caliente en segundo plano (no bloquea esta respuesta).
  void refreshDataBank();
  // Inyecta banco de datos (estado actual) + memoria persistente como contexto.
  const bank = bankContext();
  const mem = memoryContext(useMemory.getState().items);
  const system = [SYSTEM, bank, mem].filter(Boolean).join("\n\n");

  // Registra la ejecución para trazabilidad agéntica (éxito o error).
  const record = (text: string, ok: boolean) =>
    useRuns.getState().push({ source, prompt: userText, steps, text, ok, ms: Date.now() - started });

  try {
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents,
          tools,
          generationConfig: { temperature },
          systemInstruction: { parts: [{ text: system }] },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw geminiError(data?.error?.message || `Gemini ${res.status}`);

      const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
      const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);

      if (!calls.length) {
        const text = parts.map((p) => p.text ?? "").join("").trim() || "(sin respuesta)";
        record(text, true);
        return { text, steps };
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

    const text = "No pude completar la tarea en los pasos disponibles.";
    record(text, false);
    return { text, steps };
  } catch (e) {
    record(`⚠️ ${(e as Error).message}`, false);
    throw e;
  }
}
