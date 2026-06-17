"use client";

import { create } from "zustand";

// Estado global de la paleta de comandos para poder abrirla desde cualquier
// botón (sidebar, top bar móvil) además del atajo ⌘K / Ctrl+K.
interface CommandPaletteState {
  open: boolean;
  setOpen: (b: boolean) => void;
  toggle: () => void;
}

export const useCommandPalette = create<CommandPaletteState>((set, get) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
}));
