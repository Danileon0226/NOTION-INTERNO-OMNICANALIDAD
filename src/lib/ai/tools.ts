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
import { gmailSearch, gmailProfile, driveList, calendarEvents, driveReadText } from "@/lib/connectors/google";
import { ghFetchAll, ghCommits, ghCreateIssue, repoFromUrl } from "@/lib/connectors/github";
import { tgSendMessage, tgGetUpdates, tgGetMe, alertText } from "@/lib/connectors/telegram";
import { useWorkspace } from "@/lib/store";
import { useActivity, type ActivitySource } from "@/lib/activity";
import { useVault } from "@/lib/obsidian";
import { resolveAnticipations } from "@/lib/anticipation/engine";
import { templates } from "@/lib/data/templates";
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
    name: "create_client_pack",
    description:
      "Pre-configura el expediente administrativo completo de un cliente en el workspace: crea una página de cliente con subpáginas de Propuesta/PPT, Contrato de servicios y Onboarding (checklist). Automatiza el alta del cliente. Después puedes elaborar cada documento con append_to_note o drive_read.",
    parameters: {
      type: "object",
      properties: {
        client: { type: "string", description: "Nombre del cliente." },
        scope: { type: "string", description: "Alcance/servicios (opcional)." },
      },
      required: ["client"],
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
  // ── Conectores ampliados ──────────────────────────────────────
  {
    name: "gmail_profile",
    description: "Perfil/estadísticas de la cuenta de Gmail conectada: correo, total de mensajes e hilos.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "drive_folder",
    description: "Lista el contenido de una carpeta de Google Drive buscada por nombre (devuelve sus archivos).",
    parameters: {
      type: "object",
      properties: { name: { type: "string", description: "Nombre de la carpeta." } },
      required: ["name"],
    },
  },
  {
    name: "github_pulls",
    description: "Lista los pull requests abiertos de un usuario/organización de GitHub.",
    parameters: {
      type: "object",
      properties: { account: { type: "string", description: "Usuario u organización (opcional)." } },
    },
  },
  {
    name: "telegram_bot_info",
    description: "Información del bot de Telegram conectado (nombre, usuario). Útil para verificar la conexión.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_templates",
    description: "Lista las plantillas de página disponibles (brief, propuesta, contrato, onboarding, reporte, acta, roadmap, wiki, crm, etc.).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "create_from_template",
    description:
      "Crea una página nueva a partir de una plantilla por su id (usa list_templates para ver los ids). Sustituye '[Cliente]' por el nombre indicado.",
    parameters: {
      type: "object",
      properties: {
        templateId: { type: "string", description: "Id de la plantilla (p. ej. 'propuesta', 'contrato')." },
        title: { type: "string", description: "Título de la página (opcional)." },
        client: { type: "string", description: "Nombre de cliente para rellenar la plantilla (opcional)." },
      },
      required: ["templateId"],
    },
  },
  {
    name: "toggle_task",
    description: "Marca como hecha (o pendiente) una tarea/checkbox dentro de una nota, identificándola por un fragmento de su texto.",
    parameters: {
      type: "object",
      properties: {
        noteTitle: { type: "string", description: "Título de la nota que contiene la tarea." },
        taskText: { type: "string", description: "Fragmento del texto de la tarea." },
        done: { type: "boolean", description: "true = marcar hecha (por defecto), false = desmarcar." },
      },
      required: ["noteTitle", "taskText"],
    },
  },
  {
    name: "vault_overview",
    description:
      "Resumen de la bóveda de Obsidian conectada (grafo de conocimiento): nº de notas, etiquetas más usadas y notas más enlazadas.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "vault_search",
    description: "Busca notas en la bóveda de Obsidian conectada por título o etiqueta.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Texto o etiqueta a buscar." } },
      required: ["query"],
    },
  },
  {
    name: "fetch_url",
    description:
      "Descarga el texto visible de una URL pública (investigación/lectura web). Devuelve el contenido sin etiquetas HTML (puede fallar por CORS en algunos sitios).",
    parameters: {
      type: "object",
      properties: { url: { type: "string", description: "URL https:// a leer." } },
      required: ["url"],
    },
  },
  {
    name: "anticipate",
    description:
      "Motor de anticipación: lee señales reales de los conectores y devuelve las próximas mejores acciones (Next Best Actions) con su confianza y la señal que las justifica. Úsalo cuando el usuario pida 'adelántate', 'qué debería hacer', 'anticípate' o un resumen proactivo.",
    parameters: { type: "object", properties: {} },
  },
];

function logActivity(source: ActivitySource, label: string) {
  useActivity.getState().push({ source, kind: "integrate", label, count: 0 });
}

/**
 * Evaluador aritmético seguro (shunting-yard). Soporta + - * / ( ) y %
 * (porcentaje = /100). No usa eval ni Function: cero ejecución de código.
 */
function safeCalc(input: string): number | null {
  const src = input.replace(/%/g, "/100");
  const tokens = src.match(/(\d+\.?\d*|\.\d+|[+\-*/()])/g);
  if (!tokens) return null;
  const out: (number | string)[] = [];
  const ops: string[] = [];
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  let prev: string | null = null;
  for (const t of tokens) {
    if (/^[\d.]+$/.test(t)) {
      out.push(parseFloat(t));
    } else if (t === "(") {
      ops.push(t);
    } else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()!);
      if (!ops.length) return null;
      ops.pop();
    } else {
      // Unario (p. ej. "-5" o "(-3)"): inserta un 0 implícito.
      if ((t === "-" || t === "+") && (prev === null || prev === "(" || prev in prec)) out.push(0);
      while (ops.length && ops[ops.length - 1] !== "(" && prec[ops[ops.length - 1]] >= prec[t])
        out.push(ops.pop()!);
      ops.push(t);
    }
    prev = t;
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return null;
    out.push(op);
  }
  const st: number[] = [];
  for (const tok of out) {
    if (typeof tok === "number") st.push(tok);
    else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) return null;
      st.push(tok === "+" ? a + b : tok === "-" ? a - b : tok === "*" ? a * b : a / b);
    }
  }
  return st.length === 1 ? st[0] : null;
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
        // Evaluador seguro (sin eval/Function): no ejecuta código arbitrario.
        const val = safeCalc(expr);
        if (val === null || !Number.isFinite(val)) return { error: "No pude calcular la expresión." };
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
    case "create_client_pack": {
      const client = String(args?.client || "Cliente");
      const ws = useWorkspace.getState();
      const parentId = ws.createPage(null);
      ws.applyTemplate(
        parentId,
        [
          { id: "t", type: "heading1", content: `Cliente — ${client}` },
          { id: "t", type: "callout", content: `Expediente de ${client}: propuesta, contrato y onboarding.` },
          ...(args?.scope ? [{ id: "t", type: "text", content: `Alcance: ${args.scope}` } as Block] : []),
        ],
        { title: `Cliente — ${client}`, icon: "🤝" }
      );
      const made: string[] = [];
      for (const tid of ["propuesta", "contrato", "onboarding"]) {
        const t = templates.find((x) => x.id === tid);
        if (!t) continue;
        const childId = ws.createSubpage(parentId, null);
        const blocks: Block[] = t.blocks.map((b) => ({
          ...b,
          content: b.content.replace(/\[Cliente\]/g, client),
        }));
        ws.applyTemplate(childId, blocks, { title: `${t.name} — ${client}`, icon: t.icon });
        made.push(`${t.name} — ${client}`);
      }
      logActivity("ai", `Gemini pre-configuró el pack administrativo de "${client}"`);
      return { created: true, client, pages: made };
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
    case "gmail_profile": {
      if (!googleTokenValid(g, GMAIL_SCOPE)) return { error: "Gmail no está conectado." };
      const p = await gmailProfile(g.accessToken);
      logActivity("gmail", "Gemini consultó el perfil de Gmail");
      return { email: p.emailAddress, messages: p.messagesTotal, threads: p.threadsTotal };
    }
    case "drive_folder": {
      if (!googleTokenValid(g, DRIVE_SCOPE)) return { error: "Google Drive no está conectado." };
      const matches = await driveList(g.accessToken, 5, { query: String(args?.name || "") });
      const folder = matches.find((f) => f.mimeType === "application/vnd.google-apps.folder");
      if (!folder) return { error: `No encontré la carpeta "${args?.name}".` };
      const files = await driveList(g.accessToken, 50, { parentId: folder.id });
      logActivity("google-drive", `Gemini abrió la carpeta "${folder.name}" de Drive`);
      return {
        folder: folder.name,
        count: files.length,
        files: files.map((f) => ({ name: f.name, mimeType: f.mimeType, link: f.webViewLink })),
      };
    }
    case "github_pulls": {
      const account = args?.account || c.github.account;
      if (!account && !c.github.token) return { error: "GitHub no está conectado." };
      const d = await ghFetchAll(account, c.github.token || undefined);
      logActivity("github", "Gemini revisó los PRs de GitHub");
      return {
        openPRs: d.openPRs,
        pulls: d.pulls.map((pr) => ({
          title: pr.title,
          repo: repoFromUrl(pr.repository_url),
          state: pr.state,
          url: pr.html_url,
        })),
      };
    }
    case "telegram_bot_info": {
      if (!c.telegram.botToken) return { error: "Telegram no está conectado." };
      const bot = await tgGetMe(c.telegram.botToken);
      return { username: bot.username, name: bot.first_name, id: bot.id, chatConfigured: !!c.telegram.chatId };
    }
    case "list_templates": {
      return {
        templates: templates.map((t) => ({ id: t.id, name: t.name, description: t.description })),
      };
    }
    case "create_from_template": {
      const t = templates.find((x) => x.id === String(args?.templateId || "").toLowerCase());
      if (!t) return { error: `No existe la plantilla "${args?.templateId}". Usa list_templates.` };
      const client = args?.client ? String(args.client) : "";
      const blocks: Block[] = t.blocks.map((b) => ({
        ...b,
        content: client ? b.content.replace(/\[Cliente\]/g, client) : b.content,
      }));
      const title = String(args?.title || (client ? `${t.name} — ${client}` : t.name));
      const ws = useWorkspace.getState();
      const id = ws.createPageFromTemplate(blocks, { title, icon: t.icon }, null);
      logActivity("ai", `Gemini creó "${title}" desde la plantilla ${t.name}`);
      return { created: true, pageId: id, title, template: t.id };
    }
    case "toggle_task": {
      const ws = useWorkspace.getState();
      const p = ws.pages.find((x) => x.title.toLowerCase() === String(args?.noteTitle || "").toLowerCase());
      if (!p) return { error: `No encontré la nota "${args?.noteTitle}".` };
      const frag = String(args?.taskText || "").toLowerCase();
      const block = p.blocks.find((b) => b.type === "todo" && b.content.toLowerCase().includes(frag));
      if (!block) return { error: `No encontré una tarea con "${args?.taskText}" en "${p.title}".` };
      const done = args?.done === undefined ? true : !!args.done;
      ws.updateBlock(p.id, block.id, { checked: done });
      logActivity("ai", `Gemini marcó la tarea "${block.content}" como ${done ? "hecha" : "pendiente"}`);
      return { updated: true, task: block.content, done };
    }
    case "vault_overview": {
      const v = useVault.getState();
      if (!v.notes.length) return { error: "No hay una bóveda de Obsidian conectada (ve a Canvas/Grafo)." };
      const tagCount: Record<string, number> = {};
      const linkCount: Record<string, number> = {};
      for (const n of v.notes) {
        n.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1));
        n.links.forEach((l) => (linkCount[l] = (linkCount[l] || 0) + 1));
      }
      const top = (o: Record<string, number>) =>
        Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => ({ name: k, count: n }));
      return { vault: v.name, notes: v.notes.length, topTags: top(tagCount), mostLinked: top(linkCount) };
    }
    case "vault_search": {
      const v = useVault.getState();
      if (!v.notes.length) return { error: "No hay una bóveda de Obsidian conectada (ve a Canvas/Grafo)." };
      const q = String(args?.query || "").toLowerCase().replace(/^#/, "");
      const hits = v.notes
        .filter((n) => n.title.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))
        .slice(0, 20)
        .map((n) => ({ title: n.title, path: n.path, tags: n.tags, links: n.links.length }));
      return { count: hits.length, notes: hits };
    }
    case "fetch_url": {
      const url = String(args?.url || "");
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return { error: "URL inválida." };
      }
      // Solo https público: bloquea http, esquemas raros y hosts internos.
      if (parsed.protocol !== "https:") return { error: "Solo se permiten URLs https://." };
      const host = parsed.hostname.toLowerCase();
      const isPrivate =
        host === "localhost" ||
        host.endsWith(".local") ||
        host.endsWith(".internal") ||
        /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        /^\[?::1\]?$/.test(host) ||
        /^\[?(fc|fd)/i.test(host);
      if (isPrivate) return { error: "Host no permitido (red interna/loopback)." };
      try {
        const res = await fetch(url);
        if (!res.ok) return { error: `La página respondió ${res.status}.` };
        const raw = await res.text();
        const text = raw
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000);
        logActivity("ai", `Gemini leyó la web ${url}`);
        return { url, text };
      } catch (e) {
        return { error: `No pude leer la URL (posible bloqueo CORS): ${(e as Error).message}` };
      }
    }
    case "anticipate": {
      const res = await resolveAnticipations();
      logActivity("ai", "Gemini ejecutó el motor de anticipación");
      return {
        signals: res.signals,
        anticipations: res.visible.map((a) => ({
          title: a.title,
          type: a.type,
          reason: a.reason,
          confidence: Math.round(a.confidence * 100) / 100,
          leadTime: a.leadTime,
          mode: a.mode,
          suggestedAction: a.suggestPrompt,
        })),
        inShadow: res.shadow,
      };
    }
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}
