"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Mode = "light" | "dark";

interface ThemeState {
  mode: Mode;
  setMode: (m: Mode) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      setMode: (mode) => {
        set({ mode });
        applyTheme(mode);
      },
      toggle: () => get().setMode(get().mode === "dark" ? "light" : "dark"),
    }),
    { name: "zero-agency-theme" }
  )
);

/** Aplica el tema al documento (data-theme en <html>). */
export function applyTheme(mode: Mode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", mode);
}
