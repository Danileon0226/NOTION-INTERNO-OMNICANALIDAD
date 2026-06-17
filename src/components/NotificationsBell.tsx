"use client";

import { Bell } from "lucide-react";
import { useActivity } from "@/lib/activity";
import { useNotifications } from "@/lib/ui/notifications";

export function NotificationsBell({ className = "" }: { className?: string }) {
  const events = useActivity((s) => s.events);
  const lastSeen = useNotifications((s) => s.lastSeen);
  const setOpen = useNotifications((s) => s.setOpen);
  const unread = events.filter((e) => e.ts > lastSeen).length;

  return (
    <button
      onClick={() => setOpen(true)}
      className={`relative rounded-md p-1.5 text-muted hover:bg-bg-subtle hover:text-ink ${className}`}
      aria-label="Notificaciones"
      title="Notificaciones"
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
