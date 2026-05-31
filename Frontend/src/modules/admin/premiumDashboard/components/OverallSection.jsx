import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { CardHeader, COLORS, StoryTooltip } from "./SharedUI.jsx";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", 
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function OverallSection({ appointments = [], grievances = [], loading, showGrievances = true }) {
  const { t } = useTranslation();
  const appointmentData = useMemo(() => {
    const map = {};
    INDIAN_STATES.forEach(st => map[st] = { state: st, total: 0, completed: 0 });
    appointments.forEach(m => {
      const st = m.citizenSnapshot?.state;
      if (st && map[st]) {
        map[st].total++;
        if (m.status === 'completed') map[st].completed++;
      }
    });
    return INDIAN_STATES.map(st => map[st]);
  }, [appointments]);

  const grievanceData = useMemo(() => {
    const map = {};
    INDIAN_STATES.forEach(st => map[st] = { state: st, total: 0, resolved: 0 });
    grievances.forEach(c => {
      const st = c.citizenSnapshot?.state;
      if (st && map[st]) {
        map[st].total++;
        if (c.status === 'resolved') map[st].resolved++;
      }
    });
    return INDIAN_STATES.map(st => map[st]);
  }, [grievances]);

  return (
    <div className="db-grid-row db-col-1-1">
      <div className="db-card">
        <CardHeader title={t("admin.dashboard.appointmentsByState")} infoText={t("admin.dashboard.appointmentsByStateInfo")} />
        {loading ? (
          <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
          </div>
        ) : (
          <div style={{ height: 240, overflowY: "auto", overflowX: "hidden", paddingRight: "0.5rem" }}>
            <div style={{ height: INDIAN_STATES.length * 45 + 40 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentData} layout="vertical" barCategoryGap={16}>
                  <defs>
                    <linearGradient id="overallAppointmentTotalBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
                      <stop offset="100%" stopColor="var(--db-series-lavender-deep)" />
                    </linearGradient>
                    <linearGradient id="overallAppointmentCompletedBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
                      <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--db-border)" horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="state" tick={{ fill: "var(--db-text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
                  <Tooltip
                    cursor={{ fill: "var(--db-chart-hover)" }}
                    content={
                      <StoryTooltip
                        formatter={(payload, label) => {
                          const total = payload.find(p => p.dataKey === "total")?.value || 0;
                          const completed = payload.find(p => p.dataKey === "completed")?.value || 0;
                          return (
                            <>
                              <strong>{label}</strong> generated <strong>{total}</strong> appointment requests, out of which <strong>{completed}</strong> were completed.
                            </>
                          );
                        }}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 10 }} />
                  <Bar dataKey="total" name="Total Requests" fill="url(#overallAppointmentTotalBar)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="url(#overallAppointmentCompletedBar)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {showGrievances && <div className="db-card">
        <CardHeader title={t("admin.dashboard.grievancesByState")} infoText={t("admin.dashboard.grievancesByStateInfo")} />
        {loading ? (
          <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
          </div>
        ) : (
          <div style={{ height: 240, overflowY: "auto", overflowX: "hidden", paddingRight: "0.5rem" }}>
            <div style={{ height: INDIAN_STATES.length * 45 + 40 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grievanceData} layout="vertical" barCategoryGap={16}>
                  <defs>
                    <linearGradient id="overallGrievanceTotalBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--db-series-indigo-soft)" />
                      <stop offset="100%" stopColor="var(--db-series-indigo-deep)" />
                    </linearGradient>
                    <linearGradient id="overallGrievanceResolvedBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--db-series-amber-soft)" />
                      <stop offset="100%" stopColor="var(--db-series-amber-deep)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--db-border)" horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="state" tick={{ fill: "var(--db-text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
                  <Tooltip
                    cursor={{ fill: "var(--db-chart-hover)" }}
                    content={
                      <StoryTooltip
                        formatter={(payload, label) => {
                          const total = payload.find(p => p.dataKey === "total")?.value || 0;
                          const resolved = payload.find(p => p.dataKey === "resolved")?.value || 0;
                          return (
                            <>
                              <strong>{label}</strong> submitted <strong>{total}</strong> grievances, out of which <strong>{resolved}</strong> are resolved.
                            </>
                          );
                        }}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 10 }} />
                  <Bar dataKey="total" name="Total Grievances" fill="url(#overallGrievanceTotalBar)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="url(#overallGrievanceResolvedBar)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
