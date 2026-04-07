import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
    });

    setRefreshHandler(async () => {
      const current = sessionRef.current;
      if (!current?.refreshToken || !current?.role) {
        throw new Error("No refresh token available");
      }
      const { data } = await apiClient.post("/auth/token/refresh", {
        refreshToken: current.refreshToken,
      });
      if (!data?.accessToken) throw new Error("Refresh failed");
      setSession((prev) => ({ ...prev, ...data }));
      return data.accessToken;
    });

    return () => {
      setUnauthorizedHandler(null);
      setRefreshHandler(null);
    };
  }, []);

  function assertSessionPayload(data, contextLabel) {
    const token = data?.accessToken;
    if (typeof token !== "string" || token.trim().length < 20) {
      const hint = " If the app is served from Docker or a static server, ensure API requests reach the backend (e.g. API_UPSTREAM / reverse proxy for /api).";
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
      setSession({ ...data, role: "citizen" });
      return { requiresOtp: false };
    }

    if (role === "minister") {
      const { data } = await apiClient.post("/auth/minister/login", {
        usernameOrEmail: identifier,
        password,
      });
      assertSessionPayload(data, "minister");
      setSession({ ...data, role: "minister" });
      return { requiresOtp: false };
    }

    if (role === "masteradmin") {
      const { data } = await apiClient.post("/auth/masteradmin/login", {
        usernameOrEmail: identifier,
        password,
      });
      assertSessionPayload(data, "masteradmin");
      setSession({ ...data, role: "masteradmin" });
      return { requiresOtp: false };
    }

    const endpoint = role === "admin" ? "/auth/admin/login" : "/auth/deo/login";
    const { data } = await apiClient.post(endpoint, {
      usernameOrEmail: identifier,
      password,
    });

    assertSessionPayload(data, role);
    setSession({ ...data, role });
    return { requiresOtp: false };
  }

  async function logout() {
    if (session?.accessToken && session?.refreshToken && session?.role) {
      try {
        await apiClient.post(
          mapRoleToLogoutPath(session.role),
          { refreshToken: session.refreshToken },
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );
      } catch {
        // Ignore logout transport errors and clear the client session anyway.
      }
    }
    setSession(null);
  }

  const value = useMemo(() => ({
    session,
    login,
    logout,
    isAuthenticated: Boolean(session?.accessToken),
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
