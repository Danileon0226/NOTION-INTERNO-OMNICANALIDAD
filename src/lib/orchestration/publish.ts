"use client";

import type { GenFile } from "@/lib/orchestration/files";

// Publica el proyecto generado en GitHub con UN solo commit limpio, usando la
// Git Data API (blobs → tree → commit → ref). Soporta repos vacíos y existentes.
// 100% del lado del cliente con el token (PAT) del conector de GitHub.

const API = "https://api.github.com";

function H(token: string): Record<string, string> {
  return { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function api<T>(path: string, token: string, init?: RequestInit, okNotFound = false): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { ...init, headers: H(token) });
  if (res.status === 404 && okNotFound) return null;
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { message?: string }).message || `GitHub ${res.status}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export interface PublishOptions {
  token: string;
  owner: string; // usuario u organización; "" = usuario autenticado
  repo: string;
  description?: string;
  private: boolean;
  branch?: string;
  message: string;
}

export interface PublishResult {
  repoFullName: string;
  htmlUrl: string;
  commitUrl: string;
  branch: string;
  filesPushed: number;
  created: boolean;
}

/** Asegura que el repo exista; lo crea si hace falta. Devuelve [fullName, created]. */
async function ensureRepo(o: PublishOptions): Promise<{ owner: string; htmlUrl: string; created: boolean }> {
  const me = await api<{ login: string }>("/user", o.token);
  const owner = o.owner.trim() || me!.login;
  const isSelf = owner.toLowerCase() === me!.login.toLowerCase();

  const existing = await api<{ html_url: string }>(`/repos/${owner}/${o.repo}`, o.token, {}, true);
  if (existing) return { owner, htmlUrl: existing.html_url, created: false };

  const body = JSON.stringify({
    name: o.repo,
    description: o.description || "",
    private: o.private,
    auto_init: false,
    has_issues: true,
  });
  const created = await api<{ html_url: string }>(isSelf ? "/user/repos" : `/orgs/${owner}/repos`, o.token, {
    method: "POST",
    body,
  });
  return { owner, htmlUrl: created!.html_url, created: true };
}

export async function publishToGithub(files: GenFile[], o: PublishOptions): Promise<PublishResult> {
  if (!o.token) throw new Error("Conecta GitHub (token) en Conectores para publicar.");
  if (!o.repo.trim()) throw new Error("Indica un nombre de repositorio.");
  if (!files.length) throw new Error("No se detectaron archivos en la propuesta.");

  const branch = (o.branch || "main").trim();
  const { owner, htmlUrl } = await ensureRepo(o);
  const repo = `${owner}/${o.repo}`;

  // Estado actual de la rama (si existe).
  const ref = await api<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/${branch}`, o.token, {}, true);
  let baseTree: string | undefined;
  let parents: string[] = [];
  if (ref) {
    parents = [ref.object.sha];
    const commit = await api<{ tree: { sha: string } }>(`/repos/${repo}/git/commits/${ref.object.sha}`, o.token);
    baseTree = commit!.tree.sha;
  }

  // Blobs (encoding utf-8: soporta unicode sin base64).
  const tree = await Promise.all(
    files.map(async (f) => {
      const blob = await api<{ sha: string }>(`/repos/${repo}/git/blobs`, o.token, {
        method: "POST",
        body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
      });
      return { path: f.path, mode: "100644" as const, type: "blob" as const, sha: blob!.sha };
    })
  );

  const newTree = await api<{ sha: string }>(`/repos/${repo}/git/trees`, o.token, {
    method: "POST",
    body: JSON.stringify(baseTree ? { base_tree: baseTree, tree } : { tree }),
  });

  const commit = await api<{ sha: string; html_url: string }>(`/repos/${repo}/git/commits`, o.token, {
    method: "POST",
    body: JSON.stringify({ message: o.message, tree: newTree!.sha, parents }),
  });

  // Crea o actualiza la rama.
  if (ref) {
    await api(`/repos/${repo}/git/refs/heads/${branch}`, o.token, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit!.sha, force: false }),
    });
  } else {
    await api(`/repos/${repo}/git/refs`, o.token, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit!.sha }),
    });
  }

  return {
    repoFullName: repo,
    htmlUrl,
    commitUrl: commit!.html_url,
    branch,
    filesPushed: files.length,
    created: !ref,
  };
}
