"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Recuerda si la persona ya pasó por la bienvenida (solo en este dispositivo).
interface OnboardingState {
  done: boolean;
  finish: () => void;
  reset: () => void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      done: false,
      finish: () => set({ done: true }),
      reset: () => set({ done: false }),
    }),
    { name: "zero-agency-onboarding" }
  )
);
