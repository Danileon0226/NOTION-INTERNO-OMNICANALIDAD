import type { WorkspacePage } from "@/lib/types";

// IDs de páginas heredadas de versiones anteriores, para purgarlas en la migración.
export const LEGACY_PAGE_IDS = ["page-onboarding", "page-clientes", "page-finanzas"];

function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// Página en blanco inicial (sin contenido predefinido).
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
export const initialPages: WorkspacePage[] = [blankPage()];
