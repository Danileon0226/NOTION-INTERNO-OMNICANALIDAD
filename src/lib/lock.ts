"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Bloqueo local con PIN. Es un candado de privacidad del dispositivo
// (no cifra los datos): evita que alguien con acceso físico abra el OS.
// El PIN nunca se guarda en claro, solo su hash SHA-256.
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(`zero-os::${text}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface LockState {
  pinHash: string; // "" = sin PIN
  locked: boolean; // estado de sesión (persistido para sobrevivir recargas)
  setPin: (pin: string) => Promise<void>;
  clearPin: () => void;
  lock: () => void;
  unlock: (pin: string) => Promise<boolean>;
}

export const useLock = create<LockState>()(
  persist(
    (set, get) => ({
      pinHash: "",
      locked: false,
      setPin: async (pin) => {
        const pinHash = await sha256(pin);
        set({ pinHash, locked: false });
      },
      clearPin: () => set({ pinHash: "", locked: false }),
      lock: () => {
        if (get().pinHash) set({ locked: true });
      },
      unlock: async (pin) => {
        const h = await sha256(pin);
        if (h === get().pinHash) {
          set({ locked: false });
          return true;
        }
        return false;
      },
    }),
    { name: "zero-agency-lock" }
  )
);

/** Hay un PIN configurado. */
export const pinEnabled = () => !!useLock.getState().pinHash;
