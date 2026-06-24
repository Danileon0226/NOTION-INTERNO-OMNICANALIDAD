"use client";

import { useMemo, useState } from "react";
import { Brain, Plus, Pin, PinOff, Trash2, Search } from "lucide-react";
import { useMemory, searchMemory } from "@/lib/ai/memory";
import { ModuleHeader } from "@/components/ModuleHeader";

export default function MemoryPage() {
  const { items, add, remove, togglePin, clear } = useMemory();
  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = searchMemory(items, q);
    return [...list].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.ts - a.ts);
  }, [items, q]);

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    add(text, tag.trim() || undefined);
    setText("");
    setTag("");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <ModuleHeader
        icon={<Brain size={20} />}
        title="Memoria de ZERO"
        subtitle="Lo que el gestor de conciencia recuerda entre sesiones; contexto en cada respuesta."
        right={
          items.length > 0 ? (
            <button onClick={clear} className="rounded-md border px-3 py-1.5 text-sm text-muted hover:bg-bg-subtle hover:text-red-500">
              Vaciar memoria
            </button>
          ) : undefined
        }
      />

      {/* Añadir */}
      <form onSubmit={submit} className="mb-4 rounded-xl border glass-card p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(e);
          }}
          placeholder="Recuerda que… (p. ej. 'El retainer de Montaña Viva es 480 USD mensuales')"
          rows={2}
          autoFocus
          className="w-full resize-none rounded-lg border bg-bg-subtle px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="etiqueta (opcional)"
            className="w-40 rounded-md border glass-card px-2 py-1 text-xs text-muted outline-none focus:border-accent"
          />
          <span className="hidden text-[11px] text-muted sm:inline">⌘/Ctrl + Enter</span>
          <button
            type="submit"
            disabled={!text.trim()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={14} /> Recordar
          </button>
        </div>
      </form>

      {/* Buscar */}
      {items.length > 3 && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md border glass-card px-2.5 py-1.5">
          <Search size={14} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en la memoria…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted">
          {items.length === 0 ? "ZERO aún no recuerda nada. Añade un hecho arriba." : "Sin coincidencias."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="hover-lift flex items-start gap-2.5 rounded-xl border glass-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{m.text}</p>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                  {m.tag && <span className="rounded bg-bg-subtle px-1.5 py-0.5">{m.tag}</span>}
                  {new Date(m.ts).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => togglePin(m.id)}
                className={`shrink-0 rounded p-1 hover:bg-bg-subtle ${m.pinned ? "text-accent" : "text-muted"}`}
                title={m.pinned ? "Quitar fijado" : "Fijar"}
              >
                {m.pinned ? <Pin size={14} /> : <PinOff size={14} />}
              </button>
              <button
                onClick={() => remove(m.id)}
                className="shrink-0 rounded p-1 text-muted hover:bg-bg-subtle hover:text-red-500"
                title="Olvidar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
