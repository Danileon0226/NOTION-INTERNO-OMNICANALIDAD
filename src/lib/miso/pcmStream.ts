"use client";

import { getSharedAnalyser, unlockAudioOutput } from "@/lib/audioPlayer";

let streamCtx: AudioContext | null = null;
let streamAbort: AbortController | null = null;

function getCtx(sampleRate: number): AudioContext {
  if (!streamCtx || streamCtx.state === "closed") {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    streamCtx = new Ctx({ sampleRate });
  }
  return streamCtx;
}

export function abortPcmStream(): void {
  streamAbort?.abort();
  streamAbort = null;
}

/** Reproduce PCM L16 mono en streaming (Miso `stream: true`). */
export async function playPcmStream(
  response: Response,
  opts: { sampleRate?: number; onFirst?: () => void; signal?: AbortSignal } = {}
): Promise<void> {
  await unlockAudioOutput();
  const sampleRate = opts.sampleRate ?? Number(response.headers.get("X-Sample-Rate") || 24000);
  const ctx = getCtx(sampleRate);
  if (ctx.state === "suspended") await ctx.resume();

  const analyser = getSharedAnalyser();
  const dest = analyser ?? ctx.destination;

  const reader = response.body?.getReader();
  if (!reader) throw new Error("El servidor no devolvió un stream de audio.");

  let nextTime = ctx.currentTime + 0.05;
  let first = false;
  const ac = new AbortController();
  streamAbort = ac;
  const onAbort = () => ac.abort();
  opts.signal?.addEventListener("abort", onAbort);

  try {
    while (true) {
      if (ac.signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.length) continue;

      const aligned = value.byteOffset % 2 === 0 ? value : value.slice();
      const samples = new Int16Array(aligned.buffer, aligned.byteOffset, Math.floor(aligned.byteLength / 2));
      if (!samples.length) continue;

      const floats = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) floats[i] = Math.max(-1, Math.min(1, samples[i] / 32768));

      const buf = ctx.createBuffer(1, floats.length, sampleRate);
      buf.copyToChannel(floats, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(dest);
      const startAt = Math.max(nextTime, ctx.currentTime);
      src.start(startAt);
      nextTime = startAt + buf.duration;

      if (!first) {
        first = true;
        opts.onFirst?.();
      }
    }
    const waitMs = Math.max(0, (nextTime - ctx.currentTime) * 1000);
    if (waitMs > 0 && !ac.signal.aborted) {
      await new Promise((r) => setTimeout(r, waitMs));
    }
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
    if (streamAbort === ac) streamAbort = null;
  }
}
