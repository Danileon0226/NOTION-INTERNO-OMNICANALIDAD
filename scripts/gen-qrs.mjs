#!/usr/bin/env node
/**
 * Genera los QRs estándar de la agencia (admin y dev) como PNG de 1024 px:
 * QR con tinta de marca + isotipo Zero al centro sobre placa blanca redondeada.
 * Deben coincidir con los presets de /vincular (códigos fijos).
 *
 * Uso: node scripts/gen-qrs.mjs <outDir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = "https://notion-interno-omnicanalidad-4p4e.vercel.app";
const LOGO = path.join(__dirname, "..", "src", "brand", "zero-mark.png");
const LADO = 1024; // px del PNG final
const TINTA = "#0e002b"; // tinta de marca (módulos oscuros)

// Mismos códigos fijos que los presets de src/app/vincular/page.tsx.
const PRESETS = [
  { code: "zadmin-x7k9m2", file: "zero-qr-admin.png", label: "Administradores" },
  { code: "zcom-t5r3j8", file: "zero-qr-comercial.png", label: "Chief Comercial" },
  { code: "zdev-p4w8n6", file: "zero-qr-dev.png", label: "Desarrolladores" },
];

const outDir = process.argv[2];
if (!outDir) {
  console.error("Uso: node scripts/gen-qrs.mjs <outDir>");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

async function generar({ code, file, label }) {
  const url = `${BASE_URL}/unirse?invite=${encodeURIComponent(code)}`;

  // QR base: corrección "H" porque el isotipo tapa el centro.
  const qr = await QRCode.toBuffer(url, {
    width: LADO,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: TINTA, light: "#ffffff" },
  });

  // Placa blanca redondeada (~24% del ancho) e isotipo (~20% del ancho).
  const placaLado = Math.round(LADO * 0.24);
  const logoLado = Math.round(LADO * 0.2);
  const radio = Math.round(placaLado * 0.22);
  const placa = Buffer.from(
    `<svg width="${placaLado}" height="${placaLado}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${placaLado}" height="${placaLado}" rx="${radio}" fill="#ffffff"/></svg>`
  );
  const logo = await sharp(LOGO)
    .resize(logoLado, logoLado, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  const destino = path.join(outDir, file);
  await sharp(qr)
    .composite([
      { input: placa, gravity: "center" },
      { input: logo, gravity: "center" },
    ])
    .png()
    .toFile(destino);
  console.log(`✔ ${label}: ${destino} → ${url}`);
}

for (const preset of PRESETS) {
  await generar(preset);
}
