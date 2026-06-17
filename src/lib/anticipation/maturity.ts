"use client";

// Modelo de madurez del blueprint: Reactivo → Asistido → Predictivo → Autónomo.
// Se autoevalúa con el estado REAL de la plataforma (conectores, anticipación,
// monitoreo, feedback y autonomía) y dice cuál es el único siguiente paso.

export type MaturityLevel = "reactivo" | "asistido" | "predictivo" | "autonomo";

export interface MaturityInput {
  connectors: number; // conectores realmente conectados
  anticipationEnabled: boolean;
  decisions: number; // feedback acumulado (accepted/dismissed)
  monitoring: boolean; // monitoreo activo con al menos un sitio
  autonomyActive: boolean;
  autoMode: boolean; // escalera global en "auto"
}

export interface MaturityResult {
  level: MaturityLevel;
  index: number; // 0..3
  nextStep: string | null;
}

export const MATURITY_STEPS: { id: MaturityLevel; label: string; desc: string }[] = [
  { id: "reactivo", label: "Reactivo", desc: "Responde a lo que ya ocurrió." },
  { id: "asistido", label: "Asistido", desc: "Sugiere la siguiente acción; tú decides." },
  { id: "predictivo", label: "Predictivo", desc: "Predice y avisa antes con señales reales." },
  { id: "autonomo", label: "Autónomo", desc: "Ejecuta solo lo de bajo riesgo, con guardrails." },
];

export function computeMaturity(i: MaturityInput): MaturityResult {
  // Autónomo: anticipación + monitoreo + autonomía en auto.
  if (i.anticipationEnabled && i.connectors >= 1 && i.monitoring && i.autonomyActive && i.autoMode) {
    return { level: "autonomo", index: 3, nextStep: null };
  }
  // Predictivo: anticipación activa + monitoreo + algo de aprendizaje.
  if (i.anticipationEnabled && i.connectors >= 1 && (i.monitoring || i.decisions >= 3)) {
    return {
      level: "predictivo",
      index: 2,
      nextStep: "Activa la autonomía TOTAL (escalera en 'auto') para que ZERO ejecute solo.",
    };
  }
  // Asistido: anticipación encendida con al menos un conector.
  if (i.anticipationEnabled && i.connectors >= 1) {
    return {
      level: "asistido",
      index: 1,
      nextStep: i.monitoring
        ? "Acepta o descarta anticipaciones para alimentar el aprendizaje (subes a Predictivo)."
        : "Activa el monitoreo web para anticipar incidentes (subes a Predictivo).",
    };
  }
  // Reactivo: base.
  return {
    level: "reactivo",
    index: 0,
    nextStep:
      i.connectors < 1
        ? "Conecta al menos un servicio (Gmail, GitHub…) para que ZERO empiece a anticipar."
        : "Activa la anticipación para pasar a Asistido.",
  };
}
