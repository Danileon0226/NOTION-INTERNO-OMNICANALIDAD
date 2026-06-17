// Cliente de la API REST de GitHub (100% del lado del cliente).
// Funciona sin token para datos públicos; con token (PAT) accede a repos
// privados y eleva el límite de peticiones.

const API = "https://api.github.com";

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(token) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `GitHub ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  public_repos: number;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  open_issues_count: number;
  language: string | null;
  private: boolean;
  pushed_at: string;
}

export interface GithubSearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  repository_url: string;
  created_at: string;
  pull_request?: unknown;
}

export interface GithubData {
  user: GithubUser | null;
  repos: GithubRepo[];
  openPRs: number;
  openIssues: number;
  pulls: GithubSearchItem[];
}

/** Valida el token / cuenta y devuelve el usuario autenticado o el indicado. */
export async function ghValidate(account: string, token?: string): Promise<GithubUser> {
  if (token && !account) return gh<GithubUser>("/user", token);
  return gh<GithubUser>(`/users/${encodeURIComponent(account)}`, token);
}

export async function ghFetchAll(account: string, token?: string): Promise<GithubData> {
  const user = account
    ? await gh<GithubUser>(`/users/${encodeURIComponent(account)}`, token).catch(() => null)
    : token
      ? await gh<GithubUser>("/user", token).catch(() => null)
      : null;

  const owner = account || user?.login || "";
  const repos = owner
    ? await gh<GithubRepo[]>(
        `/users/${encodeURIComponent(owner)}/repos?sort=pushed&per_page=8`,
        token
      ).catch(() => [])
    : [];

  let openPRs = 0;
  let openIssues = 0;
  let pulls: GithubSearchItem[] = [];
  if (owner) {
    const prSearch = await gh<{ total_count: number; items: GithubSearchItem[] }>(
      `/search/issues?q=${encodeURIComponent(`is:pr is:open user:${owner}`)}&per_page=6`,
      token
    ).catch(() => null);
    if (prSearch) {
      openPRs = prSearch.total_count;
      pulls = prSearch.items;
    }
    const issueSearch = await gh<{ total_count: number }>(
      `/search/issues?q=${encodeURIComponent(`is:issue is:open user:${owner}`)}&per_page=1`,
      token
    ).catch(() => null);
    if (issueSearch) openIssues = issueSearch.total_count;
  }

  return { user, repos, openPRs, openIssues, pulls };
}

export function repoFromUrl(url: string): string {
  return url.replace("https://api.github.com/repos/", "");
}

// ── Acciones extra (commits / crear issue) ───────────────────

export interface GithubCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author?: { name?: string; date?: string } };
}

/** Últimos commits de un repo "owner/name". */
export async function ghCommits(repo: string, token?: string): Promise<GithubCommit[]> {
  return gh<GithubCommit[]>(`/repos/${repo}/commits?per_page=8`, token);
}

/** Crea un issue (requiere token con permiso de escritura). */
export async function ghCreateIssue(
  repo: string,
  title: string,
  body: string,
  token: string
): Promise<{ number: number; html_url: string }> {
  const res = await fetch(`${API}/repos/${repo}/issues`, {
    method: "POST",
    headers: { ...(headers(token) as Record<string, string>), "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { message?: string }).message || `GitHub ${res.status}`);
  }
  const d = (await res.json()) as { number: number; html_url: string };
  return { number: d.number, html_url: d.html_url };
}
