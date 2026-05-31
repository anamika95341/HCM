import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiClient, setRefreshHandler, setUnauthorizedHandler } from "../api/client.js";

const AuthContext = createContext(null);

function mapRoleToLogoutPath(role) {
  if (role === "masteradmin") return "/auth/masteradmin/logout";
  if (role === "admin") return "/auth/admin/logout";
  if (role === "deo") return "/auth/deo/logout";
  if (role === "minister") return "/auth/minister/logout";
  return "/auth/citizen/logout";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Restore session from valid httpOnly cookies on app load / browser refresh.
  // Tries access token first; if expired, silently refreshes and retries.
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data } = await apiClient.get("/auth/session");
        if (data?.user && data?.role) {
          setSession({ user: data.user, role: data.role });
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          // Access token expired — try token refresh before giving up
          try {
            const { data: refreshData } = await apiClient.post(
              "/auth/token/refresh",
            );
            if (refreshData?.user) {
              const { data: sessionData } = await apiClient.get("/auth/session");
              if (sessionData?.user && sessionData?.role) {
                setSession({ user: sessionData.user, role: sessionData.role });
              }
            }
          } catch {
            // Refresh token also expired or absent — user must log in
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Fire a DOM event so any mounted page can show a toast before redirect
      try {
        window.dispatchEvent(new CustomEvent("session:expired"));
      } catch {
        // ignore
      }
      setSession(null);
    });

    setRefreshHandler(async () => {
      const current = sessionRef.current;
      // If no current session in state, still attempt refresh using the cookie —
      // the server is the source of truth. Only bail if we get a 401 back.
      const { data } = await apiClient.post("/auth/token/refresh");
      if (!data?.user) throw new Error("Refresh failed");
      setSession((prev) => ({
        ...prev,
        user: data.user,
        // Preserve role from existing session or fall back to the one in the response
        role: prev?.role || current?.role,
      }));
    });

    return () => {
      setUnauthorizedHandler(null);
      setRefreshHandler(null);
    };
  }, []);

  function assertSessionPayload(data, contextLabel) {
    if (!data?.user || typeof data.user !== "object") {
      const hint =
        " If the app is served from Docker or a static server, ensure API requests reach the backend (e.g. API_UPSTREAM / reverse proxy for /api).";
      throw new Error(`Invalid login response (${contextLabel}).${hint}`);
    }
  }

  async function login({ role, identifier, password }) {
    if (role === "citizen") {
      const { data } = await apiClient.post("/auth/citizen/login", {
        citizenId: identifier,
        password,
      });
      assertSessionPayload(data, "citizen");
      setSession({ user: data.user, role: "citizen" });
      return { requiresOtp: false };
    }

    if (role === "minister") {
      const { data } = await apiClient.post("/auth/minister/login", {
        usernameOrEmail: identifier,
        password,
      });
      assertSessionPayload(data, "minister");
      setSession({ user: data.user, role: "minister" });
      return { requiresOtp: false };
    }

    if (role === "masteradmin") {
      const { data } = await apiClient.post("/auth/masteradmin/login", {
        usernameOrEmail: identifier,
        password,
      });
      assertSessionPayload(data, "masteradmin");
      setSession({ user: data.user, role: "masteradmin" });
      return { requiresOtp: false };
    }

    const endpoint = role === "admin" ? "/auth/admin/login" : "/auth/deo/login";
    const { data } = await apiClient.post(endpoint, {
      usernameOrEmail: identifier,
      password,
    });

    assertSessionPayload(data, role);
    setSession({ user: data.user, role });
    return { requiresOtp: false };
  }

  async function logout() {
    if (session?.role) {
      try {
        await apiClient.post(mapRoleToLogoutPath(session.role));
      } catch {
        // Ignore logout transport errors and clear the client session anyway.
      }
    }
    setSession(null);
  }

  const value = useMemo(
    () => ({
      session,
      login,
      logout,
      isAuthenticated: Boolean(session?.role),
      isLoading,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/**
 * Call this hook in any page/layout to register a callback when the server
 * force-expires a session (idle timeout, deploy restart, token replay).
 * The callback fires once before the user is redirected to login.
 *
 * Usage:
 *   useSessionExpired(() => toast.error("Your session expired. Please log in again."));
 */
export function useSessionExpired(onExpired) {
  const handlerRef = useRef(onExpired);
  useEffect(() => { handlerRef.current = onExpired; }, [onExpired]);

  useEffect(() => {
    function handler() {
      try { handlerRef.current?.(); } catch { /* ignore */ }
    }
    window.addEventListener("session:expired", handler);
    return () => window.removeEventListener("session:expired", handler);
  }, []);
}
