"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { AGENCY_EMAIL } from "@/lib/data/emails";
import {
  LayoutDashboard,
  Plug,
  FileText,
  Plus,
  ChevronRight,
  Mail,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const pages = useWorkspace((s) => s.pages);
  const activePageId = useWorkspace((s) => s.activePageId);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const createPage = useWorkspace((s) => s.createPage);

  const rootPages = pages.filter((p) => p.parentId === null);

  function openPage(id: string) {
    setActivePage(id);
    router.push("/pages");
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
          Z
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">Zero Agency OS</div>
          <div className="text-[11px] text-muted">Omnicanal · Interno</div>
        </div>
      </div>

      <nav className="px-2">
        <NavLink href="/dashboard" active={pathname === "/dashboard"} icon={<LayoutDashboard size={16} />}>
          Dashboard
        </NavLink>
        <NavLink href="/connectors" active={pathname === "/connectors"} icon={<Plug size={16} />}>
          Conectores
        </NavLink>
        <NavLink href="/inbox" active={pathname === "/inbox"} icon={<Mail size={16} />}>
          Bandeja
        </NavLink>
      </nav>

      <div className="mt-4 flex items-center justify-between px-4 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Workspace
        </span>
        <button
          onClick={() => {
            createPage(null);
            router.push("/pages");
          }}
          className="rounded p-0.5 text-muted hover:bg-bg-subtle hover:text-ink"
          title="Nueva página"
        >
          <Plus size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {rootPages.map((p) => {
          const active = pathname === "/pages" && activePageId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => openPage(p.id)}
              className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm ${
                active ? "bg-bg-subtle font-medium text-ink" : "text-ink/80 hover:bg-bg-subtle"
              }`}
            >
              <ChevronRight size={13} className="text-muted" />
              <span className="text-base leading-none">{p.icon}</span>
              <span className="truncate">{p.title}</span>
            </button>
          );
        })}
      </div>

      <div className="border-t px-4 py-2.5 text-[11px] text-muted">
        <FileText size={12} className="mr-1 inline" />
        {AGENCY_EMAIL}
      </div>
    </aside>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        active ? "bg-bg-subtle font-medium text-ink" : "text-ink/80 hover:bg-bg-subtle"
      }`}
    >
      <span className="text-muted">{icon}</span>
      {children}
    </Link>
  );
}
