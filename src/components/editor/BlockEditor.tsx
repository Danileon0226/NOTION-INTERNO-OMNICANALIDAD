"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Block, BlockType } from "@/lib/types";
import { useWorkspace } from "@/lib/store";
import { ConnectorEmbed } from "@/components/editor/Embeds";
import {
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Plus,
  FileText,
  ChevronRight,
} from "lucide-react";

const placeholders: Partial<Record<BlockType, string>> = {
  heading1: "Encabezado 1",
  heading2: "Encabezado 2",
  heading3: "Encabezado 3",
  text: "Escribe algo, o usa '/' para comandos…",
  todo: "Tarea",
  bulleted: "Elemento de lista",
  numbered: "Elemento de lista",
  quote: "Cita",
  callout: "Resaltado",
};

interface SlashItem {
  type: BlockType;
  label: string;
  kw: string;
  hint: string;
}

const SLASH: SlashItem[] = [
  { type: "text", label: "Texto", kw: "text texto parrafo", hint: "Aa" },
  { type: "heading1", label: "Encabezado 1", kw: "h1 titulo encabezado", hint: "H1" },
  { type: "heading2", label: "Encabezado 2", kw: "h2 subtitulo encabezado", hint: "H2" },
  { type: "heading3", label: "Encabezado 3", kw: "h3 encabezado", hint: "H3" },
  { type: "todo", label: "Lista de tareas", kw: "todo tarea checkbox pendiente", hint: "☑" },
  { type: "bulleted", label: "Lista con viñetas", kw: "bullet vineta lista", hint: "•" },
  { type: "numbered", label: "Lista numerada", kw: "numero numerada lista ordenada", hint: "1." },
  { type: "quote", label: "Cita", kw: "quote cita", hint: "❝" },
  { type: "callout", label: "Resaltado", kw: "callout destacado nota", hint: "💡" },
  { type: "code", label: "Código", kw: "code codigo snippet", hint: "</>" },
  { type: "divider", label: "Divisor", kw: "divider linea separador", hint: "―" },
  { type: "image", label: "Imagen", kw: "image imagen foto", hint: "🖼" },
  { type: "page", label: "Subpágina", kw: "page pagina subpagina", hint: "📄" },
  { type: "embed-github", label: "GitHub en vivo", kw: "github repos prs conector", hint: "🐙" },
  { type: "embed-gmail", label: "Gmail en vivo", kw: "gmail correo bandeja conector", hint: "✉" },
  { type: "embed-drive", label: "Google Drive en vivo", kw: "drive archivos conector", hint: "📁" },
  { type: "embed-telegram", label: "Telegram (enviar)", kw: "telegram alerta enviar conector", hint: "✈" },
];

const NON_EDITABLE: BlockType[] = [
  "divider",
  "image",
  "html",
  "page",
  "embed-github",
  "embed-gmail",
  "embed-drive",
  "embed-telegram",
];

interface Dnd {
  dragId: string | null;
  overId: string | null;
  setDrag: (id: string | null) => void;
  setOver: (id: string | null) => void;
  reorder: (from: string, to: string) => void;
}

export function BlockEditor({ pageId, blocks }: { pageId: string; blocks: Block[] }) {
  const reorderBlock = useWorkspace((s) => s.reorderBlock);
  const [dragId, setDrag] = useState<string | null>(null);
  const [overId, setOver] = useState<string | null>(null);
  const dnd: Dnd = {
    dragId,
    overId,
    setDrag,
    setOver,
    reorder: (from, to) => reorderBlock(pageId, from, to),
  };
  return (
    <div className="space-y-0.5">
      {blocks.map((block, i) => (
        <BlockRow key={block.id} pageId={pageId} block={block} index={i} blocks={blocks} dnd={dnd} />
      ))}
    </div>
  );
}

function numberFor(blocks: Block[], index: number): number {
  let n = 1;
  for (let i = index - 1; i >= 0 && blocks[i].type === "numbered"; i--) n++;
  return n;
}

function BlockRow({
  pageId,
  block,
  index,
  blocks,
  dnd,
}: {
  pageId: string;
  block: Block;
  index: number;
  blocks: Block[];
  dnd: Dnd;
}) {
  const store = useWorkspace.getState();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const [slashClosed, setSlashClosed] = useState(false);

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      if (!dnd.dragId) return;
      e.preventDefault();
      if (dnd.overId !== block.id) dnd.setOver(block.id);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dnd.dragId && dnd.dragId !== block.id) dnd.reorder(dnd.dragId, block.id);
      dnd.setDrag(null);
      dnd.setOver(null);
    },
  };
  const isOver = dnd.overId === block.id && !!dnd.dragId && dnd.dragId !== block.id;

  const content = block.content;
  const showSlash =
    !NON_EDITABLE.includes(block.type) && content.startsWith("/") && !slashClosed;
  const query = showSlash ? content.slice(1).toLowerCase().trim() : "";
  const matches = showSlash
    ? SLASH.filter((s) => s.label.toLowerCase().includes(query) || s.kw.includes(query))
    : [];

  function focusBlock(id: string) {
    requestAnimationFrame(() => document.getElementById(`block-${id}`)?.focus());
  }

  function applyType(item: SlashItem) {
    setSlashClosed(true);
    if (item.type === "page") {
      store.updateBlock(pageId, block.id, { content: "", type: "text" });
      const child = store.createSubpage(pageId, block.id);
      // limpia el bloque "/" vacío que quedó
      requestAnimationFrame(() => store.deleteBlock(pageId, block.id));
      void child;
      return;
    }
    if (NON_EDITABLE.includes(item.type)) {
      store.updateBlock(pageId, block.id, { content: "", type: item.type });
      const next = store.addBlock(pageId, block.id, "text");
      focusBlock(next);
      return;
    }
    store.updateBlock(pageId, block.id, { content: "", type: item.type });
    if (ref.current) ref.current.innerText = "";
    focusBlock(block.id);
  }

  function markdown(text: string): boolean {
    const map: [RegExp, BlockType][] = [
      [/^# $/, "heading1"],
      [/^## $/, "heading2"],
      [/^### $/, "heading3"],
      [/^[-*] $/, "bulleted"],
      [/^1\. $/, "numbered"],
      [/^\[\]\s$|^\[ \] $/, "todo"],
      [/^> $/, "quote"],
      [/^``` $|^```$/, "code"],
      [/^--- $/, "divider"],
    ];
    for (const [re, type] of map) {
      if (re.test(text)) {
        if (type === "divider") {
          store.updateBlock(pageId, block.id, { content: "", type });
          const next = store.addBlock(pageId, block.id, "text");
          focusBlock(next);
        } else {
          store.updateBlock(pageId, block.id, { content: "", type });
          if (ref.current) ref.current.innerText = "";
          focusBlock(block.id);
        }
        return true;
      }
    }
    return false;
  }

  function onInput(e: React.FormEvent<HTMLDivElement>) {
    const text = e.currentTarget.innerText;
    if (slashClosed && !text.startsWith("/")) setSlashClosed(false);
    if (markdown(text)) return;
    store.updateBlock(pageId, block.id, { content: text });
    setSel(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (showSlash && matches.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => (s + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => (s - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        applyType(matches[sel]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashClosed(true);
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const listType = ["bulleted", "numbered", "todo"].includes(block.type) ? block.type : "text";
      const next = store.addBlock(pageId, block.id, listType as BlockType);
      focusBlock(next);
      return;
    }
    if (e.key === "Backspace" && (ref.current?.innerText ?? "") === "") {
      e.preventDefault();
      const prev = blocks[index - 1];
      store.deleteBlock(pageId, block.id);
      if (prev) focusBlock(prev.id);
    }
  }

  const actions = (
    <RowActions
      onUp={() => store.moveBlock(pageId, block.id, -1)}
      onDown={() => store.moveBlock(pageId, block.id, 1)}
      onDup={() => store.duplicateBlock(pageId, block.id)}
      onDelete={() => store.deleteBlock(pageId, block.id)}
      onDragStart={() => dnd.setDrag(block.id)}
      onDragEnd={() => {
        dnd.setDrag(null);
        dnd.setOver(null);
      }}
    />
  );

  const rowProps = { actions, dropProps, isOver };

  // ── Bloques no editables ──────────────────────────────────
  if (block.type === "divider") {
    return (
      <Row {...rowProps}>
        <hr className="my-2 w-full border-t" />
      </Row>
    );
  }
  if (block.type === "image") {
    return (
      <Row {...rowProps}>
        {content ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content} alt="" className="max-h-96 rounded-lg border object-contain" />
        ) : (
          <input
            autoFocus
            placeholder="Pega la URL de la imagen y presiona Enter"
            className="w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-accent"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                store.updateBlock(pageId, block.id, { content: (e.target as HTMLInputElement).value });
                const next = store.addBlock(pageId, block.id, "text");
                focusBlock(next);
              }
            }}
          />
        )}
      </Row>
    );
  }
  if (block.type === "page") {
    const child = store.pages.find((p) => p.id === block.refId);
    return (
      <Row {...rowProps}>
        <button
          onClick={() => {
            if (!child) return;
            store.setActivePage(child.id);
            router.push("/pages");
          }}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-bg-subtle"
        >
          <span className="text-lg leading-none">{child?.icon ?? "📄"}</span>
          <span className="font-medium text-ink underline decoration-border underline-offset-2">
            {child?.title || "Página sin título"}
          </span>
          <FileText size={13} className="ml-auto text-muted" />
        </button>
      </Row>
    );
  }
  if (block.type.startsWith("embed-")) {
    return (
      <Row {...rowProps}>
        <ConnectorEmbed type={block.type} />
      </Row>
    );
  }
  if (block.type === "html") {
    return (
      <Row {...rowProps}>
        <div className="my-1 w-full overflow-hidden rounded-lg border bg-white">
          <div className="flex items-center gap-2 border-b bg-bg-subtle px-3 py-1.5 text-xs text-muted">
            🌐 Página web generada
            <button
              onClick={() => {
                const w = window.open();
                if (w) {
                  w.document.write(block.content);
                  w.document.close();
                }
              }}
              className="ml-auto rounded px-1.5 py-0.5 hover:bg-white hover:text-ink"
            >
              Abrir
            </button>
            <button
              onClick={() => {
                const blob = new Blob([block.content], { type: "text/html" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "pagina.html";
                a.click();
              }}
              className="rounded px-1.5 py-0.5 hover:bg-white hover:text-ink"
            >
              Descargar
            </button>
          </div>
          <iframe
            title="preview"
            sandbox="allow-scripts"
            srcDoc={block.content}
            className="h-80 w-full bg-white"
          />
        </div>
      </Row>
    );
  }
  if (block.type === "code") {
    return (
      <Row {...rowProps}>
        <textarea
          id={`block-${block.id}`}
          value={content}
          onChange={(e) => store.updateBlock(pageId, block.id, { content: e.target.value })}
          placeholder="// código"
          rows={Math.max(2, content.split("\n").length)}
          spellCheck={false}
          className="w-full resize-none rounded-md bg-[#f7f6f3] p-3 font-mono text-[13px] text-ink outline-none"
        />
      </Row>
    );
  }

  // ── Bloques editables (texto enriquecido) ─────────────────
  const typeClass: Partial<Record<BlockType, string>> = {
    heading1: "text-3xl font-bold mt-2",
    heading2: "text-2xl font-semibold mt-2",
    heading3: "text-xl font-semibold mt-1",
    text: "text-[15px]",
    todo: "text-[15px]",
    bulleted: "text-[15px]",
    numbered: "text-[15px]",
    quote: "text-[15px] italic text-muted border-l-2 pl-3",
    callout: "text-[15px]",
  };

  const editable = (
    <div
      id={`block-${block.id}`}
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholders[block.type]}
      className={`w-full leading-relaxed text-ink outline-none ${typeClass[block.type] ?? "text-[15px]"} ${
        block.type === "todo" && block.checked ? "text-muted line-through" : ""
      }`}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onFocus={() => store.setActivePage(pageId)}
      dangerouslySetInnerHTML={{ __html: escapeHtml(content) }}
    />
  );

  let prefix: React.ReactNode = null;
  if (block.type === "todo") {
    prefix = (
      <input
        type="checkbox"
        checked={!!block.checked}
        onChange={(e) => store.updateBlock(pageId, block.id, { checked: e.target.checked })}
        className="mt-1.5 h-4 w-4 accent-accent"
      />
    );
  } else if (block.type === "bulleted") {
    prefix = <span className="mt-1 select-none text-ink">•</span>;
  } else if (block.type === "numbered") {
    prefix = <span className="mt-1 select-none text-sm text-muted">{numberFor(blocks, index)}.</span>;
  }

  if (block.type === "callout") {
    return (
      <Row {...rowProps} slash={showSlash ? <SlashMenu matches={matches} sel={sel} onPick={applyType} /> : null}>
        <div className="flex w-full gap-2 rounded-md bg-bg-subtle p-3">
          <span className="select-none">💡</span>
          <div className="flex-1">{editable}</div>
        </div>
      </Row>
    );
  }

  return (
    <Row {...rowProps} slash={showSlash ? <SlashMenu matches={matches} sel={sel} onPick={applyType} /> : null}>
      {prefix}
      <div className="flex-1">{editable}</div>
    </Row>
  );
}

function Row({
  children,
  actions,
  slash,
  dropProps,
  isOver,
}: {
  children: React.ReactNode;
  actions: React.ReactNode;
  slash?: React.ReactNode;
  dropProps?: { onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void };
  isOver?: boolean;
}) {
  return (
    <div
      {...dropProps}
      className={`group relative flex items-start gap-1 rounded ${
        isOver ? "border-t-2 border-accent" : "border-t-2 border-transparent"
      }`}
    >
      {actions}
      {children}
      {slash}
    </div>
  );
}

function RowActions({
  onUp,
  onDown,
  onDup,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  onUp: () => void;
  onDown: () => void;
  onDup: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex w-5 shrink-0 items-center justify-center pt-1.5 opacity-40 transition lg:opacity-0 lg:group-hover:opacity-100">
      <button
        onClick={() => setOpen((v) => !v)}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title="Arrastra para mover · clic para acciones"
        className="cursor-grab text-muted hover:text-ink active:cursor-grabbing"
      >
        <GripVertical size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="zero-pop absolute left-5 top-0 z-20 w-36 rounded-md border bg-white py-1 shadow-lg">
            <MenuItem icon={<ChevronUp size={13} />} label="Subir" onClick={() => { onUp(); setOpen(false); }} />
            <MenuItem icon={<ChevronDown size={13} />} label="Bajar" onClick={() => { onDown(); setOpen(false); }} />
            <MenuItem icon={<Copy size={13} />} label="Duplicar" onClick={() => { onDup(); setOpen(false); }} />
            <MenuItem icon={<Trash2 size={13} />} label="Eliminar" danger onClick={() => { onDelete(); setOpen(false); }} />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-bg-subtle ${
        danger ? "text-red-600" : "text-ink"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function SlashMenu({
  matches,
  sel,
  onPick,
}: {
  matches: SlashItem[];
  sel: number;
  onPick: (i: SlashItem) => void;
}) {
  if (!matches.length) return null;
  return (
    <div className="zero-pop absolute left-6 top-7 z-30 max-h-72 w-64 overflow-y-auto rounded-lg border bg-white py-1 shadow-xl">
      {matches.map((m, i) => (
        <button
          key={m.type}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(m);
          }}
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm ${
            i === sel ? "bg-bg-subtle" : "hover:bg-bg-subtle"
          }`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded border bg-white text-[11px]">
            {m.hint}
          </span>
          <span className="text-ink">{m.label}</span>
          {m.type.startsWith("embed-") && (
            <ChevronRight size={12} className="ml-auto text-accent" />
          )}
        </button>
      ))}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export { Plus };
