"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import zeroMark from "@/brand/zero-mark.png";

// Tinta de marca por defecto para los módulos del QR.
const TINTA_MARCA = "#0e002b";

interface OpcionesQr {
  width: number; // ancho real del PNG en px
  margin?: number; // margen en módulos
  logo?: boolean; // compone el isotipo Zero al centro
  accent?: string; // color hex de los módulos oscuros
}

/** Carga una imagen del navegador como elemento listo para dibujar en canvas. */
function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen del QR."));
    img.src = src;
  });
}

/** Traza un rectángulo redondeado (compatible con navegadores sin roundRect). */
function trazarRedondeado(ctx: CanvasRenderingContext2D, x: number, y: number, lado: number, radio: number) {
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.lineTo(x + lado - radio, y);
  ctx.arcTo(x + lado, y, x + lado, y + radio, radio);
  ctx.lineTo(x + lado, y + lado - radio);
  ctx.arcTo(x + lado, y + lado, x + lado - radio, y + lado, radio);
  ctx.lineTo(x + radio, y + lado);
  ctx.arcTo(x, y + lado, x, y + lado - radio, radio);
  ctx.lineTo(x, y + radio);
  ctx.arcTo(x, y, x + radio, y, radio);
  ctx.closePath();
}

/**
 * Genera el QR como data URL. Con `logo` activa la máxima corrección de
 * errores ("H") y compone el isotipo de la marca al centro sobre una placa
 * blanca redondeada (~22% del ancho), todo en un canvas fuera de pantalla.
 */
export async function qrDataUrl(value: string, { width, margin = 1, logo = false, accent }: OpcionesQr): Promise<string> {
  const base = await QRCode.toDataURL(value, {
    width,
    margin,
    // Con el isotipo tapando el centro necesitamos corrección "H".
    errorCorrectionLevel: logo ? "H" : "M",
    color: { dark: accent || TINTA_MARCA, light: "#ffffff" },
  });
  if (!logo) return base;

  const [qr, marca] = await Promise.all([cargarImagen(base), cargarImagen(zeroMark.src)]);
  const canvas = document.createElement("canvas");
  canvas.width = qr.width;
  canvas.height = qr.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return base; // sin canvas 2D: devolvemos el QR sin marca

  ctx.drawImage(qr, 0, 0);

  // Placa blanca redondeada al centro para que el isotipo no pise los módulos.
  const placa = Math.round(canvas.width * 0.22);
  const esquina = (canvas.width - placa) / 2;
  ctx.fillStyle = "#ffffff";
  trazarRedondeado(ctx, esquina, esquina, placa, Math.round(placa * 0.24));
  ctx.fill();

  // Isotipo centrado dentro de la placa.
  const lado = Math.round(placa * 0.78);
  const inicio = (canvas.width - lado) / 2;
  ctx.drawImage(marca, inicio, inicio, lado, lado);

  return canvas.toDataURL("image/png");
}

// Renderiza un QR como imagen (data URL). Cliente puro, sin red.
export function QrCode({
  value,
  size = 180,
  className = "",
  logo = false,
  accent,
}: {
  value: string;
  size?: number;
  className?: string;
  logo?: boolean;
  accent?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    qrDataUrl(value, {
      width: size * 2, // nitidez en pantallas retina
      margin: 1,
      logo,
      accent,
    })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(""));
    return () => {
      alive = false;
    };
  }, [value, size, logo, accent]);

  if (!src) {
    return <div className="animate-pulse rounded-xl bg-bg-subtle" style={{ width: size, height: size }} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Código QR de vinculación"
      width={size}
      height={size}
      className={`rounded-xl bg-white p-2 shadow ${className}`}
    />
  );
}

/** Descarga el QR como PNG (con isotipo de marca si `logo` está activo). */
export async function downloadQr(
  value: string,
  filename: string,
  opts: { logo?: boolean; accent?: string } = {}
): Promise<void> {
  const url = await qrDataUrl(value, { width: 1024, margin: 2, logo: opts.logo, accent: opts.accent });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
