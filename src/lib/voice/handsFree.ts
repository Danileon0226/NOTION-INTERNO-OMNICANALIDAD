"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { runAgent, type ChatMsg } from "@/lib/ai/agent";
import { speakOut, stopVoice } from "@/lib/voiceManager";
import { unlockAudioOutput } from "@/lib/audioPlayer";
import { createRecognition, recognitionSupported } from "@/lib/voice";

// Manos libres global: escucha continua de la palabra de activación ("Zero") en
// cualquier pantalla. Al oírla, captura la orden, la pasa al agente y responde
// con voz — sin tocar nada. (Reconocimiento Web Speech: Chrome/Edge de escritorio.)

export type HFStatus = "off" | "listening" | "awake" | "thinking" | "speaking";

interface HFState {
  enabled: boolean; // preferencia del usuario (persistida)
  status: HFStatus;
  lastText: string;
  error: string | null;
  setEnabled: (b: boolean) => void;
  _set: (p: Partial<Pick<HFState, "status" | "lastText" | "error" | "enabled">>) => void;
}

export const useHandsFree = create<HFState>()(
  persist(
    (set) => ({
      enabled: false,
      status: "off",
      lastText: "",
      error: null,
      setEnabled: (enabled) => set({ enabled }),
      _set: (p) => set(p),
    }),
    { name: "zero-agency-handsfree", partialize: (s) => ({ enabled: s.enabled }) }
  )
);

// Palabras de activación (sin acentos; el transcript se normaliza).
const WAKE = ["oye zero", "hey zero", "oye cero", "hola zero", "zero", "cero"];
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

let rec: any = null;
let active = false; // controlador en marcha (lo gobierna el daemon)
let armed = false; // oyó la palabra de activación, espera la orden
let busy = false; // procesando/hablando
let armTimer: any = null;
let history: ChatMsg[] = [];

function setStatus(s: HFStatus) {
  useHandsFree.getState()._set({ status: s });
}

/** Detecta la palabra de activación cerca del inicio y devuelve la orden que la sigue. */
function parseWake(text: string): { wake: boolean; cmd: string } {
  const n = norm(text).trim();
  for (const w of WAKE) {
    const idx = n.indexOf(w);
    if (idx >= 0 && idx <= 8) {
      return { wake: true, cmd: n.slice(idx + w.length).replace(/^[\s,.:;¿?]+/, "") };
    }
  }
  return { wake: false, cmd: "" };
}

async function handleCommand(raw: string) {
  if (busy || !raw.trim()) return;
  busy = true;
  armed = false;
  clearTimeout(armTimer);
  stopRec();
  setStatus("thinking");
  useHandsFree.getState()._set({ lastText: raw });
  try {
    await unlockAudioOutput();
    const res = await runAgent(raw, history, undefined, "voz manos libres");
    history = [...history, { role: "user", text: raw } as ChatMsg, { role: "model", text: res.text } as ChatMsg].slice(-12);
    setStatus("speaking");
    speakOut(res.text, { onEnd: resumeAfterSpeak });
  } catch (e) {
    setStatus("speaking");
    speakOut(`No pude completar eso. ${(e as Error).message}`, { onEnd: resumeAfterSpeak });
  }
}

function resumeAfterSpeak() {
  busy = false;
  if (active && useHandsFree.getState().enabled) startRec();
  else setStatus("off");
}

function onResult(e: any) {
  let finalText = "";
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
  }
  if (!finalText.trim() || busy) return;

  if (armed) {
    handleCommand(finalText.trim());
    return;
  }
  const { wake, cmd } = parseWake(finalText);
  if (!wake) return;
  if (cmd) {
    handleCommand(cmd);
    return;
  }
  // Solo la palabra de activación: confirma y espera la orden.
  armed = true;
  setStatus("awake");
  stopRec();
  speakOut("¿Sí?", {
    onEnd: () => {
      if (!active || !useHandsFree.getState().enabled) return;
      startRec();
      clearTimeout(armTimer);
      armTimer = setTimeout(() => {
        if (armed && !busy) {
          armed = false;
          setStatus("listening");
        }
      }, 9000);
    },
  });
}

function onErr(e: any) {
  const code = String(e?.error || "");
  if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
    useHandsFree.getState()._set({ enabled: false, status: "off", error: "Micrófono bloqueado o no disponible." });
    stopHandsFree();
  }
}

function onEnd() {
  // El reconocimiento se corta solo tras silencio: reanuda si seguimos activos.
  if (active && useHandsFree.getState().enabled && !busy) {
    try {
      rec.start();
    } catch {
      /* ya iniciado */
    }
  }
}

function startRec() {
  if (busy) return;
  if (!recognitionSupported()) {
    useHandsFree.getState()._set({ error: "El reconocimiento de voz requiere Chrome o Edge." });
    return;
  }
  if (!rec) {
    rec = createRecognition("es-ES");
    if (!rec) return;
    rec.onresult = onResult;
    rec.onerror = onErr;
    rec.onend = onEnd;
  }
  try {
    rec.start();
    setStatus(armed ? "awake" : "listening");
  } catch {
    /* ya iniciado */
  }
}

function stopRec() {
  try {
    rec?.stop();
  } catch {
    /* noop */
  }
}

/** Arranca el controlador (lo llama el daemon cuando procede). */
export function startHandsFree() {
  if (active) return;
  active = true;
  armed = false;
  busy = false;
  startRec();
}

/** Detiene el controlador sin cambiar la preferencia del usuario. */
export function stopHandsFree() {
  active = false;
  armed = false;
  busy = false;
  clearTimeout(armTimer);
  stopRec();
  stopVoice();
  setStatus("off");
}
