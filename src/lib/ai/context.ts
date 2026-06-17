// Construye el "snapshot" del banco de datos de Zero Agency que se envía al
// asistente como contexto. Todo ocurre en el cliente (tiene acceso al store de
// Zustand y a los tokens de los conectores); el texto resultante viaja a /api/ai.

import type { Block, EmailItem, WorkspacePage } from "@/lib/types";
import { ghFetchAll } from "@/lib/connectors/github";
import { gmailFetchInbox, driveList } from "@/lib/connectors/google";
import { tgGetMe } from "@/lib/connectors/telegram";
import {
  GMAIL_SCOPE,
  DRIVE_SCOPE,
  CALENDAR_SCOPE,
  googleTokenValid,
  type GithubConfig,
  type GoogleConfig,
  type TelegramConfig,
} from "@/lib/connectors/store";

// Límite defensivo para no inflar el prompt si el workspace crece mucho.
const MAX_PAGES = 40;
const MAX_BLOCKS_PER_PAGE = 80;
const MAX_EMAILS = 30;

function blockToText(b: Block): string {
  const c = b.content.trim();
  switch (b.type) {
    case "heading1":
      return `# ${c}`;
    case "heading2":
      return `## ${c}`;
    case "heading3":
      return `### ${c}`;
    case "todo":
      return `- [${b.checked ? "x" : " "}] ${c}`;
    case "bulleted":
      return `- ${c}`;
    case "numbered":
      return `1. ${c}`;
    case "quote":
      return `> ${c}`;
    case "callout":
      return `📌 ${c}`;
    case "code":
      return c ? `\`\`\`\n${c}\n\`\`\`` : "";
    case "divider":
      return "---";
    case "page":
      return `↳ (subpágina) ${c}`;
    case "embed-github":
    case "embed-gmail":
    case "embed-drive":
    case "embed-telegram":
      return `[bloque en vivo: ${b.type.replace("embed-", "")}]`;
    default:
      return c;
  }
}

function pageToText(page: WorkspacePage, pages: WorkspacePage[]): string {
  const parent = page.parentId ? pages.find((p) => p.id === page.parentId) : null;
  const head = `${page.icon} ${page.title}${parent ? ` (subpágina de "${parent.title}")` : ""}`;
  const body = page.blocks
    .slice(0, MAX_BLOCKS_PER_PAGE)
    .map(blockToText)
    .filter(Boolean)
    .join("\n");
  return `${head}\n${body}`;
}

export function buildWorkspaceContext(pages: WorkspacePage[]): string {
  if (!pages.length) return "";
  const body = pages
    .slice(0, MAX_PAGES)
    .map((p) => pageToText(p, pages))
    .join("\n\n———\n\n");
  return `## WORKSPACE (páginas / proyectos)\n\n${body}`;
}

export function buildEmailContext(emails: EmailItem[]): string {
  if (!emails.length) return "";
  const body = emails
    .slice(0, MAX_EMAILS)
    .map((e) => {
      const flags = [e.priority, e.category, e.unread ? "no leído" : "leído"].join(" · ");
      const action = e.actionItem ? `\n  → Acción: ${e.actionItem}` : "";
      return `- [${flags}] "${e.subject}" — de ${e.senderName} (${e.date})\n  ${e.snippet}${action}`;
    })
    .join("\n");
  return `## CORREOS (bandeja de la agencia)\n\n${body}`;
}

// ── Conectores: estado base + captura en vivo (best-effort) ──────

export interface LiveConnectorInput {
  github: GithubConfig;
  telegram: TelegramConfig;
  google: GoogleConfig;
}

export async function buildConnectorsContext(cfg: LiveConnectorInput): Promise<string> {
  const lines: string[] = ["## CONECTORES"];

  // Estado real derivado de la configuración actual (sin datos de ejemplo).
  const status = (ok: boolean) => (ok ? "conectado" : "sin conectar");
  lines.push(
    `- Gmail — ${status(googleTokenValid(cfg.google, GMAIL_SCOPE))}`,
    `- Google Drive — ${status(googleTokenValid(cfg.google, DRIVE_SCOPE))}`,
    `- Google Calendar — ${status(googleTokenValid(cfg.google, CALENDAR_SCOPE))}`,
    `- GitHub — ${status(!!cfg.github.account || !!cfg.github.token)}${cfg.github.account ? ` (@${cfg.github.account})` : ""}`,
    `- Telegram — ${status(!!cfg.telegram.botToken)}`
  );

  // Captura en vivo en paralelo; cada fuente falla de forma aislada.
  const live = await Promise.allSettled([
    cfg.github.token || cfg.github.account
      ? ghFetchAll(cfg.github.account, cfg.github.token).then((d) => {
          const repos = d.repos
            .slice(0, 10)
            .map((r) => `${r.full_name} (${r.language ?? "?"}, ${r.open_issues_count} issues)`)
            .join("; ");
          return `GitHub EN VIVO — ${d.repos.length} repos. Top: ${repos}`;
        })
      : Promise.reject("github sin configurar"),
    googleTokenValid(cfg.google, GMAIL_SCOPE)
      ? gmailFetchInbox(cfg.google.accessToken, 10).then(
          (m) => `Gmail EN VIVO — ${m.length} correos recientes: ${m.map((e) => e.subject).join(" | ")}`,
        )
      : Promise.reject("gmail sin token"),
    googleTokenValid(cfg.google, DRIVE_SCOPE)
      ? driveList(cfg.google.accessToken, 10).then(
          (f) => `Drive EN VIVO — ${f.length} elementos: ${f.map((x) => x.name).join(" | ")}`,
        )
      : Promise.reject("drive sin token"),
    cfg.telegram.botToken
      ? tgGetMe(cfg.telegram.botToken).then((b) => `Telegram EN VIVO — bot @${b.username} activo`)
      : Promise.reject("telegram sin token"),
  ]);

  const liveLines = live
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => `- ${r.value}`);
  if (liveLines.length) lines.push("", "Datos en vivo:", ...liveLines);

  return lines.join("\n");
}

/** Ensambla el contexto completo. Las secciones vacías se omiten. */
export async function buildFullContext(args: {
  pages: WorkspacePage[];
  emails: EmailItem[];
  connectors: LiveConnectorInput;
}): Promise<string> {
  const [connectors] = await Promise.all([buildConnectorsContext(args.connectors)]);
  const sections = [
    "Este es el banco de datos actual de Zero Agency. Úsalo como única fuente de verdad:",
    buildWorkspaceContext(args.pages),
    buildEmailContext(args.emails),
    connectors,
  ].filter(Boolean);
  return sections.join("\n\n");
}
