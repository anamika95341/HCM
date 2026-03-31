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
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceSelect,
  WorkspaceStatGrid,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function citizenStatus(item) {
  if (["assigned", "department_contact_identified", "call_scheduled", "followup_in_progress", "escalated_to_meeting"].includes(item.status)) {
    return { value: "under_review", label: "Under Review" };
  }
  const label = String(item.status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
  return { value: item.status, label };
}

export default function MyCases() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ q: "", status: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        status.label,
        item.currentOwner,
        item.department,
        item.relatedMeeting?.requestId,
        item.statusReason,
        item.resolutionSummary,
      ].filter(Boolean).join(" ").toLowerCase();
      return statusOk && (!q || searchText.includes(q));
    });
  }, [complaints, filters]);

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(items.map((item) => citizenStatus(item).value))).filter(Boolean).sort();
  }, [items]);

  const totalItems = complaints.length;

  return (
    <WorkspacePage width={1320}>
      <WorkspaceSectionHeader
        eyebrow="Citizen Workspace"
        title="My Complaints"
        subtitle="Track only your complaint requests, status updates, and resolution progress."
        icon={<FileText size={20} />}
      />

      <div style={{ marginBottom: 20 }}>
        <WorkspaceCard>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3" size={18} style={{ color: C.t3 }} />
              <WorkspaceInput
                value={filters.q}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, q: event.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="Search ID, title, status, owner..."
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
        </WorkspaceCard>
      </div>

        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar rounded-xl">
          {loading && (
            <WorkspaceEmptyState title="Loading your complaints..." />
          )}

          {error && <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>}

          {!loading && !error && (
            <>
              {items.length === 0 ? (
                <WorkspaceEmptyState title="No complaints found" subtitle="Try adjusting your filters." />
              ) : (
                <>
                  <WorkspaceCard style={{ padding: 0, overflow: "hidden" }}>
                    <table className="w-full text-sm">
                      <thead style={{ background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
                        <tr>
                          <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Case ID</th>
                          <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Subject</th>
                          <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Department</th>
                          <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Status</th>
                          <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Owner</th>
                          <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Reference</th>
                          <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", whiteSpace: "nowrap" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item) => {
                          const status = citizenStatus(item);
                          const secondaryLine = item.callOutcome || item.resolutionSummary || item.statusReason || "Complaint under process";
                          const departmentLabel = item.department || "Complaint Desk";
                          const referenceLabel = item.relatedMeeting?.requestId || "No linked record";

                          return (
                            <tr key={`${item.itemType}-${item._id}`} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                              <td style={{ padding: "12px 16px" }}><span style={{ fontWeight: 600, color: C.purple, fontSize: 13 }}>{item.primaryId}</span></td>
                              <td style={{ padding: "12px 16px" }}>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{item.primaryTitle}</p>
                                  <p style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{secondaryLine}</p>
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px", fontSize: 13, color: C.t2 }}>{departmentLabel}</td>
                              <td style={{ padding: "12px 16px" }}>
                                <WorkspaceBadge status={status.value}>{status.label}</WorkspaceBadge>
                              </td>
                              <td style={{ padding: "12px 16px", fontSize: 13, color: C.t2 }}>{item.currentOwner || "Pending"}</td>
                              <td style={{ padding: "12px 16px", fontSize: 13, color: C.t2 }}>{referenceLabel}</td>
                              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                <WorkspaceButton
                                  type="button"
                                  onClick={() => navigate(`/citizen/cases/${item._id}`, { state: { caseData: item, itemType: item.itemType } })}
                                  variant="ghost"
                                  style={{ minWidth: 0, padding: 10 }}
                                  title="View details"
                                >
                                  <Eye size={18} />
                                </WorkspaceButton>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </WorkspaceCard>

                  <div className="lg:hidden space-y-3 pb-2">
                    {paginatedItems.map((item) => {
                      const status = citizenStatus(item);
                      const departmentLabel = item.department || "Complaint Desk";
                      const referenceLabel = item.relatedMeeting?.requestId || "No linked record";

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

                          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p style={{ textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4, fontWeight: 600 }}>Department</p>
                              <p style={{ color: C.t2, fontWeight: 600 }}>{departmentLabel}</p>
                            </div>
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p style={{ textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4, fontWeight: 600 }}>Owner</p>
                              <p style={{ color: C.t2, fontWeight: 600 }}>{item.currentOwner || "Pending"}</p>
                            </div>
                            <div className="col-span-2" style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p style={{ textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4, fontWeight: 600 }}>Reference</p>
                              <p style={{ color: C.t2, fontWeight: 600, fontSize: 12 }}>{referenceLabel}</p>
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

        {!loading && !error && items.length > 0 && (
          <div className="flex-shrink-0 pt-4 mt-auto">
            <WorkspaceCard style={{ padding: 16 }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <p style={{ fontSize: 13, color: C.t2 }}>
                  Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-semibold">{Math.min(currentPage * itemsPerPage, items.length)}</span> of{" "}
                  <span className="font-semibold">{items.length}</span> requests
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <WorkspaceButton
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="ghost"
                  >
                    <ChevronLeft size={16} /> Previous
                  </WorkspaceButton>

                  <span style={{ padding: "8px 12px", fontSize: 12, color: C.t3 }}>
                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                  </span>

                  <WorkspaceButton
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="ghost"
                  >
                    Next <ChevronRight size={16} />
                  </WorkspaceButton>
                </div>
              </div>
            </WorkspaceCard>
          </div>
        )}
    </WorkspacePage>
  );
}
