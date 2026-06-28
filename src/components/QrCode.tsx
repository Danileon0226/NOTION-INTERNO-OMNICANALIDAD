"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renderiza un QR como imagen (data URL). Cliente puro, sin red.
export function QrCode({ value, size = 180, className = "" }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size * 2, // nitidez en pantallas retina
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0e002b", light: "#ffffff" },
    })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(""));
    return () => {
      alive = false;
    };
  }, [value, size]);

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

/** Descarga el QR como PNG. */
export async function downloadQr(value: string, filename: string): Promise<void> {
  const url = await QRCode.toDataURL(value, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0e002b", light: "#ffffff" },
  });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
