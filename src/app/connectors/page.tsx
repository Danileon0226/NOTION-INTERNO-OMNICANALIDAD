"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  HardDrive,
  Github,
  Send,
  ExternalLink,
  Check,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Star,
  GitPullRequest,
  CircleDot,
  Folder,
  FileText,
  Trash2,
  Bot,
  Search,
  ChevronRight,
  Home,
  CalendarDays,
} from "lucide-react";
import { useAi } from "@/lib/ai/store";
import { askAi, listModels, type GeminiModel } from "@/lib/ai/client";
import {
  useConnectors,
  GMAIL_SCOPE,
  DRIVE_SCOPE,
  CALENDAR_SCOPE,
  googleTokenValid,
} from "@/lib/connectors/store";
import { ghFetchAll, repoFromUrl, type GithubData } from "@/lib/connectors/github";
import {
  tgGetMe,
  tgSendMessage,
  tgGetUpdates,
  alertText,
  type TelegramBot,
  type TelegramUpdate,
} from "@/lib/connectors/telegram";
import {
  requestGoogleToken,
  gmailProfile,
  gmailFetchInbox,
  driveList,
  isFolder,
  calendarEvents,
  type GmailProfile,
  type DriveFile,
  type CalendarEvent,
} from "@/lib/connectors/google";
import type { EmailItem } from "@/lib/types";

export default function ConnectorsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Conectores omnicanal</h1>
        <p className="mt-1 text-sm text-muted">
          Integraciones reales y funcionales. Las credenciales se guardan solo en tu navegador
          (localStorage) y las llamadas salen directo a cada API — sin servidores intermedios.
        </p>
      </header>

      <div className="space-y-4">
        <GeminiCard />
        <GithubCard />
        <TelegramCard />
        <GmailCard />
        <DriveCard />
        <CalendarCard />
      </div>
    </div>
  );
}

/* ───────────────────────────── UI helpers ───────────────────────────── */

function Shell({
  icon,
  title,
  desc,
  connected,
  children,
  docsUrl,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  connected: boolean;
  children: React.ReactNode;
  docsUrl?: string;
}) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-subtle text-ink">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-ink">{title}</h2>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                connected ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
              }`}
            >
              {connected ? "Conectado" : "Sin conectar"}
            </span>
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-ink"
              >
                Docs <ExternalLink size={12} />
              </a>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{desc}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full rounded-md border bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
      />
    </label>
  );
}

function Btn({
  children,
  onClick,
  busy,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:opacity-90"
      : variant === "danger"
        ? "text-red-600 hover:bg-red-50"
        : "border text-ink hover:bg-bg-subtle";
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${styles}`}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-bg-subtle px-3 py-2">
      <div className="text-lg font-semibold text-ink">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="mt-3 flex items-start gap-1.5 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {msg}
    </div>
  );
}

/* ───────────────────────────── GitHub ───────────────────────────── */

function GithubCard() {
  const { github, setGithub, disconnect } = useConnectors();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<GithubData | null>(null);
  const connected = !!data?.user || (!!github.account && !!data);

  async function connect() {
    setErr("");
    setBusy(true);
    try {
      const d = await ghFetchAll(github.account.trim(), github.token.trim() || undefined);
      if (!d.user && !github.account) throw new Error("Indica un usuario/organización o un token.");
      setData(d);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if ((github.account || github.token) && !data) connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell
      icon={<Github size={22} />}
      title="GitHub"
      desc="Repos, issues y PRs en vivo. Funciona con un usuario/organización público; añade un token (PAT) para repos privados y más límite."
      connected={connected}
      docsUrl="https://docs.github.com/rest"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Usuario u organización"
          value={github.account}
          onChange={(v) => setGithub({ account: v })}
          placeholder="p. ej. Danileon0226"
        />
        <Field
          label="Token (opcional, PAT)"
          value={github.token}
          onChange={(v) => setGithub({ token: v })}
          placeholder="ghp_…"
          type="password"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Btn onClick={connect} busy={busy}>
          {connected ? "Actualizar" : "Conectar"}
        </Btn>
        {connected && (
          <Btn
            variant="danger"
            onClick={() => {
              disconnect("github");
              setData(null);
            }}
          >
            <Trash2 size={14} /> Desconectar
          </Btn>
        )}
      </div>
      <ErrorMsg msg={err} />

      {data && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Repos" value={data.user?.public_repos ?? data.repos.length} />
            <Stat label="PRs abiertos" value={data.openPRs} />
            <Stat label="Issues abiertos" value={data.openIssues} />
          </div>
          {data.repos.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Repositorios recientes</div>
              <div className="divide-y rounded-lg border">
                {data.repos.slice(0, 5).map((r) => (
                  <a
                    key={r.id}
                    href={r.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-subtle"
                  >
                    <span className="truncate font-medium text-ink">{r.name}</span>
                    {r.private && <span className="rounded bg-gray-100 px-1 text-[10px] text-gray-500">privado</span>}
                    <span className="ml-auto flex items-center gap-2 text-[11px] text-muted">
                      {r.language && <span>{r.language}</span>}
                      <span className="flex items-center gap-0.5">
                        <Star size={11} /> {r.stargazers_count}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {data.pulls.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Pull requests abiertos</div>
              <div className="divide-y rounded-lg border">
                {data.pulls.slice(0, 5).map((p) => (
                  <a
                    key={p.id}
                    href={p.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-subtle"
                  >
                    <GitPullRequest size={13} className="shrink-0 text-emerald-600" />
                    <span className="truncate text-ink">{p.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-muted">
                      {repoFromUrl(p.repository_url)}#{p.number}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ───────────────────────────── Telegram ───────────────────────────── */

function TelegramCard() {
  const { telegram, setTelegram, disconnect } = useConnectors();
  const [busy, setBusy] = useState<"connect" | "send" | "updates" | null>(null);
  const [err, setErr] = useState("");
  const [bot, setBot] = useState<TelegramBot | null>(null);
  const [updates, setUpdates] = useState<TelegramUpdate[]>([]);
  const [sent, setSent] = useState(false);

  async function connect() {
    setErr("");
    setSent(false);
    setBusy("connect");
    try {
      const me = await tgGetMe(telegram.botToken.trim());
      setBot(me);
    } catch (e) {
      setErr((e as Error).message);
      setBot(null);
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setErr("");
    setBusy("send");
    try {
      await tgSendMessage(
        telegram.botToken.trim(),
        telegram.chatId.trim(),
        alertText("Prueba de conexión", "El bot de Telegram quedó conectado al dashboard ✅")
      );
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function refreshUpdates() {
    setErr("");
    setBusy("updates");
    try {
      setUpdates((await tgGetUpdates(telegram.botToken.trim())).reverse());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (telegram.botToken && !bot) connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell
      icon={<Send size={22} />}
      title="Telegram"
      desc="Bot de alertas omnicanal. Crea un bot con @BotFather, pega el token, y usa 'Leer updates' para descubrir el chat_id (escríbele algo al bot primero)."
      connected={!!bot}
      docsUrl="https://core.telegram.org/bots/api"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Bot token"
          value={telegram.botToken}
          onChange={(v) => setTelegram({ botToken: v })}
          placeholder="123456:ABC-DEF…"
          type="password"
        />
        <Field
          label="Chat ID (destino de alertas)"
          value={telegram.chatId}
          onChange={(v) => setTelegram({ chatId: v })}
          placeholder="p. ej. 123456789"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={connect} busy={busy === "connect"}>
          {bot ? "Revalidar" : "Conectar"}
        </Btn>
        <Btn variant="ghost" onClick={refreshUpdates} busy={busy === "updates"} disabled={!telegram.botToken}>
          <RefreshCw size={14} /> Leer updates
        </Btn>
        <Btn
          variant="ghost"
          onClick={send}
          busy={busy === "send"}
          disabled={!bot || !telegram.chatId}
        >
          <Send size={14} /> Enviar alerta de prueba
        </Btn>
        {bot && (
          <Btn
            variant="danger"
            onClick={() => {
              disconnect("telegram");
              setBot(null);
              setUpdates([]);
            }}
          >
            <Trash2 size={14} /> Desconectar
          </Btn>
        )}
      </div>
      {sent && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
          <Check size={13} /> Alerta enviada al chat {telegram.chatId}.
        </div>
      )}
      <ErrorMsg msg={err} />

      {bot && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Bot" value={`@${bot.username}`} />
            <Stat label="Updates leídos" value={updates.length} />
          </div>
          {updates.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Mensajes recientes hacia el bot</div>
              <div className="divide-y rounded-lg border">
                {updates.slice(0, 5).map((u) => (
                  <div key={u.update_id} className="px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-ink">{u.message?.from?.first_name ?? "—"}</span>
                      <span className="ml-auto text-[11px] text-muted">chat_id: {u.message?.chat.id}</span>
                    </div>
                    {u.message?.text && <p className="text-xs text-muted">{u.message.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ───────────────────────────── Google base ───────────────────────────── */

function useGoogleConnect() {
  const { google, setGoogle } = useConnectors();

  // Autocompleta el Client ID desde el entorno (NEXT_PUBLIC_GOOGLE_CLIENT_ID)
  // para que conectar la cuenta real sea de un solo clic en el sitio desplegado.
  useEffect(() => {
    const env = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (env && !google.clientId) setGoogle({ clientId: env });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureToken(scope: string): Promise<string> {
    if (googleTokenValid(google, scope)) return google.accessToken;
    if (!google.clientId.trim()) throw new Error("Falta el Google OAuth Client ID.");
    const wanted = Array.from(new Set([...google.scopes, scope]));
    const tok = await requestGoogleToken(google.clientId.trim(), wanted);
    setGoogle({
      accessToken: tok.access_token,
      expiry: Date.now() + tok.expires_in * 1000,
      scopes: tok.scope ? tok.scope.split(" ") : wanted,
    });
    return tok.access_token;
  }

  return { google, setGoogle, ensureToken };
}

/* ───────────────────────────── Gmail ───────────────────────────── */

function GmailCard() {
  const { google, setGoogle, ensureToken } = useGoogleConnect();
  const { disconnect } = useConnectors();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const connected = googleTokenValid(google, GMAIL_SCOPE);

  async function connect() {
    setErr("");
    setBusy(true);
    try {
      const token = await ensureToken(GMAIL_SCOPE);
      const [p, msgs] = await Promise.all([gmailProfile(token), gmailFetchInbox(token)]);
      setProfile(p);
      setEmails(msgs);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      icon={<Mail size={22} />}
      title="Gmail · Correo de la agencia"
      desc="OAuth de Google (sin secreto) y lectura real de tu bandeja. El dashboard usará estos correos en vivo cuando esté conectado."
      connected={connected}
      docsUrl="https://developers.google.com/gmail/api"
    >
      <Field
        label="Google OAuth Client ID"
        value={google.clientId}
        onChange={(v) => setGoogle({ clientId: v })}
        placeholder="xxxxx.apps.googleusercontent.com"
      />
      <p className="mt-1 text-[11px] text-muted">
        Crea un Client ID de tipo &quot;Web&quot; en Google Cloud Console y añade este origen a
        &quot;Authorized JavaScript origins&quot;.
      </p>
      <div className="mt-3 flex gap-2">
        <Btn onClick={connect} busy={busy}>
          {connected ? "Sincronizar bandeja" : "Conectar con Google"}
        </Btn>
        {connected && (
          <Btn
            variant="danger"
            onClick={() => {
              disconnect("gmail");
              setProfile(null);
              setEmails([]);
            }}
          >
            <Trash2 size={14} /> Desconectar
          </Btn>
        )}
      </div>
      <ErrorMsg msg={err} />

      {profile && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={profile.emailAddress} value={`${profile.messagesTotal.toLocaleString()} msgs`} />
            <Stat label="Cargados en vivo" value={emails.length} />
          </div>
          <div className="divide-y rounded-lg border">
            {emails.slice(0, 6).map((e) => (
              <div key={e.id} className="px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`truncate ${e.unread ? "font-semibold text-ink" : "text-ink/80"}`}>
                    {e.subject}
                  </span>
                  <span className="ml-auto shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] text-muted">
                    {e.category}
                  </span>
                </div>
                <p className="truncate text-xs text-muted">{e.senderName}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ───────────────────────────── Drive ───────────────────────────── */

function DriveCard() {
  const { google, ensureToken } = useGoogleConnect();
  const { disconnect } = useConnectors();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [stack, setStack] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const connected = googleTokenValid(google, DRIVE_SCOPE);

  async function load(opts: { parentId?: string; query?: string } = {}) {
    setErr("");
    setBusy(true);
    try {
      const token = await ensureToken(DRIVE_SCOPE);
      setFiles(await driveList(token, 60, opts));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openFolder(f: DriveFile) {
    const next = [...stack, { id: f.id, name: f.name }];
    setStack(next);
    setSearch("");
    load({ parentId: f.id });
  }
  function goTo(index: number) {
    // index -1 = recientes (raíz lógica)
    const next = stack.slice(0, index + 1);
    setStack(next);
    setSearch("");
    load(next.length ? { parentId: next[next.length - 1].id } : {});
  }
  function runSearch() {
    setStack([]);
    load(search.trim() ? { query: search.trim() } : {});
  }

  const folders = (files ?? []).filter(isFolder);
  const docs = (files ?? []).filter((f) => !isFolder(f));

  return (
    <Shell
      icon={<HardDrive size={22} />}
      title="Google Drive"
      desc="Explora archivos y carpetas reales (incluidas las compartidas y unidades compartidas). Navega entre carpetas y busca por nombre."
      connected={connected}
      docsUrl="https://developers.google.com/drive/api"
    >
      {!google.clientId && (
        <p className="text-[11px] text-muted">
          Configura primero el Google OAuth Client ID en la tarjeta de Gmail (es el mismo).
        </p>
      )}
      <div className="mt-1 flex flex-wrap gap-2">
        <Btn onClick={() => { setStack([]); setSearch(""); load(); }} busy={busy} disabled={!google.clientId}>
          {connected ? "Actualizar" : "Conectar Drive"}
        </Btn>
        {connected && (
          <Btn
            variant="danger"
            onClick={() => {
              disconnect("google-drive");
              setFiles(null);
              setStack([]);
            }}
          >
            <Trash2 size={14} /> Desconectar
          </Btn>
        )}
      </div>
      <ErrorMsg msg={err} />

      {files && (
        <div className="mt-4 space-y-2">
          {/* búsqueda */}
          <div className="flex items-center gap-1.5 rounded-md border bg-white px-2 py-1">
            <Search size={13} className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Buscar en Drive por nombre…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
            {search && (
              <button onClick={runSearch} className="text-xs text-accent hover:underline">
                Buscar
              </button>
            )}
          </div>

          {/* breadcrumb */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted">
            <button onClick={() => goTo(-1)} className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-bg-subtle hover:text-ink">
              <Home size={12} /> Recientes
            </button>
            {stack.map((s, i) => (
              <span key={s.id} className="flex items-center gap-1">
                <ChevronRight size={11} />
                <button onClick={() => goTo(i)} className="rounded px-1 py-0.5 hover:bg-bg-subtle hover:text-ink">
                  {s.name}
                </button>
              </span>
            ))}
          </div>

          {/* listado: carpetas primero (navegables), luego archivos */}
          <div className="divide-y rounded-lg border">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => openFolder(f)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-subtle"
              >
                <Folder size={14} className="shrink-0 text-amber-500" />
                <span className="truncate text-ink">{f.name}</span>
                {f.shared && (
                  <span className="rounded bg-blue-50 px-1 text-[10px] text-blue-600">compartida</span>
                )}
                <ChevronRight size={13} className="ml-auto shrink-0 text-muted" />
              </button>
            ))}
            {docs.map((f) => (
              <a
                key={f.id}
                href={f.webViewLink ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-subtle"
              >
                <FileText size={14} className="shrink-0 text-muted" />
                <span className="truncate text-ink">{f.name}</span>
                {f.shared && (
                  <span className="rounded bg-blue-50 px-1 text-[10px] text-blue-600">compartido</span>
                )}
                <span className="ml-auto shrink-0 text-[11px] text-muted">
                  {new Date(f.modifiedTime).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                </span>
              </a>
            ))}
            {files.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted">Carpeta vacía o sin resultados.</div>
            )}
          </div>
          <div className="text-[11px] text-muted">
            {folders.length} carpetas · {docs.length} archivos
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ───────────────────────────── Gemini (IA) ───────────────────────────── */

function GeminiCard() {
  const { apiKey, model, setApiKey, setModel } = useAi();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [reply, setReply] = useState("");

  async function test() {
    setErr("");
    setReply("");
    setBusy(true);
    try {
      const text = await askAi("Responde en una frase: ¿estás listo para ayudar a la agencia?");
      setReply(text);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      icon={<Bot size={22} />}
      title="Asistente IA · Gemini"
      desc="Pega tu API key de Google AI Studio y la IA queda lista para resumir correos, redactar y potenciar el dashboard. La clave se guarda solo en tu navegador."
      connected={!!apiKey}
      docsUrl="https://aistudio.google.com/apikey"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="API key de Gemini"
          value={apiKey}
          onChange={setApiKey}
          placeholder="AIza…"
          type="password"
        />
        <ModelPicker value={model} onChange={setModel} hasKey={!!apiKey} />
      </div>
      <div className="mt-3 flex gap-2">
        <Btn onClick={test} busy={busy} disabled={!apiKey}>
          Probar IA
        </Btn>
      </div>
      <ErrorMsg msg={err} />
      {reply && (
        <div className="mt-3 rounded-md bg-bg-subtle px-3 py-2 text-sm text-ink">{reply}</div>
      )}
    </Shell>
  );
}

/* ───────────────────────────── Google Calendar ───────────────────────────── */

function CalendarCard() {
  const { google, ensureToken } = useGoogleConnect();
  const { disconnect } = useConnectors();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const connected = googleTokenValid(google, CALENDAR_SCOPE);

  async function connect() {
    setErr("");
    setBusy(true);
    try {
      const token = await ensureToken(CALENDAR_SCOPE);
      setEvents(await calendarEvents(token, 10));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      icon={<CalendarDays size={22} />}
      title="Google Calendar"
      desc="Próximos eventos de tu calendario. Mismo Client ID de Google. El asistente IA puede consultarlo."
      connected={connected}
      docsUrl="https://developers.google.com/calendar/api"
    >
      {!google.clientId && (
        <p className="text-[11px] text-muted">
          Configura primero el Google OAuth Client ID en la tarjeta de Gmail (es el mismo).
        </p>
      )}
      <div className="mt-1 flex gap-2">
        <Btn onClick={connect} busy={busy} disabled={!google.clientId}>
          {connected ? "Actualizar eventos" : "Conectar Calendar"}
        </Btn>
        {connected && (
          <Btn
            variant="danger"
            onClick={() => {
              disconnect("gmail"); // limpia scope google; el usuario re-autoriza si hace falta
              setEvents(null);
            }}
          >
            <Trash2 size={14} /> Desconectar
          </Btn>
        )}
      </div>
      <ErrorMsg msg={err} />

      {events && (
        <div className="mt-4 divide-y rounded-lg border">
          {events.length === 0 && <div className="px-3 py-4 text-center text-sm text-muted">Sin eventos próximos.</div>}
          {events.map((e) => (
            <a
              key={e.id}
              href={e.htmlLink ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-subtle"
            >
              <CalendarDays size={13} className="shrink-0 text-accent" />
              <span className="truncate text-ink">{e.summary || "(sin título)"}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted">
                {(() => {
                  const d = e.start?.dateTime || e.start?.date;
                  return d ? new Date(d).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
                })()}
              </span>
            </a>
          ))}
        </div>
      )}
    </Shell>
  );
}

// Modelos de respaldo si aún no se pueden cargar desde Google (key sin validar
// o sin conexión). En cuanto la key funcione, la lista real los reemplaza.
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

function ModelPicker({
  value,
  onChange,
  hasKey,
}: {
  value: string;
  onChange: (v: string) => void;
  hasKey: boolean;
}) {
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const list = await listModels();
      setModels(list);
      // Si el modelo guardado ya no está disponible, cae al primero de la lista.
      if (list.length && !list.some((m) => m.id === value)) onChange(list[0].id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Intenta cargar automáticamente cuando hay key y todavía no hay lista.
  useEffect(() => {
    if (hasKey && models.length === 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKey]);

  // Opciones: las reales de Google, o el respaldo. Garantiza incluir el valor actual.
  const ids = models.length ? models.map((m) => m.id) : FALLBACK_MODELS;
  const options = ids.includes(value) ? ids : [value, ...ids];

  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
        Modelo
        <button
          type="button"
          onClick={load}
          disabled={!hasKey || busy}
          className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline disabled:opacity-40"
          title="Cargar modelos disponibles desde Google"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {models.length ? "Actualizar" : "Cargar de Google"}
        </button>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
      >
        {options.map((id) => {
          const found = models.find((m) => m.id === id);
          return (
            <option key={id} value={id}>
              {found ? `${found.label} (${id})` : id}
            </option>
          );
        })}
      </select>
      {err ? (
        <span className="mt-1 block text-[11px] text-red-600">
          No se pudieron cargar los modelos: {err}
        </span>
      ) : (
        <span className="mt-1 block text-[11px] text-muted">
          {models.length
            ? `${models.length} modelos disponibles para tu key.`
            : "Lista de respaldo — pulsa “Cargar de Google” para ver los tuyos."}
        </span>
      )}
    </label>
  );
}
