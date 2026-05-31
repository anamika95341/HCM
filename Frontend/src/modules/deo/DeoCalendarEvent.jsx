import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import {
  WorkspaceButton,
  WorkspaceEmptyState,
  WorkspaceInput,
} from "../../shared/components/WorkspaceUI.jsx";
import CustomDateFilter from "../../shared/components/CustomDateFilter.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { PATHS } from "../../routes/paths.js";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${mon},${year}`;
}

function toYmd(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const tableCellTextStyle = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export default function DeoCalendarEvent() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [showEntriesFocused, setShowEntriesFocused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.card : "#F7F1FF";

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data } = await apiClient.get("/deo/assigned-appointments");
        if (mounted) setAppointments(data.appointments || []);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.error || "Unable to load verification requests");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (session?.role) load();
    return () => { mounted = false; };
  }, [session?.role]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter((a) => {
      const citizenName = [a.first_name, a.last_name].filter(Boolean).join(" ");
      const matchesQuery = !q || [a.request_id, a.title, a.purpose, citizenName, a.citizen_state, a.citizen_city]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
      const matchesDate = !dateFilter || toYmd(a.created_at || a.createdAt) === dateFilter;
      return matchesQuery && matchesDate;
    });
  }, [appointments, searchQuery, dateFilter]);

  const todayStr = toYmd(new Date());

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <div
      style={{
        height: "calc(100vh - 73px)",
        overflow: "auto",
        padding: "16px 20px 8px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>
            APPOINTMENT VERIFICATION
          </h1>
        </div>

        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative", width: "30%" }}>
            <Search
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.t3 }}
              size={15}
            />
            <WorkspaceInput
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Id, Title, Citizen, State and District"
              style={{ padding: "6px 14px 6px 34px", minHeight: 34, fontSize: 11 }}
            />
          </div>
          <div style={{ width: "20%" }}>
            <CustomDateFilter
              value={dateFilter}
              onChange={(v) => { setDateFilter(v); setCurrentPage(1); }}
              placeholder="Created At"
              max={todayStr}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading && <WorkspaceEmptyState title="Loading verification queue..." />}
          {error && <div style={{ color: C.danger, padding: "12px 0" }}>{error}</div>}

          {!loading && !error && (
            filtered.length === 0 ? (
              <WorkspaceEmptyState title="No pending verification requests" />
            ) : (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", marginBottom: 10 }}>
                <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 145, minWidth: 145, maxWidth: 145 }} />
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: 100, minWidth: 100, maxWidth: 100 }} />
                    <col style={{ width: 100, minWidth: 100, maxWidth: 100 }} />
                    <col style={{ width: 105, minWidth: 105, maxWidth: 105 }} />
                    <col style={{ width: 84, minWidth: 84, maxWidth: 84 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        { label: "Appointment ID", align: "left" },
                        { label: "Title", align: "left" },
                        { label: "Citizen Name", align: "left" },
                        { label: "State", align: "left" },
                        { label: "District", align: "left" },
                        { label: "Created At", align: "left" },
                        { label: "Action", align: "center" },
                      ].map(({ label, align }, i) => (
                        <th
                          key={label}
                          style={{
                            padding: "13px 16px",
                            fontSize: 10,
                            fontWeight: 600,
                            color: tableHeaderText,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            textAlign: align,
                            whiteSpace: "nowrap",
                            background: tableHeaderBackground,
                            borderBottom: `1px solid ${C.border}`,
                            verticalAlign: "middle",
                            borderTopLeftRadius: i === 0 ? 12 : 0,
                            borderTopRightRadius: i === 6 ? 12 : 0,
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((appt, index) => {
                      const rowBg = index % 2 === 0 ? C.card : alternateRowBackground;
                      const isHovered = hoveredActionId === appt.id;
                      const citizenName = [appt.first_name, appt.last_name].filter(Boolean).join(" ") || "-";
                      return (
                        <tr
                          key={appt.id}
                          style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBg, verticalAlign: "middle" }}
                        >
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                            <span style={{ ...tableCellTextStyle, fontWeight: 600, fontFamily: "monospace", fontSize: 11 }}>{appt.request_id || appt.id}</span>
                          </td>
                          <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 0 }}>
                            <div style={{ ...tableCellTextStyle, fontSize: 13, fontWeight: 600, color: C.t1 }}>
                              {appt.title || appt.purpose || "-"}
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                            <span style={tableCellTextStyle}>{citizenName}</span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                            <span style={tableCellTextStyle}>{appt.citizen_state || "-"}</span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                            <span style={tableCellTextStyle}>{appt.citizen_city || "-"}</span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            <span style={tableCellTextStyle}>{formatDate(appt.created_at || appt.createdAt)}</span>
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredActionId(appt.id)}
                              onMouseLeave={() => setHoveredActionId(null)}
                              onClick={() =>
                                navigate(
                                  PATHS.deo.calendarEventDetail.replace(":id", appt.id),
                                  { state: { appointment: appt } }
                                )
                              }
                              title="View details"
                              style={{
                                minWidth: 0,
                                padding: 7,
                                borderRadius: 10,
                                border: "none",
                                background: isHovered ? C.purple : "transparent",
                                color: isHovered ? "#ffffff" : C.purple,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
                              }}
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span style={{ color: C.t2, whiteSpace: "nowrap", fontSize: 12 }}>Show</span>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={itemsPerPage}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          setItemsPerPage(Math.min(25, Math.max(1, v)));
                          setCurrentPage(1);
                        }}
                        onFocus={() => setShowEntriesFocused(true)}
                        onBlur={() => setShowEntriesFocused(false)}
                        style={{
                          width: 64,
                          minHeight: 34,
                          padding: "6px 14px",
                          border: `1px solid ${showEntriesFocused ? C.purple : C.border}`,
                          borderRadius: "var(--portal-radius-sm, 10px)",
                          background: C.inp,
                          color: C.t1,
                          fontSize: 13,
                          fontWeight: 500,
                          outline: "none",
                          boxShadow: showEntriesFocused ? `0 0 0 3px ${C.purpleDim}` : "none",
                          transition: "border-color var(--portal-duration-fast) ease, box-shadow var(--portal-duration-fast) ease",
                        }}
                      />
                      <span style={{ color: C.t2, whiteSpace: "nowrap", fontSize: 12 }}>Entries</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
                      {totalPages > 1 ? (
                        <>
                          <WorkspaceButton
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            variant="outline"
                            onMouseEnter={() => setHoveredPagerButton("prev")}
                            onMouseLeave={() => setHoveredPagerButton(null)}
                            style={{
                              minWidth: 30, minHeight: 30, padding: 6, border: "none",
                              background: "transparent", color: C.purple,
                              opacity: currentPage === 1 ? 0.35 : 1,
                              display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
                            }}
                          >
                            <ChevronLeft size={16} />
                          </WorkspaceButton>
                          {pageNumbers.map((pageNum, idx) => {
                            const prev = pageNumbers[idx - 1];
                            const showGap = idx > 0 && prev !== undefined && pageNum - prev > 1;
                            return (
                              <div key={pageNum} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {showGap && <span style={{ color: C.t3, fontSize: 12 }}>...</span>}
                                <WorkspaceButton
                                  onClick={() => setCurrentPage(pageNum)}
                                  variant="outline"
                                  onMouseEnter={() => setHoveredPagerButton(`p-${pageNum}`)}
                                  onMouseLeave={() => setHoveredPagerButton(null)}
                                  style={{
                                    minWidth: 30, minHeight: 30, padding: 6, border: "none", borderRadius: 8, fontSize: 12,
                                    fontWeight: pageNum === currentPage ? 700 : 600, background: "transparent",
                                    color: pageNum === currentPage || hoveredPagerButton === `p-${pageNum}` ? "#ffffff" : C.purple,
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    textShadow: pageNum === currentPage || hoveredPagerButton === `p-${pageNum}` ? "0 0 10px rgba(255,255,255,0.9)" : "none",
                                    transition: "text-shadow 0.18s ease, color 0.18s ease",
                                  }}
                                >
                                  {pageNum}
                                </WorkspaceButton>
                              </div>
                            );
                          })}
                          <WorkspaceButton
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            onMouseEnter={() => setHoveredPagerButton("next")}
                            onMouseLeave={() => setHoveredPagerButton(null)}
                            style={{
                              minWidth: 30, minHeight: 30, padding: 6, border: "none",
                              background: "transparent", color: C.purple,
                              opacity: currentPage === totalPages ? 0.35 : 1,
                              display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
                            }}
                          >
                            <ChevronRight size={16} />
                          </WorkspaceButton>
                        </>
                      ) : (
                        <span style={{ color: "#ffffff", fontSize: 14, fontWeight: 700, textShadow: "0 0 10px rgba(255,255,255,0.9)", lineHeight: 1 }}>
                          1
                        </span>
                      )}
                    </div>

                    <p style={{ color: C.t2, margin: 0, whiteSpace: "nowrap", textAlign: "right", flex: 1, fontSize: 12 }}>
                      Showing{" "}
                      <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}</strong>
                      –
                      <strong>{Math.min(currentPage * itemsPerPage, filtered.length)}</strong>
                      {" "}of{" "}
                      <strong>{filtered.length}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
