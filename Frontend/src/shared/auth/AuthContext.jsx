import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, setUnauthorizedHandler } from "../api/client.js";

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

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  async function login({ role, identifier, password }) {
    if (role === "citizen") {
      const { data } = await apiClient.post("/auth/citizen/login", {
        citizenId: identifier,
        password,
      });
      setSession({ ...data, role: "citizen" });
      return { requiresOtp: false };
    }

    if (role === "minister") {
      const { data } = await apiClient.post("/auth/minister/login", {
        usernameOrEmail: identifier,
        password,
      });
      setSession({ ...data, role: "minister" });
      return { requiresOtp: false };
    }

    if (role === "masteradmin") {
      const { data } = await apiClient.post("/auth/masteradmin/login", {
        usernameOrEmail: identifier,
        password,
      });
      setSession({ ...data, role: "masteradmin" });
      return { requiresOtp: false };
    }

    const endpoint = role === "admin" ? "/auth/admin/login" : "/auth/deo/login";
    const { data } = await apiClient.post(endpoint, {
      usernameOrEmail: identifier,
      password,
    });

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
