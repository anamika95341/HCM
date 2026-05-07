import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  visitorTrends,
  visitorByCategory,
  peakHoursData,
  stateWiseRequests,
} from "../data/dashboardData.js";
import { FilterGroup, CardHeader, COLORS, MiniStat, StoryTooltip } from "./SharedUI.jsx";

const FILTERS = ["Week", "Month", "Year"];
const VISITOR_DONUT_FILLS = [
  { id: "visitorDonutIndigo", fill: "url(#visitorDonutIndigo)", solid: "var(--db-series-indigo)" },
  { id: "visitorDonutLavender", fill: "url(#visitorDonutLavender)", solid: "var(--db-series-lavender)" },
  { id: "visitorDonutTeal", fill: "url(#visitorDonutTeal)", solid: "var(--db-series-teal)" },
  { id: "visitorDonutAmber", fill: "url(#visitorDonutAmber)", solid: "var(--db-series-amber)" },
  { id: "visitorDonutPeony", fill: "url(#visitorDonutPeony)", solid: "var(--db-series-peony)" },
  { id: "visitorDonutRose", fill: "url(#visitorDonutRose)", solid: "var(--db-series-rose)" },
  { id: "visitorDonutSlate", fill: "url(#visitorDonutSlate)", solid: "var(--db-series-slate)" },
];

export default function VisitorSection() {
  const [filter, setFilter] = useState("Month");
  const key = filter.toLowerCase();
  const series = visitorTrends[key] || [];
  const totalVisitors = series.reduce((sum, item) => sum + item.visitors, 0);
  const totalApproved = series.reduce((sum, item) => sum + item.approved, 0);
  const approvalRate = totalVisitors ? Math.round((totalApproved / totalVisitors) * 100) : 0;

  return (
    <>
      {/* Row 1: Visitor Trends + Categories */}
      <div className="db-grid-row db-col-6-4">
        <div className="db-card">
          <CardHeader title="Visitor Trends" infoText="Tracks total visitor traffic versus approved entries over time.">
            <FilterGroup options={FILTERS} value={filter} onChange={setFilter} />
          </CardHeader>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "1rem",
              marginBottom: "1.25rem",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              border: "1px solid var(--db-border)",
            }}
          >
            <MiniStat label="Total" value={totalVisitors.toLocaleString()} colorHex={COLORS.blue} />
            <MiniStat label="Approved" value={totalApproved.toLocaleString()} colorHex={COLORS.green} />
            <MiniStat label="Approval %" value={`${approvalRate}%`} colorHex={COLORS.glow} />
          </div>

          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="vTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-indigo-soft)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--db-series-indigo-deep)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="vApprv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-teal-soft)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--db-series-teal-deep)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--db-border)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip
                  content={
                    <StoryTooltip
                      formatter={(payload, label) => {
                        const total = payload.find((entry) => entry.dataKey === "visitors")?.value || 0;
                        const approved = payload.find((entry) => entry.dataKey === "approved")?.value || 0;
                        return (
                          <>
                            On <strong>{label}</strong>, <strong>{total}</strong> visitors were recorded. Out of these,{" "}
                            <strong>{approved}</strong> were approved for entry.
                          </>
                        );
                      }}
                    />
                  }
                />
                <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 10, color: "var(--db-text-secondary)" }} />
                <Area type="monotone" dataKey="visitors" name="Total" stroke={COLORS.blue} fill="url(#vTotal)" strokeWidth={2.4} />
                <Area type="monotone" dataKey="approved" name="Approved" stroke={COLORS.green} fill="url(#vApprv)" strokeWidth={2.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visitor Categories donut */}
        <div className="db-card">
          <CardHeader title="Visitor Categories" infoText="Breakdown of visitors by their declared purpose or category type." />
          <div style={{ position: "relative", height: 170, marginBottom: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="visitorDonutIndigo" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-indigo-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-indigo-deep)" />
                  </linearGradient>
                  <linearGradient id="visitorDonutLavender" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-lavender-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-lavender-deep)" />
                  </linearGradient>
                  <linearGradient id="visitorDonutTeal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-teal-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-teal-deep)" />
                  </linearGradient>
                  <linearGradient id="visitorDonutAmber" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-amber-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-amber-deep)" />
                  </linearGradient>
                  <linearGradient id="visitorDonutPeony" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-peony-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-peony-deep)" />
                  </linearGradient>
                  <linearGradient id="visitorDonutRose" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-rose-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-rose-deep)" />
                  </linearGradient>
                  <linearGradient id="visitorDonutSlate" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-slate-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-slate-deep)" />
                  </linearGradient>
                </defs>
                <Pie
                  data={visitorByCategory}
                  dataKey="count"
                  innerRadius={60}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                  cornerRadius={4}
                >
                  {visitorByCategory.map((item, index) => {
                    const color = VISITOR_DONUT_FILLS[index % VISITOR_DONUT_FILLS.length];
                    return <Cell key={item.category} fill={color.fill} />;
                  })}
                </Pie>
                <Tooltip
                  content={
                    <StoryTooltip
                      formatter={(payload) => {
                        const item = payload[0];
                        if (!item) return null;
                        return (
                          <>
                            There have been <strong>{item.value}</strong> visitors in the <strong>{item.name}</strong> category.
                          </>
                        );
                      }}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--db-text-primary)", fontFamily: "'Lora', serif", lineHeight: 1 }}>
                {visitorByCategory.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
              </div>
              <div style={{ fontSize: "0.6rem", color: "var(--db-text-muted)", fontWeight: 600, letterSpacing: "0.05em", marginTop: "0.2rem" }}>
                TOTAL
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {visitorByCategory.map((item, index) => {
              const color = VISITOR_DONUT_FILLS[index % VISITOR_DONUT_FILLS.length];
              return (
                <div key={item.category} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "2px", background: color.solid, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.72rem", color: "var(--db-text-secondary)", fontWeight: 500 }}>{item.category}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--db-text-primary)" }}>{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: State-wise Requests + Peak Hours */}
      <div className="db-grid-row db-col-1-1">
        <div className="db-card">
          <CardHeader title="State-wise Requests" infoText="Geographic distribution of incoming visit requests across different states." />
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateWiseRequests} layout="vertical" barCategoryGap={10} barGap={4}>
                <defs>
                  <linearGradient id="vRequestsBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--db-series-mist-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-mist-deep)" />
                  </linearGradient>
                  <linearGradient id="vApprovedBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--db-series-indigo-soft)" />
                    <stop offset="100%" stopColor="var(--db-series-indigo-deep)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--db-border)" horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="state" tick={{ fill: "var(--db-text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: "var(--db-chart-hover)" }}
                  content={
                    <StoryTooltip
                      formatter={(payload, label) => {
                        const requests = payload.find((entry) => entry.dataKey === "requests")?.value || 0;
                        const approved = payload.find((entry) => entry.dataKey === "approved")?.value || 0;
                        return (
                          <>
                            <strong>{label}</strong> generated <strong>{requests}</strong> visit requests, with{" "}
                            <strong>{approved}</strong> successfully approved.
                          </>
                        );
                      }}
                    />
                  }
                />
                <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: 8 }} />
                <Bar dataKey="requests" name="Total" fill="url(#vRequestsBar)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="approved" name="Approved" fill="url(#vApprovedBar)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="db-card">
          <CardHeader title="Peak Hours" infoText="Highlights the busiest times of day based on historical foot traffic data." />
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} barCategoryGap={10}>
                <defs>
                  <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--db-series-lavender-soft)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--db-series-indigo-deep)" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--db-border)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fill: "var(--db-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: "var(--db-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip
                  cursor={{ fill: "var(--db-chart-hover)" }}
                  content={
                    <StoryTooltip
                      formatter={(payload, label) => {
                        const visitors = payload[0]?.value || 0;
                        return (
                          <>
                            At <strong>{label}</strong>, there is an average foot traffic of <strong>{visitors}</strong> visitors.
                          </>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="visitors" name="Visitors" fill="url(#peakGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
