"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import zeroMark from "@/brand/zero-mark.png";
import { useWorkspace } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useCommandPalette } from "@/lib/ui/commandPalette";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AGENCY_EMAIL } from "@/lib/data/emails";
import type { WorkspacePage } from "@/lib/types";
import {
  LayoutDashboard,
  Plug,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Mail,
  Search,
  Activity,
  Bot,
  Mic,
  Rocket,
  Calendar,
  FolderOpen,
  Moon,
  Sun,
  Radar,
  Globe,
  Brain,
} from "lucide-react";

// Navegación agrupada por intención → más fácil de escanear.
const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: React.ReactNode }[] }[] = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      { href: "/anticipation", label: "Anticipación", icon: <Radar size={16} /> },
      { href: "/assistant", label: "Asistente IA", icon: <Bot size={16} /> },
      { href: "/zero", label: "ZERO (voz)", icon: <Mic size={16} /> },
      { href: "/memory", label: "Memoria", icon: <Brain size={16} /> },
    ],
  },
  {
    label: "Datos",
    items: [
      { href: "/inbox", label: "Bandeja", icon: <Mail size={16} /> },
      { href: "/calendar", label: "Calendario", icon: <Calendar size={16} /> },
      { href: "/drive", label: "Drive", icon: <FolderOpen size={16} /> },
      { href: "/canvas", label: "Canvas / Grafo", icon: <Activity size={16} /> },
      { href: "/monitor", label: "Monitoreo web", icon: <Globe size={16} /> },
    ],
  },
  {
    label: "Automatización",
    items: [
      { href: "/autopilot", label: "Piloto automático", icon: <Rocket size={16} /> },
      { href: "/connectors", label: "Conectores", icon: <Plug size={16} /> },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const pages = useWorkspace((s) => s.pages);
  const activePageId = useWorkspace((s) => s.activePageId);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const createPage = useWorkspace((s) => s.createPage);
  const createSubpage = useWorkspace((s) => s.createSubpage);
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);
  const openPalette = useCommandPalette((s) => s.setOpen);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const roots = pages.filter((p) => p.parentId === null);

  function openPage(id: string) {
    setActivePage(id);
    router.push("/pages");
    onNavigate?.();
  }
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <Image src={zeroMark} alt="ZERO AGENCY" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg" priority />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide text-ink">ZERO AGENCY</div>
          <div className="text-[11px] text-muted">OS Omnicanal</div>
        </div>
        <NotificationsBell className="ml-auto" />
      </div>

      {/* Comando global: descubrible (no solo ⌘K) */}
      <div className="px-3 pb-2">
        <button
          onClick={() => openPalette(true)}
          className="flex w-full items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-sm text-muted hover:border-accent/40 hover:text-ink"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Buscar o preguntar…</span>
          <kbd className="rounded border px-1 py-0.5 text-[9px]">⌘K</kbd>
        </button>
      </div>

      <nav className="space-y-3 px-2 pb-1">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/70">{g.label}</p>
            {g.items.map((it) => (
              <NavLink
                key={it.href}
                href={it.href}
                active={pathname === it.href}
                icon={it.icon}
                onClick={onNavigate}
              >
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-4 flex items-center justify-between px-4 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Workspace</span>
        <button
          onClick={() => {
            createPage(null);
            router.push("/pages");
            onNavigate?.();
          }}
          className="rounded p-0.5 text-muted hover:bg-bg-subtle hover:text-ink"
          title="Nueva página"
        >
          <Plus size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {roots.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted">Sin páginas todavía.</p>
        ) : (
          roots.map((p) => (
            <Tree
              key={p.id}
              page={p}
              pages={pages}
              depth={0}
              expanded={expanded}
              activeId={activePageId}
              isPages={pathname === "/pages"}
              onOpen={openPage}
              onToggle={toggle}
              onAddChild={(pid) => {
                const child = createSubpage(pid, null);
                setExpanded((s) => new Set(s).add(pid));
                openPage(child);
              }}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted">
        <span className="flex min-w-0 items-center gap-1">
          <FileText size={12} className="shrink-0" />
          <span className="truncate">{AGENCY_EMAIL || "Zero Agency OS"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <kbd className="hidden rounded border px-1 py-0.5 text-[9px] sm:inline">⌘K</kbd>
          <button
            onClick={toggleTheme}
            title={mode === "dark" ? "Modo claro" : "Modo oscuro"}
            className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-ink"
          >
            {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </span>
      </div>
    </aside>
  );
}

function Tree({
  page,
  pages,
  depth,
  expanded,
  activeId,
  isPages,
  onOpen,
  onToggle,
  onAddChild,
}: {
  page: WorkspacePage;
  pages: WorkspacePage[];
  depth: number;
  expanded: Set<string>;
  activeId: string;
  isPages: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
}) {
  const children = pages.filter((p) => p.parentId === page.id);
  const isExpanded = expanded.has(page.id);
  return (
    <>
      <Item
        page={page}
        depth={depth}
        active={activeId === page.id && isPages}
        hasChildren={children.length > 0}
        isExpanded={isExpanded}
        onOpen={() => onOpen(page.id)}
        onToggle={() => onToggle(page.id)}
        onAddChild={() => onAddChild(page.id)}
      />
      {isExpanded &&
        children.map((c) => (
          <Tree
            key={c.id}
            page={c}
            pages={pages}
            depth={depth + 1}
            expanded={expanded}
            activeId={activeId}
            isPages={isPages}
            onOpen={onOpen}
            onToggle={onToggle}
            onAddChild={onAddChild}
          />
        ))}
    </>
  );
}

function Item({
  page,
  depth,
  active,
  hasChildren,
  isExpanded,
  onOpen,
  onToggle,
  onAddChild,
}: {
  page: WorkspacePage;
  depth: number;
  active: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onAddChild: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-0.5 rounded-md pr-1 text-sm ${
        active ? "bg-bg-subtle font-medium text-ink" : "text-ink/80 hover:bg-bg-subtle"
      }`}
      style={{ paddingLeft: depth * 12 }}
    >
      <button
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:bg-border ${
          hasChildren ? "" : "invisible"
        }`}
      >
        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left">
        <span className="text-base leading-none">{page.icon}</span>
        <span className="truncate">{page.title}</span>
      </button>
      <button
        onClick={onAddChild}
        title="Añadir subpágina"
        className="shrink-0 rounded p-0.5 text-muted opacity-0 transition hover:bg-border hover:text-ink group-hover:opacity-100"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        active ? "bg-accent/10 font-medium text-accent" : "text-ink/80 hover:bg-bg-subtle hover:text-ink"
      }`}
    >
      {/* Indicador de acento del activo (microinteracción sutil) */}
      <span
        className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      <span className={active ? "text-accent" : "text-muted group-hover:text-ink"}>{icon}</span>
      {children}
    </Link>
  );
}
