"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Github,
  Mail,
  HardDrive,
  Send,
  GitPullRequest,
  Folder,
  FileText,
  ExternalLink,
  Loader2,
  Plug,
  RefreshCw,
} from "lucide-react";
import type { BlockType, EmailItem } from "@/lib/types";
import { useConnectors, googleTokenValid, GMAIL_SCOPE, DRIVE_SCOPE } from "@/lib/connectors/store";
import { ghFetchAll, repoFromUrl, type GithubData } from "@/lib/connectors/github";
import { gmailFetchInbox } from "@/lib/connectors/google";
import { driveList, isFolder, type DriveFile } from "@/lib/connectors/google";
import { tgSendMessage, alertText } from "@/lib/connectors/telegram";

const META: Record<string, { icon: React.ReactNode; label: string }> = {
  "embed-github": { icon: <Github size={14} />, label: "GitHub" },
  "embed-gmail": { icon: <Mail size={14} />, label: "Gmail" },
  "embed-drive": { icon: <HardDrive size={14} />, label: "Google Drive" },
  "embed-telegram": { icon: <Send size={14} />, label: "Telegram" },
};

function Frame({
  type,
  children,
  onRefresh,
}: {
  type: BlockType;
  children: React.ReactNode;
  onRefresh?: () => void;
}) {
  const m = META[type];
  return (
    <div className="my-1 rounded-lg border bg-card">
      <div className="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs font-medium text-muted">
        {m.icon} {m.label}
        {onRefresh && (
          <button onClick={onRefresh} className="ml-auto rounded p-0.5 hover:bg-bg-subtle hover:text-ink">
            <RefreshCw size={12} />
          </button>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function NotConnected() {
  return (
    <Link
      href="/connectors"
      className="flex items-center gap-1.5 text-sm text-accent hover:underline"
    >
      <Plug size={14} /> Conectar en la página de Conectores
    </Link>
  );
}

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <Loader2 size={14} className="animate-spin" /> Cargando…
    </div>
  );
}

export function ConnectorEmbed({ type }: { type: BlockType }) {
  if (type === "embed-github") return <GithubEmbed />;
  if (type === "embed-gmail") return <GmailEmbed />;
  if (type === "embed-drive") return <DriveEmbed />;
  if (type === "embed-telegram") return <TelegramEmbed />;
  return null;
}

function GithubEmbed() {
  const { github } = useConnectors();
  const [data, setData] = useState<GithubData | null>(null);
  const [loading, setLoading] = useState(false);
  const enabled = !!github.account || !!github.token;

  function load() {
    if (!enabled) return;
    setLoading(true);
    ghFetchAll(github.account.trim(), github.token.trim() || undefined)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, [github.account, github.token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Frame type="embed-github" onRefresh={enabled ? load : undefined}>
      {!enabled ? (
        <NotConnected />
      ) : loading && !data ? (
        <Spinner />
      ) : data ? (
        <div className="space-y-2">
          <div className="flex gap-4 text-xs text-muted">
            <span><b className="text-ink">{data.repos.length}</b> repos</span>
            <span><b className="text-ink">{data.openPRs}</b> PRs</span>
            <span><b className="text-ink">{data.openIssues}</b> issues</span>
          </div>
          {data.pulls.slice(0, 4).map((p) => (
            <a key={p.id} href={p.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm hover:underline">
              <GitPullRequest size={12} className="text-emerald-600" />
              <span className="truncate text-ink">{p.title}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted">{repoFromUrl(p.repository_url)}</span>
            </a>
          ))}
          {data.pulls.length === 0 &&
            data.repos.slice(0, 4).map((r) => (
              <a key={r.id} href={r.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm hover:underline">
                <span className="truncate text-ink">{r.name}</span>
                <ExternalLink size={11} className="ml-auto text-muted" />
              </a>
            ))}
        </div>
      ) : (
        <span className="text-sm text-muted">Sin datos.</span>
      )}
    </Frame>
  );
}

function GmailEmbed() {
  const { google } = useConnectors();
  const [emails, setEmails] = useState<EmailItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const enabled = googleTokenValid(google, GMAIL_SCOPE);

  function load() {
    if (!enabled) return;
    setLoading(true);
    gmailFetchInbox(google.accessToken, 6)
      .then(setEmails)
      .catch(() => setEmails(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, [google.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Frame type="embed-gmail" onRefresh={enabled ? load : undefined}>
      {!enabled ? <NotConnected /> : loading && !emails ? <Spinner /> : (
        <div className="space-y-1.5">
          {(emails ?? []).map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-sm">
              <span className={`truncate ${e.unread ? "font-semibold text-ink" : "text-ink/80"}`}>{e.subject}</span>
              <span className="ml-auto shrink-0 rounded bg-bg-subtle px-1 text-[10px] text-muted">{e.category}</span>
            </div>
          ))}
          {emails && emails.length === 0 && <span className="text-sm text-muted">Bandeja vacía.</span>}
        </div>
      )}
    </Frame>
  );
}

function DriveEmbed() {
  const { google } = useConnectors();
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const enabled = googleTokenValid(google, DRIVE_SCOPE);

  function load() {
    if (!enabled) return;
    setLoading(true);
    driveList(google.accessToken, 6)
      .then(setFiles)
      .catch(() => setFiles(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, [google.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Frame type="embed-drive" onRefresh={enabled ? load : undefined}>
      {!enabled ? <NotConnected /> : loading && !files ? <Spinner /> : (
        <div className="space-y-1.5">
          {(files ?? []).map((f) => (
            <a key={f.id} href={f.webViewLink ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm hover:underline">
              {isFolder(f) ? <Folder size={12} className="text-amber-500" /> : <FileText size={12} className="text-muted" />}
              <span className="truncate text-ink">{f.name}</span>
            </a>
          ))}
        </div>
      )}
    </Frame>
  );
}

function TelegramEmbed() {
  const { telegram } = useConnectors();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const enabled = !!telegram.botToken && !!telegram.chatId;

  async function send() {
    setStatus("sending");
    try {
      await tgSendMessage(telegram.botToken, telegram.chatId, alertText("Nota del workspace", text || "—"));
      setStatus("sent");
      setText("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Frame type="embed-telegram">
      {!enabled ? <NotConnected /> : (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enviar una alerta al equipo…"
            className="flex-1 rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={send}
            disabled={status === "sending"}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Enviar
          </button>
        </div>
      )}
      {status === "sent" && <p className="mt-1.5 text-xs text-emerald-600">Enviado ✅</p>}
      {status === "error" && <p className="mt-1.5 text-xs text-red-600">Error al enviar.</p>}
    </Frame>
  );
}
