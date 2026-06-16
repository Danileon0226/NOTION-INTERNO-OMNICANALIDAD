"use client";

import { useRef } from "react";
import type { Block, BlockType } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { GripVertical, Trash2 } from "lucide-react";

const placeholders: Partial<Record<BlockType, string>> = {
  heading1: "Encabezado 1",
  heading2: "Encabezado 2",
  heading3: "Encabezado 3",
  text: "Escribe algo, o usa '/' para comandos…",
  todo: "Tarea",
  bulleted: "Elemento de lista",
  quote: "Cita",
  callout: "Resaltado",
};

const SLASH: { key: string; type: BlockType; label: string }[] = [
  { key: "h1", type: "heading1", label: "Encabezado 1" },
  { key: "h2", type: "heading2", label: "Encabezado 2" },
  { key: "h3", type: "heading3", label: "Encabezado 3" },
  { key: "todo", type: "todo", label: "Lista de tareas" },
  { key: "list", type: "bulleted", label: "Lista con viñetas" },
  { key: "quote", type: "quote", label: "Cita" },
  { key: "callout", type: "callout", label: "Resaltado" },
  { key: "div", type: "divider", label: "Divisor" },
  { key: "text", type: "text", label: "Texto" },
];

export function BlockEditor({ pageId, blocks }: { pageId: string; blocks: Block[] }) {
  return (
    <div className="space-y-0.5">
      {blocks.map((block) => (
        <BlockRow key={block.id} pageId={pageId} block={block} />
      ))}
    </div>
  );
}

function BlockRow({ pageId, block }: { pageId: string; block: Block }) {
  const { updateBlock, addBlock, deleteBlock, setBlockType, setActivePage } = useWorkspace.getState();
  const ref = useRef<HTMLDivElement>(null);

  if (block.type === "divider") {
    return (
      <div className="group flex items-center gap-1 py-1">
        <RowHandle onDelete={() => deleteBlock(pageId, block.id)} />
        <hr className="my-2 w-full border-t" />
      </div>
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const text = ref.current?.innerText ?? "";

    // Slash command: si la línea es exactamente "/h1" etc al presionar Enter/Espacio
    if (e.key === "Enter") {
      const match = SLASH.find((s) => text.trim() === `/${s.key}`);
      if (match) {
        e.preventDefault();
        if (match.type === "divider") {
          updateBlock(pageId, block.id, { content: "", type: "divider" });
        } else {
          updateBlock(pageId, block.id, { content: "", type: match.type });
          if (ref.current) ref.current.innerText = "";
        }
        return;
      }
      e.preventDefault();
      const newId = addBlock(pageId, block.id, block.type === "heading1" ? "text" : block.type);
      requestAnimationFrame(() => {
        document.getElementById(`block-${newId}`)?.focus();
      });
      return;
    }

    if (e.key === "Backspace" && text === "") {
      e.preventDefault();
      deleteBlock(pageId, block.id);
    }
  }

  const base = "outline-none w-full leading-relaxed text-ink";
  const typeClass: Record<BlockType, string> = {
    heading1: "text-3xl font-bold mt-2",
    heading2: "text-2xl font-semibold mt-2",
    heading3: "text-xl font-semibold mt-1",
    text: "text-[15px]",
    todo: "text-[15px]",
    bulleted: "text-[15px]",
    quote: "text-[15px] italic text-muted border-l-2 pl-3",
    callout: "text-[15px]",
    divider: "",
  };

  const editable = (
    <div
      id={`block-${block.id}`}
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholders[block.type]}
      className={`${base} ${typeClass[block.type]}`}
      onInput={(e) => updateBlock(pageId, block.id, { content: e.currentTarget.innerText })}
      onKeyDown={onKeyDown}
      onFocus={() => setActivePage(pageId)}
      dangerouslySetInnerHTML={{ __html: escapeHtml(block.content) }}
    />
  );

  if (block.type === "todo") {
    return (
      <div className="group flex items-start gap-1">
        <RowHandle onDelete={() => deleteBlock(pageId, block.id)} />
        <input
          type="checkbox"
          checked={!!block.checked}
          onChange={(e) => updateBlock(pageId, block.id, { checked: e.target.checked })}
          className="mt-1.5 h-4 w-4 accent-accent"
        />
        <div className={`flex-1 ${block.checked ? "text-muted line-through" : ""}`}>{editable}</div>
      </div>
    );
  }

  if (block.type === "bulleted") {
    return (
      <div className="group flex items-start gap-1">
        <RowHandle onDelete={() => deleteBlock(pageId, block.id)} />
        <span className="mt-2 text-ink">•</span>
        <div className="flex-1">{editable}</div>
      </div>
    );
  }

  if (block.type === "callout") {
    return (
      <div className="group flex items-start gap-1">
        <RowHandle onDelete={() => deleteBlock(pageId, block.id)} />
        <div className="flex w-full gap-2 rounded-md bg-bg-subtle p-3">
          <span>💡</span>
          <div className="flex-1">{editable}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-1">
      <RowHandle onDelete={() => deleteBlock(pageId, block.id)} />
      <div className="flex-1">{editable}</div>
    </div>
  );
}

function RowHandle({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="flex w-5 shrink-0 items-center justify-center pt-1.5 opacity-0 transition group-hover:opacity-100">
      <button onClick={onDelete} title="Eliminar bloque" className="text-muted hover:text-red-500">
        <Trash2 size={13} />
      </button>
      <GripVertical size={13} className="hidden text-muted" />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
