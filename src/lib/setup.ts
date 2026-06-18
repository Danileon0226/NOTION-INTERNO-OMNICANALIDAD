"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Guarda el Project ID de Google Cloud para construir los enlaces exactos de
// habilitación de APIs en el panel de diagnóstico.
interface SetupState {
  projectId: string;
  setProjectId: (p: string) => void;
}

export const useSetup = create<SetupState>()(
  persist(
    (set) => ({
      projectId: "",
      setProjectId: (projectId) => set({ projectId }),
    }),
    { name: "zero-agency-setup" }
  )
);

/** Enlace para habilitar una API concreta en el proyecto indicado. */
export function enableUrl(apiHost: string, projectId: string): string {
  const base = `https://console.cloud.google.com/apis/library/${apiHost}`;
  return projectId ? `${base}?project=${encodeURIComponent(projectId)}` : base;
}

/** Clasifica un error de Google para saber si la API está deshabilitada o la key restringida. */
export function classifyGoogleError(msg: string): "disabled" | "restricted" | "auth" | "other" {
  if (/has not been used|is disabled|SERVICE_DISABLED|enable it by visiting/i.test(msg)) return "disabled";
  if (/blocked|PERMISSION_DENIED|API_KEY|restricted|referer/i.test(msg)) return "restricted";
  if (/invalid|unauthor|401|403|token/i.test(msg)) return "auth";
  return "other";
}
