import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CalendarLtrRegular,
  ClipboardTaskRegular,
  CheckmarkCircleRegular,
  StarRegular,
} from "@fluentui/react-icons";

const ACCENT = "#5B4FE9";
const PIE_COLORS = ["#5B4FE9", "#7C72F2", "#D9D6FF"];
const TOKENS = {
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
  bgApp: "var(--bg-app)",
  bgPrimary: "var(--bg-primary)",
  bgSecondary: "var(--bg-secondary)",
  bgTertiary: "var(--bg-tertiary)",
  border: "var(--border-primary)",
  borderSoft: "var(--border-secondary)",
  shadow: "var(--shadow-soft)",
};

// Static Dashboard Data
const getStaticDashboardData = () => {
  return {
    profile: {
      name: "Hon'ble Minister",
    },
    scheduledMeetings: 12,
    attendedEvents: 8,
    complaintOverview: {
      received: 142,
      resolved: 98,
      pending: 44,
    },
    operations: {
      pendingAgeBuckets: {
        under3: 1.4,
      },
      referralDepartmentPerformance: [
        {
          resolutionRate: 1.8,
        },
      ],
      priorityBreakdown: [
        {
          count: 6,
        },
      ],
    },
    analytics: {
      meetingDensity: 0.8,
      publicOutreachIndex: -0.6,
      policyEngagementIndex: 52,
      governanceVsCeremonialRatio: 0.5,
      weeklyScores: [
        { week: "2026-03-08", score: 48 },
        { week: "2026-03-15", score: 52 },
        { week: "2026-03-22", score: 56 },
      ],
    },
    meetingsHeldSeries: [
      { date: "2026-03-15", count: 2, target: 2 },
      { date: "2026-03-16", count: 3, target: 3 },
      { date: "2026-03-17", count: 1, target: 2 },
      { date: "2026-03-18", count: 4, target: 3 },
      { date: "2026-03-19", count: 2, target: 2 },
      { date: "2026-03-20", count: 3, target: 3 },
    ],
    vipMeetingsAndEvents: [
      {
        id: "vip1",
        label: "Cabinet Meeting - Policy Review",
        type: "VIP Meeting",
        date: "2026-03-25",
        time: "10:00 AM",
        location: "Chief Minister's Office",
        status: "Scheduled",
      },
      {
        id: "vip2",
        label: "District Development Conference",
        type: "Event",
        date: "2026-03-28",
        time: "02:30 PM",
        location: "Convention Center",
        status: "Scheduled",
      },
      {
        id: "vip3",
        label: "Education Sector Stakeholder Meeting",
        type: "VIP Meeting",
        date: "2026-04-01",
        time: "11:00 AM",
        location: "State Education Building",
        status: "Confirmed",
      },
      {
        id: "vip4",
        label: "Healthcare Initiative Launch",
        type: "Event",
        date: "2026-04-05",
        time: "03:00 PM",
        location: "Medical College Campus",
        status: "Scheduled",
      },
      {
        id: "vip5",
        label: "Infrastructure Review Meeting",
        type: "VIP Meeting",
        date: "2026-04-08",
        time: "09:30 AM",
        location: "PWD Office",
        status: "Pending",
      },
      {
        id: "vip6",
        label: "Community Engagement Program",
        type: "Event",
        date: "2026-04-12",
        time: "04:00 PM",
        location: "District Stadium",
        status: "Scheduled",
      },
    ],
  };
};

const cardStyle = {
  background: TOKENS.bgPrimary,
  borderRadius: 12,
  boxShadow: TOKENS.shadow,
  border: "1px solid color-mix(in srgb, var(--border-primary) 78%, #5B4FE9 22%)",
};

function changeMeta(value, positiveLabel = "from last month") {
  const numeric = Number(value || 0);
  return {
    label: `${numeric >= 0 ? "+" : ""}${numeric.toFixed(1)}%`,
    tone: numeric >= 0 ? "#16A34A" : "#DC2626",
    bg: numeric >= 0 ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)",
    sub: positiveLabel,
  };
}

function statusTone(status = "") {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("resolved") || normalized.includes("attended") || normalized.includes("completed")) return { fg: "#15803D", bg: "#DCFCE7" };
  if (normalized.includes("pending")) return { fg: "#C2410C", bg: "#FFEDD5" };
  if (normalized.includes("progress") || normalized.includes("scheduled") || normalized.includes("confirmed")) return { fg: "#1D4ED8", bg: "#DBEAFE" };
  if (normalized.includes("cancel")) return { fg: "#B91C1C", bg: "#FEE2E2" };
  return { fg: TOKENS.textSecondary, bg: TOKENS.bgSecondary };
}

function chartTooltipStyle() {
  return {
    background: TOKENS.bgPrimary,
    border: `1px solid ${TOKENS.border}`,
    borderRadius: 12,
    color: TOKENS.textPrimary,
  };
}

function shortDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWeekLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString(undefined, { month: "short" })} ${date.getDate()}`;
}

function buildExecutiveProductivitySeries(rawSeries = [], meetingsHeldSeries = []) {
  const weekly = [...rawSeries]
    .map((item) => ({
      label: formatWeekLabel(item.week || item.label),
      score: Number(item.score || 0),
      sourceDate: item.week || item.label,
    }))
    .filter((item) => item.label);

  if (weekly.length >= 4) {
    return weekly.slice(-6);
  }

  const fallbackSource = (meetingsHeldSeries || []).slice(-6);
  if (fallbackSource.length) {
    return fallbackSource.map((item, index) => ({
      label: shortDateLabel(item.date),
      score: Number((item.count * 12 + item.target * 4 + index * 1.5).toFixed(1)),
      sourceDate: item.date,
    }));
  }

  return [
    { label: "W1", score: 28 },
    { label: "W2", score: 36 },
    { label: "W3", score: 41 },
    { label: "W4", score: 38 },
    { label: "W5", score: 46 },
    { label: "W6", score: 52 },
  ];
}

function StatCard({ icon: Icon, label, value, change }) {
  return (
    <div style={{ ...cardStyle, padding: "1.15rem 1.2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(91,79,233,0.1)", color: ACCENT }}>
          <Icon fontSize={22} />
        </div>
        <div style={{ padding: "0.28rem 0.6rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, color: change.tone, background: change.bg }}>
          {change.label}
        </div>
      </div>
      <div style={{ fontSize: "0.86rem", color: TOKENS.textSecondary, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: TOKENS.textPrimary, marginTop: "0.45rem" }}>{value}</div>
      <div style={{ fontSize: "0.78rem", color: TOKENS.textMuted, marginTop: "0.45rem" }}>{change.sub}</div>
    </div>
  );
}

function SectionCard({ title, action, children, style = {} }) {
  return (
    <div style={{ ...cardStyle, padding: "1.2rem", ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: TOKENS.textPrimary }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function FilterPill({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 999,
        padding: "0.38rem 0.72rem",
        background: active ? "rgba(91,79,233,0.12)" : "transparent",
        color: active ? ACCENT : TOKENS.textSecondary,
        fontSize: "0.76rem",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default function MinisterDashboard() {
  const [data] = useState(getStaticDashboardData());
  const [complaintWindow, setComplaintWindow] = useState("Month");
  const [vipWindow, setVipWindow] = useState("This Month");
  const [meetingsWindow, setMeetingsWindow] = useState("Last 30 days");
  const [vipPage, setVipPage] = useState(1);
  const VIP_ITEMS_PER_PAGE = 4;

  const kpis = useMemo(() => ([
    {
      icon: CalendarLtrRegular,
      label: "Meetings Held This Month",
      value: data?.scheduledMeetings ?? "--",
      change: changeMeta(data?.analytics?.meetingDensity || 0.8),
    },
    {
      icon: ClipboardTaskRegular,
      label: "Complaints Received",
      value: data?.complaintOverview?.received ?? "--",
      change: changeMeta(data?.operations?.pendingAgeBuckets?.under3 || 1.4),
    },
    {
      icon: CheckmarkCircleRegular,
      label: "Complaints Resolved",
      value: data?.complaintOverview?.resolved ?? "--",
      change: changeMeta(data?.operations?.referralDepartmentPerformance?.[0]?.resolutionRate || 1.8),
    },
    {
      icon: StarRegular,
      label: "Events & VIP Meetings Attended",
      value: (data?.attendedEvents || 0) + (data?.operations?.priorityBreakdown?.[0]?.count || 0),
      change: changeMeta(data?.analytics?.publicOutreachIndex || -0.6),
    },
  ]), [data]);

  const complaintsOverview = useMemo(() => {
    const all = [
      { name: "Received", value: data?.complaintOverview?.received || 0 },
      { name: "Resolved", value: data?.complaintOverview?.resolved || 0 },
      { name: "Pending", value: data?.complaintOverview?.pending || 0 },
    ];
    if (complaintWindow === "Year") return all;
    const multiplier = complaintWindow === "Week" ? 0.22 : 0.58;
    return all.map((item) => ({
      ...item,
      value: Math.max(1, Math.round(item.value * multiplier)),
    }));
  }, [data, complaintWindow]);

  const meetingsHeldSeries = useMemo(() => {
    const series = data?.meetingsHeldSeries || [];
    if (meetingsWindow === "This Month") return series.slice(-5);
    if (meetingsWindow === "This Quarter") return series.slice(-8);
    return series;
  }, [data, meetingsWindow]);

  const productivitySeries = useMemo(
    () => buildExecutiveProductivitySeries(data?.analytics?.weeklyScores || [], meetingsHeldSeries),
    [data, meetingsHeldSeries]
  );

  const productivityPeak = useMemo(
    () => productivitySeries.reduce((max, item) => Math.max(max, Number(item.score || 0)), 0),
    [productivitySeries]
  );

  const complaintsTotal = complaintsOverview.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const vipItems = useMemo(() => {
    const now = new Date();
    const items = data?.vipMeetingsAndEvents || [];
    return items.filter((item) => {
      const itemDate = new Date(item.date);
      if (Number.isNaN(itemDate.getTime())) return false;
      const diffMs = itemDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (vipWindow === "This Week") return diffDays >= -7 && diffDays <= 7;
      if (vipWindow === "This Month") {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
      if (vipWindow === "This Year") return itemDate.getFullYear() === now.getFullYear();
      return true;
    });
  }, [data, vipWindow]);

  const totalVipPages = Math.ceil(vipItems.length / VIP_ITEMS_PER_PAGE);
  const paginatedVipItems = vipItems.slice((vipPage - 1) * VIP_ITEMS_PER_PAGE, vipPage * VIP_ITEMS_PER_PAGE);

  function handleDownloadExecutiveBrief() {
    alert("Download Executive Brief PDF");
  }

  return (
    <div className="minister-dashboard" style={{ background: TOKENS.bgApp, minHeight: "100%", color: TOKENS.textPrimary, padding: "1.5rem" }}>
      <div style={{ marginBottom: "1.2rem", borderRadius: 16, padding: "1.3rem 1.4rem", background: "linear-gradient(135deg, #5B4FE9, #756BFF)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.85rem", opacity: 0.82, fontWeight: 700 }}>Executive Snapshot</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "0.3rem" }}>This month&apos;s governance pulse is ready for review.</div>
          <div style={{ fontSize: "0.88rem", opacity: 0.88, marginTop: "0.35rem" }}>Track meetings, complaints, events, and productivity from one consolidated view.</div>
        </div>
        <button type="button" onClick={handleDownloadExecutiveBrief} style={{ border: "none", borderRadius: 999, padding: "0.75rem 1.2rem", fontWeight: 700, background: "#FFFFFF", color: ACCENT, cursor: "pointer", whiteSpace: "nowrap" }}>
          View Executive Brief
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "1rem", marginBottom: "1rem" }} className="minister-kpis">
        {kpis.map((item) => <StatCard key={item.label} {...item} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.9fr 1.1fr", gap: "1rem", marginBottom: "1rem" }} className="minister-charts">
        <SectionCard
          title="Meetings Held"
          action={(
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: TOKENS.textPrimary }}>{meetingsHeldSeries.reduce((sum, item) => sum + Number(item.count || 0), 0) || data?.scheduledMeetings || 0}</div>
              <span style={{ padding: "0.28rem 0.58rem", borderRadius: 999, background: "rgba(22,163,74,0.12)", color: "#16A34A", fontSize: "0.72rem", fontWeight: 700 }}>
                {changeMeta(data?.analytics?.meetingDensity || 1.1).label}
              </span>
              <select value={meetingsWindow} onChange={(event) => setMeetingsWindow(event.target.value)} style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 10, padding: "0.45rem 0.65rem", fontSize: "0.8rem", color: TOKENS.textSecondary, background: TOKENS.bgPrimary }}>
                <option>Last 30 days</option>
                <option>This Month</option>
                <option>This Quarter</option>
              </select>
            </div>
          )}
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meetingsHeldSeries} barCategoryGap={18}>
                <defs>
                  <linearGradient id="meetingsHeldGhost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CFCBFF" />
                    <stop offset="100%" stopColor="color-mix(in srgb, var(--bg-secondary) 80%, white 20%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="color-mix(in srgb, var(--border-secondary) 88%, transparent 12%)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDateLabel} tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Bar dataKey="target" fill="url(#meetingsHeldGhost)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="count" fill={ACCENT} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Productivity Score"
          action={(
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: TOKENS.textPrimary }}>{productivityPeak || data?.analytics?.policyEngagementIndex || 0}</div>
              <span style={{ padding: "0.28rem 0.58rem", borderRadius: 999, background: "rgba(22,163,74,0.12)", color: "#16A34A", fontSize: "0.72rem", fontWeight: 700 }}>
                {changeMeta(data?.analytics?.governanceVsCeremonialRatio || 0.5).label}
              </span>
            </div>
          )}
        >
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productivitySeries}>
                <defs>
                  <linearGradient id="productivityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7A6FFF" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#7A6FFF" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="color-mix(in srgb, var(--border-secondary) 88%, transparent 12%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Area type="monotone" dataKey="score" stroke={ACCENT} strokeWidth={3} fill="url(#productivityFill)" activeDot={{ r: 5, fill: ACCENT, stroke: TOKENS.bgPrimary, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "1rem", marginBottom: "1rem" }} className="minister-middle">
        <SectionCard
          title="Complaints Overview"
          action={<div style={{ display: "flex", gap: "0.4rem" }}>{["Week", "Month", "Year"].map((tab) => <FilterPill key={tab} label={tab} active={complaintWindow === tab} onClick={() => setComplaintWindow(tab)} />)}</div>}
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr)", alignItems: "center", gap: "0.5rem" }} className="minister-pie-layout">
            <div style={{ height: 220, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complaintsOverview} dataKey="value" innerRadius={56} outerRadius={86} paddingAngle={3} stroke="none">
                    {complaintsOverview.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle()} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.45rem", fontWeight: 800, color: TOKENS.textPrimary }}>{complaintsTotal}</div>
                  <div style={{ fontSize: "0.72rem", color: TOKENS.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Cases</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gap: "0.7rem" }}>
              {complaintsOverview.map((item, index) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem", background: TOKENS.bgSecondary, borderRadius: 12, padding: "0.75rem 0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", minWidth: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: PIE_COLORS[index % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: "0.83rem", color: TOKENS.textSecondary, fontWeight: 700 }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: "0.88rem", color: TOKENS.textPrimary, fontWeight: 800 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="VIP Meetings & Events"
          action={
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {["This Week", "This Month", "This Year"].map((tab) => (
                <FilterPill
                  key={tab}
                  label={tab}
                  active={vipWindow === tab}
                  onClick={() => {
                    setVipWindow(tab);
                    setVipPage(1);
                  }}
                />
              ))}
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {paginatedVipItems.map((item) => {
                const badge = statusTone(item.status);
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.9rem", paddingBottom: "0.85rem", borderBottom: `1px solid ${TOKENS.borderSoft}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: item.type === "VIP Meeting" ? ACCENT : "#3B82F6" }} />
                      <div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 700, color: TOKENS.textPrimary }}>{item.label}</div>
                        <div style={{ fontSize: "0.78rem", color: TOKENS.textMuted, marginTop: "0.2rem" }}>{new Date(item.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span style={{ padding: "0.32rem 0.68rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, color: badge.fg, background: badge.bg }}>
                      {item.status}
                    </span>
                  </div>
                );
              })}

              {!vipItems.length && (
                <div style={{ background: TOKENS.bgSecondary, borderRadius: 12, padding: "1rem", color: TOKENS.textSecondary, textAlign: "center" }}>
                  No VIP meetings or events found for {vipWindow.toLowerCase()}.
                </div>
              )}

              {totalVipPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    disabled={vipPage === 1}
                    onClick={() => setVipPage(p => Math.max(1, p - 1))}
                    style={{
                      background: "transparent", border: `1px solid ${TOKENS.borderSoft}`, borderRadius: 6,
                      padding: "0.3rem 0.6rem", cursor: vipPage === 1 ? "not-allowed" : "pointer",
                      color: TOKENS.textSecondary, opacity: vipPage === 1 ? 0.5 : 1, fontSize: "0.75rem", fontWeight: 600
                    }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: "0.75rem", color: TOKENS.textMuted, fontWeight: 500 }}>
                    Page {vipPage} of {totalVipPages}
                  </span>
                  <button
                    type="button"
                    disabled={vipPage === totalVipPages}
                    onClick={() => setVipPage(p => Math.min(totalVipPages, p + 1))}
                    style={{
                      background: "transparent", border: `1px solid ${TOKENS.borderSoft}`, borderRadius: 6,
                      padding: "0.3rem 0.6rem", cursor: vipPage === totalVipPages ? "not-allowed" : "pointer",
                      color: TOKENS.textSecondary, opacity: vipPage === totalVipPages ? 0.5 : 1, fontSize: "0.75rem", fontWeight: 600
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <style>{`
        .minister-dashboard button,
        .minister-dashboard select {
          transition: background-color var(--duration-theme) var(--ease-smooth), color var(--duration-theme) var(--ease-smooth), border-color var(--duration-theme) var(--ease-smooth), box-shadow 160ms ease;
        }

        .minister-dashboard {
          transition: background-color var(--duration-theme) var(--ease-smooth), color var(--duration-theme) var(--ease-smooth);
        }

        @media (max-width: 1200px) {
          .minister-kpis,
          .minister-charts,
          .minister-middle {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 860px) {
          .minister-pie-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}