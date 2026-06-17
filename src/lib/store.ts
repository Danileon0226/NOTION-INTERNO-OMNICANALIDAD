"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Block, BlockType, WorkspacePage } from "@/lib/types";
import { seedPages, blankPage, DEMO_PAGE_IDS } from "@/lib/data/workspace";

function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface WorkspaceState {
  pages: WorkspacePage[];
  activePageId: string;
  setActivePage: (id: string) => void;
  createPage: (parentId?: string | null) => string;
  deletePage: (id: string) => void;
  updatePageMeta: (id: string, patch: Partial<Pick<WorkspacePage, "title" | "icon">>) => void;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  addBlock: (pageId: string, afterBlockId: string | null, type?: BlockType) => string;
  deleteBlock: (pageId: string, blockId: string) => void;
  setBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  moveBlock: (pageId: string, blockId: string, dir: -1 | 1) => void;
  duplicateBlock: (pageId: string, blockId: string) => void;
  /** Reordena moviendo `fromId` justo delante de `toId` (drag & drop). */
  reorderBlock: (pageId: string, fromId: string, toId: string) => void;
  /** Crea una subpágina e inserta un bloque `page` que la enlaza. */
  createSubpage: (pageId: string, afterBlockId: string | null) => string;
  /** Reemplaza el contenido de una página con los bloques de una plantilla. */
  applyTemplate: (pageId: string, blocks: Block[], meta?: { title?: string; icon?: string }) => void;
  /** Crea una página nueva a partir de una plantilla y la activa. */
  createPageFromTemplate: (
    blocks: Block[],
    meta: { title: string; icon: string },
    parentId?: string | null
  ) => string;
  /** Duplica una página (sin sus subpáginas) y la activa. */
  duplicatePage: (id: string) => string;
}

function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) => ({ ...b, id: uid("b") }));
}

const touch = (p: WorkspacePage): WorkspacePage => ({ ...p, updatedAt: new Date().toISOString() });

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      pages: seedPages,
      activePageId: seedPages[0].id,

      setActivePage: (id) => set({ activePageId: id }),

      createPage: (parentId = null) => {
        const id = uid("page");
        const now = new Date().toISOString();
        const page: WorkspacePage = {
          id,
          title: "Página sin título",
          icon: "📄",
          parentId,
          createdAt: now,
          updatedAt: now,
          blocks: [{ id: uid("b"), type: "text", content: "" }],
        };
        set((s) => ({ pages: [...s.pages, page], activePageId: id }));
        return id;
      },

      deletePage: (id) =>
        set((s) => {
          const pages = s.pages.filter((p) => p.id !== id && p.parentId !== id);
          const activePageId = s.activePageId === id ? pages[0]?.id ?? "" : s.activePageId;
          return { pages, activePageId };
        }),

      updatePageMeta: (id, patch) =>
        set((s) => ({
          pages: s.pages.map((p) => (p.id === id ? touch({ ...p, ...patch }) : p)),
        })),

      updateBlock: (pageId, blockId, patch) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === pageId
              ? touch({ ...p, blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) })
              : p
          ),
        })),

      addBlock: (pageId, afterBlockId, type = "text") => {
        const newId = uid("b");
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            const idx = afterBlockId ? p.blocks.findIndex((b) => b.id === afterBlockId) : p.blocks.length - 1;
            const blocks = [...p.blocks];
            blocks.splice(idx + 1, 0, { id: newId, type, content: "" });
            return touch({ ...p, blocks });
          }),
        }));
        return newId;
      },

      deleteBlock: (pageId, blockId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            if (p.blocks.length <= 1) return p;
            return touch({ ...p, blocks: p.blocks.filter((b) => b.id !== blockId) });
          }),
        })),

      setBlockType: (pageId, blockId, type) => get().updateBlock(pageId, blockId, { type }),

      moveBlock: (pageId, blockId, dir) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            const idx = p.blocks.findIndex((b) => b.id === blockId);
            const to = idx + dir;
            if (idx < 0 || to < 0 || to >= p.blocks.length) return p;
            const blocks = [...p.blocks];
            [blocks[idx], blocks[to]] = [blocks[to], blocks[idx]];
            return touch({ ...p, blocks });
          }),
        })),

      duplicateBlock: (pageId, blockId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            const idx = p.blocks.findIndex((b) => b.id === blockId);
            if (idx < 0) return p;
            const blocks = [...p.blocks];
            blocks.splice(idx + 1, 0, { ...p.blocks[idx], id: uid("b") });
            return touch({ ...p, blocks });
          }),
        })),

      reorderBlock: (pageId, fromId, toId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            const from = p.blocks.findIndex((b) => b.id === fromId);
            if (from < 0) return p;
            const moved = p.blocks[from];
            const rest = p.blocks.filter((b) => b.id !== fromId);
            const to = rest.findIndex((b) => b.id === toId);
            const at = to < 0 ? rest.length : to;
            rest.splice(at, 0, moved);
            return touch({ ...p, blocks: rest });
          }),
        })),

      applyTemplate: (pageId, blocks, meta) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === pageId
              ? touch({
                  ...p,
                  blocks: cloneBlocks(blocks),
                  title: meta?.title && p.title.startsWith("Página sin") ? meta.title : p.title,
                  icon: meta?.icon ?? p.icon,
                })
              : p
          ),
        })),

      createPageFromTemplate: (blocks, meta, parentId = null) => {
        const id = uid("page");
        const now = new Date().toISOString();
        const page: WorkspacePage = {
          id,
          title: meta.title,
          icon: meta.icon,
          parentId,
          createdAt: now,
          updatedAt: now,
          blocks: cloneBlocks(blocks),
        };
        set((s) => ({ pages: [...s.pages, page], activePageId: id }));
        return id;
      },

      duplicatePage: (id) => {
        const src = get().pages.find((p) => p.id === id);
        if (!src) return id;
        const newId = uid("page");
        const now = new Date().toISOString();
        const copy: WorkspacePage = {
          ...src,
          id: newId,
          title: `${src.title} (copia)`,
          createdAt: now,
          updatedAt: now,
          blocks: cloneBlocks(src.blocks),
        };
        set((s) => ({ pages: [...s.pages, copy], activePageId: newId }));
        return newId;
      },

      createSubpage: (pageId, afterBlockId) => {
        const childId = uid("page");
        const now = new Date().toISOString();
        const child: WorkspacePage = {
          id: childId,
          title: "Página sin título",
          icon: "📄",
          parentId: pageId,
          createdAt: now,
          updatedAt: now,
          blocks: [{ id: uid("b"), type: "text", content: "" }],
        };
        set((s) => ({
          pages: [
            ...s.pages.map((p) => {
              if (p.id !== pageId) return p;
              const idx = afterBlockId
                ? p.blocks.findIndex((b) => b.id === afterBlockId)
                : p.blocks.length - 1;
              const blocks = [...p.blocks];
              blocks.splice(idx + 1, 0, {
                id: uid("b"),
                type: "page",
                content: "Página sin título",
                refId: childId,
              });
              return touch({ ...p, blocks });
            }),
            child,
          ],
        }));
        return childId;
      },
    }),
    {
      name: "zero-agency-workspace",
      version: 2,
      // Purga las antiguas páginas de ejemplo del almacenamiento existente.
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Partial<WorkspaceState>;
        const pages = (s.pages ?? []).filter((p) => !DEMO_PAGE_IDS.includes(p.id));
        const list = pages.length ? pages : [blankPage()];
        const activeOk = list.some((p) => p.id === s.activePageId);
        return { ...s, pages: list, activePageId: activeOk ? s.activePageId! : list[0].id } as WorkspaceState;
      },
    }
  )
);
