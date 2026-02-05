/**
 * Notification Context
 * Real-time unread count and socket for new_notification events.
 * Dependencies: socket.io-client (add manually: npm install socket.io-client)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { notificationsService } from "@/services/notifications.service";
import { API_BASE_URL, STORAGE_KEYS } from "@/lib/constants";

const EVENT_NEW_NOTIFICATION = "new_notification";

function getSocketBaseUrl(): string {
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "").trim();
  return (
    base ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5000")
  );
}

interface NotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  /** Increments when a new_notification is received; use in useEffect deps to refetch list. */
  newNotificationVersion: number;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotificationVersion, setNewNotificationVersion] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }
    refreshUnreadCount();
  }, [isAuthenticated, refreshUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
        : null);
    if (!authToken) return;

    const socketUrl = getSocketBaseUrl();
    const socket = io(socketUrl, {
      path: "/socket.io",
      auth: { token: authToken },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on(EVENT_NEW_NOTIFICATION, () => {
      refreshUnreadCount();
      setNewNotificationVersion((v) => v + 1);
    });

    socket.on("connect_error", () => {
      // Optional: could show a subtle "reconnecting" state
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, refreshUnreadCount]);

  const value: NotificationContextValue = {
    unreadCount,
    refreshUnreadCount,
    newNotificationVersion,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      refreshUnreadCount: async () => {},
      newNotificationVersion: 0,
    };
  }
  return ctx;
}
