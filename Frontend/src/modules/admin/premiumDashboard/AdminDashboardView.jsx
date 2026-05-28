import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import AppointmentsSection, { AppointmentStatsPanel, OverallAppointmentsSection, AppointmentPoolTrendLine } from "./components/AppointmentsSection.jsx";
import OverallSection from "./components/OverallSection.jsx";
import "./Dashboard.css";

const EXCLUDED_APPOINTMENT_STATUSES = new Set([
  "completed",
  "cancelled",
  "rejected",
]);


function isSameLocalDay(dateValue) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

function StatCard({ label, value, loading }) {
  return (
    <div className="db-stat-card" style={{ padding: "0.6rem 0.8rem" }}>
      <div className="db-stat-header" style={{ marginBottom: 0, alignItems: "center" }}>
        <div className="db-stat-value" style={{ margin: 0, lineHeight: 1 }}>
          {loading ? <span style={{ fontSize: "1rem", opacity: 0.4 }}>—</span> : value}
        </div>
      </div>
      <div className="db-stat-title" style={{ marginTop: "0.25rem", color: "var(--db-text-secondary)" }}>
        {label}
      </div>
    </div>
  );
}

export default function PremiumAdminDashboard() {
  const [appointmentFilter, setAppointmentFilter] = useState("Month");
  const { session } = useAuth();
  const { C, theme } = usePortalTheme();
  const { t } = useTranslation();
  const adminId = session?.user?.id;

  const [stats, setStats] = useState({
    appointmentsToday: 0,
    vipAppointmentsToday: 0,
    pendingAppointments: 0,
  });
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      if (!session?.role) return;
      try {
        setLoading(true);
        const response = await apiClient.get("/admin/work-queue");
        if (!active) return;

        const appointments = Array.isArray(response.data?.appointments) ? response.data.appointments : [];

        const appointmentsToday = appointments.filter(
          (m) =>
            (m.status === "scheduled" || m.status === "rescheduled") &&
            isSameLocalDay(m.scheduled_at) &&
            !Boolean(m.is_vip)
        ).length;

        const vipAppointmentsToday = appointments.filter(
          (m) =>
            (m.status === "scheduled" || m.status === "rescheduled") &&
            isSameLocalDay(m.scheduled_at) &&
            Boolean(m.is_vip)
        ).length;

        const pendingAppointments = appointments.filter(
          (m) =>
            m.assignedAdminUserId === adminId &&
            !EXCLUDED_APPOINTMENT_STATUSES.has(m.status)
        ).length;

        if (active) {
          setStats({ appointmentsToday, vipAppointmentsToday, pendingAppointments });
          setAllAppointments(appointments);
        }
      } catch {
        // silently fall back to zeros
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStats();
    return () => {
      active = false;
    };
  }, [session?.role, adminId]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dashboardVars = {
    "--db-bg": C.bg,
    "--db-card-bg": C.card,
    "--db-card-hover": theme === "dark" ? C.bgElevated : C.cardHover,
    "--db-border": C.border,
    "--db-border-hover": theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(46, 35, 95, 0.18)",
    "--db-chart-hover": theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(139, 92, 246, 0.18)",
    "--db-series-indigo": theme === "dark" ? "#9abbff" : "#7a99f5",
    "--db-series-indigo-soft": theme === "dark" ? "#7390ff" : "#bacdff",
    "--db-series-indigo-deep": theme === "dark" ? "#4d68d8" : "#5676d9",
    "--db-series-lavender": theme === "dark" ? "#d0b5ff" : "#ab8ef8",
    "--db-series-lavender-soft": theme === "dark" ? "#a485ff" : "#ddd0ff",
    "--db-series-lavender-deep": theme === "dark" ? "#7f61dd" : "#8669e0",
    "--db-series-teal": theme === "dark" ? "#82e6d8" : "#62ccb9",
    "--db-series-teal-soft": theme === "dark" ? "#56c4b2" : "#bdeee6",
    "--db-series-teal-deep": theme === "dark" ? "#2f988b" : "#43a896",
    "--db-series-amber": theme === "dark" ? "#fff56b" : "#f0de22",
    "--db-series-amber-soft": theme === "dark" ? "#fff89e" : "#fff6a6",
    "--db-series-amber-deep": theme === "dark" ? "#d4c100" : "#cfbb00",
    "--db-series-rose": theme === "dark" ? "#ffb4c8" : "#ef94ad",
    "--db-series-rose-soft": theme === "dark" ? "#ee90aa" : "#ffd4df",
    "--db-series-rose-deep": theme === "dark" ? "#d96f8f" : "#d86c89",
    "--db-series-peony": theme === "dark" ? "#ebbfff" : "#dea0ff",
    "--db-series-peony-soft": theme === "dark" ? "#c391f5" : "#f4dbff",
    "--db-series-peony-deep": theme === "dark" ? "#a86ae0" : "#bb78e8",
    "--db-series-slate": theme === "dark" ? "#acbee6" : "#99abd2",
    "--db-series-slate-soft": theme === "dark" ? "#7f93bb" : "#dde5f7",
    "--db-series-slate-deep": theme === "dark" ? "#5c7099" : "#7487b2",
    "--db-series-mist": theme === "dark" ? "#556684" : "#e2e9f6",
    "--db-series-mist-soft": theme === "dark" ? "#95a7ca" : "#f4f7fd",
    "--db-series-mist-deep": theme === "dark" ? "#33445f" : "#c7d2e8",
    "--db-text-primary": C.t1,
    "--db-text-secondary": C.t2,
    "--db-text-muted": C.t3,
    "--db-accent-purple": C.purple,
    "--db-accent-purple-dim": C.purpleDim,
  };

  return (
    <div className="adv-dashboard" style={dashboardVars}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{t("admin.dashboard.hcmOverview")}</h1>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--db-text-muted)" }}>{dateStr} · {t("admin.dashboard.realtimeMetrics")}</p>
      </div>

      <div className="db-exec-grid">
        <StatCard label={t("admin.dashboard.appointmentsToday")}     value={stats.appointmentsToday}    loading={loading} />
        <StatCard label={t("admin.dashboard.vipAppointmentsToday")}  value={stats.vipAppointmentsToday} loading={loading} />
        <StatCard label={t("admin.dashboard.pendingAppointments")}   value={stats.pendingAppointments}  loading={loading} />
      </div>

      <div className="db-section-label">{t("admin.dashboard.appointmentsSection")}</div>
      <div className="db-grid-row db-col-7-3">
        <AppointmentsSection filter={appointmentFilter} onFilterChange={setAppointmentFilter} appointments={allAppointments} adminId={adminId} loading={loading} />
        <AppointmentStatsPanel filter={appointmentFilter} appointments={allAppointments} adminId={adminId} loading={loading} />
      </div>
      <div className="db-grid-row db-col-1-1">
        <OverallAppointmentsSection appointments={allAppointments} loading={loading} />
        <AppointmentPoolTrendLine appointments={allAppointments} loading={loading} />
      </div>

      <div className="db-section-label">{t("admin.dashboard.overallSection")}</div>
      <OverallSection
        appointments={allAppointments}
        grievances={[]}
        loading={loading}
        showGrievances={false}
      />
    </div>
  );
}
