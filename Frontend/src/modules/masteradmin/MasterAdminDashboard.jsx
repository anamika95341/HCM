import { useEffect, useState } from "react";
import { Shield, Users, UserCog, UserX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { toSafeUserMessage } from "../../shared/security/text.js";
import { PATHS } from "../../routes/paths.js";
import {
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceStatGrid,
  WorkspaceCard,
  WorkspaceCardHeader,
} from "../../shared/components/WorkspaceUI.jsx";

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

  const statItems = [
    { label: "Active Admins", value: data?.activeAdmins ?? "—", accent: C.purple, icon: <UserCog size={16} /> },
    { label: "Pending Admins", value: data?.pendingAdmins ?? "—", accent: C.warn, icon: <Shield size={16} /> },
    { label: "Active DEOs", value: data?.activeDeos ?? "—", accent: C.mint, icon: <Users size={16} /> },
    { label: "Pending DEOs", value: data?.pendingDeos ?? "—", accent: C.warn, icon: <UserX size={16} /> },
  ];

  const quickLinks = [
    { to: PATHS.masteradmin.createAdmin, label: "Create Admin", description: "Provision a new admin account" },
    { to: PATHS.masteradmin.createDeo, label: "Create DEO", description: "Provision a new DEO account" },
    { to: PATHS.masteradmin.manageAdmins, label: "Manage Admins", description: "Review and verify admin accounts" },
    { to: PATHS.masteradmin.manageDeos, label: "Manage DEOs", description: "Review and verify DEO accounts" },
  ];

  return (
    <WorkspacePage>
      <WorkspaceSectionHeader
        eyebrow="Master Admin Workspace"
        title="Access Control Dashboard"
        subtitle="Provision admins and DEOs, monitor pending verifications, and manage workspace access."
        icon={<Shield size={20} />}
      />

      {error && (
        <div style={{
          marginBottom: 20, padding: "12px 16px",
          borderRadius: 10, border: `1px solid ${C.danger}30`,
          background: `${C.danger}08`, color: C.danger, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <WorkspaceStatGrid items={statItems} />
      </div>

      <WorkspaceCard>
        <WorkspaceCardHeader
          title="Quick Actions"
          subtitle="Manage access provisioning and user accounts"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: 11,
                border: `1px solid ${C.border}`,
                background: C.bg,
                textDecoration: "none",
                transition: "border-color 0.2s ease, opacity 0.2s ease",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, letterSpacing: "-0.01em" }}>{link.label}</div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 3 }}>{link.description}</div>
              </div>
              <ArrowRight size={15} style={{ color: C.purple, flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </WorkspaceCard>
    </WorkspacePage>
  );
}
