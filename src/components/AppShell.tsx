"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { AutonomyDaemon } from "@/components/anticipation/AutonomyDaemon";
import { useTheme, applyTheme } from "@/lib/theme";
import zeroMark from "@/brand/zero-mark.png";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const mode = useTheme((s) => s.mode);

  // Aplica el tema persistido al cargar y cuando cambia.
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar fija en escritorio */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Drawer en móvil/tablet */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra superior móvil */}
        <div className="flex items-center gap-2 border-b bg-sidebar px-3 py-2 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-ink hover:bg-bg-subtle"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <Image src={zeroMark} alt="ZERO AGENCY" width={24} height={24} className="h-6 w-6 shrink-0 rounded-md" />
          <span className="text-sm font-semibold tracking-wide text-ink">ZERO AGENCY</span>
        </div>

        <main className="flex-1 overflow-y-auto bg-bg">
          <div key={pathname} className="zero-page-enter h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Paleta de comandos global (⌘K / Ctrl+K) */}
      <CommandPalette />

      {/* Demonio de autonomía: ZERO actúa solo (con guardrails) */}
      <AutonomyDaemon />

      {/* Copiloto "Zero" — flotante en cualquier pantalla */}
      <AssistantPanel />
    </div>
  );
}
