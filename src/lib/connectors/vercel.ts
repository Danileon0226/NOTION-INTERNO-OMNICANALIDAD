"use client";

// Cliente de la API de Vercel (lado del cliente, con token del usuario).
// Enlaza un repo de GitHub como proyecto de Vercel (queda con auto-deploy en
// cada push) y dispara un despliegue inmediato del estado actual.

const API = "https://api.vercel.com";

function q(teamId?: string): string {
  return teamId?.trim() ? `?teamId=${encodeURIComponent(teamId.trim())}` : "";
}

async function vapi<T>(path: string, token: string, teamId: string | undefined, init?: RequestInit, okConflict = false): Promise<T | null> {
  const res = await fetch(`${API}${path}${q(teamId)}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (okConflict && res.status === 409) return null; // ya existe
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const msg = (b as { error?: { message?: string } }).error?.message || `Vercel ${res.status}`;
    throw new Error(msg);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export interface VercelDeployOptions {
  token: string;
  teamId?: string;
  projectName: string; // nombre del proyecto en Vercel
  repo: string; // "owner/name" de GitHub
  branch?: string;
}

export interface VercelDeployResult {
  projectName: string;
  inspectorUrl: string; // panel del despliegue
  url: string; // dominio del despliegue
  projectUrl: string; // panel del proyecto
  alreadyExisted: boolean;
}

interface VercelProject {
  id: string;
  name: string;
  link?: { type?: string; repoId?: number; repo?: string; org?: string };
}

/** Enlaza el repo como proyecto de Vercel y despliega el estado actual. */
export async function vercelDeploy(o: VercelDeployOptions): Promise<VercelDeployResult> {
  if (!o.token) throw new Error("Conecta Vercel (token) en Conectores para desplegar.");
  const branch = (o.branch || "main").trim();
  const name = o.projectName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  // 1) Crea el proyecto enlazado al repo (Next.js autodetectado). Si ya existe (409), lo reusa.
  let project = await vapi<VercelProject>(
    "/v10/projects",
    o.token,
    o.teamId,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        framework: "nextjs",
        gitRepository: { type: "github", repo: o.repo },
      }),
    },
    true
  );

  const alreadyExisted = !project;
  if (!project) {
    project = await vapi<VercelProject>(`/v9/projects/${encodeURIComponent(name)}`, o.token, o.teamId);
  }
  if (!project) throw new Error("No se pudo crear ni leer el proyecto en Vercel.");

  const repoId = project.link?.repoId;
  const teamPart = o.teamId ? `?teamId=${encodeURIComponent(o.teamId)}` : "";
  const projectUrl = `https://vercel.com/dashboard${teamPart}`;

  // 2) Dispara un despliegue inmediato desde el repo enlazado.
  if (!repoId) {
    // El proyecto quedó enlazado: se desplegará solo en el próximo push.
    return { projectName: name, inspectorUrl: projectUrl, url: "", projectUrl, alreadyExisted };
  }

  const dep = await vapi<{ url: string; inspectorUrl?: string; id: string }>("/v13/deployments", o.token, o.teamId, {
    method: "POST",
    body: JSON.stringify({
      name,
      target: "production",
      gitSource: { type: "github", repoId, ref: branch },
    }),
  });

  return {
    projectName: name,
    inspectorUrl: dep?.inspectorUrl || projectUrl,
    url: dep?.url ? `https://${dep.url}` : "",
    projectUrl,
    alreadyExisted,
  };
}

export interface VercelUser {
  username: string;
  name?: string;
  email?: string;
}

/** Valida el token de Vercel y devuelve el usuario. */
export async function vercelWhoami(token: string, teamId?: string): Promise<VercelUser> {
  const u = await vapi<{ user?: VercelUser } & VercelUser>("/v2/user", token, teamId);
  const user = (u?.user || u) as VercelUser;
  if (!user?.username) throw new Error("Token de Vercel no válido.");
  return { username: user.username, name: user.name, email: user.email };
}

/** Enlace de importación 1-clic a Vercel (fallback sin token; el repo debe ser accesible). */
export function vercelImportUrl(repoHtmlUrl: string): string {
  return `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repoHtmlUrl)}`;
}
