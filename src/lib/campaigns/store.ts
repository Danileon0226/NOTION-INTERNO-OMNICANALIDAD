"use client";

// Store del módulo "Campañas IG": ZERO genera el contenido, se deja en el
// Drive del usuario y desde aquí se publica en Instagram. Persiste en el
// navegador igual que el resto de módulos del OS.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CampaignEstado = "draft" | "contenido" | "publicando" | "activa";

export const ESTADO_LABEL: Record<CampaignEstado, string> = {
  draft: "Borrador",
  contenido: "Contenido listo",
  publicando: "Publicando…",
  activa: "Activa",
};

export interface CampaignPiece {
  id: string;
  /** Caption listo para Instagram (español, con CTA). */
  caption: string;
  /** Hashtags de la pieza (sin incluirlos en el caption). */
  hashtags: string[];
  /** Brief visual detallado para diseñar la imagen. */
  briefImagen: string;
  /** Archivo de texto de la pieza subido a la carpeta "ZERO Campañas". */
  driveFileId?: string;
  /** URL pública de la imagen final (la que consume la Graph API de IG). */
  imageUrl?: string;
  publicado?: boolean;
  /** Id del media publicado en Instagram. */
  igId?: string;
}

export interface Campaign {
  id: string;
  nombre: string;
  objetivo: string;
  publico: string;
  tono: string;
  estado: CampaignEstado;
  piezas: CampaignPiece[];
  /** Carpeta "ZERO Campañas" en el Drive del usuario. */
  driveFolderId?: string;
  /** Página "Campaña: {nombre}" creada en el workspace (proyecto completo). */
  workspacePageId?: string;
  createdAt: number;
  updatedAt: number;
}

interface CampaignsState {
  campaigns: Campaign[];
  create: (input: Pick<Campaign, "nombre" | "objetivo" | "publico" | "tono">) => string;
  remove: (id: string) => void;
  patch: (id: string, patch: Partial<Campaign>) => void;
  setPiezas: (id: string, piezas: CampaignPiece[]) => void;
  patchPieza: (id: string, piezaId: string, patch: Partial<CampaignPiece>) => void;
}

const CAP = 30;

function uid(prefix = "c"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function piezaId(): string {
  return uid("pz");
}

export const useCampaigns = create<CampaignsState>()(
  persist(
    (set) => ({
      campaigns: [],

      create: (input) => {
        const id = uid("camp");
        const now = Date.now();
        const camp: Campaign = {
          id,
          ...input,
          estado: "draft",
          piezas: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ campaigns: [camp, ...s.campaigns].slice(0, CAP) }));
        return id;
      },

      remove: (id) => set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),

      patch: (id, patch) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
          ),
        })),

      setPiezas: (id, piezas) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id ? { ...c, piezas, updatedAt: Date.now() } : c
          ),
        })),

      patchPieza: (id, pzId, patch) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id
              ? {
                  ...c,
                  piezas: c.piezas.map((p) => (p.id === pzId ? { ...p, ...patch } : p)),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),
    }),
    { name: "zero-agency-campaigns" }
  )
);
