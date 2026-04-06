import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Clock, CheckCircle2, AlertCircle, Calendar, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { useNotifications } from "../../../shared/notifications/NotificationContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function meetingStatus(item) {
  const status = item.status || "pending";
  const label = String(status)
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
  return { value: status, label };
}

export default function MeetingList() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { eventVersion } = useNotifications();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.card : "#F7F1FF";
  const pageHeight = "calc(100vh - 73px)";
  
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredActionId, setHoveredActionId] = useState(null);
  
  // Pagination and Filter State
  const [filters, setFilters] = useState({ q: "", status: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  useEffect(() => {
    let mounted = true;

    async function loadMeetings() {
      try {
        const { data } = await apiClient.get("/meetings/my", authorizedConfig(session.accessToken));
        if (mounted) {
          setMeetings(data.meetings || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load meetings");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken) {
      loadMeetings();
    }

    return () => {
      mounted = false;
    };
  }, [session?.accessToken, eventVersion]);

  // Unified items calculation with filtering and sorting
  const items = useMemo(() => {
    const meetingItems = meetings.map((item) => ({
      ...item,
      itemType: "meeting",
      primaryTitle: item.title,
      primaryId: item.requestId || item.id, // Fallback to id if requestId isn't present
    })).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return meetingItems.filter((item) => {
      const statusObj = meetingStatus(item);
      const statusOk = filters.status === "all" || statusObj.value === filters.status;
      const q = filters.q.trim().toLowerCase();
      
      const searchText = [
        item.primaryTitle,
        item.primaryId,
        item.purpose,
        statusObj.label,
        item.scheduled_location,
      ].filter(Boolean).join(" ").toLowerCase();
      
      return statusOk && (!q || searchText.includes(q));
    });
  }, [meetings, filters]);

  // Pagination Math
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Dynamic Status Options for the dropdown
  const statusOptions = useMemo(() => {
    return Array.from(new Set(meetings.map((item) => item.status).filter(Boolean))).sort();
  }, [meetings]);

  return (
    <div
      style={{
        height: pageHeight,
        overflow: "hidden",
        padding: "16px 20px 12px",
        display: "flex",
        flexDirection: "column",
      }}
    >
        <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <Calendar size={20} style={{ color: C.purple, flexShrink: 0 }} />
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>MY MEETINGS</h1>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3" size={18} style={{ color: C.t3 }} />
              <WorkspaceInput
                value={filters.q}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, q: event.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="Search title, purpose, location..."
                style={{ paddingLeft: 38 }}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3" size={18} style={{ color: C.t3 }} />
              <WorkspaceSelect
                value={filters.status}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, status: event.target.value }));
                  setCurrentPage(1);
                }}
                style={{ paddingLeft: 38 }}
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ").charAt(0).toUpperCase() + status.replace(/_/g, " ").slice(1)}
                  </option>
                ))}
              </WorkspaceSelect>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 22, minHeight: 0 }}>
          {loading && <WorkspaceEmptyState title="Loading your meetings..." />}
          {error && <div style={{ color: C.danger, padding: "12px 0" }}>{error}</div>}

          {!loading && !error && (
            <>
              {items.length === 0 ? (
                <WorkspaceEmptyState title="No meeting requests found" subtitle="Try adjusting your filters." />
              ) : (
                <>
                  <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Meeting ID</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Meeting Title</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Created At</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Scheduled Time</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Location</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Status</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedItems.map((item, index) => {
                              const statusObj = meetingStatus(item);
                              const scheduledTimeLabel = item.scheduled_at ? new Date(item.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
                              const createdAtLabel = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "--";
                              const locationLabel = item.scheduled_location || "-";
                              const isActionHovered = hoveredActionId === item.id;

                              const rowBackground = index % 2 === 0 ? C.card : alternateRowBackground;

                              return (
                                <tr key={`${item.itemType}-${item.id}`} style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBackground, verticalAlign: "middle" }}>
                                  <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, whiteSpace: "nowrap", verticalAlign: "middle" }}>{item.primaryId || "-"}</td>
                                  <td style={{ padding: "10px 16px", verticalAlign: "middle", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35, minWidth: 260, maxWidth: 320 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{item.primaryTitle}</span>
                                  </td>
                                  <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, whiteSpace: "nowrap", verticalAlign: "middle" }}>{createdAtLabel}</td>
                                  <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, whiteSpace: "nowrap", verticalAlign: "middle" }}>{scheduledTimeLabel}</td>
                                  <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>{locationLabel}</td>
                                  <td style={{ padding: "10px 16px", verticalAlign: "middle" }}>
                                    <WorkspaceBadge status={statusObj.value}>{statusObj.label}</WorkspaceBadge>
                                  </td>
                                  <td style={{ padding: "10px 16px", textAlign: "center", verticalAlign: "middle" }}>
                                    <button
                                      type="button"
                                      onMouseEnter={() => setHoveredActionId(item.id)}
                                      onMouseLeave={() => setHoveredActionId(null)}
                                      onClick={() => navigate(`/citizen/meetings/${item.id}`, { state: { meetingData: item, itemType: item.itemType } })}
                                      title="View details"
                                      style={{
                                        minWidth: 0,
                                        padding: 7,
                                        borderRadius: 10,
                                        border: `1px solid ${C.purple}`,
                                        background: isActionHovered ? C.purple : "transparent",
                                        color: isActionHovered ? "#ffffff" : C.purple,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease, border-color var(--portal-duration-fast) ease",
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
                  </div>

                  <div className="lg:hidden space-y-3">
                    {paginatedItems.map((item) => {
                      const statusObj = meetingStatus(item);
                      const scheduledTimeLabel = item.scheduled_at ? new Date(item.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
                      const locationLabel = item.scheduled_location || "-";
                      const createdAtLabel = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "--";

                      return (
                        <div key={`${item.itemType}-${item.id}`} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, background: C.card }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div style={{ fontSize: 11, color: C.t3, marginBottom: 6, fontWeight: 600 }}>
                                Meeting ID: {item.primaryId || "-"}
                              </div>
                              <h3 style={{ margin: 0, fontWeight: 700, color: C.t1, lineHeight: 1.5, wordBreak: "break-word" }}>{item.primaryTitle}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <WorkspaceBadge status={statusObj.value}>{statusObj.label}</WorkspaceBadge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p style={{ margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, fontWeight: 600 }}>Created At</p>
                              <p style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{createdAtLabel}</p>
                            </div>
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p style={{ margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, fontWeight: 600 }}>Scheduled Time</p>
                              <p style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{scheduledTimeLabel}</p>
                            </div>
                            <div className="col-span-2" style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p style={{ margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, fontWeight: 600 }}>Location</p>
                              <p style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{locationLabel}</p>
                            </div>
                          </div>

                          <WorkspaceButton
                            type="button"
                            onClick={() => navigate(`/citizen/meetings/${item.id}`, { state: { meetingData: item, itemType: item.itemType } })}
                            variant="outline"
                            style={{ width: "100%" }}
                          >
                            <Eye size={16} /> View Details
                          </WorkspaceButton>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto" }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, background: C.card }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>
                Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-semibold">{Math.min(currentPage * itemsPerPage, items.length)}</span> of{" "}
                <span className="font-semibold">{items.length}</span> requests
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <WorkspaceButton
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="ghost"
                  style={{ minHeight: 34, padding: "8px 12px" }}
                >
                  <ChevronLeft size={16} /> Previous
                </WorkspaceButton>

                <span style={{ padding: "6px 10px", fontSize: 12, color: C.t3 }}>
                  Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                </span>

                <WorkspaceButton
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="ghost"
                  style={{ minHeight: 34, padding: "8px 12px" }}
                >
                  Next <ChevronRight size={16} />
                </WorkspaceButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
