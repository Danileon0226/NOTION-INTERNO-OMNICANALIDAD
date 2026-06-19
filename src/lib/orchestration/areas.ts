"use client";

// Sistema de Orquestación (módulo de ZERO OS).
// Traduce el "DIAGRAMA TÉCNICO: SISTEMA DE ORQUESTACIÓN":
//   Áreas Técnicas → (informa y restricciones) → Orquestador
//   Orquestador → Documentación
//   Orquestador → Código → Prueba End-to-End
//   Bucle de feedback: Revisión técnica → reajusta Código/Documentación.

export type OrchStage = "plan" | "documentation" | "code" | "e2e" | "review";

export interface StageMeta {
  id: OrchStage;
  label: string;
  short: string;
}

export const STAGES: StageMeta[] = [
  { id: "plan", label: "Orquestador · Plan", short: "Plan" },
  { id: "documentation", label: "Documentación", short: "Docs" },
  { id: "code", label: "Código", short: "Código" },
  { id: "e2e", label: "Prueba End-to-End", short: "E2E" },
  { id: "review", label: "Revisión (bucle de feedback)", short: "Revisión" },
];

export interface TechArea {
  id: string;
  label: string;
  hint: string;
}

// Áreas técnicas que "informan y restringen" al orquestador.
export const TECH_AREAS: TechArea[] = [
  { id: "frontend", label: "Frontend", hint: "UI, accesibilidad, rendimiento" },
  { id: "backend", label: "Backend / API", hint: "endpoints, lógica, validación" },
  { id: "data", label: "Datos / BD", hint: "modelo, migraciones, integridad" },
  { id: "infra", label: "Infraestructura / DevOps", hint: "despliegue, CI/CD, entornos" },
  { id: "security", label: "Seguridad", hint: "authz, secretos, OWASP, PII" },
  { id: "qa", label: "QA / Testing", hint: "cobertura, casos límite, E2E" },
  { id: "integrations", label: "Integraciones", hint: "APIs externas, webhooks" },
  { id: "ai", label: "IA / Agentes", hint: "prompts, herramientas, evals" },
];

export function areaLabels(ids: string[]): string {
  return ids
    .map((id) => {
      const a = TECH_AREAS.find((x) => x.id === id);
      return a ? `${a.label} (${a.hint})` : id;
    })
    .join("; ");
}

export type OrchStatus = "draft" | "running" | "done" | "failed";

export interface OrchLogEntry {
  ts: number;
  stage: OrchStage;
  note: string;
  ok: boolean;
}

export interface OrchRun {
  id: string;
  title: string;
  request: string; // el requerimiento / tarea
  areas: string[]; // ids de áreas técnicas
  constraints: string; // restricciones técnicas explícitas
  language: string; // lenguaje/stack objetivo del código
  status: OrchStatus;
  currentStage?: OrchStage;
  artifacts: Partial<Record<OrchStage, string>>;
  log: OrchLogEntry[];
  iterations: number; // vueltas del bucle de feedback ejecutadas
  reviewPassed?: boolean;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export const MAX_FEEDBACK_ITERATIONS = 2;
