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
conciencia. Coordinas la entrega de software COMPLETO y DESPLEGABLE a partir de un requerimiento, informado por
las ÁREAS TÉCNICAS y sus RESTRICCIONES. Eres riguroso, conciso y accionable. No inventes APIs ni datos. Respeta
SIEMPRE las restricciones técnicas declaradas. Tu objetivo final es un proyecto que se despliega en Vercel sin
tocar nada: completo, idiomático, sin TODOs ni placeholders, con cada import resoluble. Respondes en español
con Markdown limpio, salvo el código (que va en archivos).`;

// Formato de archivos OBLIGATORIO para que la plataforma pueda publicarlo en GitHub.
const FILE_FORMAT = `FORMATO DE ARCHIVOS (OBLIGATORIO):
Emite CADA archivo exactamente así, sin excepción y sin texto entre archivos:
FILE: ruta/relativa/desde/la/raiz.ext
\`\`\`<lenguaje>
<contenido completo del archivo>
\`\`\`
- Rutas relativas a la raíz del repo (sin "./" ni "/" inicial).
- Contenido COMPLETO de cada archivo (nunca "// resto igual" ni recortes).
- No agrupes varios archivos en un mismo bloque.`;

// Requisitos de despliegue en Vercel que se inyectan al generar el código.
const VERCEL_REQUIREMENTS = `REQUISITOS DE DESPLIEGUE (Vercel, automático):
El proyecto debe desplegarse en Vercel tal cual, sin configuración manual. Incluye SIEMPRE estos archivos:
- "package.json" con scripts ("build", "start"/"dev" según el framework) y dependencias correctas y fijadas.
- "vercel.json" mínimo y válido (framework si aplica; cabeceras/rewrites solo si se necesitan).
- "README.md" con: descripción, requisitos, variables de entorno, cómo correr en local y un botón
  "Deploy with Vercel" (![Deploy](https://vercel.com/button) enlazando a https://vercel.com/new/clone?repository-url=...).
- ".gitignore" adecuado (node_modules, .next, dist, .env*, etc.).
- ".env.example" si el proyecto usa variables de entorno (NUNCA pongas secretos reales).
Si el stack no se especifica, usa Next.js (App Router) + TypeScript, óptimo para Vercel.`;

function baseContext(run: OrchRun): string {
  return [
    `# Requerimiento\n${run.title}\n\n${run.request}`,
    `# Áreas técnicas (informan y restringen)\n${run.areas.length ? areaLabels(run.areas) : "(sin especificar)"}`,
    `# Restricciones técnicas\n${run.constraints?.trim() || "(sin restricciones explícitas)"}`,
    `# Stack/lenguaje objetivo del código\n${run.language || "Next.js (App Router) + TypeScript, desplegable en Vercel"}`,
    `# Destino\nEl entregable se publicará en GitHub y se desplegará automáticamente en Vercel.`,
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
    `\n\n---\nGenera el PROYECTO COMPLETO que implementa el plan, respetando estrictamente las restricciones técnicas.
${feedback ? "Aplica TODAS las correcciones requeridas y vuelve a emitir el árbol de archivos completo." : ""}
${VERCEL_REQUIREMENTS}

${FILE_FORMAT}

Reglas:
- Código completo, idiomático y production-ready (sin TODOs, sin placeholders, sin funciones vacías).
- Todos los imports deben resolver con los archivos y dependencias que incluyes.
- Antes del primer archivo puedes poner UNA frase de resumen; después, solo archivos en el formato indicado.`,

  e2e: (_run, ctx, prev) =>
    `${ctx}\n\n# Plan\n${prev.plan || ""}\n\n# Código\n${prev.code || ""}\n\n---\nDefine la PRUEBA END-TO-END que valida los criterios de aceptación.
Primero, en Markdown:
1. "Estrategia" (qué se valida de extremo a extremo y con qué herramienta).
2. "Casos E2E" (tabla: caso → pasos → resultado esperado), incluyendo casos límite y de error.
3. "Checklist de validación" (marcable).
Después, los TESTS como archivos reales del proyecto (se publicarán junto al código), usando este formato:

${FILE_FORMAT}
Incluye también la configuración del runner de pruebas si hace falta (p. ej. "playwright.config.ts") y, si procede,
los scripts de test en el "package.json" (menciónalo en la estrategia).`,

  review: (_run, ctx, prev) =>
    `${ctx}\n\n# Plan\n${prev.plan || ""}\n\n# Código\n${prev.code || ""}\n\n# Prueba End-to-End\n${prev.e2e || ""}\n\n---\nActúa como REVISIÓN TÉCNICA (bucle de feedback "informa y restricciones técnicas").
Evalúa el código y las pruebas contra el plan, los criterios de aceptación, las restricciones técnicas y la
DESPLEGABILIDAD en Vercel. Verifica explícitamente:
- ¿Existen package.json, vercel.json, README.md y .gitignore válidos?
- ¿Las dependencias y scripts permiten "build" sin errores? ¿Los imports resuelven?
- ¿Hay TODOs, placeholders o archivos incompletos? (eso es CAMBIOS)
- ¿Se filtran secretos? (.env.example sí, secretos reales no)
Tu respuesta DEBE empezar EXACTAMENTE con una de estas dos líneas:
"VEREDICTO: APROBADO" — si cumple criterios, restricciones y es desplegable, o
"VEREDICTO: CAMBIOS" — si hay defectos, incumplimientos o no desplegaría.
Si es CAMBIOS, lista debajo correcciones concretas y accionables (numeradas, por archivo cuando aplique).
Si es APROBADO, resume en 3-5 líneas por qué cumple y por qué desplegaría en Vercel.`,
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
