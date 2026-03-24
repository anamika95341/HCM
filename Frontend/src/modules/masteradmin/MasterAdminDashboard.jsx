import { useEffect, useState } from "react";
import { Shield, Users, UserCog, UserX } from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { toSafeUserMessage } from "../../shared/security/text.js";
import { PATHS } from "../../routes/paths.js";

export default function MasterAdminDashboard() {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data } = await apiClient.get("/masteradmin/dashboard", authorizedConfig(session?.accessToken));
        setData(data);
      } catch (requestError) {
        setError(toSafeUserMessage(requestError, "Unable to load master admin dashboard"));
      }
    }

    if (session?.accessToken) {
      loadDashboard();
    }
  }, [session?.accessToken]);

  const cards = [
    { label: "Active Admins", value: data?.activeAdmins ?? "-", icon: <UserCog size={18} color={C.purple} /> },
    { label: "Pending Admins", value: data?.pendingAdmins ?? "-", icon: <Shield size={18} color={C.warn} /> },
    { label: "Active DEOs", value: data?.activeDeos ?? "-", icon: <Users size={18} color={C.purple} /> },
    { label: "Pending DEOs", value: data?.pendingDeos ?? "-", icon: <UserX size={18} color={C.warn} /> },
  ];

  return (
    <div className="portal-page" style={{ padding: 24, display: "grid", gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".18em" }}>Master Admin Workspace</div>
        <h1 style={{ marginTop: 10, fontSize: 28, color: C.t1 }}>Access Control Dashboard</h1>
        <p style={{ marginTop: 6, color: C.t3, fontSize: 13 }}>Provision admins and DEOs directly from the masteradmin sidebar and monitor pending verifications here.</p>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <QuickLink C={C} to={PATHS.masteradmin.createAdmin}>Create Admin</QuickLink>
          <QuickLink C={C} to={PATHS.masteradmin.createDeo}>Create DEO</QuickLink>
          <QuickLink C={C} to={PATHS.masteradmin.manageAdmins}>Manage Admins</QuickLink>
          <QuickLink C={C} to={PATHS.masteradmin.manageDeos}>Manage DEOs</QuickLink>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${C.danger}33`, background: `${C.danger}12`, color: C.danger, fontSize: 12 }}>{error}</div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, boxShadow: "var(--portal-shadow)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              {card.icon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.t1 }}>{card.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: C.t3 }}>{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickLink({ C, to, children }) {
  return (
    <Link
      to={to}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.card,
        color: C.t1,
        fontSize: 12,
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}
