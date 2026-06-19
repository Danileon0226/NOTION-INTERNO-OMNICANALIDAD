"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import zeroMark from "@/brand/zero-mark.png";
import { useWorkspace } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useCommandPalette } from "@/lib/ui/commandPalette";
import { canAccessWith, roleMeta } from "@/lib/rbac";
import { authMode, useAccount, signOutAccount } from "@/lib/account";
import { NotificationsBell } from "@/components/NotificationsBell";
import { LevelHud } from "@/components/gamification/LevelHud";
import type { WorkspacePage } from "@/lib/types";
import {
  LayoutDashboard,
  Plug,
  BookOpen,
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
  History,
  FileBarChart,
  ShieldCheck,
  LogOut,
  Users,
  UserCircle,
  UserPlus,
  Workflow,
  Trophy,
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
      { href: "/leads", label: "Leads", icon: <UserPlus size={16} /> },
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
      { href: "/orquestacion", label: "Orquestación", icon: <Workflow size={16} /> },
      { href: "/reports", label: "Reportes", icon: <FileBarChart size={16} /> },
      { href: "/runs", label: "Actividad agéntica", icon: <History size={16} /> },
      { href: "/connectors", label: "Conectores", icon: <Plug size={16} /> },
      { href: "/setup", label: "Estado de configuración", icon: <ShieldCheck size={16} /> },
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
  const account = useAccount();
  const role = account.role;
  const userName = account.name;
  const photoURL = account.photoURL;
  const showIdentity = authMode !== "open";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const roots = pages.filter((p) => p.parentId === null);

  // Navegación filtrada por rol + overrides por usuario: cada perfil ve solo sus módulos.
  const navGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => canAccessWith(role, it.href, account.modules)),
  })).filter((g) => g.items.length > 0);

  // Grupo de cuenta: progreso (todos), perfil (con login) y, para admin, equipo.
  const accountItems: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: "/progreso", label: "Progreso", icon: <Trophy size={16} /> },
  ];
  if (authMode === "firebase") accountItems.push({ href: "/profile", label: "Mi perfil", icon: <UserCircle size={16} /> });
  if (role === "admin") accountItems.push({ href: "/team", label: "Equipo", icon: <Users size={16} /> });
  navGroups.push({ label: "Cuenta", items: accountItems });

  const rm = roleMeta(role);

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
    <aside className="glass-bar flex h-full w-64 shrink-0 flex-col border-r">
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
          className="flex w-full items-center gap-2 rounded-lg border glass-card px-2.5 py-1.5 text-sm text-muted hover:border-accent/40 hover:text-ink"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Buscar o preguntar…</span>
          <kbd className="rounded border px-1 py-0.5 text-[9px]">⌘K</kbd>
        </button>
      </div>

      {/* Zona desplazable: navegación + workspace (clave para móvil) */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <nav className="space-y-3 px-2 pb-1">
          {navGroups.map((g) => (
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

        <div className="px-2 pb-4">
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
      </div>

      {/* HUD de nivel/XP (gamificación) */}
      <LevelHud />

      {/* Identidad y rol de la sesión */}
      {showIdentity && (
        <Link href={authMode === "firebase" ? "/profile" : "#"} className="flex items-center gap-2 border-t px-3 py-2 hover:bg-bg-subtle">
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt={userName} className="h-7 w-7 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="zero-monogram h-7 w-7 text-[11px]">{(userName || "Z").charAt(0).toUpperCase()}</span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-medium text-ink">{userName || "Sesión"}</div>
            <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${rm.badge}`}>{rm.label}</span>
          </div>
        </Link>
      )}

      <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted">
        <Link href="/docs" className="flex min-w-0 items-center gap-1 hover:text-ink">
          <BookOpen size={12} className="shrink-0" />
          <span className="truncate">Documentación</span>
        </Link>
        <span className="flex shrink-0 items-center gap-1">
          <kbd className="hidden rounded border px-1 py-0.5 text-[9px] sm:inline">⌘K</kbd>
          <button
            onClick={toggleTheme}
            title={mode === "dark" ? "Modo claro" : "Modo oscuro"}
            className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-ink"
          >
            {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {showIdentity && (
            <button onClick={() => signOutAccount()} title="Salir" className="rounded p-1 text-muted hover:bg-bg-subtle hover:text-red-500">
              <LogOut size={14} />
            </button>
          )}
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
