"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Preferencias de personalización y accesibilidad del OS (ancladas al brandbook).
// Se aplican como atributos/variables en <html> para afectar todo el árbol.

export type TextScale = "sm" | "base" | "lg" | "xl";

export interface AccentPreset {
  id: string;
  label: string;
  color: string;
}

// Acentos de la paleta de marca con buen contraste para texto blanco (WCAG):
// Violeta Zero 8.66:1 (AAA), Profundo 11.15:1 (AAA), Eléctrico ~3.4:1 (UI/grande).
export const ACCENTS: AccentPreset[] = [
  { id: "zero", label: "Violeta Zero", color: "#5e20be" },
  { id: "profundo", label: "Violeta Profundo", color: "#4f1f88" },
  { id: "electrico", label: "Eléctrico", color: "#8b49f0" },
  { id: "medianoche", label: "Medianoche", color: "#382850" },
];

interface PrefsState {
  accent: string; // hex; "" = acento de marca por tema
  scale: TextScale;
  reduceMotion: boolean;
  highContrast: boolean;
  lockMinutes: number; // bloqueo por inactividad; 0 = desactivado
  setAccent: (c: string) => void;
  setScale: (s: TextScale) => void;
  setReduceMotion: (b: boolean) => void;
  setHighContrast: (b: boolean) => void;
  setLockMinutes: (n: number) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      accent: "",
      scale: "base",
      reduceMotion: false,
      highContrast: false,
      lockMinutes: 0,
      setAccent: (accent) => {
        set({ accent });
        applyPrefs();
      },
      setScale: (scale) => {
        set({ scale });
        applyPrefs();
      },
      setReduceMotion: (reduceMotion) => {
        set({ reduceMotion });
        applyPrefs();
      },
      setHighContrast: (highContrast) => {
        set({ highContrast });
        applyPrefs();
      },
      setLockMinutes: (lockMinutes) => set({ lockMinutes }),
    }),
    { name: "zero-agency-prefs", onRehydrateStorage: () => () => applyPrefs() }
  )
);

/** Aplica las preferencias visuales a <html> (acento, escala, motion, contraste). */
export function applyPrefs() {
  if (typeof document === "undefined") return;
  const { accent, scale, reduceMotion, highContrast } = usePrefs.getState();
  const el = document.documentElement;
  if (accent) el.style.setProperty("--accent", accent);
  else el.style.removeProperty("--accent");
  el.setAttribute("data-scale", scale);
  el.setAttribute("data-reduce-motion", reduceMotion ? "1" : "0");
  el.setAttribute("data-contrast", highContrast ? "high" : "normal");
}
