#!/usr/bin/env node
/**
 * Prueba autónoma de integración Miso One (API + contrato WAV + CORS).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.MISO_TEST_URL || "http://localhost:8080/v1").replace(/\/+$/, "");
const OUT_DIR = path.join(__dirname, ".miso-test-output");

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name, detail) {
  failed++;
  console.error(`  ✗ ${name}`);
  if (detail) console.error(`    ${detail}`);
}

function assert(cond, name, detail) {
  if (cond) ok(name);
  else fail(name, detail);
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { res, json, text };
}

function isValidWav(buf) {
  if (buf.length < 44) return false;
  const riff = buf.toString("ascii", 0, 4);
  const wave = buf.toString("ascii", 8, 12);
  const fmt = buf.toString("ascii", 12, 16);
  return riff === "RIFF" && wave === "WAVE" && fmt === "fmt ";
}

async function testHealth() {
  const { res, json } = await fetchJson(`${BASE.replace(/\/v1$/, "")}/health`);
  assert(res.ok, "GET /health → 200");
  assert(json?.status === "ok", "GET /health → status ok");
}

async function testModels() {
  const { res, json } = await fetchJson(`${BASE}/models`);
  assert(res.ok, "GET /v1/models → 200");
  const ids = (json?.data || []).map((m) => m.id);
  assert(ids.includes("miso-tts-8b"), "GET /v1/models incluye miso-tts-8b");
}

async function testVoices() {
  const { res, json } = await fetchJson(`${BASE}/audio/voices`);
  assert(res.ok, "GET /v1/audio/voices → 200");
  const voices = json?.voices || json?.data || json;
  assert(Array.isArray(voices) && voices.length > 0, "Lista de voces no vacía");
}

async function testSpeech() {
  const payload = {
    model: "miso-tts-8b",
    input: "Sistemas en línea. Soy ZERO, su gestor de conciencia.",
    voice: "default",
    response_format: "wav",
  };
  const res = await fetch(`${BASE}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert(res.ok, `POST /v1/audio/speech → ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  assert(ct.includes("audio") || ct.includes("wav"), "Content-Type es audio");
  const buf = Buffer.from(await res.arrayBuffer());
  assert(buf.length > 1000, `WAV > 1KB (${buf.length} bytes)`);
  assert(isValidWav(buf), "Cabecera RIFF/WAVE válida");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, "zero-test.wav");
  fs.writeFileSync(out, buf);
  ok(`Audio guardado en ${out}`);
}

async function testCors() {
  const res = await fetch(`${BASE}/audio/speech`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });
  const acao = res.headers.get("access-control-allow-origin");
  assert(res.status === 204 || res.ok, "OPTIONS preflight aceptado");
  assert(acao === "*" || acao === "http://localhost:3000", "CORS Allow-Origin presente");
}

async function testVoiceManagerContract() {
  // Simula voiceMiso.ts (mismo contrato que el cliente)
  const res = await fetch(`${BASE}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "miso-tts-8b",
      input: "Test chunk one.",
      voice: "default",
      response_format: "wav",
    }),
  });
  assert(res.ok, "Contrato voiceMiso.ts (speech)");
  const blob = await res.blob();
  assert(blob.size > 500, `Blob URL viable (${blob.size} bytes)`);
}

async function testChunkedPipeline() {
  const chunks = [
    "Primera frase de prueba.",
    "Segunda frase para pipeline.",
    "Tercera frase final.",
  ];
  let total = 0;
  for (const c of chunks) {
    const res = await fetch(`${BASE}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "miso-tts-8b", input: c, voice: "default", response_format: "wav" }),
    });
    if (!res.ok) {
      fail("Pipeline por frases", `chunk failed ${res.status}`);
      return;
    }
    total += (await res.arrayBuffer()).byteLength;
  }
  assert(total > 3000, `Pipeline 3 frases → ${total} bytes total`);
}

async function main() {
  console.log("\n=== Prueba autónoma Miso One ===");
  console.log(`Base URL: ${BASE}\n`);

  try {
    await testHealth();
    await testModels();
    await testVoices();
    await testSpeech();
    await testCors();
    await testVoiceManagerContract();
    await testChunkedPipeline();
  } catch (e) {
    fail("Conexión al servidor", (e).message);
    console.error("\n¿Está corriendo el servidor?  node scripts/miso-mock-server.mjs\n");
    process.exit(1);
  }

  console.log(`\n--- Resultado: ${passed} OK, ${failed} FAIL ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
