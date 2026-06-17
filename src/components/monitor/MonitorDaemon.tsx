"use client";

import { useEffect } from "react";
import { useMonitor, statusOf } from "@/lib/monitor/store";
import { pingSite } from "@/lib/monitor/ping";
import { useActivity } from "@/lib/activity";
import { fireWebhooks } from "@/lib/connectors/webhooks";

let running = false;

export async function runMonitorCycle(): Promise<void> {
  if (running) return;
  const m = useMonitor.getState();
  if (!m.enabled || !m.sites.length) return;
  running = true;
  try {
    for (const site of m.sites) {
      const prev = statusOf(site);
      const check = await pingSite(site.url);
      useMonitor.getState().recordCheck(site.id, check);
      const now = check.ok ? (check.ms > 2500 ? "slow" : "up") : "down";
      // Solo registra el evento cuando cambia el estado (señal, no ruido).
      if (now !== prev && prev !== "unknown") {
        const label =
          now === "down"
            ? `⚠️ ${site.label} no responde`
            : now === "slow"
              ? `${site.label} lento (${check.ms} ms)`
              : `${site.label} se recuperó`;
        useActivity.getState().push({ source: "system", kind: now === "down" ? "alert" : "info", label, count: 0 });
        void fireWebhooks("monitor", { site: site.label, url: site.url, status: now, ms: check.ms, message: label });
      }
    }
  } finally {
    running = false;
  }
}

// Demonio headless de monitoreo, montado una vez en AppShell.
export function MonitorDaemon() {
  const enabled = useMonitor((s) => s.enabled);
  const intervalMin = useMonitor((s) => s.intervalMin);

  useEffect(() => {
    if (!enabled) return;
    const kick = setTimeout(() => void runMonitorCycle(), 4000);
    const t = setInterval(() => void runMonitorCycle(), Math.max(1, intervalMin) * 60_000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [enabled, intervalMin]);

  return null;
}
