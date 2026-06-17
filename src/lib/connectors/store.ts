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

const emptyGoogle: GoogleConfig = { clientId: "", accessToken: "", expiry: 0, scopes: [] };

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
                : { ...emptyGoogle, clientId: s.google.clientId },
            };
          }
          return {};
        }),
    }),
    { name: "zero-agency-connectors" }
  )
);

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function googleTokenValid(g: GoogleConfig, scope?: string): boolean {
  if (!g.accessToken || g.expiry < Date.now() + 30_000) return false;
  if (scope && !g.scopes.includes(scope)) return false;
  return true;
}
