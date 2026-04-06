import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, ClipboardList, FileText, TrendingDown, TrendingUp } from "lucide-react";
import {
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
} from "../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";

// ─── Status helpers ───────────────────────────────────────────────────────────
const RESOLVED_COMPLAINT = new Set(["resolved", "completed", "closed"]);
const RESOLVED_MEETING   = new Set(["completed", "cancelled", "rejected"]);
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Derive all metrics from real data ────────────────────────────────────────
function deriveMetrics(complaints, meetings) {
  const now = new Date();

  const resolved      = complaints.filter(c => RESOLVED_COMPLAINT.has(c.status));
  const activeMeetings = meetings.filter(m => !RESOLVED_MEETING.has(m.status));

  // Week-over-week
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 6);
  const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 13);
  const inRange = (arr, from, to) =>
    arr.filter(item => {
      const d = new Date(item.createdAt || item.created_at);
      return d >= from && (!to || d < to);
    }).length;
  const complaintsChange = inRange(complaints, thisWeekStart) - inRange(complaints, lastWeekStart, thisWeekStart);
  const meetingsChange   = inRange(meetings,   thisWeekStart) - inRange(meetings,   lastWeekStart, thisWeekStart);

  // Weekly volume (last 7 days)
  const weeklyMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    weeklyMap[d.toDateString()] = { day: DAY_LABELS[d.getDay()], count: 0 };
  }
  complaints.forEach(c => {
    const key = new Date(c.createdAt || c.created_at).toDateString();
    if (weeklyMap[key]) weeklyMap[key].count++;
  });

  // Monthly trend (last 6 months)
  const monthlyMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap[`${d.getFullYear()}-${d.getMonth()}`] = {
      month: MONTH_LABELS[d.getMonth()], submitted: 0, resolved: 0, meetings: 0,
    };
  }
  complaints.forEach(c => {
    const d = new Date(c.createdAt || c.created_at);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthlyMap[k]) {
      monthlyMap[k].submitted++;
      if (RESOLVED_COMPLAINT.has(c.status)) monthlyMap[k].resolved++;
    }
  });
  meetings.forEach(m => {
    const d = new Date(m.createdAt || m.created_at);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthlyMap[k]) monthlyMap[k].meetings++;
  });

  // Department distribution (top 5)
  const deptMap = {};
  complaints.forEach(c => {
    const dept = c.department || "Unassigned";
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const departmentDistribution = Object.entries(deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    summary: {
      totalComplaints: complaints.length,
      complaintsChange,
      activeMeetings: activeMeetings.length,
      meetingsChange,
    },
    weeklyVolume: Object.values(weeklyMap),
    monthlyTrend: Object.values(monthlyMap),
    departmentDistribution,
  };
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, C }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "10px 14px", fontSize: 12, boxShadow: C.dropdownShadow, minWidth: 120,
    }}>
      {label && <div style={{ fontWeight: 600, color: C.t1, marginBottom: 6 }}>{label}</div>}
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, color: C.t2, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11 }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: C.t1, marginLeft: "auto" }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, change, icon, accent, C }) {
  const up = change >= 0;
  return (
    <WorkspaceCard style={{ padding: "20px 24px", marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${accent}18`, color: accent, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent, letterSpacing: "-0.025em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 12, fontSize: 11, fontWeight: 600 }}>
        {up ? <TrendingUp size={13} color={C.mint} /> : <TrendingDown size={13} color={C.danger} />}
        <span style={{ color: up ? C.mint : C.danger }}>
          {up ? "+" : ""}{change} vs last week
        </span>
      </div>
    </WorkspaceCard>
  );
}

// ─── Weekly volume bar card ───────────────────────────────────────────────────
function VolumeCard({ data, C }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <WorkspaceCard style={{ padding: "20px 24px", marginBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Weekly Volume
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.purple, marginTop: 6, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {total}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, color: C.t3,
          background: C.bgElevated, border: `1px solid ${C.border}`,
          borderRadius: 999, padding: "3px 10px",
        }}>
          This week
        </span>
      </div>
      <div style={{ height: 72 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={12} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === data.length - 1 ? C.purple : `${C.purple}50`} />
              ))}
            </Bar>
            <Tooltip cursor={false} content={({ active, payload, label }) =>
              <ChartTooltip active={active} payload={payload} label={label} C={C} />} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {data.map(d => (
          <span key={d.day} style={{ fontSize: 9, color: C.t3, textTransform: "uppercase", letterSpacing: "0.04em", width: 12, textAlign: "center" }}>
            {d.day.charAt(0)}
          </span>
        ))}
      </div>
    </WorkspaceCard>
  );
}

// ─── Monthly trend chart (fills remaining height) ─────────────────────────────
function TrendChart({ data, C }) {
  const LINES = [
    { key: "submitted", name: "Submitted", color: C.purple },
    { key: "resolved",  name: "Resolved",  color: C.mint },
    { key: "meetings",  name: "Meetings",  color: C.warn, dashed: true },
  ];
  const hasData = data.some(d => d.submitted > 0 || d.resolved > 0 || d.meetings > 0);

  return (
    <WorkspaceCard style={{ padding: "20px 24px", marginBottom: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0 }}>
        <WorkspaceCardHeader
          title="Monthly Case Trend"
          subtitle="Complaints submitted vs resolved vs meetings per month"
        />
      </div>

      <div style={{ flex: 1, minHeight: 200 }}>
        {!hasData ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: C.t3 }}>No activity in the last 6 months</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <defs>
                {LINES.map(l => (
                  <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={l.color} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={l.color} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.t3 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.t3 }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload, label }) =>
                <ChartTooltip active={active} payload={payload} label={label} C={C} />} />
              {LINES.map(l => (
                <Area
                  key={l.key} type="monotone" dataKey={l.key} name={l.name}
                  stroke={l.color} strokeWidth={2}
                  strokeDasharray={l.dashed ? "5 3" : undefined}
                  fill={l.dashed ? "none" : `url(#grad-${l.key})`}
                  dot={{ r: 3, fill: l.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: "flex", gap: 20, paddingTop: 12, borderTop: `1px solid ${C.border}`, flexShrink: 0, flexWrap: "wrap" }}>
        {LINES.map(l => (
          <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.t3 }}>
            <div style={{
              width: 20, height: 2, borderRadius: 1,
              background: l.dashed
                ? `repeating-linear-gradient(90deg,${l.color} 0,${l.color} 4px,transparent 4px,transparent 7px)`
                : l.color,
            }} />
            {l.name}
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

// ─── Department donut chart ───────────────────────────────────────────────────
function DeptChart({ data, C }) {
  const COLORS = [C.purple, C.mint, C.warn, C.danger, C.t3];
  const total  = data.reduce((s, d) => s + d.value, 0);

  return (
    <WorkspaceCard style={{ padding: "20px 24px", marginBottom: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0 }}>
        <WorkspaceCardHeader
          title="Cases by Department"
          subtitle={total > 0 ? `${total} total cases` : "No cases yet"}
        />
      </div>

      {data.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 13, color: C.t3 }}>No data available</span>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ position: "relative", width: 160, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: C.t1 }}>{payload[0].name}: </span>
                        <span style={{ color: C.t2 }}>{payload[0].value}</span>
                      </div>
                    ) : null} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.t1, lineHeight: 1 }}>{total}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 3 }}>
                  Total
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: "grid", alignContent: "center", gap: 10, marginTop: 8 }}>
            {data.map((dept, i) => (
              <div key={dept.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.t2 }}>{dept.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{dept.value}</span>
                  <span style={{ fontSize: 10, color: C.t3, minWidth: 28, textAlign: "right" }}>
                    {Math.round((dept.value / total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </WorkspaceCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [meetings,   setMeetings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data } = await apiClient.get("/admin/work-queue", authorizedConfig(session.accessToken));
        if (!mounted) return;
        setComplaints(Array.isArray(data?.complaints) ? data.complaints : []);
        setMeetings(Array.isArray(data?.meetings)     ? data.meetings   : []);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.error || "Unable to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (session?.accessToken) load();
    return () => { mounted = false; };
  }, [session?.accessToken]);

  const metrics = useMemo(() => deriveMetrics(complaints, meetings), [complaints, meetings]);

  // ── Full-height non-scrollable shell ────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <WorkspaceEmptyState title="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          border: `1px solid ${C.danger}30`, background: `${C.danger}08`,
          color: C.danger, fontSize: 13,
        }}>
          {error}
        </div>
      </div>
    );
  }

  const { summary, weeklyVolume, monthlyTrend, departmentDistribution } = metrics;

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "28px 28px 24px",
      gap: 16,
      overflow: "hidden",
      boxSizing: "border-box",
    }}>

      {/* Header ────────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Admin Workspace
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: C.purpleDim, color: C.purple,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <ClipboardList size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.t1, lineHeight: 1.3 }}>
              Operations Dashboard
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: C.t3, lineHeight: 1.5 }}>
              System-wide complaint and meeting metrics derived from the live work queue.
            </p>
          </div>
        </div>
      </div>

      {/* Row 1 — KPI cards ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, flexShrink: 0 }}>
        <KpiCard
          label="Total Complaints"
          value={summary.totalComplaints}
          change={summary.complaintsChange}
          icon={<FileText size={15} />}
          accent={C.purple}
          C={C}
        />
        <KpiCard
          label="Active Meetings"
          value={summary.activeMeetings}
          change={summary.meetingsChange}
          icon={<CalendarDays size={15} />}
          accent={C.mint}
          C={C}
        />
        <VolumeCard data={weeklyVolume} C={C} />
      </div>

      {/* Row 2 — Charts (fills all remaining space) ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <TrendChart data={monthlyTrend} C={C} />
        <DeptChart  data={departmentDistribution} C={C} />
      </div>

    </div>
  );
}
