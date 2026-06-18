"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, RefreshCw, Loader2, X } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { useConnectors, googleTokenValid, GMAIL_SCOPE, DRIVE_SCOPE } from "@/lib/connectors/store";
import { useActivity, sourceMeta } from "@/lib/activity";
import { useVault, pickVault, scanVault } from "@/lib/obsidian";

type NType = "hub" | "ws" | "source" | "page" | "item";
interface Node {
  id: string;
  label: string;
  type: NType;
  color: string;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
  pageId?: string;
}
interface Edge {
  a: string;
  b: string;
  len: number;
}

const SRCS = ["gmail", "github", "google-drive", "telegram"] as const;

export function GraphView() {
  const router = useRouter();
  const pages = useWorkspace((s) => s.pages);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const conn = useConnectors();
  const events = useActivity((s) => s.events);
  const pushActivity = useActivity((s) => s.push);
  const vault = useVault();
  const [status, setStatus] = useState<"idle" | "scanning">("idle");
  const [auto, setAuto] = useState(false);
  const [err, setErr] = useState("");

  const scan = useCallback(
    async (handle: unknown) => {
      setStatus("scanning");
      setErr("");
      try {
        const notes = await scanVault(handle);
        useVault.getState().setNotes(notes);
        const links = notes.reduce((a, n) => a + n.links.length, 0);
        pushActivity({
          source: "ai",
          kind: "integrate",
          label: `La IA indexó ${notes.length} notas y ${links} enlaces de Obsidian`,
          count: notes.length,
        });
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setStatus("idle");
      }
    },
    [pushActivity]
  );

  const connect = useCallback(async () => {
    setErr("");
    try {
      const handle = await pickVault();
      useVault.getState().setVault(handle, handle.name ?? "Bóveda");
      await scan(handle);
    } catch (e) {
      const er = e as Error;
      if (er.name !== "AbortError") setErr(er.message);
    }
  }, [scan]);

  // Auto-reescaneo de la bóveda (la IA reindexa en tiempo real).
  useEffect(() => {
    if (!auto || !vault.handle) return;
    const t = setInterval(() => scan(vault.handle), 8000);
    return () => clearInterval(t);
  }, [auto, vault.handle, scan]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Map<string, Node>>(new Map());
  const edgesRef = useRef<Edge[]>([]);
  const hoverRef = useRef<string | null>(null);
  const dragRef = useRef<string | null>(null);
  const sizeRef = useRef({ w: 800, h: 460 });

  const connected: Record<string, boolean> = {
    gmail: googleTokenValid(conn.google, GMAIL_SCOPE),
    "google-drive": googleTokenValid(conn.google, DRIVE_SCOPE),
    github: !!conn.github.account || !!conn.github.token,
    telegram: !!conn.telegram.botToken,
  };

  // Reconstruye el conjunto de nodos/aristas reutilizando posiciones existentes.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    const cx = w / 2;
    const cy = h / 2;
    const prev = nodesRef.current;
    const next = new Map<string, Node>();
    const edges: Edge[] = [];

    const ensure = (
      id: string,
      base: Omit<Node, "x" | "y" | "vx" | "vy">,
      near?: { x: number; y: number }
    ) => {
      const old = prev.get(id);
      next.set(id, {
        ...base,
        x: old?.x ?? (near?.x ?? cx) + (Math.random() - 0.5) * 80,
        y: old?.y ?? (near?.y ?? cy) + (Math.random() - 0.5) * 80,
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0,
        fixed: base.fixed,
      });
    };

    ensure("hub", { id: "hub", label: "IA", type: "hub", color: "#2383e2", r: 16, fixed: false });
    ensure("ws", { id: "ws", label: "Workspace", type: "ws", color: "#37352f", r: 13 });
    edges.push({ a: "hub", b: "ws", len: 90 });

    const notes = vault.notes;
    if (notes.length) {
      // ── Grafo real de la bóveda de Obsidian (notas + [[enlaces]] + #tags) ──
      const wsNode = next.get("ws");
      if (wsNode) wsNode.label = vault.name || "Bóveda";
      const cap = notes.slice(0, 320);
      const titleMap = new Map<string, string>();
      cap.forEach((n) => titleMap.set(n.title.toLowerCase(), n.path));
      const degree = new Map<string, number>();
      const inc = (id: string) => degree.set(id, (degree.get(id) || 0) + 1);
      const linkEdges: Edge[] = [];
      const tagSet = new Set<string>();
      for (const n of cap) {
        for (const link of n.links) {
          const tp = titleMap.get(link.toLowerCase());
          if (tp && tp !== n.path) {
            linkEdges.push({ a: `nt-${n.path}`, b: `nt-${tp}`, len: 58 });
            inc(`nt-${n.path}`);
            inc(`nt-${tp}`);
          }
        }
        for (const tag of n.tags.slice(0, 5)) {
          tagSet.add(tag);
          linkEdges.push({ a: `nt-${n.path}`, b: `tag-${tag}`, len: 46 });
          inc(`nt-${n.path}`);
          inc(`tag-${tag}`);
        }
      }
      for (const n of cap) {
        const deg = degree.get(`nt-${n.path}`) || 0;
        ensure(
          `nt-${n.path}`,
          {
            id: `nt-${n.path}`,
            label: n.title,
            type: "page",
            color: deg ? "#7c6f9b" : "#bcbbb7",
            r: 5 + Math.min(deg, 9),
          },
          prev.get("ws")
        );
        if (deg === 0) edges.push({ a: "ws", b: `nt-${n.path}`, len: 130 });
      }
      for (const tag of [...tagSet].slice(0, 80)) {
        ensure(`tag-${tag}`, { id: `tag-${tag}`, label: `#${tag}`, type: "page", color: "#c2a33b", r: 5 });
      }
      edges.push(...linkEdges);
    } else {
      // ── Fallback: grafo del workspace + conectores ──
      for (const s of SRCS) {
        ensure(`src-${s}`, {
          id: `src-${s}`,
          label: sourceMeta[s].label,
          type: "source",
          color: connected[s] ? sourceMeta[s].color : "#c7c7c5",
          r: 11,
        });
        edges.push({ a: "hub", b: `src-${s}`, len: 110 });
      }
      for (const p of pages) {
        ensure(`pg-${p.id}`, {
          id: `pg-${p.id}`,
          label: `${p.icon} ${p.title}`,
          type: "page",
          color: "#9b9a97",
          r: 7,
          pageId: p.id,
        });
        if (p.parentId) edges.push({ a: `pg-${p.parentId}`, b: `pg-${p.id}`, len: 60 });
        else edges.push({ a: "ws", b: `pg-${p.id}`, len: 90 });
        for (const b of p.blocks) {
          if (b.type.startsWith("embed-")) {
            const s = b.type.replace("embed-", "");
            if (next.has(`src-${s}`)) edges.push({ a: `pg-${p.id}`, b: `src-${s}`, len: 80 });
          }
        }
      }
      for (const e of events.slice(0, 14)) {
        if (!SRCS.includes(e.source as (typeof SRCS)[number])) continue;
        const id = `it-${e.id}`;
        ensure(
          id,
          { id, label: "", type: "item", color: sourceMeta[e.source].color, r: 3.5 },
          prev.get(`src-${e.source}`)
        );
        edges.push({ a: `src-${e.source}`, b: id, len: 34 });
      }
    }

    nodesRef.current = next;
    edgesRef.current = edges;
  }, [pages, events, vault.notes, vault.scannedAt, vault.name, conn.google.accessToken, conn.github.account, conn.github.token, conn.telegram.botToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulación + render.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    function resize() {
      const parent = canvas!.parentElement!;
      const w = parent.clientWidth;
      const h = w < 640 ? 340 : 460;
      sizeRef.current = { w, h };
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function step() {
      const { w, h } = sizeRef.current;
      const nodes = [...nodesRef.current.values()];
      const map = nodesRef.current;
      const cx = w / 2;
      const cy = h / 2;

      // repulsión
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = Math.random();
            dy = Math.random();
            d2 = 1;
          }
          const d = Math.sqrt(d2);
          const f = 1400 / d2;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      // resortes (aristas)
      for (const e of edgesRef.current) {
        const a = map.get(e.a);
        const b = map.get(e.b);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - e.len) * 0.02;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // centrado + integración
      for (const n of nodes) {
        n.vx += (cx - n.x) * 0.002;
        n.vy += (cy - n.y) * 0.002;
        n.vx *= 0.86;
        n.vy *= 0.86;
        if (dragRef.current === n.id) continue;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(n.r, Math.min(w - n.r, n.x));
        n.y = Math.max(n.r, Math.min(h - n.r, n.y));
      }

      // draw
      ctx.clearRect(0, 0, w, h);
      const hover = hoverRef.current;
      const neighbors = new Set<string>();
      if (hover) {
        for (const e of edgesRef.current) {
          if (e.a === hover) neighbors.add(e.b);
          if (e.b === hover) neighbors.add(e.a);
        }
      }
      // edges
      for (const e of edgesRef.current) {
        const a = map.get(e.a);
        const b = map.get(e.b);
        if (!a || !b) continue;
        const active = hover && (e.a === hover || e.b === hover);
        ctx.strokeStyle = active ? "#2383e2" : "#e6e6e4";
        ctx.lineWidth = active ? 1.6 : 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // nodes
      for (const n of nodes) {
        const dim = hover && n.id !== hover && !neighbors.has(n.id);
        ctx.globalAlpha = dim ? 0.35 : 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        if (n.type === "hub" || n.type === "ws" || n.id === hover) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        }
        // labels
        const showLabel =
          n.type === "hub" || n.type === "ws" || n.type === "source" || n.id === hover || neighbors.has(n.id);
        if (showLabel && n.label) {
          ctx.globalAlpha = dim ? 0.4 : 1;
          ctx.fillStyle = "#37352f";
          ctx.font = `${n.type === "hub" ? 12 : 10}px ui-sans-serif, system-ui`;
          ctx.textAlign = "center";
          ctx.fillText(trim(n.label), n.x, n.y + n.r + 11);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);

    // interacción
    function pick(mx: number, my: number): Node | null {
      let best: Node | null = null;
      let bd = 18 * 18;
      for (const n of nodesRef.current.values()) {
        const dx = n.x - mx;
        const dy = n.y - my;
        const d = dx * dx + dy * dy;
        if (d < bd && d < (n.r + 8) * (n.r + 8)) {
          bd = d;
          best = n;
        }
      }
      return best;
    }
    function pos(ev: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    }
    function onMove(ev: PointerEvent) {
      const { x, y } = pos(ev);
      if (dragRef.current) {
        ev.preventDefault();
        const n = nodesRef.current.get(dragRef.current);
        if (n) {
          n.x = x;
          n.y = y;
          n.vx = 0;
          n.vy = 0;
        }
        return;
      }
      const hit = pick(x, y);
      hoverRef.current = hit?.id ?? null;
      canvas!.style.cursor = hit ? "pointer" : "default";
    }
    function onDown(ev: PointerEvent) {
      const { x, y } = pos(ev);
      const hit = pick(x, y);
      if (hit) {
        dragRef.current = hit.id;
        try {
          canvas!.setPointerCapture(ev.pointerId);
        } catch {
          /* noop */
        }
      }
    }
    function onUp(ev: PointerEvent) {
      const id = dragRef.current;
      dragRef.current = null;
      if (!id) return;
      const { x, y } = pos(ev);
      const n = nodesRef.current.get(id);
      if (n && Math.abs(n.x - x) < 4 && Math.abs(n.y - y) < 4 && n.pageId) {
        setActivePage(n.pageId);
        router.push("/pages");
      }
    }
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [router, setActivePage]);

  return (
    <div className="rounded-xl border bg-[#fbfbfa]">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {!vault.notes.length ? (
          <button
            onClick={connect}
            disabled={!vault.supported}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <FolderOpen size={14} /> Conectar bóveda de Obsidian
          </button>
        ) : (
          <>
            <span className="text-sm font-medium text-ink">📓 {vault.name}</span>
            <span className="text-xs text-muted">{vault.notes.length} notas</span>
            <button
              onClick={() => scan(vault.handle)}
              className="ml-1 inline-flex items-center gap-1 rounded-md border glass-card px-2 py-1 text-xs text-ink hover:bg-bg-subtle"
            >
              {status === "scanning" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Re-escanear
            </button>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                className="accent-accent"
              />
              Auto
            </label>
            <button
              onClick={() => {
                useVault.getState().reset();
                setAuto(false);
              }}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-500"
            >
              <X size={12} /> Desconectar
            </button>
          </>
        )}
        <span className="ml-auto text-[11px] text-muted">arrastra nodos · clic para abrir</span>
      </div>
      {err && <div className="px-3 py-1.5 text-xs text-red-600">{err}</div>}
      {!vault.supported && !vault.notes.length && (
        <div className="px-3 py-1.5 text-[11px] text-amber-600">
          Tu navegador no soporta acceso a carpetas. Usa Chrome o Edge (escritorio) para conectar la bóveda.
        </div>
      )}
      <canvas ref={canvasRef} className="block w-full touch-none rounded-b-xl" />
    </div>
  );
}

function trim(s: string): string {
  return s.length > 22 ? s.slice(0, 21) + "…" : s;
}
