"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, Ear, Loader2, Volume2, AudioLines } from "lucide-react";
import { useHandsFree, startHandsFree, stopHandsFree, setNavigator } from "@/lib/voice/handsFree";
import { ensureMicPermission, recognitionSupported } from "@/lib/voice";
import { unlockAudioOutput } from "@/lib/audioPlayer";

// Manos libres global: corre el controlador en cualquier pantalla (salvo /zero,
// que tiene su propia escucha) y muestra un control flotante para activarlo.
export function HandsFree() {
  const enabled = useHandsFree((s) => s.enabled);
  const status = useHandsFree((s) => s.status);
  const heard = useHandsFree((s) => s.heard);
  const error = useHandsFree((s) => s.error);
  const setEnabled = useHandsFree((s) => s.setEnabled);
  const pathname = usePathname();
  const router = useRouter();

  // Permite que el controlador navegue por voz ("Zero, abre Leads").
  useEffect(() => {
    setNavigator((path) => router.push(path));
    return () => setNavigator(null);
  }, [router]);

  // En /zero manda la escucha de la propia página: pausamos el controlador global.
  const onZero = pathname === "/zero";

  useEffect(() => {
    if (enabled && !onZero) startHandsFree();
    else stopHandsFree();
    return () => stopHandsFree();
  }, [enabled, onZero]);

  if (!recognitionSupported() || onZero) return null;

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      return;
    }
    const perm = await ensureMicPermission();
    if (!perm.ok) {
      useHandsFree.getState()._set({ error: perm.message || "Permiso de micrófono denegado." });
      return;
    }
    useHandsFree.getState()._set({ error: null });
    await unlockAudioOutput();
    setEnabled(true);
  }

  const ring =
    status === "awake"
      ? "ring-2 ring-emerald-400/70"
      : status === "thinking"
        ? "ring-2 ring-violet-400/70"
        : status === "speaking"
          ? "ring-2 ring-emerald-400/70"
          : enabled
            ? "ring-2 ring-violet-400/50"
            : "";

  const icon =
    status === "thinking" ? (
      <Loader2 size={18} className="animate-spin" />
    ) : status === "speaking" ? (
      <Volume2 size={18} />
    ) : status === "awake" ? (
      <Ear size={18} />
    ) : enabled ? (
      <AudioLines size={18} />
    ) : (
      <Mic size={18} />
    );

  const hint =
    status === "awake"
      ? "Te escucho…"
      : status === "thinking"
        ? "Pensando…"
        : status === "speaking"
          ? "Respondiendo…"
          : enabled
            ? "Di “Zero…”"
            : "Manos libres";

  // Muestra la transcripción en vivo cuando hay algo oído; si no, el estado.
  const chip = error || (heard ? `“${heard}”` : hint);

  return (
    <div className="fixed bottom-5 left-4 z-40 flex max-w-[70vw] items-center gap-2">
      <button
        onClick={() => void toggle()}
        title={enabled ? "Desactivar manos libres" : "Activar manos libres (di “Zero”)"}
        aria-label="Manos libres"
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-lg transition active:scale-95 ${
          enabled ? "btn-brand" : "glass-pop text-ink"
        } ${ring} ${enabled && status === "listening" && !heard ? "animate-pulse" : ""}`}
      >
        {icon}
      </button>
      {(enabled || error) && (
        <span className={`glass-chip truncate rounded-full px-2.5 py-1 text-[11px] ${error ? "text-amber-600" : heard ? "text-ink" : "text-muted"}`}>
          {chip}
        </span>
      )}
    </div>
  );
}
