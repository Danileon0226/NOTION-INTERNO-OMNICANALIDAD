"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Centro de notificaciones: marca la última vez vista para contar no leídas
// sobre el feed de actividad (monitoreo, autonomía, integraciones).
interface NotificationsState {
  lastSeen: number;
  open: boolean;
  setOpen: (b: boolean) => void;
  markSeen: () => void;
}

export const useNotifications = create<NotificationsState>()(
  persist(
    (set) => ({
      lastSeen: 0,
      open: false,
      setOpen: (open) => set(open ? { open, lastSeen: Date.now() } : { open }),
      markSeen: () => set({ lastSeen: Date.now() }),
    }),
    { name: "zero-agency-notifications" }
  )
);
