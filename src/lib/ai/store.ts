"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AiState {
  apiKey: string;
  model: string;
  temperature: number;
  // Voz de ZERO: Miso One (primario), Gemini TTS o Web Speech del sistema.
  voiceEngine: "miso" | "gemini" | "system";
  misoTtsUrl: string;
  misoVoice: string;
  misoStream: boolean;
  misoSpeed: number;
  misoStyle: string;
  geminiVoice: string;
  voiceURI: string;
  voiceRate: number;
  voicePitch: number;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
  setTemperature: (t: number) => void;
  setVoice: (v: {
    voiceEngine?: "miso" | "gemini" | "system";
    misoTtsUrl?: string;
    misoVoice?: string;
    misoStream?: boolean;
    misoSpeed?: number;
    misoStyle?: string;
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
      voiceEngine: "miso",
      misoTtsUrl: (process.env.NEXT_PUBLIC_MISO_TTS_URL || "http://localhost:8080/v1").trim(),
      misoVoice: "default",
      misoStream: true,
      misoSpeed: 1,
      misoStyle: "jarvis",
      geminiVoice: "Charon",
      voiceURI: "",
      voiceRate: 0.97,
      voicePitch: 0.82,
      setApiKey: (apiKey) => set({ apiKey: (apiKey || "").trim() }),
      setModel: (model) => set({ model: model || "gemini-2.5-flash" }),
      setTemperature: (temperature) => set({ temperature }),
      setVoice: (v) => set((s) => ({ ...s, ...v })),
    }),
    { name: "zero-agency-ai" }
  )
);
