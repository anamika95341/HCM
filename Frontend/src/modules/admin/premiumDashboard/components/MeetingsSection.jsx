import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FilterGroup, CardHeader, COLORS, StoryTooltip, MiniStat } from "./SharedUI.jsx";

const FILTERS = ["Week", "Month", "Year"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MEETING_DONUT_FILLS = [
  { id: "meetingDonutIndigo", fill: "url(#meetingDonutIndigo)", solid: COLORS.blue },
  { id: "meetingDonutAmber", fill: "url(#meetingDonutAmber)", solid: COLORS.glow },
  { id: "meetingDonutLavender", fill: "url(#meetingDonutLavender)", solid: COLORS.purple },
  { id: "meetingDonutTeal", fill: "url(#meetingDonutTeal)", solid: COLORS.green },
  { id: "meetingDonutRose", fill: "url(#meetingDonutRose)", solid: COLORS.red },
];

// Pick the most relevant date for a meeting
function meetingDate(m) {
  // Check updatedAt first as the user specifically requested to use the updated date from the database
  const raw = m.updatedAt || m.updated_at || m.scheduled_at || m.createdAt || m.created_at;
  return raw ? new Date(raw) : null;
}

// Build chart series from real meetings, grouped by the selected period
function buildSeries(meetings, adminId, filter, selectedMonth, selectedYear) {
  const now = new Date();
  const targetMeetings = meetings;

  const bucket = (m) => {
    const d = meetingDate(m);
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
  };

  const tally = (group) => ({
    completed: group.filter((m) => m.status === "completed").length,
    scheduled: group.filter((m) => m.status === "scheduled" || m.status === "rescheduled").length,
    cancelled: group.filter((m) => m.status === "cancelled").length,
  });

  // ── Year: group by calendar month ──────────────────────────────────────────
  if (filter === "Year") {
    return MONTH_NAMES.map((label, idx) => {
      const group = targetMeetings.filter((m) => {
        const d = bucket(m);
        return d && d.getFullYear() === selectedYear && d.getMonth() === idx;
      });
      return { label, ...tally(group) };
    });
  }

  // ── Month: group by week within current month ───────────────────────────────
  if (filter === "Month") {
    const year = now.getFullYear();
    const month = selectedMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const result = [];
    let cursor = new Date(firstDay);
    let week = 1;
    while (cursor <= lastDay) {
      const wStart = new Date(cursor);
      const wEnd = new Date(cursor);
      wEnd.setDate(wEnd.getDate() + 6);
      if (wEnd > lastDay) wEnd.setTime(lastDay.getTime());
      wEnd.setHours(23, 59, 59, 999);
      const group = targetMeetings.filter((m) => {
        const d = bucket(m);
        return d && d >= wStart && d <= wEnd;
      });
      result.push({ label: `W${week}`, ...tally(group) });
      cursor.setDate(cursor.getDate() + 7);
      week++;
    }
    return result;
  }

  // ── Week: group by day Mon–Sun ──────────────────────────────────────────────
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return DAY_NAMES.map((label, idx) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + idx);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const group = targetMeetings.filter((m) => {
      const d = bucket(m);
      return d && d >= dayStart && d <= dayEnd;
    });
    return { label, ...tally(group) };
  });
}

// ─── Left: Bar Chart ──────────────────────────────────────────────────────────

export default function MeetingsSection({ filter, onFilterChange, meetings = [], adminId, loading }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsFromData = meetings.map((m) => meetingDate(m)?.getFullYear()).filter(Boolean);
    const minYear = yearsFromData.length > 0 ? Math.min(...yearsFromData) : currentYear - 5;
    
    const years = [];
    for (let y = currentYear; y >= Math.min(minYear, currentYear - 5); y--) {
      years.push(y);
    }
    return years;
  }, [meetings]);

  const series = useMemo(
    () => buildSeries(meetings, adminId, filter, selectedMonth, selectedYear),
    [meetings, adminId, filter, selectedMonth, selectedYear]
  );

  return (
    <div className="db-card">
      <CardHeader
        title="Meetings Trend"
        infoText="Scheduled, completed and cancelled meetings grouped by the selected period."
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {filter === "Month" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{
                outline: "none",
                margin: 0,
                color: "var(--db-text-primary)",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                padding: "0.2rem 0.65rem",
                fontFamily: "'Lora', serif",
                fontSize: "0.68rem",
                fontWeight: "600",
                cursor: "pointer",
                appearance: "auto",
                boxSizing: "border-box"
              }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i} style={{ background: "var(--db-bg)", color: "var(--db-text-primary)", padding: 0 }}>
                  {m}
                </option>
              ))}
            </select>
          )}
          {filter === "Year" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                outline: "none",
                margin: 0,
                color: "var(--db-text-primary)",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                padding: "0.2rem 0.65rem",
                fontFamily: "'Lora', serif",
                fontSize: "0.68rem",
                fontWeight: "600",
                cursor: "pointer",
                appearance: "auto",
                boxSizing: "border-box"
              }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y} style={{ background: "var(--db-bg)", color: "var(--db-text-primary)", padding: 0 }}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <FilterGroup options={FILTERS} value={filter} onChange={onFilterChange} />
        </div>
      </CardHeader>

      {loading ? (
        <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "1rem",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            <MiniStat label="Scheduled" value={series.reduce((sum, item) => sum + item.scheduled, 0)} colorHex={COLORS.purple} />
            <MiniStat label="Completed" value={series.reduce((sum, item) => sum + item.completed, 0)} colorHex={COLORS.green} />
            <MiniStat label="Cancelled" value={series.reduce((sum, item) => sum + item.cancelled, 0)} colorHex={COLORS.red} />
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} barCategoryGap={14} barGap={3}>
              <defs>
                <linearGradient id="meetingsCompletedBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
                  <stop offset="52%" stopColor="var(--db-series-teal)" />
                  <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
                </linearGradient>
                <linearGradient id="meetingsScheduledBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
                  <stop offset="52%" stopColor="var(--db-series-lavender)" />
                  <stop offset="100%" stopColor="var(--db-series-indigo-deep)" />
                </linearGradient>
                <linearGradient id="meetingsCancelledBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--db-series-rose-soft)" />
                  <stop offset="52%" stopColor="var(--db-series-rose)" />
                  <stop offset="100%" stopColor="var(--db-series-rose-deep)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--db-border)" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
              <YAxis tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dx={-6} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "var(--db-chart-hover)" }}
                content={
                  <StoryTooltip
                    formatter={(payload, label) => {
                      const s = payload.find((e) => e.dataKey === "scheduled")?.value || 0;
                      const c = payload.find((e) => e.dataKey === "completed")?.value || 0;
                      const x = payload.find((e) => e.dataKey === "cancelled")?.value || 0;
                      return (
                        <>
                          <strong>{label}</strong>: {s} scheduled, {c} completed, {x} cancelled.
                        </>
                      );
                    }}
                  />
                }
              />
              <Legend
                wrapperStyle={{
                  fontSize: "0.73rem",
                  color: "var(--db-text-secondary)",
                  paddingTop: 6,
                  paddingBottom: 0,
                  marginBottom: 0,
                }}
              />
              <Bar dataKey="completed" name="Completed" fill="url(#meetingsCompletedBar)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="scheduled" name="Scheduled" fill="url(#meetingsScheduledBar)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="url(#meetingsCancelledBar)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </>
      )}
    </div>
  );
}

// ─── Right: Stats Panel ────────────────────────────────────────────────────────

const INACTIVE_STATUSES = new Set(["scheduled", "rescheduled", "cancelled", "completed", "rejected"]);

function inPeriod(m, filter) {
  const d = meetingDate(m);
  if (!d || Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (filter === "Week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (filter === "Month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  // Year
  return d.getFullYear() === now.getFullYear();
}

export function MeetingStatsPanel({ filter, meetings = [], adminId, loading }) {
  const stats = useMemo(() => {
    const mine = meetings.filter((m) => m.assignedAdminUserId === adminId);
    
    return {
      totalPool: meetings.length,
      myActive: mine.filter(
        (m) =>
          !["scheduled", "rescheduled", "cancelled", "rejected", "completed"].includes(
            m.status
          )
      ).length,
      scheduled: meetings.filter(
        (m) => m.status === "scheduled" || m.status === "rescheduled"
      ).length,
      completed: meetings.filter((m) => m.status === "completed").length,
      cancelled: meetings.filter((m) => m.status === "cancelled").length,
    };
  }, [meetings, adminId]);

  const overviewStats = useMemo(() => [
    { name: "Total in Meeting Pool", value: stats.totalPool, color: COLORS.blue },
    { name: "My Meetings (Active)", value: stats.myActive, color: COLORS.glow },
    { name: "Scheduled", value: stats.scheduled, color: COLORS.purple },
    { name: "Completed", value: stats.completed, color: COLORS.green },
    { name: "Cancelled", value: stats.cancelled, color: COLORS.red },
  ], [stats]);

  return (
    <div className="db-card">
      <CardHeader
        title="Meeting Overview"
        infoText="Live data for all meetings."
      />
      {loading ? (
        <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
        </div>
      ) : (
        <>
          <div style={{ position: "relative", height: 140, marginBottom: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="meetingDonutIndigo" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-indigo-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-indigo-deep)" />
                  </linearGradient>
                  <linearGradient id="meetingDonutAmber" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-amber-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-amber-deep)" />
                  </linearGradient>
                  <linearGradient id="meetingDonutLavender" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-lavender-deep)" />
                  </linearGradient>
                  <linearGradient id="meetingDonutTeal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
                  </linearGradient>
                  <linearGradient id="meetingDonutRose" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-rose-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-rose-deep)" />
                  </linearGradient>
                </defs>
                <Pie
                  data={overviewStats}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  stroke="none"
                  cornerRadius={4}
                >
                  {overviewStats.map((bucket, index) => (
                    <Cell key={bucket.name} fill={MEETING_DONUT_FILLS[index % MEETING_DONUT_FILLS.length].fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <StoryTooltip
                      formatter={(payload) => {
                        const item = payload[0];
                        if (!item) return null;
                        return (
                          <>
                            <strong>{item.name}</strong> accounts for <strong>{item.value}</strong> meetings.
                          </>
                        );
                      }}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gap: "0.6rem" }}>
            {overviewStats.map((bucket, index) => (
              <div key={bucket.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "2px", background: MEETING_DONUT_FILLS[index % MEETING_DONUT_FILLS.length].solid }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--db-text-secondary)", fontWeight: 500 }}>{bucket.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--db-text-primary)" }}>{bucket.value}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
