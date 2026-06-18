"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AiState {
  apiKey: string;
  model: string;
  temperature: number;
  // Voz de ZERO: motor neural (Gemini) o del sistema (Web Speech).
  voiceEngine: "gemini" | "system";
  geminiVoice: string;
  voiceURI: string;
  voiceRate: number;
  voicePitch: number;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
  setTemperature: (t: number) => void;
  setVoice: (v: {
    voiceEngine?: "gemini" | "system";
    geminiVoice?: string;
    voiceURI?: string;
    voiceRate?: number;
    voicePitch?: number;
  }) => void;
}

// Asistente Gemini, client-side (coherente con el resto de conectores).
// La clave se guarda solo en el navegador (localStorage).
export const useAi = create<AiState>()(
  persist(
    (set) => ({
      apiKey: "",
      model: "gemini-2.5-flash",
      temperature: 0.4,
      voiceEngine: "gemini",
      geminiVoice: "Charon",
      voiceURI: "",
      voiceRate: 0.97,
      voicePitch: 0.82,
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model: model || "gemini-2.5-flash" }),
      setTemperature: (temperature) => set({ temperature }),
      setVoice: (v) => set((s) => ({ ...s, ...v })),
    }),
    { name: "zero-agency-ai" }
  )
);
