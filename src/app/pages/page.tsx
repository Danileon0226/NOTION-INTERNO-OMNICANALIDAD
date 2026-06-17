"use client";

import { useWorkspace } from "@/lib/store";
import { PageClient } from "@/components/editor/PageClient";

// Ruta única del workspace: renderiza la página activa desde el store.
// Compatible con exportación estática y con páginas creadas en el cliente.
export default function WorkspacePage() {
  const activePageId = useWorkspace((s) => s.activePageId);
  return <PageClient id={activePageId} />;
}
