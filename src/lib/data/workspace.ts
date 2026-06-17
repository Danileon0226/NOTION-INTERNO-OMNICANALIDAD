import type { WorkspacePage } from "@/lib/types";

// IDs de las antiguas páginas de ejemplo, para purgarlas en la migración.
export const DEMO_PAGE_IDS = ["page-onboarding", "page-clientes", "page-finanzas"];

function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// Página en blanco inicial (sin contenido de ejemplo).
export function blankPage(): WorkspacePage {
  const now = new Date().toISOString();
  return {
    id: uid("page"),
    title: "Página sin título",
    icon: "📄",
    parentId: null,
    createdAt: now,
    updatedAt: now,
    blocks: [{ id: uid("b"), type: "text", content: "" }],
  };
}

// Workspace inicial: una sola página vacía lista para escribir.
export const seedPages: WorkspacePage[] = [blankPage()];
