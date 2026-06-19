"use client";

// Control de acceso por roles (multi-tenant por rol).
// La app es client-side/estática: cada navegador ya aísla sus propios datos.
// El rol define QUÉ módulos ve y a qué rutas puede entrar cada persona.

export type Role = "admin" | "comercial" | "dev";

export interface RoleMeta {
  id: Role;
  label: string;
  desc: string;
  badge: string; // color de acento del badge (clases Tailwind)
}

export const ROLES: Record<Role, RoleMeta> = {
  admin: {
    id: "admin",
    label: "Administrador",
    desc: "Acceso total: configuración, autonomía y todos los módulos.",
    badge: "bg-accent/15 text-accent",
  },
  comercial: {
    id: "comercial",
    label: "Chief Comercial",
    desc: "Comercial, clientes, comunicación y reportes.",
    badge: "bg-emerald-500/15 text-emerald-500",
  },
  dev: {
    id: "dev",
    label: "Desarrollador",
    desc: "Técnico: proyectos, automatización y monitoreo.",
    badge: "bg-sky-500/15 text-sky-500",
  },
};

export const ROLE_LIST: RoleMeta[] = [ROLES.admin, ROLES.comercial, ROLES.dev];

export function roleMeta(role: Role): RoleMeta {
  return ROLES[role] ?? ROLES.admin;
}

// Rutas permitidas por rol ("*" = todas). Las rutas de marketing ("/", "/docs")
// son públicas y se manejan aparte en el AppShell.
const ROUTES: Record<Role, string[]> = {
  admin: ["*"],
  comercial: [
    "/dashboard",
    "/anticipation",
    "/assistant",
    "/zero",
    "/memory",
    "/inbox",
    "/calendar",
    "/drive",
    "/monitor",
    "/reports",
    "/runs",
    "/pages",
    "/connectors",
  ],
  dev: [
    "/dashboard",
    "/anticipation",
    "/assistant",
    "/zero",
    "/memory",
    "/canvas",
    "/drive",
    "/monitor",
    "/orquestacion",
    "/reports",
    "/runs",
    "/pages",
    "/connectors",
  ],
};

/** ¿Puede este rol entrar a esta ruta? (sin overrides por usuario) */
export function canAccess(role: Role, path: string): boolean {
  const allowed = ROUTES[role] ?? [];
  if (allowed.includes("*")) return true;
  return allowed.some((r) => path === r || path.startsWith(`${r}/`));
}

/** Lista de rutas permitidas (para filtrar la navegación). */
export function allowedRoutes(role: Role): string[] | "*" {
  const allowed = ROUTES[role] ?? [];
  return allowed.includes("*") ? "*" : allowed;
}

// Módulos cuyo acceso el admin puede activar/desactivar por persona.
export interface ModuleDef {
  href: string;
  label: string;
}

export const MODULES: ModuleDef[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/anticipation", label: "Anticipación" },
  { href: "/assistant", label: "Asistente IA" },
  { href: "/zero", label: "ZERO (voz)" },
  { href: "/memory", label: "Memoria" },
  { href: "/inbox", label: "Bandeja" },
  { href: "/calendar", label: "Calendario" },
  { href: "/drive", label: "Drive" },
  { href: "/canvas", label: "Canvas / Grafo" },
  { href: "/monitor", label: "Monitoreo web" },
  { href: "/autopilot", label: "Piloto automático" },
  { href: "/orquestacion", label: "Orquestación" },
  { href: "/reports", label: "Reportes" },
  { href: "/runs", label: "Actividad agéntica" },
  { href: "/connectors", label: "Conectores" },
  { href: "/setup", label: "Estado de configuración" },
];

/** Primer segmento de la ruta (p. ej. "/inbox/123" → "/inbox"). */
function segOf(path: string): string {
  return `/${path.split("/")[1] || ""}`;
}

/**
 * Acceso efectivo: el override por usuario (si existe para ese módulo) manda
 * sobre el permiso por rol. El panel de administración es siempre solo-admin.
 */
// Páginas de cuenta personales: accesibles para cualquier sesión autenticada.
const ALWAYS_ALLOWED = ["/profile", "/progreso"];

export function canAccessWith(role: Role, path: string, overrides?: Record<string, boolean>): boolean {
  const seg = segOf(path);
  if (seg === "/team") return role === "admin"; // consola de administración
  if (ALWAYS_ALLOWED.includes(seg)) return true;
  if (overrides && seg in overrides) return overrides[seg];
  return canAccess(role, path);
}
