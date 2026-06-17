"use client";

// Herramientas que Gemini puede invocar (function calling). Cada herramienta
// es un conector real de la plataforma; Gemini actúa como gestor único.

import {
  useConnectors,
  googleTokenValid,
  GMAIL_SCOPE,
  DRIVE_SCOPE,
  CALENDAR_SCOPE,
} from "@/lib/connectors/store";
import { gmailSearch, driveList, calendarEvents, driveReadText } from "@/lib/connectors/google";
import { ghFetchAll, ghCommits, ghCreateIssue } from "@/lib/connectors/github";
import { tgSendMessage, tgGetUpdates, alertText } from "@/lib/connectors/telegram";
import { useWorkspace } from "@/lib/store";
import { useActivity, type ActivitySource } from "@/lib/activity";
import type { Block } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Declaraciones en formato OpenAPI que entiende Gemini.
export const toolDeclarations = [
  {
    name: "gmail_search",
    description:
      "Busca correos en la bandeja real de Gmail con sintaxis Gmail (p. ej. 'is:unread', 'from:cliente', 'factura'). Devuelve asunto, remitente, fecha y categoría.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Consulta Gmail. Por defecto 'in:inbox'." } },
    },
  },
  {
    name: "drive_search",
    description: "Lista o busca archivos/carpetas en Google Drive por nombre.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Texto a buscar en el nombre (opcional)." } },
    },
  },
  {
    name: "calendar_upcoming",
    description: "Devuelve los próximos eventos del calendario de Google.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "github_overview",
    description: "Resumen de GitHub: repos, PRs e issues abiertos de un usuario/organización.",
    parameters: {
      type: "object",
      properties: { account: { type: "string", description: "Usuario u organización (opcional)." } },
    },
  },
  {
    name: "telegram_alert",
    description: "Envía una alerta/mensaje al chat de Telegram del equipo.",
    parameters: {
      type: "object",
      properties: { text: { type: "string", description: "Mensaje a enviar." } },
      required: ["text"],
    },
  },
  {
    name: "create_note",
    description: "Crea una página/nota en el workspace tipo Notion con un título y contenido.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string", description: "Contenido; cada línea es un párrafo. Usa '- ' para tareas." },
      },
      required: ["title"],
    },
  },
  {
    name: "list_notes",
    description: "Lista los títulos de las páginas existentes en el workspace.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "read_note",
    description: "Lee el contenido de una página/nota del workspace por su título.",
    parameters: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
  },
  {
    name: "append_to_note",
    description: "Añade contenido al final de una nota existente (cada línea es un párrafo; '- ' = tarea).",
    parameters: {
      type: "object",
      properties: { title: { type: "string" }, content: { type: "string" } },
      required: ["title", "content"],
    },
  },
  {
    name: "analyze_agency",
    description:
      "Analítica consolidada en tiempo real de la agencia: métricas de Gmail (no leídos, categorías), GitHub (repos/PRs/issues), Drive y Calendar de los conectores conectados. Úsala para reportes y análisis de datos.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "now",
    description: "Fecha y hora actual (para fechas, vencimientos, agendas).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "calc",
    description: "Calcula una expresión aritmética (sumas, %, etc.). Útil para finanzas y métricas.",
    parameters: {
      type: "object",
      properties: { expression: { type: "string", description: "Ej: '480*1.19' o '(240-180)/180*100'." } },
      required: ["expression"],
    },
  },
  {
    name: "search_notes",
    description: "Busca páginas del workspace por título o contenido.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "create_subpage",
    description: "Crea una subpágina dentro de una página existente (por título del padre).",
    parameters: {
      type: "object",
      properties: {
        parentTitle: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
      },
      required: ["parentTitle", "title"],
    },
  },
  {
    name: "delete_note",
    description: "Elimina una página/nota del workspace por su título exacto.",
    parameters: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
  },
  {
    name: "telegram_updates",
    description: "Lee los últimos mensajes recibidos por el bot de Telegram (para descubrir chats o leer respuestas).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "drive_read",
    description: "Lee el contenido de texto de un archivo de Drive buscado por nombre (Docs/Sheets/txt).",
    parameters: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "github_commits",
    description: "Últimos commits de un repositorio 'owner/repo'.",
    parameters: {
      type: "object",
      properties: { repo: { type: "string", description: "Formato owner/repo" } },
      required: ["repo"],
    },
  },
  {
    name: "github_create_issue",
    description: "Crea un issue en un repositorio 'owner/repo' (requiere token de GitHub con escritura).",
    parameters: {
      type: "object",
      properties: { repo: { type: "string" }, title: { type: "string" }, body: { type: "string" } },
      required: ["repo", "title"],
    },
  },
  {
    name: "create_webpage",
    description:
      "Crea una página web (landing/sitio) en el workspace. Pasa el HTML COMPLETO y autónomo (con <style> y, si hace falta, <script>). Se renderiza y se puede abrir/descargar.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        html: { type: "string", description: "Documento HTML completo (<!doctype html>…)." },
      },
      required: ["title", "html"],
    },
  },
];

function logActivity(source: ActivitySource, label: string) {
  useActivity.getState().push({ source, kind: "integrate", label, count: 0 });
}

export async function runTool(name: string, args: any): Promise<unknown> {
  const c = useConnectors.getState();
  const g = c.google;

  switch (name) {
    case "gmail_search": {
      if (!googleTokenValid(g, GMAIL_SCOPE)) return { error: "Gmail no está conectado." };
      const emails = await gmailSearch(g.accessToken, args?.query || "in:inbox", 8);
      logActivity("gmail", `Gemini buscó en Gmail: "${args?.query || "in:inbox"}"`);
      return {
        count: emails.length,
        emails: emails.map((e) => ({
          subject: e.subject,
          from: e.senderName,
          date: e.date,
          category: e.category,
          snippet: e.snippet,
        })),
      };
    }
    case "drive_search": {
      if (!googleTokenValid(g, DRIVE_SCOPE)) return { error: "Google Drive no está conectado." };
      const files = await driveList(g.accessToken, 20, { query: args?.query });
      logActivity("google-drive", `Gemini consultó Drive${args?.query ? `: "${args.query}"` : ""}`);
      return { count: files.length, files: files.map((f) => ({ name: f.name, mimeType: f.mimeType, link: f.webViewLink })) };
    }
    case "calendar_upcoming": {
      if (!googleTokenValid(g, CALENDAR_SCOPE)) return { error: "Google Calendar no está conectado." };
      const events = await calendarEvents(g.accessToken, 10);
      logActivity("ai", "Gemini revisó el calendario");
      return {
        events: events.map((e) => ({
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          location: e.location,
        })),
      };
    }
    case "github_overview": {
      const account = args?.account || c.github.account;
      if (!account && !c.github.token) return { error: "GitHub no está conectado." };
      const d = await ghFetchAll(account, c.github.token || undefined);
      logActivity("github", "Gemini consultó GitHub");
      return {
        user: d.user?.login,
        repos: d.repos.length,
        openPRs: d.openPRs,
        openIssues: d.openIssues,
        recentRepos: d.repos.slice(0, 5).map((r) => r.name),
      };
    }
    case "telegram_alert": {
      if (!c.telegram.botToken || !c.telegram.chatId) return { error: "Telegram no está conectado." };
      await tgSendMessage(c.telegram.botToken, c.telegram.chatId, alertText("Asistente IA", String(args?.text || "")));
      logActivity("telegram", "Gemini envió una alerta a Telegram");
      return { sent: true };
    }
    case "create_note": {
      const ws = useWorkspace.getState();
      const id = ws.createPage(null);
      const lines: string[] = String(args?.content || "").split("\n").filter((l: string) => l.trim());
      const blocks: Block[] = [
        { id: "t", type: "heading1", content: String(args?.title || "Nota") },
        ...lines.map((l): Block =>
          l.trim().startsWith("- ")
            ? { id: "t", type: "todo", content: l.replace(/^-\s*/, ""), checked: false }
            : { id: "t", type: "text", content: l }
        ),
      ];
      ws.applyTemplate(id, blocks.length > 1 ? blocks : [{ id: "t", type: "text", content: "" }], {
        title: String(args?.title || "Nota"),
        icon: "🤖",
      });
      logActivity("ai", `Gemini creó la nota "${args?.title}"`);
      return { created: true, pageId: id, title: args?.title };
    }
    case "list_notes": {
      const pages = useWorkspace.getState().pages;
      return { notes: pages.map((p) => ({ title: p.title, icon: p.icon })) };
    }
    case "read_note": {
      const pages = useWorkspace.getState().pages;
      const p = pages.find((x) => x.title.toLowerCase() === String(args?.title || "").toLowerCase());
      if (!p) return { error: `No encontré la nota "${args?.title}".` };
      return {
        title: p.title,
        content: p.blocks.map((b) => (b.type === "todo" ? `- ${b.content}` : b.content)).filter(Boolean).join("\n"),
      };
    }
    case "append_to_note": {
      const ws = useWorkspace.getState();
      const p = ws.pages.find((x) => x.title.toLowerCase() === String(args?.title || "").toLowerCase());
      if (!p) return { error: `No encontré la nota "${args?.title}".` };
      let lastId = p.blocks[p.blocks.length - 1]?.id ?? null;
      for (const line of String(args?.content || "").split("\n").filter((l: string) => l.trim())) {
        const isTodo = line.trim().startsWith("- ");
        const nid = ws.addBlock(p.id, lastId, isTodo ? "todo" : "text");
        ws.updateBlock(p.id, nid, { content: line.replace(/^-\s*/, "") });
        lastId = nid;
      }
      logActivity("ai", `Gemini amplió la nota "${p.title}"`);
      return { updated: true, title: p.title };
    }
    case "analyze_agency": {
      const out: Record<string, unknown> = { connected: [] as string[] };
      const conn = out.connected as string[];
      if (googleTokenValid(g, GMAIL_SCOPE)) {
        const em = await gmailSearch(g.accessToken, "in:inbox", 25);
        const byCategory: Record<string, number> = {};
        em.forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + 1));
        out.gmail = { total: em.length, unread: em.filter((e) => e.unread).length, byCategory };
        conn.push("gmail");
      }
      if (c.github.account || c.github.token) {
        const d = await ghFetchAll(c.github.account, c.github.token || undefined);
        out.github = { repos: d.repos.length, openPRs: d.openPRs, openIssues: d.openIssues };
        conn.push("github");
      }
      if (googleTokenValid(g, DRIVE_SCOPE)) {
        out.drive = { recentItems: (await driveList(g.accessToken, 30)).length };
        conn.push("drive");
      }
      if (googleTokenValid(g, CALENDAR_SCOPE)) {
        out.calendar = { upcoming: (await calendarEvents(g.accessToken, 10)).length };
        conn.push("calendar");
      }
      logActivity("ai", "Gemini ejecutó analítica de la agencia");
      return out;
    }
    case "now": {
      const d = new Date();
      return { iso: d.toISOString(), local: d.toLocaleString("es-CO"), weekday: d.toLocaleDateString("es-CO", { weekday: "long" }) };
    }
    case "calc": {
      const expr = String(args?.expression || "");
      if (!/^[\d\s.+\-*/()%]+$/.test(expr)) return { error: "Expresión no permitida." };
      try {
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict"; return (${expr.replace(/%/g, "/100")})`)();
        return { expression: expr, result: val };
      } catch {
        return { error: "No pude calcular la expresión." };
      }
    }
    case "search_notes": {
      const q = String(args?.query || "").toLowerCase();
      const pages = useWorkspace.getState().pages;
      const hits = pages
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.blocks.some((b) => b.content.toLowerCase().includes(q))
        )
        .map((p) => ({ title: p.title, icon: p.icon }));
      return { count: hits.length, notes: hits };
    }
    case "create_subpage": {
      const ws = useWorkspace.getState();
      const parent = ws.pages.find(
        (p) => p.title.toLowerCase() === String(args?.parentTitle || "").toLowerCase()
      );
      if (!parent) return { error: `No encontré la página padre "${args?.parentTitle}".` };
      const childId = ws.createSubpage(parent.id, null);
      const lines: string[] = String(args?.content || "").split("\n").filter((l: string) => l.trim());
      ws.applyTemplate(
        childId,
        [
          { id: "t", type: "heading1", content: String(args?.title || "Subpágina") },
          ...lines.map((l): Block => ({ id: "t", type: l.trim().startsWith("- ") ? "todo" : "text", content: l.replace(/^-\s*/, "") })),
        ],
        { title: String(args?.title || "Subpágina"), icon: "📄" }
      );
      logActivity("ai", `Gemini creó la subpágina "${args?.title}" en "${parent.title}"`);
      return { created: true, pageId: childId, parent: parent.title };
    }
    case "delete_note": {
      const ws = useWorkspace.getState();
      const p = ws.pages.find((x) => x.title.toLowerCase() === String(args?.title || "").toLowerCase());
      if (!p) return { error: `No encontré la nota "${args?.title}".` };
      ws.deletePage(p.id);
      logActivity("ai", `Gemini eliminó la nota "${p.title}"`);
      return { deleted: true, title: p.title };
    }
    case "telegram_updates": {
      if (!c.telegram.botToken) return { error: "Telegram no está conectado." };
      const ups = await tgGetUpdates(c.telegram.botToken);
      return {
        updates: ups.slice(-8).map((u) => ({
          from: u.message?.from?.first_name,
          chatId: u.message?.chat.id,
          text: u.message?.text,
        })),
      };
    }
    case "drive_read": {
      if (!googleTokenValid(g, DRIVE_SCOPE)) return { error: "Google Drive no está conectado." };
      const files = await driveList(g.accessToken, 5, { query: String(args?.name || "") });
      const file = files.find((f) => f.mimeType !== "application/vnd.google-apps.folder");
      if (!file) return { error: `No encontré un archivo "${args?.name}".` };
      const text = await driveReadText(g.accessToken, file);
      logActivity("google-drive", `Gemini leyó "${file.name}" de Drive`);
      return { name: file.name, content: text };
    }
    case "github_commits": {
      const commits = await ghCommits(String(args?.repo || ""), c.github.token || undefined);
      logActivity("github", `Gemini leyó commits de ${args?.repo}`);
      return {
        commits: commits.map((cm) => ({
          message: cm.commit.message.split("\n")[0],
          author: cm.commit.author?.name,
          date: cm.commit.author?.date,
          url: cm.html_url,
        })),
      };
    }
    case "github_create_issue": {
      if (!c.github.token) return { error: "Crear issues requiere un token de GitHub con escritura (Conectores → GitHub)." };
      const r = await ghCreateIssue(String(args?.repo || ""), String(args?.title || ""), String(args?.body || ""), c.github.token);
      logActivity("github", `Gemini creó el issue #${r.number} en ${args?.repo}`);
      return { created: true, number: r.number, url: r.html_url };
    }
    case "create_webpage": {
      const ws = useWorkspace.getState();
      const id = ws.createPage(null);
      ws.applyTemplate(
        id,
        [
          { id: "t", type: "heading1", content: String(args?.title || "Página web") },
          { id: "t", type: "html", content: String(args?.html || "<!doctype html><html><body></body></html>") },
        ],
        { title: String(args?.title || "Página web"), icon: "🌐" }
      );
      logActivity("ai", `Gemini generó la página web "${args?.title}"`);
      return { created: true, pageId: id, title: args?.title };
    }
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}
