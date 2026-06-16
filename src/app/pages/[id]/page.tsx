"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { Trash2, Plus } from "lucide-react";

const EMOJIS = ["📄", "🚀", "🤝", "💰", "📈", "🧠", "📋", "🎯", "🛠️", "🔔", "📦", "✨"];

export default function PageView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const page = useWorkspace((s) => s.pages.find((p) => p.id === id));
  const updatePageMeta = useWorkspace((s) => s.updatePageMeta);
  const deletePage = useWorkspace((s) => s.deletePage);
  const addBlock = useWorkspace((s) => s.addBlock);
  const [showPicker, setShowPicker] = useState(false);

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-12 py-16 text-muted">
        Página no encontrada. <button onClick={() => router.push("/dashboard")} className="text-accent underline">Volver al dashboard</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-12 py-12">
      <div className="mb-2 flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="rounded-md p-1 text-4xl hover:bg-bg-subtle"
          >
            {page.icon}
          </button>
          {showPicker && (
            <div className="absolute z-10 mt-1 grid grid-cols-6 gap-1 rounded-lg border bg-white p-2 shadow-lg">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    updatePageMeta(page.id, { icon: e });
                    setShowPicker(false);
                  }}
                  className="rounded p-1 text-xl hover:bg-bg-subtle"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (confirm("¿Eliminar esta página?")) {
              deletePage(page.id);
              router.push("/dashboard");
            }
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-bg-subtle hover:text-red-500"
        >
          <Trash2 size={13} /> Eliminar
        </button>
      </div>

      <input
        value={page.title}
        onChange={(e) => updatePageMeta(page.id, { title: e.target.value })}
        placeholder="Página sin título"
        className="mb-4 w-full bg-transparent text-4xl font-bold text-ink outline-none placeholder:text-muted/40"
      />

      <BlockEditor pageId={page.id} blocks={page.blocks} />

      <button
        onClick={() => addBlock(page.id, page.blocks[page.blocks.length - 1]?.id ?? null)}
        className="mt-2 flex items-center gap-1 rounded px-1 py-1 text-sm text-muted hover:bg-bg-subtle"
      >
        <Plus size={14} /> Añadir bloque
      </button>

      <div className="mt-12 border-t pt-3 text-xs text-muted">
        Última edición: {new Date(page.updatedAt).toLocaleString("es-CO")}
      </div>
    </div>
  );
}
