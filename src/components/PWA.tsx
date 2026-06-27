"use client";

import { useEffect } from "react";

// Registra el service worker para que ZERO funcione como app autónoma
// (instalable + offline). Solo en producción y si el navegador lo soporta.
export function PWA() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const onLoad = () => {
      navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
        /* sin SW: la app sigue funcionando normal */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);
  return null;
}
