"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Bot,
  Mic,
  Rocket,
  Activity,
  Radar,
  Plug,
  Mail,
  Calendar,
  FolderOpen,
  Globe,
  FileText,
  Plus,
  Moon,
  Sun,
  Sparkles,
  CornerDownLeft,
  Loader2,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useCommandPalette } from "@/lib/ui/commandPalette";
import { runAgent } from "@/lib/ai/agent";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const pages = useWorkspace((s) => s.pages);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const createPage = useWorkspace((s) => s.createPage);
  const toggleTheme = useTheme((s) => s.toggle);
  const mode = useTheme((s) => s.mode);

  const open = useCommandPalette((s) => s.open);
  const setOpen = useCommandPalette((s) => s.setOpen);
  const toggle = useCommandPalette((s) => s.toggle);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Atajo global ⌘K / Ctrl+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, setOpen]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setAnswer("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const nav = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close]
  );

  const baseCmds = useMemo<Cmd[]>(
    () => [
      { id: "dash", label: "Ir al Dashboard", icon: <LayoutDashboard size={16} />, run: () => nav("/dashboard") },
      { id: "assist", label: "Asistente IA", icon: <Bot size={16} />, run: () => nav("/assistant") },
      { id: "zero", label: "ZERO (voz)", icon: <Mic size={16} />, run: () => nav("/zero") },
      { id: "auto", label: "Piloto automático", icon: <Rocket size={16} />, run: () => nav("/autopilot") },
      { id: "anticipation", label: "Anticipación", icon: <Radar size={16} />, run: () => nav("/anticipation") },
      { id: "canvas", label: "Canvas / Grafo", icon: <Activity size={16} />, run: () => nav("/canvas") },
      { id: "calendar", label: "Calendario", icon: <Calendar size={16} />, run: () => nav("/calendar") },
      { id: "drive", label: "Explorador de Drive", icon: <FolderOpen size={16} />, run: () => nav("/drive") },
      { id: "monitor", label: "Monitoreo web", icon: <Globe size={16} />, run: () => nav("/monitor") },
      { id: "inbox", label: "Bandeja", icon: <Mail size={16} />, run: () => nav("/inbox") },
      { id: "connectors", label: "Conectores", icon: <Plug size={16} />, run: () => nav("/connectors") },
      {
        id: "new",
        label: "Nueva página",
        icon: <Plus size={16} />,
        run: () => {
          createPage(null);
          nav("/pages");
        },
      },
      {
        id: "theme",
        label: mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
        icon: mode === "dark" ? <Sun size={16} /> : <Moon size={16} />,
        run: () => {
          toggleTheme();
          close();
        },
      },
    ],
    [nav, createPage, toggleTheme, mode, close]
  );

  const pageCmds = useMemo<Cmd[]>(
    () =>
      pages.slice(0, 50).map((p) => ({
        id: `page-${p.id}`,
        label: p.title,
        hint: "Página",
        icon: <FileText size={16} />,
        run: () => {
          setActivePage(p.id);
          nav("/pages");
        },
      })),
    [pages, setActivePage, nav]
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const all = [...baseCmds, ...pageCmds];
    if (!q) return baseCmds;
    return all.filter((c) => c.label.toLowerCase().includes(q));
  }, [baseCmds, pageCmds, q]);

  // La opción de preguntar a ZERO siempre está al final si hay texto.
  const askEnabled = q.length > 1;
  const total = filtered.length + (askEnabled ? 1 : 0);

  async function askZero() {
    if (!query.trim()) return;
    setAsking(true);
    setAnswer("");
    try {
      const res = await runAgent(query.trim(), []);
      setAnswer(res.text);
    } catch (e) {
      setAnswer(`⚠️ ${(e as Error).message}`);
    } finally {
      setAsking(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(total, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + Math.max(total, 1)) % Math.max(total, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < filtered.length) filtered[active]?.run();
      else if (askEnabled) askZero();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onClick={close}>
      <div
        className="zero-pop w-full max-w-xl overflow-hidden rounded-xl border bg-card shadow-2xl"
        style={{ transformOrigin: "top center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <Search size={16} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar o preguntarle a ZERO…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] text-muted sm:inline">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onClick={c.run}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                active === i ? "bg-bg-subtle text-ink" : "text-ink/80"
              }`}
            >
              <span className="text-muted">{c.icon}</span>
              <span className="flex-1 truncate">{c.label}</span>
              {c.hint && <span className="text-[10px] text-muted">{c.hint}</span>}
            </button>
          ))}

          {askEnabled && (
            <button
              onClick={askZero}
              onMouseEnter={() => setActive(filtered.length)}
              className={`flex w-full items-center gap-2.5 border-t px-3 py-2 text-left text-sm ${
                active === filtered.length ? "bg-bg-subtle" : ""
              }`}
            >
              <span className="text-accent">
                {asking ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              </span>
              <span className="flex-1 truncate text-ink">
                Preguntar a ZERO: <span className="text-muted">“{query}”</span>
              </span>
              <CornerDownLeft size={13} className="text-muted" />
            </button>
          )}

          {filtered.length === 0 && !askEnabled && (
            <p className="px-3 py-6 text-center text-sm text-muted">Sin resultados.</p>
          )}
        </div>

        {(asking || answer) && (
          <div className="max-h-48 overflow-y-auto border-t bg-bg-subtle px-3 py-2.5 text-sm text-ink">
            {asking ? (
              <span className="flex items-center gap-2 text-muted">
                <Loader2 size={14} className="animate-spin" /> ZERO está pensando…
              </span>
            ) : (
              <p className="whitespace-pre-wrap">{answer}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
