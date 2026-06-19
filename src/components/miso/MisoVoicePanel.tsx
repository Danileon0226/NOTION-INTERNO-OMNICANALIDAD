"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Radio, Wifi, WifiOff, Zap } from "lucide-react";
import { useAi } from "@/lib/ai/store";
import {
  MISO_STYLE_PRESETS,
  checkMisoHealth,
  listMisoVoices,
  probeMiso,
} from "@/lib/voiceMiso";
import type { MisoConnectionStatus, MisoVoiceOption } from "@/lib/miso/types";

interface MisoVoicePanelProps {
  onTestVoice?: () => void;
  testing?: boolean;
}

export function MisoVoicePanel({ onTestVoice, testing }: MisoVoicePanelProps) {
  const { misoTtsUrl, misoVoice, misoStream, misoSpeed, misoStyle, setVoice } = useAi();
  const [voices, setVoices] = useState<MisoVoiceOption[]>([]);
  const [status, setStatus] = useState<MisoConnectionStatus>("unknown");
  const [latency, setLatency] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);

  const refresh = useCallback(async (force = false) => {
    if (!misoTtsUrl.trim()) {
      setStatus("offline");
      setStatusMsg("Configura la URL del servidor.");
      return;
    }
    setStatus("checking");
    const health = await checkMisoHealth(misoTtsUrl, force);
    setLatency(health.latencyMs ?? null);
    if (health.ok) {
      setStatus("online");
      setStatusMsg(health.latencyMs != null ? `${health.latencyMs} ms` : "Conectado");
      const v = await listMisoVoices(misoTtsUrl);
      setVoices(v);
      if (!v.some((x) => x.id === misoVoice) && v[0]) setVoice({ misoVoice: v[0].id });
    } else {
      setStatus("offline");
      setStatusMsg(health.error || "Sin conexión");
      setVoices([]);
    }
  }, [misoTtsUrl, misoVoice, setVoice]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function probe() {
    setProbing(true);
    try {
      const r = await probeMiso(misoTtsUrl);
      setLatency(r.latencyMs ?? null);
      setStatus(r.ok ? "online" : "offline");
      setStatusMsg(r.ok ? `OK · ${r.latencyMs} ms · ${r.voices.length} voces` : r.error || "Error");
      if (r.voices.length) setVoices(r.voices);
    } finally {
      setProbing(false);
    }
  }

  const statusColor =
    status === "online" ? "text-emerald-300" : status === "checking" ? "text-violet-200" : "text-amber-300";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs ${statusColor}`}>
          {status === "online" ? <Wifi size={13} /> : status === "checking" ? <Loader2 size={13} className="animate-spin" /> : <WifiOff size={13} />}
          {status === "online" ? "Miso One en línea" : status === "checking" ? "Comprobando…" : "Miso One offline"}
          {latency != null && status === "online" && <span className="text-violet-100/50">· {latency} ms</span>}
        </span>
        <button
          type="button"
          onClick={() => void probe()}
          disabled={probing || !misoTtsUrl.trim()}
          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-0.5 text-[10px] text-violet-100 hover:bg-white/5 disabled:opacity-50"
        >
          {probing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          Probar conexión
        </button>
      </div>
      {statusMsg && status !== "online" && (
        <p className="text-[11px] text-amber-200/80">{statusMsg}</p>
      )}

      <label className="block text-xs text-violet-100/70">
        URL del servidor (OpenAI-compatible)
        <input
          type="url"
          value={misoTtsUrl}
          onChange={(e) => setVoice({ misoTtsUrl: e.target.value })}
          onBlur={() => void refresh(true)}
          placeholder="http://localhost:8080/v1"
          className="mt-1 w-full rounded-md border border-white/15 bg-[#0a0e1a] px-2 py-1.5 text-sm text-white"
        />
      </label>

      <label className="block text-xs text-violet-100/70">
        Voz
        <select
          value={misoVoice}
          onChange={(e) => setVoice({ misoVoice: e.target.value })}
          className="mt-1 w-full rounded-md border border-white/15 bg-[#0a0e1a] px-2 py-1.5 text-sm text-white"
        >
          {(voices.length ? voices : [{ id: "default", label: "default" }]).map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}{v.description ? ` · ${v.description}` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-violet-100/70">
        Estilo / dirección (preset JARVIS u otro)
        <select
          value={MISO_STYLE_PRESETS.some((p) => p.id === misoStyle) ? misoStyle : "custom"}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "custom") setVoice({ misoStyle: v });
          }}
          className="mt-1 w-full rounded-md border border-white/15 bg-[#0a0e1a] px-2 py-1.5 text-sm text-white"
        >
          {MISO_STYLE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
          <option value="custom">Personalizado (abajo)</option>
        </select>
      </label>

      {!MISO_STYLE_PRESETS.some((p) => p.id === misoStyle) && (
        <label className="block text-xs text-violet-100/70">
          Prompt de estilo personalizado
          <textarea
            value={misoStyle}
            onChange={(e) => setVoice({ misoStyle: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-md border border-white/15 bg-[#0a0e1a] px-2 py-1.5 text-sm text-white"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-violet-100/70">
          <input
            type="checkbox"
            checked={misoStream}
            onChange={(e) => setVoice({ misoStream: e.target.checked })}
            className="accent-emerald-400"
          />
          <Zap size={12} /> Streaming (baja latencia)
        </label>
        <label className="flex items-center gap-1.5 text-xs text-violet-100/70">
          <Radio size={12} />
          Velocidad: {misoSpeed.toFixed(2)}
          <input
            type="range"
            min={0.85}
            max={1.15}
            step={0.01}
            value={misoSpeed}
            onChange={(e) => setVoice({ misoSpeed: Number(e.target.value) })}
            className="w-24 accent-emerald-400"
          />
        </label>
      </div>

      {onTestVoice && (
        <button
          type="button"
          onClick={onTestVoice}
          disabled={testing || !misoTtsUrl.trim() || status === "offline"}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {testing ? <Loader2 size={12} className="animate-spin" /> : null}
          Probar voz Miso One
        </button>
      )}

      <p className="text-[11px] leading-relaxed text-violet-100/45">
        Miso TTS 8B es expresivo y funciona mejor en inglés. Para español, ZERO usa Gemini o voz del sistema como respaldo.
        Arranca el servidor con <code className="text-violet-200/80">npm run miso:mock</code> (dev) o Docker con GPU (prod).
      </p>
    </div>
  );
}
