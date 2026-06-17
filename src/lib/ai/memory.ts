"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Memoria persistente del gestor de conciencia (ZERO): hechos que recuerda
// entre sesiones y que se inyectan como contexto al agente. Vive en el
// navegador (localStorage), coherente con el resto de la plataforma.

export interface Memory {
  id: string;
  text: string;
  tag?: string;
  ts: number;
  pinned?: boolean;
}

const CAP = 300;

interface MemoryState {
  items: Memory[];
  add: (text: string, tag?: string) => Memory | null;
  remove: (id: string) => void;
  togglePin: (id: string) => void;
  clear: () => void;
}

export const useMemory = create<MemoryState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (text, tag) => {
        const clean = text.trim();
        if (!clean) return null;
        // Evita duplicados exactos.
        const existing = get().items.find((m) => m.text.toLowerCase() === clean.toLowerCase());
        if (existing) return existing;
        const m: Memory = { id: Math.random().toString(36).slice(2, 10), text: clean, tag, ts: Date.now() };
        set((s) => ({ items: [m, ...s.items].slice(0, CAP) }));
        return m;
      },
      remove: (id) => set((s) => ({ items: s.items.filter((m) => m.id !== id) })),
      togglePin: (id) => set((s) => ({ items: s.items.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) })),
      clear: () => set({ items: [] }),
    }),
    { name: "zero-agency-memory" }
  )
);

/** Búsqueda simple por texto/tag. */
export function searchMemory(items: Memory[], q: string): Memory[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((m) => m.text.toLowerCase().includes(needle) || (m.tag ?? "").toLowerCase().includes(needle));
}

/** Bloque de contexto para el agente: fijados primero, luego recientes. */
export function memoryContext(items: Memory[], max = 25): string {
  if (!items.length) return "";
  const ordered = [...items].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.ts - a.ts).slice(0, max);
  const lines = ordered.map((m) => `- ${m.pinned ? "📌 " : ""}${m.text}${m.tag ? ` [${m.tag}]` : ""}`);
  return `## MEMORIA DE ZERO (hechos recordados; úsalos como contexto)\n${lines.join("\n")}`;
}
