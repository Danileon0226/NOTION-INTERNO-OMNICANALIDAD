"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, Search, Moon, Sun } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationsBell } from "@/components/NotificationsBell";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { AutonomyDaemon } from "@/components/anticipation/AutonomyDaemon";
import { MonitorDaemon } from "@/components/monitor/MonitorDaemon";
import { BriefingDaemon } from "@/components/BriefingDaemon";
import { ReportsDaemon } from "@/components/ReportsDaemon";
import { DataBankDaemon } from "@/components/DataBankDaemon";
import { useTheme, applyTheme } from "@/lib/theme";
import { useCommandPalette } from "@/lib/ui/commandPalette";
import zeroMark from "@/brand/zero-mark.png";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);
  const openPalette = useCommandPalette((s) => s.setOpen);

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
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <button
              onClick={() => openPalette(true)}
              className="rounded-md p-1.5 text-muted hover:bg-bg-subtle hover:text-ink"
              aria-label="Buscar o comando"
            >
              <Search size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-md p-1.5 text-muted hover:bg-bg-subtle hover:text-ink"
              aria-label="Cambiar tema"
            >
              {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-bg">
          <div key={pathname} className="zero-page-enter h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Paleta de comandos global (⌘K / Ctrl+K) */}
      <CommandPalette />

      {/* Centro de notificaciones */}
      <NotificationsPanel />

      {/* Demonio de autonomía: ZERO actúa solo (con guardrails) */}
      <AutonomyDaemon />

      {/* Demonio de monitoreo del sitio web de la agencia */}
      <MonitorDaemon />

      {/* Demonio del briefing programado */}
      <BriefingDaemon />

      {/* Demonio de reportes diarios/semanales/mensuales */}
      <ReportsDaemon />

      {/* Banco de datos caliente para acceso instantáneo del agente */}
      <DataBankDaemon />

      {/* Copiloto "Zero" — flotante en cualquier pantalla */}
      <AssistantPanel />
    </div>
  );
}
