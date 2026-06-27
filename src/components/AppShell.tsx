"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Menu, Search, Moon, Sun, ShieldAlert, Clock, LogOut } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { SileoBell } from "@/components/sileo/SileoBell";
import { SileoPanel } from "@/components/sileo/SileoPanel";
import { SileoToast } from "@/components/sileo/SileoToast";
import { SileoDaemon } from "@/components/sileo/SileoDaemon";
import { HandsFree } from "@/components/voice/HandsFree";
import { AutonomyDaemon } from "@/components/anticipation/AutonomyDaemon";
import { MonitorDaemon } from "@/components/monitor/MonitorDaemon";
import { BriefingDaemon } from "@/components/BriefingDaemon";
import { ReportsDaemon } from "@/components/ReportsDaemon";
import { DataBankDaemon } from "@/components/DataBankDaemon";
import { ProgressDaemon } from "@/components/gamification/ProgressDaemon";
import { Celebration } from "@/components/gamification/Celebration";
import { LevelChip } from "@/components/gamification/LevelHud";
import { LoginGate } from "@/components/LoginGate";
import { AuthListener } from "@/components/AuthListener";
import { Onboarding } from "@/components/Onboarding";
import { PWA } from "@/components/PWA";
import { useTheme, applyTheme } from "@/lib/theme";
import { useCommandPalette } from "@/lib/ui/commandPalette";
import { canAccessWith, roleMeta } from "@/lib/rbac";
import { authMode, useAccount, signOutAccount } from "@/lib/account";
import { usePrefs, applyPrefs } from "@/lib/prefs";
import { track } from "@/lib/firebase/track";
import zeroMark from "@/brand/zero-mark.png";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);
  const openPalette = useCommandPalette((s) => s.setOpen);
  const account = useAccount();
  const lockMinutes = usePrefs((s) => s.lockMinutes);
  const prefsAccent = usePrefs((s) => s.accent);
  const prefsScale = usePrefs((s) => s.scale);
  const prefsMotion = usePrefs((s) => s.reduceMotion);
  const prefsContrast = usePrefs((s) => s.highContrast);

  // Aplica el tema persistido al cargar y cuando cambia.
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Aplica las preferencias de personalización/accesibilidad.
  useEffect(() => {
    applyPrefs();
  }, [prefsAccent, prefsScale, prefsMotion, prefsContrast]);

  // Evita flash/mismatch del login antes de rehidratar el estado persistido.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloqueo por inactividad (seguridad): cierra sesión tras N min sin actividad.
  useEffect(() => {
    if (authMode === "open" || lockMinutes <= 0 || !account.authed) return;
    let last = Date.now();
    const touch = () => (last = Date.now());
    const evs = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "visibilitychange"] as const;
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const id = setInterval(() => {
      if (Date.now() - last >= lockMinutes * 60_000) {
        clearInterval(id);
        void signOutAccount();
      }
    }, 15_000);
    return () => {
      clearInterval(id);
      evs.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [lockMinutes, account.authed]);

  // Seguimiento de navegación por persona (best-effort; solo con Firebase).
  useEffect(() => {
    if (account.authed && account.enabled) track("view", `Vista: ${pathname}`, pathname);
  }, [pathname, account.authed, account.enabled]);

  // Rutas de marketing: a pantalla completa, sin el shell de la app.
  const isMarketing = pathname === "/" || pathname.startsWith("/docs");
  if (isMarketing) {
    return (
      <div key={pathname} className="zero-page-enter min-h-screen bg-transparent">
        {children}
      </div>
    );
  }

  // ── Puerta de acceso (Firebase, clave o abierto) ──
  const gate = (() => {
    if (authMode === "open") return null;
    if (!mounted || account.status === "loading") return <Splash />;
    if (account.status === "anon") return <LoginGate />;
    if (!account.enabled) return <PendingScreen name={account.name} email={account.email} />;
    if (!canAccessWith(account.role, pathname, account.modules)) return <Restricted role={account.role} />;
    return null;
  })();

  return (
    <>
      <AuthListener />
      <PWA />
      {gate ?? (
        <div className="flex h-screen w-screen overflow-hidden">
          <a href="#main" className="skip-link">
            Saltar al contenido
          </a>
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
            <div className="glass-bar sticky top-0 z-20 flex items-center gap-2 border-b px-3 py-2 lg:hidden">
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
                <LevelChip />
                <SileoBell />
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

            <main id="main" className="flex-1 overflow-y-auto bg-transparent">
              <div key={pathname} className="zero-page-enter h-full">
                {children}
              </div>
            </main>
          </div>

          {/* Paleta de comandos global (⌘K / Ctrl+K) */}
          <CommandPalette />

          {/* SILEO · centro de notificaciones internas */}
          <SileoPanel />
          <SileoToast />
          <SileoDaemon />

          {/* Manos libres global: di "Zero" para hablarle desde cualquier pantalla */}
          <HandsFree />

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

          {/* Gamificación: progreso/XP/racha + celebraciones inmersivas */}
          <ProgressDaemon />
          <Celebration />

          {/* Copiloto "Zero" — flotante en cualquier pantalla */}
          <AssistantPanel />

          {/* Bienvenida de primer arranque (se ve una sola vez) */}
          <Onboarding />
        </div>
      )}
    </>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="zero-monogram h-12 w-12 animate-pulse text-xl">Z</span>
    </div>
  );
}

function PendingScreen({ name, email }: { name?: string; email?: string }) {
  return (
    <div className="brand-halo flex min-h-screen items-center justify-center px-4">
      <div className="surface surface-glow max-w-sm p-8 text-center">
        <Clock size={32} className="mx-auto mb-3 text-amber-500" />
        <h1 className="text-base font-semibold text-ink">Cuenta pendiente de aprobación</h1>
        <p className="mt-1.5 text-sm text-muted">
          {name ? `Hola, ${name}. ` : ""}Tu acceso está pendiente. El administrador debe aprobar tu cuenta
          {email ? <> (<span className="text-ink">{email}</span>)</> : null} para que puedas entrar.
        </p>
        <button
          onClick={() => signOutAccount()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium text-ink hover:bg-bg-subtle"
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function Restricted({ role }: { role: Parameters<typeof roleMeta>[0] }) {
  return (
    <div className="brand-halo flex min-h-screen items-center justify-center px-4">
      <div className="surface surface-glow max-w-sm p-8 text-center">
        <ShieldAlert size={32} className="mx-auto mb-3 text-accent" />
        <h1 className="text-base font-semibold text-ink">Acceso restringido</h1>
        <p className="mt-1.5 text-sm text-muted">
          Tu perfil <span className="font-medium text-ink">{roleMeta(role).label}</span> no tiene acceso a este módulo.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
