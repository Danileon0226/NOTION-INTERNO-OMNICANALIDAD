"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Block, BlockType, WorkspacePage } from "@/lib/types";
import { seedPages } from "@/lib/data/workspace";

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
  /** Crea una subpágina e inserta un bloque `page` que la enlaza. */
  createSubpage: (pageId: string, afterBlockId: string | null) => string;
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
    { name: "zero-agency-workspace" }
  )
);
