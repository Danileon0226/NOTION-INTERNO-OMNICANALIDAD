"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { Trash2, Plus, ChevronRight, FilePlus2, Copy, LayoutTemplate } from "lucide-react";
import type { WorkspacePage } from "@/lib/types";
import { templates } from "@/lib/data/templates";

const EMOJIS = ["📄", "🚀", "🤝", "💰", "📈", "🧠", "📋", "🎯", "🛠️", "🔔", "📦", "✨", "📊", "🗂️", "⚡", "🌐"];

export function PageClient({ id }: { id: string }) {
  const router = useRouter();
  const pages = useWorkspace((s) => s.pages);
  const page = pages.find((p) => p.id === id);
  const updatePageMeta = useWorkspace((s) => s.updatePageMeta);
  const deletePage = useWorkspace((s) => s.deletePage);
  const addBlock = useWorkspace((s) => s.addBlock);
  const createSubpage = useWorkspace((s) => s.createSubpage);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const applyTemplate = useWorkspace((s) => s.applyTemplate);
  const duplicatePage = useWorkspace((s) => s.duplicatePage);
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  function open(pid: string) {
    setActivePage(pid);
    router.push("/pages");
  }

  function ancestors(p: WorkspacePage): WorkspacePage[] {
    const chain: WorkspacePage[] = [];
    let cur = p.parentId ? pages.find((x) => x.id === p.parentId) : undefined;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? pages.find((x) => x.id === cur!.parentId) : undefined;
    }
    return chain;
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 lg:px-12 text-muted">
        Página no encontrada.{" "}
        <button onClick={() => router.push("/dashboard")} className="text-accent underline">
          Volver al dashboard
        </button>
      </div>
    );
  }

  const children = pages.filter((p) => p.parentId === page.id);
  const trail = ancestors(page);
  const isEmpty =
    page.blocks.length === 1 && page.blocks[0].type === "text" && page.blocks[0].content === "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
      {trail.length > 0 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted">
          {trail.map((a) => (
            <span key={a.id} className="flex items-center gap-1">
              <button onClick={() => open(a.id)} className="rounded px-1 py-0.5 hover:bg-bg-subtle hover:text-ink">
                {a.icon} {a.title}
              </button>
              <ChevronRight size={12} />
            </span>
          ))}
          <span className="px-1 text-ink">{page.icon} {page.title}</span>
        </nav>
      )}
      <div className="mb-2 flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="rounded-md p-1 text-3xl sm:text-4xl hover:bg-bg-subtle"
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-bg-subtle hover:text-ink"
          >
            <LayoutTemplate size={13} /> Plantillas
          </button>
          <button
            onClick={() => duplicatePage(page.id)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-bg-subtle hover:text-ink"
          >
            <Copy size={13} /> Duplicar
          </button>
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
      </div>

      <input
        value={page.title}
        onChange={(e) => updatePageMeta(page.id, { title: e.target.value })}
        placeholder="Página sin título"
        className="mb-4 w-full bg-transparent text-3xl sm:text-4xl font-bold text-ink outline-none placeholder:text-muted/40"
      />

      {(showTemplates || isEmpty) && (
        <div className="mb-4 rounded-xl border bg-bg-subtle/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <LayoutTemplate size={15} /> Empieza con una plantilla
            </span>
            {showTemplates && (
              <button onClick={() => setShowTemplates(false)} className="text-xs text-muted hover:text-ink">
                Cerrar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  applyTemplate(page.id, t.blocks, { title: t.name, icon: t.icon });
                  setShowTemplates(false);
                }}
                className="rounded-lg border bg-white p-3 text-left hover:border-accent"
              >
                <div className="text-xl">{t.icon}</div>
                <div className="mt-1 text-sm font-medium text-ink">{t.name}</div>
                <div className="text-[11px] text-muted">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <BlockEditor pageId={page.id} blocks={page.blocks} />

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => addBlock(page.id, page.blocks[page.blocks.length - 1]?.id ?? null)}
          className="flex items-center gap-1 rounded px-1 py-1 text-sm text-muted hover:bg-bg-subtle"
        >
          <Plus size={14} /> Añadir bloque
        </button>
        <button
          onClick={() => createSubpage(page.id, page.blocks[page.blocks.length - 1]?.id ?? null)}
          className="flex items-center gap-1 rounded px-1 py-1 text-sm text-muted hover:bg-bg-subtle"
        >
          <FilePlus2 size={14} /> Nueva subpágina
        </button>
      </div>

      {children.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Subpáginas</div>
          <div className="divide-y rounded-lg border">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => open(c.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-subtle"
              >
                <span className="text-base leading-none">{c.icon}</span>
                <span className="text-ink">{c.title}</span>
                <ChevronRight size={13} className="ml-auto text-muted" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 border-t pt-3 text-xs text-muted">
        Última edición: {new Date(page.updatedAt).toLocaleString("es-CO")}
      </div>
    </div>
  );
}
