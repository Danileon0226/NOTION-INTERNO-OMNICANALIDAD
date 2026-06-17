"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConnectorId } from "@/lib/types";

export type RuntimeStatus = "disconnected" | "connecting" | "connected" | "error";

export interface GithubConfig {
  token: string;
  account: string; // usuario u organización
}
export interface TelegramConfig {
  botToken: string;
  chatId: string;
}
export interface GoogleConfig {
  clientId: string;
  accessToken: string;
  expiry: number; // epoch ms
  scopes: string[];
}

interface ConnectorsState {
  github: GithubConfig;
  telegram: TelegramConfig;
  google: GoogleConfig;
  setGithub: (p: Partial<GithubConfig>) => void;
  setTelegram: (p: Partial<TelegramConfig>) => void;
  setGoogle: (p: Partial<GoogleConfig>) => void;
  disconnect: (id: ConnectorId) => void;
}

// Client ID de Google tomado del entorno (lo configuras una vez en Vercel:
// NEXT_PUBLIC_GOOGLE_CLIENT_ID). Así el OAuth queda listo sin pegar nada.
export const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();

const emptyGoogle: GoogleConfig = { clientId: GOOGLE_CLIENT_ID, accessToken: "", expiry: 0, scopes: [] };

export const useConnectors = create<ConnectorsState>()(
  persist(
    (set) => ({
      github: { token: "", account: "" },
      telegram: { botToken: "", chatId: "" },
      google: { ...emptyGoogle },

      setGithub: (p) => set((s) => ({ github: { ...s.github, ...p } })),
      setTelegram: (p) => set((s) => ({ telegram: { ...s.telegram, ...p } })),
      setGoogle: (p) => set((s) => ({ google: { ...s.google, ...p } })),

      disconnect: (id) =>
        set((s) => {
          if (id === "github") return { github: { token: "", account: "" } };
          if (id === "telegram") return { telegram: { botToken: "", chatId: "" } };
          if (id === "gmail" || id === "google-drive") {
            // Quita solo el scope correspondiente; revoca el token si no quedan scopes.
            const scope = id === "gmail" ? GMAIL_SCOPE : DRIVE_SCOPE;
            const scopes = s.google.scopes.filter((x) => x !== scope);
            return {
              google: scopes.length
                ? { ...s.google, scopes }
                : { ...emptyGoogle, clientId: s.google.clientId || GOOGLE_CLIENT_ID },
            };
          }
          return {};
        }),
    }),
    {
      name: "zero-agency-connectors",
      // Si no hay Client ID guardado, usa el del entorno (Vercel) al rehidratar.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ConnectorsState>;
        const merged = { ...current, ...p } as ConnectorsState;
        if (!merged.google?.clientId && GOOGLE_CLIENT_ID) {
          merged.google = { ...merged.google, clientId: GOOGLE_CLIENT_ID };
        }
        return merged;
      },
    }
  )
);

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
// Todos los scopes de Google: un solo consentimiento conecta Gmail + Drive + Calendar.
export const GOOGLE_SCOPES = [GMAIL_SCOPE, DRIVE_SCOPE, CALENDAR_SCOPE];

export function googleTokenValid(g: GoogleConfig, scope?: string): boolean {
  if (!g.accessToken || g.expiry < Date.now() + 30_000) return false;
  if (scope && !g.scopes.includes(scope)) return false;
  return true;
}
