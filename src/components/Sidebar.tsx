"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import zeroMark from "@/brand/zero-mark.png";
import { useWorkspace } from "@/lib/store";
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
} from "lucide-react";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const pages = useWorkspace((s) => s.pages);
  const activePageId = useWorkspace((s) => s.activePageId);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const createPage = useWorkspace((s) => s.createPage);
  const createSubpage = useWorkspace((s) => s.createSubpage);
  const [query, setQuery] = useState("");
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

  const results = query
    ? pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <Image src={zeroMark} alt="ZERO AGENCY" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg" priority />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide text-ink">ZERO AGENCY</div>
          <div className="text-[11px] text-muted">OS Omnicanal</div>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5 rounded-md border bg-white px-2 py-1">
          <Search size={13} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar páginas…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <nav className="px-2">
        <NavLink href="/dashboard" active={pathname === "/dashboard"} icon={<LayoutDashboard size={16} />} onClick={onNavigate}>
          Dashboard
        </NavLink>
        <NavLink href="/assistant" active={pathname === "/assistant"} icon={<Bot size={16} />} onClick={onNavigate}>
          Asistente IA
        </NavLink>
        <NavLink href="/zero" active={pathname === "/zero"} icon={<Mic size={16} />} onClick={onNavigate}>
          ZERO (voz)
        </NavLink>
        <NavLink href="/autopilot" active={pathname === "/autopilot"} icon={<Rocket size={16} />} onClick={onNavigate}>
          Piloto automático
        </NavLink>
        <NavLink href="/canvas" active={pathname === "/canvas"} icon={<Activity size={16} />} onClick={onNavigate}>
          Canvas / Grafo
        </NavLink>
        <NavLink href="/connectors" active={pathname === "/connectors"} icon={<Plug size={16} />} onClick={onNavigate}>
          Conectores
        </NavLink>
        <NavLink href="/inbox" active={pathname === "/inbox"} icon={<Mail size={16} />} onClick={onNavigate}>
          Bandeja
        </NavLink>
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
        {query ? (
          results.length ? (
            results.map((p) => (
              <Item
                key={p.id}
                page={p}
                depth={0}
                active={activePageId === p.id && pathname === "/pages"}
                hasChildren={false}
                isExpanded={false}
                onOpen={() => openPage(p.id)}
                onToggle={() => {}}
                onAddChild={() => {}}
              />
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-muted">Sin resultados.</p>
          )
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

      <div className="border-t px-4 py-2.5 text-[11px] text-muted">
        <FileText size={12} className="mr-1 inline" />
        {AGENCY_EMAIL || "Zero Agency OS"}
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
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        active ? "bg-bg-subtle font-medium text-ink" : "text-ink/80 hover:bg-bg-subtle"
      }`}
    >
      <span className="text-muted">{icon}</span>
      {children}
    </Link>
  );
}
