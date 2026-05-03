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
  LabelList
} from "recharts";
import {
  slaBreachAlerts,
  escalationLadder,
  topRecurringComplaints,
} from "../data/dashboardData.js";
import {
  FilterGroup,
  CardHeader,
  Badge,
  COLORS,
  priorityToColor,
  MiniStat,
  StoryTooltip,
} from "./SharedUI.jsx";

const FILTERS = ["Week", "Month", "Year"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DONUT_COLORS = [
  { id: "complaintDonutIndigo", fill: "url(#complaintDonutIndigo)", solid: COLORS.blue },
  { id: "complaintDonutAmber", fill: "url(#complaintDonutAmber)", solid: COLORS.glow },
  { id: "complaintDonutTeal", fill: "url(#complaintDonutTeal)", solid: COLORS.green },
  { id: "complaintDonutLavender", fill: "url(#complaintDonutLavender)", solid: COLORS.purple },
  { id: "complaintDonutRose", fill: "url(#complaintDonutRose)", solid: COLORS.red }
];

const COMPLAINT_CATEGORIES = [
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

function complaintDate(c) {
  const raw = c.updatedAt || c.updated_at || c.createdAt || c.created_at;
  return raw ? new Date(raw) : null;
}

function buildSeries(complaints, adminId, filter, selectedMonth, selectedYear) {
  const now = new Date();
  
  const bucket = (c) => {
    const d = complaintDate(c);
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
      const group = complaints.filter((c) => {
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
      const group = complaints.filter((c) => {
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
    const group = complaints.filter((c) => {
      const d = bucket(c);
      return d && d >= dayStart && d <= dayEnd;
    });
    return { label, ...tally(group) };
  });
}

export default function ComplaintsSection({ complaints = [], adminId, loading }) {
  const [filter, setFilter] = useState("Month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsFromData = complaints.map((c) => complaintDate(c)?.getFullYear()).filter(Boolean);
    const minYear = yearsFromData.length > 0 ? Math.min(...yearsFromData) : currentYear - 5;
    
    const years = [];
    for (let y = currentYear; y >= Math.min(minYear, currentYear - 5); y--) {
      years.push(y);
    }
    return years;
  }, [complaints]);

  const series = useMemo(
    () => buildSeries(complaints, adminId, filter, selectedMonth, selectedYear),
    [complaints, adminId, filter, selectedMonth, selectedYear]
  );

  const overviewStats = useMemo(() => {
    const activeMine = complaints.filter(c => c.assignedAdminUserId === adminId && c.status !== 'resolved').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const scheduled = complaints.filter(c => c.status === 'call_scheduled' || c.status === 'rescheduled').length;
    const reassigned = complaints.filter(c => c.handoffType === 'reassigned').length;

    return [
      { name: "Total in Complaint Pool", value: complaints.length },
      { name: "My Complaints (Active)", value: activeMine },
      { name: "Resolved", value: resolved },
      { name: "Scheduled", value: scheduled },
      { name: "Reassigned", value: reassigned },
    ];
  }, [complaints, adminId]);

  const categoryData = useMemo(() => {
    const map = {};
    // Pre-fill map with all official categories
    COMPLAINT_CATEGORIES.forEach(cat => {
      map[cat] = { count: 0, resolved: 0 };
    });
    
    complaints.forEach(c => {
      const cat = c.complaintType || c.category || "Uncategorized";
      if (!map[cat]) map[cat] = { count: 0, resolved: 0 };
      map[cat].count++;
      if (c.status === 'resolved') map[cat].resolved++;
    });
    
    // Create an array with all official categories first, plus any 'Uncategorized' that appeared
    const data = COMPLAINT_CATEGORIES.map(cat => ({
      category: cat,
      count: map[cat].count,
      resolved: map[cat].resolved
    }));
    
    if (map["Uncategorized"] && map["Uncategorized"].count > 0) {
      data.push({
        category: "Uncategorized",
        count: map["Uncategorized"].count,
        resolved: map["Uncategorized"].resolved
      });
    }
    
    // Sort so higher counts appear at top, keeping 0-count categories at bottom
    return data.sort((a,b) => b.count - a.count);
  }, [complaints]);

  const reassignedData = useMemo(() => {
    const data = MONTH_NAMES.map(month => ({ month, total: 0, reassigned: 0 }));
    complaints.forEach(c => {
      const d = complaintDate(c);
      if (d && d.getFullYear() === selectedYear) {
        data[d.getMonth()].total++;
        if (c.handoffType === 'reassigned') {
          data[d.getMonth()].reassigned++;
        }
      }
    });
    return data;
  }, [complaints, selectedYear]);

  return (
    <>
      <div className="db-grid-row db-col-7-3">
        <div className="db-card">
          <CardHeader title="Complaints Trend" infoText="Visualizes the volume of total, resolved, and scheduled complaints over time.">
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
              <FilterGroup options={FILTERS} value={filter} onChange={setFilter} />
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
                <MiniStat label="Total Complaints" value={series.reduce((sum, item) => sum + item.total, 0)} colorHex={COLORS.purple} />
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
                            const total = payload.find((entry) => entry.dataKey === "total")?.value || 0;
                            const resolved = payload.find((entry) => entry.dataKey === "resolved")?.value || 0;
                            const scheduled = payload.find((entry) => entry.dataKey === "scheduled")?.value || 0;
                            return (
                              <>
                                On <strong>{label}</strong>, there were <strong>{total}</strong> active complaints. <strong>{resolved}</strong>{" "}
                                were resolved, and <strong>{scheduled}</strong> scheduled.
                              </>
                            );
                          }}
                        />
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 10, color: "var(--db-text-secondary)" }} />
                    <Bar dataKey="total" name="Total Complaints" fill="url(#cTotalBar)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved" fill="url(#cResolvedBar)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="scheduled" name="Scheduled" fill="url(#cScheduledBar)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        <div className="db-card">
          <CardHeader title="Complaints Overview" infoText="Distribution of complaints currently existing in the system across all possible statuses." />
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
                      <linearGradient id="complaintDonutIndigo" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-indigo-soft)" />
                        <stop offset="100%" stopColor="var(--db-series-indigo-deep)" />
                      </linearGradient>
                      <linearGradient id="complaintDonutAmber" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-amber-soft)" />
                        <stop offset="100%" stopColor="var(--db-series-amber-deep)" />
                      </linearGradient>
                      <linearGradient id="complaintDonutTeal" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
                        <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
                      </linearGradient>
                      <linearGradient id="complaintDonutLavender" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
                        <stop offset="100%" stopColor="var(--db-series-lavender-deep)" />
                      </linearGradient>
                      <linearGradient id="complaintDonutRose" x1="0" y1="0" x2="1" y2="1">
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
                            return (
                              <>
                                <strong>{item.name}</strong> accounts for <strong>{item.value}</strong> cases.
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
                      <span style={{ width: 8, height: 8, borderRadius: "2px", background: DONUT_COLORS[index % DONUT_COLORS.length].solid }} />
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
      </div>

      <div className="db-grid-row db-col-1-1">
        <div className="db-card">
          <CardHeader title="Complaints by Category" infoText="Displays the volume of complaints grouped by their respective categories and how many have been successfully resolved." />
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
                      <linearGradient id="complaintCategoryTotalBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
                        <stop offset="52%" stopColor="var(--db-series-lavender)" />
                        <stop offset="100%" stopColor="var(--db-series-lavender-deep)" />
                      </linearGradient>
                      <linearGradient id="complaintCategoryResolvedBar" x1="0" y1="0" x2="1" y2="0">
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
                          const totalCount = payload.find((entry) => entry.dataKey === "count")?.value || 0;
                          const resolved = payload.find((entry) => entry.dataKey === "resolved")?.value || 0;
                          return (
                            <>
                              The <strong>{label}</strong> category has <strong>{totalCount}</strong> total complaints, of which <strong>{resolved}</strong>{" "}
                              have been resolved.
                            </>
                          );
                        }}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 10 }} />
                  <Bar dataKey="count" name="Total" fill="url(#complaintCategoryTotalBar)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="url(#complaintCategoryResolvedBar)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </div>
          )}
        </div>

        <div className="db-card">
          <CardHeader title={`Reassigned Cases (${selectedYear})`} infoText="Tracks the total volume of complaints that were reassigned each month during the selected year." />
          {loading ? (
            <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--db-text-muted)" }}>Loading…</span>
            </div>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reassignedData} barCategoryGap={8}>
                  <defs>
                    <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-peony-soft)" stopOpacity={1} />
                    <stop offset="52%" stopColor="var(--db-series-peony)" stopOpacity={0.94} />
                    <stop offset="100%" stopColor="var(--db-series-indigo-deep)" stopOpacity={0.82} />
                  </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--db-border)" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip
                    cursor={{ fill: "var(--db-chart-hover)" }}
                    content={
                      <StoryTooltip
                        formatter={(payload, label) => {
                          const reassigned = payload.find(p => p.dataKey === "reassigned")?.value || 0;
                          return (
                            <>
                              In <strong>{label}</strong>, <strong>{reassigned}</strong> cases were reassigned.
                            </>
                          );
                        }}
                      />
                    }
                  />
                  <Bar dataKey="reassigned" name="Reassigned" fill="url(#peakGrad)" radius={[4, 4, 0, 0]} barSize={20}>
                    <LabelList dataKey="reassigned" position="top" fill="var(--db-text-muted)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
