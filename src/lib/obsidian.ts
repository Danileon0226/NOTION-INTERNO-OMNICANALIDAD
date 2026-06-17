"use client";

import { create } from "zustand";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface VaultNote {
  path: string; // ruta relativa dentro de la bóveda
  title: string; // nombre del archivo sin .md
  links: string[]; // títulos destino de los enlaces [[...]] / [..](..md)
  tags: string[];
  size: number;
}

interface VaultState {
  handle: any | null;
  name: string;
  notes: VaultNote[];
  scannedAt: number;
  supported: boolean;
  setVault: (handle: any, name: string) => void;
  setNotes: (notes: VaultNote[]) => void;
  reset: () => void;
}

export const useVault = create<VaultState>((set) => ({
  handle: null,
  name: "",
  notes: [],
  scannedAt: 0,
  supported: typeof window !== "undefined" && "showDirectoryPicker" in window,
  setVault: (handle, name) => set({ handle, name }),
  setNotes: (notes) => set({ notes, scannedAt: Date.now() }),
  reset: () => set({ handle: null, name: "", notes: [], scannedAt: 0 }),
}));

/** Abre el selector de carpeta del navegador para elegir la bóveda. */
export async function pickVault(): Promise<any> {
  const w = window as any;
  if (!w.showDirectoryPicker) throw new Error("Tu navegador no soporta acceso a carpetas (usa Chrome/Edge).");
  return w.showDirectoryPicker({ id: "obsidian-vault", mode: "read" });
}

const WIKILINK = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;
const MDLINK = /\[[^\]]*\]\(([^)]+\.md)\)/g;
const TAG = /(?:^|\s)#([a-zA-Z0-9_\-/]+)/g;

function baseName(p: string): string {
  const n = p.split("/").pop() || p;
  return n.replace(/\.md$/i, "");
}

function parseNote(path: string, text: string, size: number): VaultNote {
  const links = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = WIKILINK.exec(text))) links.add(m[1].trim());
  while ((m = MDLINK.exec(text))) links.add(baseName(m[1].trim()));
  const tags = new Set<string>();
  while ((m = TAG.exec(text))) tags.add(m[1]);
  return { path, title: baseName(path), links: [...links], tags: [...tags], size };
}

/** Recorre la bóveda y devuelve todas las notas .md con sus enlaces. */
export async function scanVault(dir: any): Promise<VaultNote[]> {
  const notes: VaultNote[] = [];
  async function walk(handle: any, prefix: string) {
    for await (const entry of handle.values()) {
      if (entry.kind === "directory") {
        if (entry.name === ".obsidian" || entry.name.startsWith(".")) continue;
        await walk(entry, `${prefix}${entry.name}/`);
      } else if (entry.name.toLowerCase().endsWith(".md")) {
        try {
          const file = await entry.getFile();
          const text = await file.text();
          notes.push(parseNote(`${prefix}${entry.name}`, text, file.size));
        } catch {
          /* archivo no legible, se omite */
        }
      }
    }
  }
  await walk(dir, "");
  return notes;
}
