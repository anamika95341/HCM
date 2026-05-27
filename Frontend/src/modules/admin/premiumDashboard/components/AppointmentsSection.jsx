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
  LineChart,
  Line,
} from "recharts";
import { FilterGroup, CardHeader, COLORS, StoryTooltip, MiniStat } from "./SharedUI.jsx";

const FILTERS = ["Week", "Month", "Year"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const APPOINTMENT_DONUT_FILLS = [
  { id: "appointmentDonutIndigo", fill: "url(#appointmentDonutIndigo)", solid: COLORS.blue },
  { id: "appointmentDonutAmber", fill: "url(#appointmentDonutAmber)", solid: COLORS.glow },
  { id: "appointmentDonutLavender", fill: "url(#appointmentDonutLavender)", solid: COLORS.purple },
  { id: "appointmentDonutTeal", fill: "url(#appointmentDonutTeal)", solid: COLORS.green },
  { id: "appointmentDonutRose", fill: "url(#appointmentDonutRose)", solid: COLORS.red },
];

function appointmentDate(m) {
  const raw = m.updatedAt || m.updated_at || m.scheduled_at || m.createdAt || m.created_at;
  return raw ? new Date(raw) : null;
}

function buildSeries(appointments, adminId, filter, selectedMonth, selectedYear) {
  const now = new Date();
  const targetAppointments = appointments.filter((m) => m.assignedAdminUserId === adminId);

  const bucket = (m) => {
    const d = appointmentDate(m);
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
  };

  const tally = (group) => ({
    completed: group.filter((m) => m.status === "completed").length,
    scheduled: group.filter((m) => m.status === "scheduled" || m.status === "rescheduled").length,
    cancelled: group.filter((m) => m.status === "cancelled").length,
  });

  if (filter === "Year") {
    return MONTH_NAMES.map((label, idx) => {
      const group = targetAppointments.filter((m) => {
        const d = bucket(m);
        return d && d.getFullYear() === selectedYear && d.getMonth() === idx;
      });
      return { label, ...tally(group) };
    });
  }

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
      const group = targetAppointments.filter((m) => {
        const d = bucket(m);
        return d && d >= wStart && d <= wEnd;
      });
      result.push({ label: `W${week}`, ...tally(group) });
      cursor.setDate(cursor.getDate() + 7);
      week++;
    }
    return result;
  }

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return DAY_NAMES.map((label, idx) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + idx);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const group = targetAppointments.filter((m) => {
      const d = bucket(m);
      return d && d >= dayStart && d <= dayEnd;
    });
    return { label, ...tally(group) };
  });
}

function buildSeriesAll(appointments, filter, selectedMonth, selectedYear) {
  const now = new Date();

  const bucket = (m) => {
    const d = appointmentDate(m);
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
  };

  const tally = (group) => ({
    completed: group.filter((m) => m.status === "completed").length,
    scheduled: group.filter((m) => m.status === "scheduled" || m.status === "rescheduled").length,
    cancelled: group.filter((m) => m.status === "cancelled").length,
  });

  if (filter === "Year") {
    return MONTH_NAMES.map((label, idx) => {
      const group = appointments.filter((m) => {
        const d = bucket(m);
        return d && d.getFullYear() === selectedYear && d.getMonth() === idx;
      });
      return { label, ...tally(group) };
    });
  }

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
      const group = appointments.filter((m) => {
        const d = bucket(m);
        return d && d >= wStart && d <= wEnd;
      });
      result.push({ label: `W${week}`, ...tally(group) });
      cursor.setDate(cursor.getDate() + 7);
      week++;
    }
    return result;
  }

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return DAY_NAMES.map((label, idx) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + idx);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const group = appointments.filter((m) => {
      const d = bucket(m);
      return d && d >= dayStart && d <= dayEnd;
    });
    return { label, ...tally(group) };
  });
}

function buildPoolDailyData(appointments) {
  const today = new Date();
  const result = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const count = appointments.filter((m) => {
      const created = m.createdAt ? new Date(m.createdAt) : (m.created_at ? new Date(m.created_at) : null);
      return created && created >= dayStart && created <= dayEnd;
    }).length;
    result.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, count });
  }
  return result;
}

function FilterControls({ filter, onFilterChange, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, availableYears }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {filter === "Month" && (
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          style={{
            outline: "none", margin: 0, color: "var(--db-text-primary)", background: "transparent",
            border: "none", borderRadius: "8px", padding: "0.2rem 0.65rem",
            fontFamily: "'Lora', serif", fontSize: "0.68rem", fontWeight: "600",
            cursor: "pointer", appearance: "auto", boxSizing: "border-box",
          }}
        >
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i} style={{ background: "var(--db-bg)", color: "var(--db-text-primary)" }}>{m}</option>
          ))}
        </select>
      )}
      {filter === "Year" && (
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{
            outline: "none", margin: 0, color: "var(--db-text-primary)", background: "transparent",
            border: "none", borderRadius: "8px", padding: "0.2rem 0.65rem",
            fontFamily: "'Lora', serif", fontSize: "0.68rem", fontWeight: "600",
            cursor: "pointer", appearance: "auto", boxSizing: "border-box",
          }}
        >
          {availableYears.map((y) => (
            <option key={y} value={y} style={{ background: "var(--db-bg)", color: "var(--db-text-primary)" }}>{y}</option>
          ))}
        </select>
      )}
      <FilterGroup options={FILTERS} value={filter} onChange={onFilterChange} />
    </div>
  );
}

function AppointmentBarChart({ series }) {
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} barCategoryGap={14} barGap={3}>
          <defs>
            <linearGradient id="appointmentsCompletedBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
              <stop offset="52%" stopColor="var(--db-series-teal)" />
              <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
            </linearGradient>
            <linearGradient id="appointmentsScheduledBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
              <stop offset="52%" stopColor="var(--db-series-lavender)" />
              <stop offset="100%" stopColor="var(--db-series-indigo-deep)" />
            </linearGradient>
            <linearGradient id="appointmentsCancelledBar" x1="0" y1="0" x2="0" y2="1">
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
                  return <><strong>{label}</strong>: {s} scheduled, {c} completed, {x} cancelled.</>;
                }}
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: "0.73rem", color: "var(--db-text-secondary)", paddingTop: 6, paddingBottom: 0, marginBottom: 0 }} />
          <Bar dataKey="completed" name="Completed" fill="url(#appointmentsCompletedBar)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="scheduled" name="Scheduled" fill="url(#appointmentsScheduledBar)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cancelled" name="Cancelled" fill="url(#appointmentsCancelledBar)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Own Appointments Bar Chart ───────────────────────────────────────────────

export default function AppointmentsSection({ filter, onFilterChange, appointments = [], adminId, loading }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsFromData = appointments.map((m) => appointmentDate(m)?.getFullYear()).filter(Boolean);
    const minYear = yearsFromData.length > 0 ? Math.min(...yearsFromData) : currentYear - 5;
    const years = [];
    for (let y = currentYear; y >= Math.min(minYear, currentYear - 5); y--) years.push(y);
    return years;
  }, [appointments]);

  const series = useMemo(
    () => buildSeries(appointments, adminId, filter, selectedMonth, selectedYear),
    [appointments, adminId, filter, selectedMonth, selectedYear]
  );

  return (
    <div className="db-card">
      <CardHeader title="Own Appointments" infoText="Your scheduled, completed and cancelled appointments grouped by the selected period.">
        <FilterControls
          filter={filter} onFilterChange={onFilterChange}
          selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear} setSelectedYear={setSelectedYear}
          availableYears={availableYears}
        />
      </CardHeader>

      {loading ? (
        <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem", textAlign: "center" }}>
            <MiniStat label="Scheduled" value={series.reduce((sum, item) => sum + item.scheduled, 0)} colorHex={COLORS.purple} />
            <MiniStat label="Completed" value={series.reduce((sum, item) => sum + item.completed, 0)} colorHex={COLORS.green} />
            <MiniStat label="Cancelled" value={series.reduce((sum, item) => sum + item.cancelled, 0)} colorHex={COLORS.red} />
          </div>
          <AppointmentBarChart series={series} />
        </>
      )}
    </div>
  );
}

// ─── Overall Appointments Bar Chart (all admins) ──────────────────────────────

export function OverallAppointmentsSection({ appointments = [], loading }) {
  const [filter, setFilter] = useState("Month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsFromData = appointments.map((m) => appointmentDate(m)?.getFullYear()).filter(Boolean);
    const minYear = yearsFromData.length > 0 ? Math.min(...yearsFromData) : currentYear - 5;
    const years = [];
    for (let y = currentYear; y >= Math.min(minYear, currentYear - 5); y--) years.push(y);
    return years;
  }, [appointments]);

  const series = useMemo(
    () => buildSeriesAll(appointments, filter, selectedMonth, selectedYear),
    [appointments, filter, selectedMonth, selectedYear]
  );

  return (
    <div className="db-card">
      <CardHeader title="Overall Appointments" infoText="Scheduled, completed and cancelled appointments across all admins grouped by the selected period.">
        <FilterControls
          filter={filter} onFilterChange={setFilter}
          selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear} setSelectedYear={setSelectedYear}
          availableYears={availableYears}
        />
      </CardHeader>

      {loading ? (
        <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem", textAlign: "center" }}>
            <MiniStat label="Scheduled" value={series.reduce((sum, item) => sum + item.scheduled, 0)} colorHex={COLORS.purple} />
            <MiniStat label="Completed" value={series.reduce((sum, item) => sum + item.completed, 0)} colorHex={COLORS.green} />
            <MiniStat label="Cancelled" value={series.reduce((sum, item) => sum + item.cancelled, 0)} colorHex={COLORS.red} />
          </div>
          <AppointmentBarChart series={series} />
        </>
      )}
    </div>
  );
}

// ─── Appointment Pool Trend Line (daily, last 14 days) ────────────────────────

export function AppointmentPoolTrendLine({ appointments = [], loading }) {
  const data = useMemo(() => buildPoolDailyData(appointments), [appointments]);

  return (
    <div className="db-card">
      <CardHeader
        title="Appointment Pool Trend"
        infoText="Daily count of new appointments entering the pool over the last 14 days."
      />
      {loading ? (
        <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
        </div>
      ) : (
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="var(--db-border)" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--db-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} dy={8} interval={1} />
              <YAxis tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dx={-6} allowDecimals={false} />
              <Tooltip
                content={
                  <StoryTooltip
                    formatter={(payload, label) => {
                      const count = payload[0]?.value || 0;
                      return <><strong>{count}</strong> appointment{count !== 1 ? "s" : ""} entered the pool on <strong>{label}</strong>.</>;
                    }}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Appointments in Pool"
                stroke="var(--db-series-indigo)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--db-series-indigo)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Right: Stats Panel ────────────────────────────────────────────────────────

function DonutChart({ overviewStats, fills }) {
  return (
    <>
      <defs>
        <linearGradient id="appointmentDonutIndigo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--db-series-indigo-soft)" />
          <stop offset="100%" stopColor="var(--db-series-indigo-deep)" />
        </linearGradient>
        <linearGradient id="appointmentDonutAmber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--db-series-amber-soft)" />
          <stop offset="100%" stopColor="var(--db-series-amber-deep)" />
        </linearGradient>
        <linearGradient id="appointmentDonutLavender" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
          <stop offset="100%" stopColor="var(--db-series-lavender-deep)" />
        </linearGradient>
        <linearGradient id="appointmentDonutTeal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
          <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
        </linearGradient>
        <linearGradient id="appointmentDonutRose" x1="0" y1="0" x2="1" y2="1">
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
          <Cell key={bucket.name} fill={fills[index % fills.length].fill} />
        ))}
      </Pie>
      <Tooltip
        content={
          <StoryTooltip
            formatter={(payload) => {
              const item = payload[0];
              if (!item) return null;
              return <><strong>{item.name}</strong> accounts for <strong>{item.value}</strong> appointments.</>;
            }}
          />
        }
      />
    </>
  );
}

export function AppointmentStatsPanel({ filter, appointments = [], adminId, loading }) {
  const stats = useMemo(() => {
    const mine = appointments.filter((m) => m.assignedAdminUserId === adminId);
    return {
      totalPool: appointments.length,
      myAppointments: mine.filter((m) => !["completed", "cancelled", "rejected"].includes(m.status)).length,
      scheduled: mine.filter((m) => m.status === "scheduled" || m.status === "rescheduled").length,
      completed: mine.filter((m) => m.status === "completed").length,
      cancelled: mine.filter((m) => m.status === "cancelled").length,
    };
  }, [appointments, adminId]);

  const overviewStats = useMemo(() => [
    { name: "Total in Appointment Pool", value: stats.totalPool, color: COLORS.blue },
    { name: "My Appointments", value: stats.myAppointments, color: COLORS.glow },
    { name: "Scheduled", value: stats.scheduled, color: COLORS.purple },
    { name: "Completed", value: stats.completed, color: COLORS.green },
    { name: "Cancelled", value: stats.cancelled, color: COLORS.red },
  ], [stats]);

  return (
    <div className="db-card">
      <CardHeader title="Appointment Overview" infoText="Live data for all appointments." />
      {loading ? (
        <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
        </div>
      ) : (
        <>
          <div style={{ position: "relative", height: 140, marginBottom: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <DonutChart overviewStats={overviewStats} fills={APPOINTMENT_DONUT_FILLS} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {overviewStats.map((bucket, index) => (
              <div key={bucket.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "2px", background: APPOINTMENT_DONUT_FILLS[index % APPOINTMENT_DONUT_FILLS.length].solid }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--db-text-secondary)", fontWeight: 500 }}>{bucket.name}</span>
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--db-text-primary)" }}>{bucket.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Overall Stats Panel (minister: total/scheduled/completed/cancelled all admins) ──

const MINISTER_DONUT_FILLS = [
  { id: "appointmentDonutIndigo", fill: "url(#appointmentDonutIndigo)", solid: COLORS.blue },
  { id: "appointmentDonutLavender", fill: "url(#appointmentDonutLavender)", solid: COLORS.purple },
  { id: "appointmentDonutTeal", fill: "url(#appointmentDonutTeal)", solid: COLORS.green },
  { id: "appointmentDonutRose", fill: "url(#appointmentDonutRose)", solid: COLORS.red },
];

export function OverallAppointmentStatsPanel({ appointments = [], loading }) {
  const stats = useMemo(() => ({
    totalPool: appointments.length,
    scheduled: appointments.filter((m) => m.status === "scheduled" || m.status === "rescheduled").length,
    completed: appointments.filter((m) => m.status === "completed").length,
    cancelled: appointments.filter((m) => m.status === "cancelled").length,
  }), [appointments]);

  const overviewStats = useMemo(() => [
    { name: "Total in Appointment Pool", value: stats.totalPool, color: COLORS.blue },
    { name: "Scheduled", value: stats.scheduled, color: COLORS.purple },
    { name: "Completed", value: stats.completed, color: COLORS.green },
    { name: "Cancelled", value: stats.cancelled, color: COLORS.red },
  ], [stats]);

  return (
    <div className="db-card">
      <CardHeader title="Appointment Overview" infoText="Live data for all appointments across all admins." />
      {loading ? (
        <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
        </div>
      ) : (
        <>
          <div style={{ position: "relative", height: 140, marginBottom: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <DonutChart overviewStats={overviewStats} fills={MINISTER_DONUT_FILLS} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {overviewStats.map((bucket, index) => (
              <div key={bucket.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "2px", background: MINISTER_DONUT_FILLS[index % MINISTER_DONUT_FILLS.length].solid }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--db-text-secondary)", fontWeight: 500 }}>{bucket.name}</span>
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--db-text-primary)" }}>{bucket.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
