"use client";

import { askAi } from "@/lib/ai/client";
import { useAi } from "@/lib/ai/store";
import { useActivity } from "@/lib/activity";
import { track } from "@/lib/firebase/track";
import { useOrchestration } from "@/lib/orchestration/store";
import { areaLabels, MAX_FEEDBACK_ITERATIONS, type OrchRun, type OrchStage } from "@/lib/orchestration/areas";

// Motor del Sistema de Orquestación. Ejecuta el pipeline del diagrama de forma
// secuencial con un bucle de feedback acotado, usando Gemini por etapa.

const ORCHESTRATOR_SYSTEM = `Eres el "Orquestador" técnico de ZERO Agency OS, una extensión del gestor de
conciencia. Coordinas la entrega de software a partir de un requerimiento, informado por las ÁREAS TÉCNICAS
y sus RESTRICCIONES. Eres riguroso, conciso y accionable. No inventes APIs ni datos. Respeta SIEMPRE las
restricciones técnicas declaradas. Respondes en español con Markdown limpio.`;

function baseContext(run: OrchRun): string {
  return [
    `# Requerimiento\n${run.title}\n\n${run.request}`,
    `# Áreas técnicas (informan y restringen)\n${run.areas.length ? areaLabels(run.areas) : "(sin especificar)"}`,
    `# Restricciones técnicas\n${run.constraints?.trim() || "(sin restricciones explícitas)"}`,
    `# Stack/lenguaje objetivo del código\n${run.language || "(a criterio del orquestador)"}`,
  ].join("\n\n");
}

const PROMPTS: Record<OrchStage, (run: OrchRun, ctx: string, prev: Partial<Record<OrchStage, string>>, feedback?: string) => string> = {
  plan: (_run, ctx) =>
    `${ctx}\n\n---\nComo ORQUESTADOR, produce el PLAN DE EJECUCIÓN. Incluye, en secciones Markdown:
1. "Objetivo" (1-2 frases).
2. "Supuestos y restricciones" (deriva de las áreas/restricciones).
3. "Diseño técnico" (componentes, contratos/interfaces, flujo de datos).
4. "Plan por pasos" (lista ordenada y ejecutable).
5. "Criterios de aceptación" (verificables, servirán para el End-to-End).
No escribas código todavía. Sé específico y breve.`,

  documentation: (_run, ctx, prev) =>
    `${ctx}\n\n# Plan de ejecución\n${prev.plan || ""}\n\n---\nGenera la DOCUMENTACIÓN TÉCNICA del entregable basada en el plan:
visión general, arquitectura, contratos/interfaces, decisiones y trade-offs, cómo usarlo y notas operativas.
Markdown claro y bien estructurado. No incluyas el código completo (eso va en la etapa de Código).`,

  code: (run, ctx, prev, feedback) =>
    `${ctx}\n\n# Plan\n${prev.plan || ""}\n\n# Documentación\n${prev.documentation || ""}` +
    (feedback ? `\n\n# CORRECCIONES REQUERIDAS (bucle de feedback)\n${feedback}` : "") +
    `\n\n---\nGenera el CÓDIGO que implementa el plan, respetando estrictamente las restricciones técnicas.
${feedback ? "Aplica TODAS las correcciones requeridas." : ""}
Reglas:
- Código completo, idiomático y listo para usar en el stack indicado.
- Incluye cada archivo en su propio bloque con ruta como encabezado (p. ej. \`// src/...\` o un comentario de ruta) y fences con el lenguaje.
- Comentarios solo donde aporten. Sin texto fuera de los bloques salvo una breve nota inicial.`,

  e2e: (_run, ctx, prev) =>
    `${ctx}\n\n# Plan\n${prev.plan || ""}\n\n# Código\n${prev.code || ""}\n\n---\nDefine la PRUEBA END-TO-END que valida los criterios de aceptación:
1. "Estrategia" (qué se valida de extremo a extremo y con qué herramienta).
2. "Casos E2E" (tabla: caso → pasos → resultado esperado), incluyendo casos límite y de error.
3. "Tests" (código de pruebas E2E ejecutable, en bloques con su ruta y lenguaje).
4. "Checklist de validación" (marcable).`,

  review: (_run, ctx, prev) =>
    `${ctx}\n\n# Plan\n${prev.plan || ""}\n\n# Código\n${prev.code || ""}\n\n# Prueba End-to-End\n${prev.e2e || ""}\n\n---\nActúa como REVISIÓN TÉCNICA (bucle de feedback "informa y restricciones técnicas").
Evalúa el código y las pruebas contra el plan, los criterios de aceptación y las restricciones técnicas.
Tu respuesta DEBE empezar EXACTAMENTE con una de estas dos líneas:
"VEREDICTO: APROBADO" — si cumple criterios y restricciones, o
"VEREDICTO: CAMBIOS" — si hay defectos o incumplimientos.
Si es CAMBIOS, lista debajo correcciones concretas y accionables (numeradas, por archivo cuando aplique).
Si es APROBADO, resume en 3-5 líneas por qué cumple.`,
};

let running = false;

async function runStage(
  run: OrchRun,
  stage: OrchStage,
  prev: Partial<Record<OrchStage, string>>,
  feedback?: string
): Promise<string> {
  const st = useOrchestration.getState();
  st.setStatus(run.id, "running", stage);
  const ctx = baseContext(run);
  const prompt = PROMPTS[stage](run, ctx, prev, feedback);
  const out = await askAi(prompt, { system: ORCHESTRATOR_SYSTEM });
  st.setArtifact(run.id, stage, out);
  st.pushLog(run.id, { stage, note: feedback ? "Reejecutado con feedback" : "Completado", ok: true });
  return out;
}

/** Ejecuta el pipeline completo (plan → docs → código → E2E → revisión + feedback). */
export async function runOrchestration(id: string): Promise<void> {
  if (running) return;
  const fresh = () => useOrchestration.getState().runs.find((r) => r.id === id);
  const run = fresh();
  if (!run) return;
  if (!useAi.getState().apiKey) {
    useOrchestration.getState().patch(id, { status: "failed", error: "Falta la API key de Gemini (Conectores → Asistente IA)." });
    return;
  }

  running = true;
  const st = useOrchestration.getState();
  st.patch(id, { status: "running", error: undefined, reviewPassed: undefined, iterations: 0, artifacts: {}, log: [] });
  track("orchestration", `Orquestación: ${run.title}`);
  useActivity.getState().push({ source: "ai", kind: "info", label: `Orquestación iniciada: ${run.title}`, count: 0 });

  const artifacts: Partial<Record<OrchStage, string>> = {};
  let currentStage: OrchStage = "plan";
  try {
    artifacts.plan = await runStage(run, (currentStage = "plan"), artifacts);
    artifacts.documentation = await runStage(run, (currentStage = "documentation"), artifacts);
    artifacts.code = await runStage(run, (currentStage = "code"), artifacts);
    artifacts.e2e = await runStage(run, (currentStage = "e2e"), artifacts);

    // Bucle de feedback técnico (Mode 2).
    let approved = false;
    let iterations = 0;
    while (iterations <= MAX_FEEDBACK_ITERATIONS) {
      const review = await runStage(run, (currentStage = "review"), artifacts);
      approved = /^\s*VEREDICTO:\s*APROBADO/i.test(review);
      useOrchestration.getState().patch(id, { reviewPassed: approved, iterations });
      if (approved || iterations === MAX_FEEDBACK_ITERATIONS) break;
      // CAMBIOS: reajusta código y pruebas con el feedback y vuelve a revisar.
      iterations += 1;
      useOrchestration.getState().patch(id, { iterations });
      artifacts.code = await runStage(run, (currentStage = "code"), artifacts, review);
      artifacts.e2e = await runStage(run, (currentStage = "e2e"), artifacts);
    }

    useOrchestration.getState().setStatus(id, "done", "review");
    useActivity.getState().push({
      source: "ai",
      kind: approved ? "sync" : "alert",
      label: `Orquestación ${approved ? "aprobada" : "con cambios pendientes"}: ${run.title}`,
      count: 0,
    });
  } catch (e) {
    const msg = (e as Error).message;
    useOrchestration.getState().patch(id, { status: "failed", error: msg });
    useOrchestration.getState().pushLog(id, { stage: currentStage, note: msg, ok: false });
    useActivity.getState().push({ source: "ai", kind: "alert", label: `Orquestación falló: ${run.title}`, count: 0 });
  } finally {
    running = false;
  }
}
