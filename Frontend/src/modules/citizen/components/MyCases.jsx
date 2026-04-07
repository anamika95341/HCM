import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Clock, CheckCircle2, AlertCircle, FileText, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function citizenStatus(item) {
  const status = item.status || "pending";
  const label = String(status)
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
  return { value: status, label };
}

const tableCellTextStyle = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const idColumnStyle = {
  width: 160,
  minWidth: 160,
  maxWidth: 160,
};

function toTooltipText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function MyCases() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.card : "#F7F1FF";
  const pageHeight = "calc(100vh - 73px)";
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [filters, setFilters] = useState({ q: "", status: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    let mounted = true;

    async function loadCases() {
      try {
        const { data: response } = await apiClient.get("/citizen/my-cases", authorizedConfig(session.accessToken));
        if (mounted) {
          setComplaints(response.complaints || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load your complaints");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken) {
      loadCases();
    }

    return () => {
      mounted = false;
    };
  }, [session?.accessToken]);

  const items = useMemo(() => {
    const complaintItems = complaints.map((item) => ({
      ...item,
      itemType: "complaint",
      primaryTitle: item.title || item.subject,
      primaryId: item.complaintId,
    })).sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0) - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0));

    return complaintItems.filter((item) => {
      const status = citizenStatus(item);
      const statusOk = filters.status === "all" || status.value === filters.status;
      const q = filters.q.trim().toLowerCase();
      const searchText = [
        item.primaryTitle,
        item.primaryId,
        item.complaintType,
      ].filter(Boolean).join(" ").toLowerCase();
      return statusOk && (!q || searchText.includes(q));
    });
  }, [complaints, filters]);

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(complaints.map((item) => item.status).filter(Boolean))).sort();
  }, [complaints]);

  return (
    <div
      style={{
        height: pageHeight,
        overflow: "hidden",
        padding: "20px 20px 0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={20} style={{ color: C.purple, flexShrink: 0 }} />
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>MY COMPLAINTS</h1>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3" size={18} style={{ color: C.t3 }} />
              <WorkspaceInput
                value={filters.q}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, q: event.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="Search ID, title, category..."
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

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {loading && (
            <WorkspaceEmptyState title="Loading your complaints..." />
          )}

          {error && <div style={{ color: C.danger, padding: "12px 0" }}>{error}</div>}

          {!loading && !error && (
            <>
              {items.length === 0 ? (
                <WorkspaceEmptyState title="No complaints found" subtitle="Try adjusting your filters." />
              ) : (
                <>
                  <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                      <colgroup>
                        <col style={idColumnStyle} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Complaint ID</th>
                          <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Complaint Title</th>
                          <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Category</th>
                          <th style={{ width: "1%", padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Status</th>
                          <th style={{ width: "1%", padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item, index) => {
                          const status = citizenStatus(item);
                          const categoryLabel = item.complaintType || "-";
                          const rowBackground = index % 2 === 0 ? C.card : alternateRowBackground;
                          const isActionHovered = hoveredActionId === item._id;

                          return (
                            <tr key={`${item.itemType}-${item._id}`} style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBackground, verticalAlign: "middle" }}>
                              <td style={{ padding: "10px 16px", verticalAlign: "middle" }}>
                                <span title={toTooltipText(item.primaryId)} style={{ display: "block", fontWeight: 600, color: C.purple, fontSize: 13, whiteSpace: "nowrap" }}>
                                  {item.primaryId}
                                </span>
                              </td>
                              <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 0 }}>
                                <div title={toTooltipText(item.primaryTitle)} style={{ ...tableCellTextStyle, fontSize: 13, fontWeight: 600, color: C.t1, margin: 0 }}>
                                  {item.primaryTitle}
                                </div>
                              </td>
                              <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                                <span title={toTooltipText(categoryLabel)} style={tableCellTextStyle}>
                                  {categoryLabel}
                                </span>
                              </td>
                              <td style={{ width: "1%", padding: "10px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                <WorkspaceBadge status={status.value}>{status.label}</WorkspaceBadge>
                              </td>
                              <td style={{ width: "1%", padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                <button
                                  type="button"
                                  onMouseEnter={() => setHoveredActionId(item._id)}
                                  onMouseLeave={() => setHoveredActionId(null)}
                                  onClick={() => navigate(`/citizen/cases/${item._id}`, { state: { caseData: item, itemType: item.itemType } })}
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

                    <div style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}`, margin: "0 0 8px" }}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-3.5">
                        <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>
                          Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, items.length)}</span>-<span className="font-semibold">{Math.min(currentPage * itemsPerPage, items.length)}</span> of <span className="font-semibold">{items.length}</span> requests
                        </p>

                        {totalPages > 1 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <WorkspaceButton
                              onMouseEnter={() => setHoveredPagerButton("previous")}
                              onMouseLeave={() => setHoveredPagerButton(null)}
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              variant="outline"
                              style={{ width: 92, minHeight: 34, padding: "8px 12px", fontSize: 12, background: hoveredPagerButton === "previous" && currentPage !== 1 ? C.purple : "transparent", color: hoveredPagerButton === "previous" && currentPage !== 1 ? "#ffffff" : C.purple, border: `1px solid ${C.purple}`, opacity: currentPage === 1 ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              <ChevronLeft size={16} /> Previous
                            </WorkspaceButton>

                            <span style={{ padding: "6px 10px", fontSize: 12, color: C.t3 }}>
                              Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                            </span>

                            <WorkspaceButton
                              onMouseEnter={() => setHoveredPagerButton("next")}
                              onMouseLeave={() => setHoveredPagerButton(null)}
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              variant="outline"
                              style={{ width: 92, minHeight: 34, padding: "8px 12px", fontSize: 12, background: hoveredPagerButton === "next" && currentPage !== totalPages ? C.purple : "transparent", color: hoveredPagerButton === "next" && currentPage !== totalPages ? "#ffffff" : C.purple, border: `1px solid ${C.purple}`, opacity: currentPage === totalPages ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              Next <ChevronRight size={16} />
                            </WorkspaceButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:hidden space-y-3 pb-2">
                    {paginatedItems.map((item) => {
                      const status = citizenStatus(item);
                      const categoryLabel = item.complaintType || "-";

                      return (
                        <WorkspaceCard key={`${item.itemType}-${item._id}`} style={{ padding: 16 }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4 }}>{item.primaryId}</p>
                              <h3 style={{ fontWeight: 700, color: C.t1 }}>{item.primaryTitle}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <WorkspaceBadge status={status.value}>{status.label}</WorkspaceBadge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 mb-3 text-xs">
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p style={{ textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4, fontWeight: 600 }}>Category</p>
                              <p style={{ color: C.t2, fontWeight: 600 }}>{categoryLabel}</p>
                            </div>
                          </div>

                          <WorkspaceButton
                            type="button"
                            onClick={() => navigate(`/citizen/cases/${item._id}`, { state: { caseData: item, itemType: item.itemType } })}
                            variant="outline"
                            style={{ width: "100%" }}
                          >
                            <Eye size={16} /> View Details
                          </WorkspaceButton>
                        </WorkspaceCard>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
