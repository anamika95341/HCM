import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiClient, authorizedConfig } from "../api/client.js";
import { API_BASE_URL } from "../config/env.js";
import { useAuth } from "../auth/AuthContext.jsx";

const NotificationContext = createContext(null);

function getRoleBasePath(role) {
  if (role === "admin") return "/admin";
  if (role === "masteradmin") return "/masteradmin";
  if (role === "minister") return "/minister";
  if (role === "deo") return "/deo";
  return "/citizen";
}

function buildWebSocketUrl(accessToken) {
  if (!accessToken) return null;

  let origin;
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    origin = API_BASE_URL.replace(/\/api\/v1\/?$/i, "");
  } else if (typeof window !== "undefined") {
    origin = window.location.origin;
  } else {
    return null;
  }

  const socketBase = origin.replace(/^http/i, "ws");
  return `${socketBase}/ws?token=${encodeURIComponent(accessToken)}`;
}

function dedupeNotifications(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function NotificationProvider({ children }) {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [eventVersion, setEventVersion] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      if (!session?.accessToken || !session?.role) {
        if (active) {
          setNotifications([]);
          setUnreadCount(0);
          setPreferences(null);
        }
        return;
      }

      setLoading(true);
      try {
        const basePath = getRoleBasePath(session.role);
        const { data } = await apiClient.get(`${basePath}/notifications?limit=20`, authorizedConfig(session.accessToken));
        if (!active) return;
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setUnreadCount(Number(data.unreadCount) || 0);
        setPreferences(data.preferences || null);
      } catch {
        if (!active) return;
        setNotifications([]);
        setUnreadCount(0);
        setPreferences(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNotifications();
    return () => {
      active = false;
    };
  }, [session?.accessToken, session?.role]);

  useEffect(() => {
    if (!session?.accessToken || session?.role !== "citizen") {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return undefined;
    }

    let closedByEffect = false;

    function scheduleReconnect() {
      if (closedByEffect || reconnectTimerRef.current) return;
      const delay = Math.min(1000 * (2 ** reconnectAttemptsRef.current), 10000);
      reconnectAttemptsRef.current += 1;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    }

    function connect() {
      if (closedByEffect || socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      const url = buildWebSocketUrl(session.accessToken);
      if (!url) return;

      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (!message?.event) return;

          if (message.event === "notification.created" && message.payload?.notification) {
            setNotifications((current) =>
              dedupeNotifications([message.payload.notification, ...current]).slice(0, 20)
            );
            setUnreadCount(Number(message.payload.unreadCount) || 0);
          }

          if (
            message.event === "meeting.status.updated" ||
            message.event === "complaint.status.updated" ||
            message.event === "notification.created"
          ) {
            setEventVersion((value) => value + 1);
          }
        } catch {
          // Ignore malformed socket payloads and keep the connection alive.
        }
      };

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [session?.accessToken, session?.role]);

  const markRead = useCallback(async (notificationId) => {
    if (!session?.accessToken || !session?.role || !notificationId) return;
    const basePath = getRoleBasePath(session.role);
    const { data } = await apiClient.patch(
      `${basePath}/notifications/${notificationId}/read`,
      {},
      authorizedConfig(session.accessToken)
    );

    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, isRead: true, readAt: data.notification?.readAt || item.readAt } : item))
    );
    setUnreadCount(Number(data.unreadCount) || 0);
  }, [session?.accessToken, session?.role]);

  const markAllRead = useCallback(async () => {
    if (!session?.accessToken || !session?.role) return;
    const basePath = getRoleBasePath(session.role);
    await apiClient.post(`${basePath}/notifications/read-all`, {}, authorizedConfig(session.accessToken));
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }, [session?.accessToken, session?.role]);

  const savePreferences = useCallback(async (payload) => {
    if (!session?.accessToken || !session?.role) return null;
    const basePath = getRoleBasePath(session.role);
    const { data } = await apiClient.patch(`${basePath}/me/notifications`, payload, authorizedConfig(session.accessToken));
    setPreferences(data.preferences || null);
    return data.preferences || null;
  }, [session?.accessToken, session?.role]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    preferences,
    loading,
    eventVersion,
    markRead,
    markAllRead,
    savePreferences,
    setPreferences,
  }), [notifications, unreadCount, preferences, loading, eventVersion]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
