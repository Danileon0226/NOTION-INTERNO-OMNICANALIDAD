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
    "/reports",
    "/runs",
    "/pages",
    "/connectors",
  ],
};

/** ¿Puede este rol entrar a esta ruta? */
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
