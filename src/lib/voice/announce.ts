"use client";

// ── Anuncios de voz de ZERO (eventos importantes) ────────────────────────────
// Locución corta con la síntesis del sistema (SpeechSynthesis), prefiriendo
// una voz es-* si el dispositivo la tiene. Reusa la capa existente de
// src/lib/voice.ts (speak / listVoices / synthesisSupported): aquí solo se
// elige la voz en español y se encolan los anuncios.
//
// A propósito NO pasa por el gestor Miso/Gemini (src/lib/voiceManager.ts):
// los anuncios son frecuentes y breves; la voz local no consume API ni añade
// latencia de red. Respeta la preferencia `voiceAnnounce` (Ajustes).

import { listVoices, speak, synthesisSupported } from "@/lib/voice";
import { usePrefs } from "@/lib/prefs";

// Puntúa voces en español: calidad primero, variantes regionales después.
function esScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/google|natural|neural|premium|enhanced/.test(n)) s += 4;
  if (/^es-(es|mx|us|co|419)/i.test(v.lang)) s += 2;
  if (v.localService) s += 1; // funciona sin red
  return s;
}

/** voiceURI de la mejor voz es-* disponible; undefined si no hay ninguna
 *  (en ese caso `speak` cae al perfil JARVIS por defecto de voice.ts). */
function pickSpanishVoiceURI(): string | undefined {
  const es = listVoices().filter((v) => /^es/i.test(v.lang));
  if (!es.length) return undefined;
  return [...es].sort((a, b) => esScore(b) - esScore(a))[0].voiceURI;
}

// Cola simple: `speak` cancela lo que esté sonando, así que encadenamos con
// onEnd para que dos eventos seguidos no se pisen entre sí.
const queue: string[] = [];
let speaking = false;

function playNext() {
  const text = queue.shift();
  if (!text) {
    speaking = false;
    return;
  }
  speaking = true;
  speak(text, { voiceURI: pickSpanishVoiceURI(), onEnd: playNext });
}

/**
 * Anuncia `text` en voz alta (español). Respeta la preferencia
 * `voiceAnnounce` de Ajustes salvo `opts.force` (botón "Probar").
 */
export function announceEs(text: string, opts: { force?: boolean } = {}): void {
  if (!synthesisSupported() || !text.trim()) return;
  if (!opts.force && !usePrefs.getState().voiceAnnounce) return;
  if (queue.length >= 4) return; // no acumular retrasos si llegan ráfagas
  queue.push(text.trim());
  if (!speaking) playNext();
}
