"use client";

// ── Notificaciones del navegador (Notification API) ──────────────────────────
// Wrapper mínimo y seguro: no explota en SSR ni en navegadores sin la API
// (Safari viejo, iOS sin PWA instalada) y respeta la preferencia del usuario
// (`notifyEnabled` en Ajustes).
//
// ALCANCE: estas notificaciones funcionan con la app ABIERTA — pestaña activa
// o en segundo plano (otra pestaña/ventana enfocada). Push real con la app
// CERRADA (FCM + claves VAPID + service worker de push) queda para la fase 2.

import { usePrefs } from "@/lib/prefs";

/** Estado de permiso, con "unsupported" para navegadores sin la API. */
export type NotifyPermission = NotificationPermission | "unsupported";

// Icono de la app: src/app/icon.png → Next lo sirve en /icon.png (es también
// el favicon / icono PWA del OS).
const ICON = "/icon.png";

/** ¿El navegador expone la Notification API? (false en SSR y Safari viejo). */
export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Permiso actual sin pedirlo: "default" | "granted" | "denied" | "unsupported". */
export function notifyPermission(): NotifyPermission {
  if (!canNotify()) return "unsupported";
  return Notification.permission;
}

/** Pide el permiso al usuario. Tolera la variante con callback (Safari viejo). */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!canNotify()) return "unsupported";
  try {
    return await new Promise<NotificationPermission>((resolve) => {
      const maybe = Notification.requestPermission(resolve);
      // Navegadores modernos devuelven una promesa; Safari viejo devuelve
      // undefined y resuelve solo por el callback de arriba.
      if (maybe && typeof maybe.then === "function") maybe.then(resolve).catch(() => resolve("denied"));
    });
  } catch {
    return "denied";
  }
}

export interface NotifyOpts {
  /** Agrupa/reemplaza notificaciones con el mismo tag (evita duplicados). */
  tag?: string;
  /** true = ignora la preferencia de Ajustes (p. ej. el botón "Probar"). */
  force?: boolean;
  /** Ruta interna a abrir al hacer clic en la notificación. */
  href?: string;
}

/**
 * Muestra una notificación del sistema. Devuelve true si se pudo emitir.
 * Respeta la preferencia `notifyEnabled` (Ajustes) salvo `opts.force`, y
 * requiere que el permiso del navegador esté concedido.
 */
export function notify(title: string, body?: string, opts: NotifyOpts = {}): boolean {
  if (!canNotify()) return false;
  if (!opts.force && !usePrefs.getState().notifyEnabled) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, { body, tag: opts.tag, icon: ICON, badge: ICON });
    n.onclick = () => {
      try {
        window.focus();
        if (opts.href) window.location.assign(opts.href);
        n.close();
      } catch {
        /* noop */
      }
    };
    return true;
  } catch {
    // Chrome Android no permite `new Notification`: hay que emitirla vía el
    // service worker (lo registra PWA.tsx). Intento silencioso de respaldo.
    try {
      void navigator.serviceWorker?.ready.then((reg) =>
        reg.showNotification(title, { body, tag: opts.tag, icon: ICON, badge: ICON })
      );
      return true;
    } catch {
      return false;
    }
  }
}
