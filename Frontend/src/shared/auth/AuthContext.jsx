import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, setUnauthorizedHandler } from "../api/client.js";

const AuthContext = createContext(null);

function mapRoleToLogoutPath(role) {
  if (role === "admin") return "/auth/admin/logout";
  if (role === "deo") return "/auth/deo/logout";
  if (role === "minister") return "/auth/minister/logout";
  return "/auth/citizen/logout";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [pendingChallenge, setPendingChallenge] = useState(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      setPendingChallenge(null);
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
      setPendingChallenge(null);
      return { requiresOtp: false };
    }

    if (role === "minister") {
      const { data } = await apiClient.post("/auth/minister/login", {
        usernameOrEmail: identifier,
        password,
      });
      setSession({ ...data, role: "minister" });
      setPendingChallenge(null);
      return { requiresOtp: false };
    }

    const endpoint = role === "admin" ? "/auth/admin/login" : "/auth/deo/login";
    const { data } = await apiClient.post(endpoint, {
      usernameOrEmail: identifier,
      password,
    });

    if (data?.accessToken) {
      setSession({ ...data, role });
      setPendingChallenge(null);
      return { requiresOtp: false };
    }

    setPendingChallenge({ role, loginToken: data.loginToken });
    return { requiresOtp: true };
  }

  async function verifyOtp(otp) {
    if (!pendingChallenge) {
      throw new Error("No pending OTP challenge");
    }
    const endpoint = pendingChallenge.role === "admin" ? "/auth/admin/verify-otp" : "/auth/deo/verify-otp";
    const { data } = await apiClient.post(endpoint, {
      loginToken: pendingChallenge.loginToken,
      otp,
    });
    setSession({ ...data, role: pendingChallenge.role });
    setPendingChallenge(null);
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
    setPendingChallenge(null);
  }

  const value = useMemo(() => ({
    session,
    pendingChallenge,
    login,
    verifyOtp,
    logout,
    isAuthenticated: Boolean(session?.accessToken),
  }), [pendingChallenge, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
