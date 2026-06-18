"use client";

import { useEffect } from "react";
import { refreshDataBank } from "@/lib/ai/dataBank";

// Mantiene el banco de datos caliente: refresca al arrancar y cada 3 min, para
// que el acceso del agente a la información sea instantáneo.
export function DataBankDaemon() {
  useEffect(() => {
    const kick = setTimeout(() => void refreshDataBank(true), 3000);
    const t = setInterval(() => void refreshDataBank(true), 3 * 60_000);
    // Refresca también al volver a la pestaña.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshDataBank();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
