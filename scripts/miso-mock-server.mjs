#!/usr/bin/env node
/**
 * Mock OpenAI-compatible Miso One TTS server (dev sin GPU).
 * Soporta: health, voices (formato real + OpenAI), speech WAV y stream PCM.
 */
import http from "node:http";

const PORT = Number(process.env.MISO_MOCK_PORT || 8080);

const VOICES = ["default", "jarvis", "narrator"];

function pcmToWav(pcm, sampleRate = 24000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const buffer = Buffer.alloc(44 + pcm.length);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + pcm.length, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(pcm.length, 40);
  pcm.copy(buffer, 44);
  return buffer;
}

function synthPcm(text, sampleRate = 24000) {
  const durationSec = Math.min(4, Math.max(0.25, text.length * 0.035));
  const samples = Math.floor(sampleRate * durationSec);
  const pcm = Buffer.alloc(samples * 2);
  const freq = 200 + (text.length % 7) * 35;
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, i / (sampleRate * 0.04)) * Math.min(1, (samples - i) / (sampleRate * 0.06));
    const v = Math.sin(2 * Math.PI * freq * t) * 0.28 * env;
    pcm.writeInt16LE(Math.floor(v * 32767), i * 2);
  }
  return pcm;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/health" && req.method === "GET") {
    return json(res, 200, { status: "ok", engine: "miso-mock", version: "2.0.0" });
  }

  if (path === "/v1/models" && req.method === "GET") {
    return json(res, 200, { object: "list", data: [{ id: "miso-tts-8b", object: "model" }] });
  }

  if (path === "/v1/audio/voices" && req.method === "GET") {
    // Formato API real MisoTTS
    return json(res, 200, { voices: VOICES });
  }

  if (path === "/v1/audio/speech" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    let payload;
    try {
      payload = JSON.parse(body || "{}");
    } catch {
      return json(res, 400, { error: "Invalid JSON" });
    }
    const input = String(payload.input || "").trim();
    if (!input) return json(res, 400, { error: "input required" });
    const pcm = synthPcm(input);

    if (payload.stream) {
      cors(res);
      res.writeHead(200, {
        "Content-Type": "audio/L16",
        "X-Sample-Rate": "24000",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      });
      const chunkSize = 4800;
      for (let i = 0; i < pcm.length; i += chunkSize) {
        res.write(pcm.subarray(i, i + chunkSize));
        await new Promise((r) => setTimeout(r, 8));
      }
      res.end();
      return;
    }

    const wav = pcmToWav(pcm);
    cors(res);
    res.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": wav.length });
    res.end(wav);
    return;
  }

  json(res, 404, { error: "not found", path });
});

server.listen(PORT, () => {
  console.log(`[miso-mock] http://localhost:${PORT}`);
  console.log(`[miso-mock] speech: POST /v1/audio/speech (stream: true)`);
});
