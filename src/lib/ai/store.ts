"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AiState {
  apiKey: string;
  model: string;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
}

// Asistente Gemini, client-side (coherente con el resto de conectores).
// La clave se guarda solo en el navegador (localStorage).
export const useAi = create<AiState>()(
  persist(
    (set) => ({
      apiKey: "",
      model: "gemini-2.5-flash",
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model: model || "gemini-2.5-flash" }),
    }),
    { name: "zero-agency-ai" }
  )
);
