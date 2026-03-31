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
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

// Standardized status mapping to match the UI behavior of the cases page
function meetingStatus(item) {
  const status = item.status || "pending";
  if (["pending", "accepted", "verification_pending", "verified"].includes(status)) {
    return { value: status, label: "Under Review" };
  }
  if (status === "not_verified") {
    return { value: status, label: "Verification Failed" };
  }
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
  
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Pagination and Filter State
  const [filters, setFilters] = useState({ q: "", status: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
  }, [session?.accessToken]);

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
    return Array.from(new Set(items.map((item) => meetingStatus(item).value))).filter(Boolean).sort();
  }, [items]);

  return (
    <WorkspacePage width={1320}>
      <WorkspaceSectionHeader
        eyebrow="Citizen Workspace"
        title="My Meetings"
        subtitle="Track meeting requests submitted through the backend workflow."
        icon={<FileText size={20} />}
      />

      {/* FILTER SECTION */}
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
        </WorkspaceCard>
      </div>

      {/* LIST SECTION */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar rounded-xl">
        {loading && (
          <WorkspaceEmptyState title="Loading your meetings..." />
        )}

        {error && <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>}

        {!loading && !error && (
          <>
            {items.length === 0 ? (
              <WorkspaceEmptyState title="No meeting requests found" subtitle="Try adjusting your filters." />
            ) : (
              <>
                {/* DESKTOP TABLE */}
                <WorkspaceCard style={{ padding: 0, overflow: "hidden" }} className="hidden lg:block">
                  <table className="w-full text-sm">
                    <thead style={{ background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
                      <tr>
                        <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Meeting Title</th>
                        <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Preferred Time</th>
                        <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Scheduled Time</th>
                        <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Status</th>
                        <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Created At</th>
                        <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>Location</th>
                        <th style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", whiteSpace: "nowrap" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((item) => {
                        const statusObj = meetingStatus(item);
                        const preferredTimeLabel = item.preferred_time ? new Date(item.preferred_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not provided";
                        const scheduledTimeLabel = item.scheduled_at ? new Date(item.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Pending";
                        const createdAtLabel = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "--";
                        const locationLabel = item.scheduled_location || "Pending";

                        return (
                          <tr key={`${item.itemType}-${item.id}`} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                            <td style={{ padding: "12px 16px" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{item.primaryTitle}</span>
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: C.t2 }}>{preferredTimeLabel}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: C.t2 }}>{scheduledTimeLabel}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <WorkspaceBadge status={statusObj.value}>{statusObj.label}</WorkspaceBadge>
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: C.t2 }}>{createdAtLabel}</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, color: C.t2 }}>{locationLabel}</td>
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              <WorkspaceButton
                                type="button"
                                onClick={() => navigate(`/citizen/meetings/${item.id}`, { state: { meetingData: item, itemType: item.itemType } })}
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

                {/* MOBILE CARDS */}
                <div className="lg:hidden space-y-3 pb-2">
                  {paginatedItems.map((item) => {
                    const statusObj = meetingStatus(item);
                    const preferredTimeLabel = item.preferred_time ? new Date(item.preferred_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not provided";
                    const scheduledTimeLabel = item.scheduled_at ? new Date(item.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Pending";
                    const locationLabel = item.scheduled_location || "Pending";
                    const createdAtLabel = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "--";

                    return (
                      <WorkspaceCard key={`${item.itemType}-${item.id}`} style={{ padding: 16 }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <h3 style={{ fontWeight: 700, color: C.t1 }}>{item.primaryTitle}</h3>
                            <div className="flex items-center gap-1 mt-1" style={{ fontSize: 11, color: C.t3 }}>
                                <Clock size={12} /> Created: {createdAtLabel}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <WorkspaceBadge status={statusObj.value}>{statusObj.label}</WorkspaceBadge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                          <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                            <p style={{ textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4, fontWeight: 600 }}>Preferred Time</p>
                            <p style={{ color: C.t2, fontWeight: 600 }}>{preferredTimeLabel}</p>
                          </div>
                          <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                            <p style={{ textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4, fontWeight: 600 }}>Scheduled Time</p>
                            <p style={{ color: C.t2, fontWeight: 600 }}>{scheduledTimeLabel}</p>
                          </div>
                          <div className="col-span-2" style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                            <p style={{ textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4, fontWeight: 600 }}>Location</p>
                            <p style={{ color: C.t2, fontWeight: 600 }}>{locationLabel}</p>
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
                      </WorkspaceCard>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* PAGINATION */}
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