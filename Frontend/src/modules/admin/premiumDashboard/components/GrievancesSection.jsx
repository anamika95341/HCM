import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import {
  FilterGroup,
  CardHeader,
  COLORS,
  MiniStat,
  StoryTooltip,
} from "./SharedUI.jsx";

const FILTERS = ["Week", "Month", "Year"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DONUT_COLORS = [
  { id: "grievanceDonutAmber", fill: "url(#grievanceDonutAmber)", solid: COLORS.glow },
  { id: "grievanceDonutTeal", fill: "url(#grievanceDonutTeal)", solid: COLORS.green },
  { id: "grievanceDonutLavender", fill: "url(#grievanceDonutLavender)", solid: COLORS.purple },
  { id: "grievanceDonutRose", fill: "url(#grievanceDonutRose)", solid: COLORS.red }
];

const GRIEVANCE_CATEGORIES = [
  "Tourism Infrastructure",
  "Heritage & Monuments",
  "Cultural Institutions & Activities",
  "Tourism Services & Visitor Experience",
  "Constituency Civic Issues",
  "Government Schemes & Benefits",
  "Employment & Skill Development",
  "Public Grievances Against Departments",
  "Suggestions / Public Feedback",
];

function grievanceDate(c) {
  const raw = c.updatedAt || c.updated_at || c.createdAt || c.created_at;
  return raw ? new Date(raw) : null;
}

function grievanceCreatedDate(c) {
  const raw = c.createdAt || c.created_at;
  return raw ? new Date(raw) : null;
}

function buildSeries(grievances, adminId, filter, selectedMonth, selectedYear) {
  const now = new Date();

  const bucket = (c) => {
    const d = grievanceDate(c);
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
  };

  const tally = (group) => {
    const mine = group.filter(c => c.assignedAdminUserId === adminId);
    return {
      total: mine.filter(c => c.status !== "resolved").length,
      resolved: mine.filter(c => c.status === "resolved").length,
      scheduled: mine.filter(c => c.status === "call_scheduled" || c.status === "rescheduled").length,
    };
  };

  if (filter === "Year") {
    return MONTH_NAMES.map((label, idx) => {
      const group = grievances.filter((c) => {
        const d = bucket(c);
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
      const group = grievances.filter((c) => {
        const d = bucket(c);
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
    const group = grievances.filter((c) => {
      const d = bucket(c);
      return d && d >= dayStart && d <= dayEnd;
    });
    return { label, ...tally(group) };
  });
}

function buildPendingDeoSeries(grievances, filter, selectedMonth, selectedYear) {
  const now = new Date();
  const pending = grievances.filter(
    (c) => !c.letterheadReady && c.status !== "rejected" && c.status !== "completed" && c.status !== "closed"
  );

  const bucket = (c) => {
    const d = grievanceCreatedDate(c);
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
  };

  if (filter === "Year") {
    return MONTH_NAMES.map((label, idx) => {
      const count = pending.filter((c) => {
        const d = bucket(c);
        return d && d.getFullYear() === selectedYear && d.getMonth() === idx;
      }).length;
      return { label, count };
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
      const count = pending.filter((c) => {
        const d = bucket(c);
        return d && d >= wStart && d <= wEnd;
      }).length;
      result.push({ label: `W${week}`, count });
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
    const count = pending.filter((c) => {
      const d = bucket(c);
      return d && d >= dayStart && d <= dayEnd;
    }).length;
    return { label, count };
  });
}

function buildDailyGrievanceTrend(grievances) {
  const today = new Date();
  const result = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const dayGrievances = grievances.filter((c) => {
      const created = grievanceCreatedDate(c);
      return created && created >= dayStart && created <= dayEnd;
    });
    result.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      byCitizen: dayGrievances.filter((c) => !c.createdByDeo).length,
      byDeo: dayGrievances.filter((c) => c.createdByDeo).length,
    });
  }
  return result;
}

export default function GrievancesSection({ grievances = [], adminId, loading, showReassigned = true }) {
  const [filter, setFilter] = useState("Month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsFromData = grievances.map((c) => grievanceDate(c)?.getFullYear()).filter(Boolean);
    const minYear = yearsFromData.length > 0 ? Math.min(...yearsFromData) : currentYear - 5;
    const years = [];
    for (let y = currentYear; y >= Math.min(minYear, currentYear - 5); y--) years.push(y);
    return years;
  }, [grievances]);

  const series = useMemo(
    () => buildSeries(grievances, adminId, filter, selectedMonth, selectedYear),
    [grievances, adminId, filter, selectedMonth, selectedYear]
  );

  const pendingDeoSeries = useMemo(
    () => buildPendingDeoSeries(grievances, filter, selectedMonth, selectedYear),
    [grievances, filter, selectedMonth, selectedYear]
  );

  const dailyTrendData = useMemo(() => buildDailyGrievanceTrend(grievances), [grievances]);

  const overviewStats = useMemo(() => {
    const activeMine = grievances.filter(c => c.assignedAdminUserId === adminId && c.status !== "resolved").length;
    const resolved = grievances.filter(c => c.status === "resolved").length;
    const scheduled = grievances.filter(c => c.status === "call_scheduled" || c.status === "rescheduled").length;
    return [
      { name: "My Grievances (Active)", value: activeMine },
      { name: "Resolved", value: resolved },
      { name: "Scheduled", value: scheduled },
    ];
  }, [grievances, adminId]);

  const categoryData = useMemo(() => {
    const map = {};
    GRIEVANCE_CATEGORIES.forEach(cat => { map[cat] = { count: 0, resolved: 0 }; });
    grievances.forEach(c => {
      const cat = c.grievanceType || c.category || "Uncategorized";
      if (!map[cat]) map[cat] = { count: 0, resolved: 0 };
      map[cat].count++;
      if (c.status === "resolved") map[cat].resolved++;
    });
    const data = GRIEVANCE_CATEGORIES.map(cat => ({ category: cat, count: map[cat].count, resolved: map[cat].resolved }));
    if (map["Uncategorized"] && map["Uncategorized"].count > 0) {
      data.push({ category: "Uncategorized", count: map["Uncategorized"].count, resolved: map["Uncategorized"].resolved });
    }
    return data.sort((a, b) => b.count - a.count);
  }, [grievances]);

  const filterControls = (
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
      <FilterGroup options={FILTERS} value={filter} onChange={setFilter} />
    </div>
  );

  return (
    <>
      {/* Row 1: Trend bar + Donut */}
      <div className="db-grid-row db-col-7-3">
        <div className="db-card">
          <CardHeader title="Grievances Trend" infoText="Visualizes the volume of total, resolved, and scheduled grievances over time.">
            {filterControls}
          </CardHeader>

          {loading ? (
            <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem", textAlign: "center" }}>
                <MiniStat label="Total Grievances" value={series.reduce((sum, item) => sum + item.total, 0)} colorHex={COLORS.purple} />
                <MiniStat label="Resolved" value={series.reduce((sum, item) => sum + item.resolved, 0)} colorHex={COLORS.green} />
                <MiniStat label="Scheduled" value={series.reduce((sum, item) => sum + item.scheduled, 0)} colorHex={COLORS.glow} />
              </div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} barCategoryGap={14} barGap={3}>
                    <defs>
                      <linearGradient id="cTotalBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-lavender-soft)" stopOpacity={1} />
                        <stop offset="52%" stopColor="var(--db-series-lavender)" stopOpacity={0.94} />
                        <stop offset="100%" stopColor="var(--db-series-indigo-deep)" stopOpacity={0.82} />
                      </linearGradient>
                      <linearGradient id="cResolvedBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-teal-soft)" stopOpacity={1} />
                        <stop offset="52%" stopColor="var(--db-series-teal)" stopOpacity={0.94} />
                        <stop offset="100%" stopColor="var(--db-series-teal-deep)" stopOpacity={0.84} />
                      </linearGradient>
                      <linearGradient id="cScheduledBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-amber-soft)" stopOpacity={1} />
                        <stop offset="52%" stopColor="var(--db-series-amber)" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="var(--db-series-amber-deep)" stopOpacity={0.86} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--db-border)" vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "var(--db-chart-hover)" }}
                      content={
                        <StoryTooltip
                          formatter={(payload, label) => {
                            const total = payload.find((e) => e.dataKey === "total")?.value || 0;
                            const resolved = payload.find((e) => e.dataKey === "resolved")?.value || 0;
                            const scheduled = payload.find((e) => e.dataKey === "scheduled")?.value || 0;
                            return <>On <strong>{label}</strong>: <strong>{total}</strong> active, <strong>{resolved}</strong> resolved, <strong>{scheduled}</strong> scheduled.</>;
                          }}
                        />
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 10, color: "var(--db-text-secondary)" }} />
                    <Bar dataKey="total" name="Total Grievances" fill="url(#cTotalBar)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="url(#cResolvedBar)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="scheduled" name="Scheduled" fill="url(#cScheduledBar)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* Donut — without "Total in Grievance Pool" */}
        <div className="db-card">
          <CardHeader title="Grievances Overview" infoText="Distribution of grievances in the system across statuses." />
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
                      <linearGradient id="grievanceDonutAmber" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-amber-soft)" />
                        <stop offset="100%" stopColor="var(--db-series-amber-deep)" />
                      </linearGradient>
                      <linearGradient id="grievanceDonutTeal" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
                        <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
                      </linearGradient>
                      <linearGradient id="grievanceDonutLavender" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
                        <stop offset="100%" stopColor="var(--db-series-lavender-deep)" />
                      </linearGradient>
                      <linearGradient id="grievanceDonutRose" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-rose-soft)" />
                        <stop offset="52%" stopColor="var(--db-series-rose)" />
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
                        <Cell key={bucket.name} fill={DONUT_COLORS[index % DONUT_COLORS.length].fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <StoryTooltip
                          formatter={(payload) => {
                            const item = payload[0];
                            if (!item) return null;
                            return <><strong>{item.name}</strong>: <strong>{item.value}</strong> cases.</>;
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
                      <span style={{ width: 8, height: 8, borderRadius: "2px", background: DONUT_COLORS[index % DONUT_COLORS.length].solid }} />
                      <span style={{ fontSize: "0.75rem", color: "var(--db-text-secondary)", fontWeight: 500 }}>{bucket.name}</span>
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--db-text-primary)" }}>{bucket.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Daily trend line (citizen vs DEO) + Pending DEO letterhead bar */}
      <div className="db-grid-row db-col-7-3">
        <div className="db-card">
          <CardHeader
            title="Grievance Submission Trend"
            infoText="Daily count of grievances submitted by citizens vs submitted by DEO over the last 14 days."
          />
          {loading ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
            </div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="var(--db-border)" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "var(--db-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} dy={8} interval={1} />
                  <YAxis tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dx={-6} allowDecimals={false} />
                  <Tooltip
                    content={
                      <StoryTooltip
                        formatter={(payload, label) => {
                          const c = payload.find((e) => e.dataKey === "byCitizen")?.value || 0;
                          const d = payload.find((e) => e.dataKey === "byDeo")?.value || 0;
                          return <><strong>{label}</strong>: <strong>{c}</strong> by citizen, <strong>{d}</strong> by DEO.</>;
                        }}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "0.73rem", color: "var(--db-text-secondary)", paddingTop: 6 }} />
                  <Line
                    type="monotone"
                    dataKey="byCitizen"
                    name="By Citizen"
                    stroke="var(--db-series-indigo)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--db-series-indigo)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="byDeo"
                    name="By DEO"
                    stroke="var(--db-series-amber)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--db-series-amber)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="db-card">
          <CardHeader
            title="Pending DEO Letterhead"
            infoText="Grievances awaiting DEO letterhead generation, grouped by the selected period."
          >
            {filterControls}
          </CardHeader>
          {loading ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "1rem", textAlign: "center" }}>
                <MiniStat
                  label="Total Pending Letterhead"
                  value={grievances.filter(c => !c.letterheadReady && c.status !== "rejected" && c.status !== "completed" && c.status !== "closed").length}
                  colorHex={COLORS.red}
                />
              </div>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pendingDeoSeries} barCategoryGap={14}>
                    <defs>
                      <linearGradient id="pendingDeoBar" x1="0" y1="0" x2="0" y2="1">
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
                            const count = payload[0]?.value || 0;
                            return <><strong>{label}</strong>: <strong>{count}</strong> grievance{count !== 1 ? "s" : ""} pending DEO letterhead.</>;
                          }}
                        />
                      }
                    />
                    <Bar dataKey="count" name="Pending Letterhead" fill="url(#pendingDeoBar)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3: Category breakdown (optional) */}
      {showReassigned && (
        <div className="db-grid-row db-col-1-1">
          <div className="db-card">
            <CardHeader title="Grievances by Category" infoText="Volume of grievances grouped by category and how many have been resolved." />
            {loading ? (
              <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
              </div>
            ) : (
              <div style={{ height: 240, overflowY: "auto", overflowX: "hidden", paddingRight: "0.5rem" }}>
                <div style={{ height: Math.max(240, categoryData.length * 60 + 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" barCategoryGap={16}>
                      <defs>
                        <linearGradient id="grievanceCategoryTotalBar" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
                          <stop offset="52%" stopColor="var(--db-series-lavender)" />
                          <stop offset="100%" stopColor="var(--db-series-lavender-deep)" />
                        </linearGradient>
                        <linearGradient id="grievanceCategoryResolvedBar" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
                          <stop offset="52%" stopColor="var(--db-series-teal)" />
                          <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--db-border)" horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="category" tick={{ fill: "var(--db-text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
                      <Tooltip
                        cursor={{ fill: "var(--db-chart-hover)" }}
                        content={
                          <StoryTooltip
                            formatter={(payload, label) => {
                              const totalCount = payload.find((e) => e.dataKey === "count")?.value || 0;
                              const resolved = payload.find((e) => e.dataKey === "resolved")?.value || 0;
                              return <><strong>{label}</strong>: <strong>{totalCount}</strong> total, <strong>{resolved}</strong> resolved.</>;
                            }}
                          />
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 10 }} />
                      <Bar dataKey="count" name="Total" fill="url(#grievanceCategoryTotalBar)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="resolved" name="Resolved" fill="url(#grievanceCategoryResolvedBar)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
