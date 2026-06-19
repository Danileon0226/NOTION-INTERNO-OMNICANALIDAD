"use client";

import { Bell, BellOff } from "lucide-react";
import { useSileo, unreadCount } from "@/lib/sileo/store";

export function SileoBell({ className = "" }: { className?: string }) {
  const items = useSileo((s) => s.items);
  const quiet = useSileo((s) => s.quiet);
  const setOpen = useSileo((s) => s.setOpen);
  const unread = unreadCount(items);

  return (
    <button
      onClick={() => setOpen(true)}
      className={`relative rounded-md p-1.5 text-muted hover:bg-bg-subtle hover:text-ink ${className}`}
      aria-label="Notificaciones SILEO"
      title={quiet ? "SILEO · modo silencio" : "SILEO · notificaciones"}
    >
      {quiet ? <BellOff size={18} /> : <Bell size={18} />}
      {unread > 0 && !quiet && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
