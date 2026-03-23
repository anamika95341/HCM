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
  WorkspaceTabs,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function statusBadgeClass(status) {
  if (status === "scheduled") return "bg-emerald-100 text-emerald-700";
  if (status === "accepted" || status === "verified" || status === "resolved" || status === "completed") return "bg-sky-100 text-sky-700";
  if (["verification_pending", "pending", "assigned", "in_review", "department_contact_identified", "call_scheduled", "followup_in_progress", "escalated_to_meeting"].includes(status)) return "bg-amber-100 text-amber-700";
  if (["rejected", "not_verified", "cancelled"].includes(status)) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function getStatusIcon(status) {
  if (["resolved", "completed"].includes(status)) return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (["rejected", "cancelled", "not_verified"].includes(status)) return <AlertCircle size={16} className="text-rose-600" />;
  return <Clock size={16} className="text-amber-600" />;
}

function citizenStatus(item) {
  if (item.itemType === "meeting" && ["verification_pending", "accepted", "verified", "not_verified", "pending"].includes(item.status)) {
    return { value: "under_review", label: "Under Review" };
  }
  if (item.itemType === "complaint" && ["assigned", "department_contact_identified", "call_scheduled", "followup_in_progress", "escalated_to_meeting"].includes(item.status)) {
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
  const [data, setData] = useState({ meetings: [], complaints: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState({ q: "", status: "all", type: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let mounted = true;

    async function loadCases() {
      try {
        const { data: response } = await apiClient.get("/citizen/my-cases", authorizedConfig(session.accessToken));
        if (mounted) {
          setData({
            meetings: response.meetings || [],
            complaints: response.complaints || [],
          });
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load your cases");
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

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      status: "all",
      type: tab === "all" ? "all" : tab,
    }));
    setCurrentPage(1);
  }, [tab]);

  const items = useMemo(() => {
    const combined = [
      ...data.meetings.map((item) => ({
        ...item,
        itemType: "meeting",
        primaryTitle: item.title || item.purpose,
        primaryId: item.requestId,
      })),
      ...data.complaints.map((item) => ({
        ...item,
        itemType: "complaint",
        primaryTitle: item.title || item.subject,
        primaryId: item.complaintId,
      })),
    ].sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0) - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0));

    return combined.filter((item) => {
      const tabOk = tab === "all" || item.itemType === tab;
      const typeOk = filters.type === "all" || item.itemType === filters.type;
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
        item.relatedComplaint?.complaintId,
        item.scheduled_location,
        item.scheduleLocation,
        item.statusReason,
        item.resolutionSummary,
        item.visitorId,
        item.meetingDocket,
      ].filter(Boolean).join(" ").toLowerCase();
      return tabOk && typeOk && statusOk && (!q || searchText.includes(q));
    });
  }, [data.complaints, data.meetings, filters, tab]);

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(items.map((item) => citizenStatus(item).value))).filter(Boolean).sort();
  }, [items]);

  const totalItems = data.meetings.length + data.complaints.length;

  return (
    <WorkspacePage width={1320}>
      <WorkspaceSectionHeader
        eyebrow="Citizen Workspace"
        title="My Cases & Complaints"
        subtitle="Track your complaints, meeting escalations, resolution updates, and linked references in one place."
        icon={<FileText size={20} />}
      />

      <div style={{ marginBottom: 20 }}>
        <WorkspaceStatGrid items={[{ label: "Total Requests", value: totalItems }]} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <WorkspaceTabs
          items={[
            { id: "all", label: "All", count: totalItems },
            { id: "complaint", label: "Complaints", count: data.complaints.length },
            { id: "meeting", label: "Meeting Escalations", count: data.meetings.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <WorkspaceCard>
          <div className="grid md:grid-cols-3 gap-3">
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
            <WorkspaceSelect
              value={filters.type}
              onChange={(event) => {
                setFilters((current) => ({ ...current, type: event.target.value }));
                setCurrentPage(1);
              }}
            >
              <option value="all">All record types</option>
              <option value="meeting">Meetings</option>
              <option value="complaint">Complaints</option>
            </WorkspaceSelect>
          </div>
        </WorkspaceCard>
      </div>

        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar rounded-xl">
          {loading && (
            <WorkspaceEmptyState title="Loading your cases..." />
          )}

          {error && <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>}

          {!loading && !error && (
            <>
              {items.length === 0 ? (
                <WorkspaceEmptyState title="No cases found" subtitle="Try adjusting your filters." />
              ) : (
                <>
                  <WorkspaceCard style={{ padding: 0, overflow: "hidden" }}>
                    <table className="w-full text-sm">
                      <thead style={{ background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
                        <tr>
                          <th className="px-4 py-4 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide rounded-tl-xl">Case ID</th>
                          <th className="px-4 py-4 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide">Subject</th>
                          <th className="px-4 py-4 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide">Department</th>
                          <th className="px-4 py-4 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide">Status</th>
                          <th className="px-4 py-4 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide">Owner</th>
                          <th className="px-4 py-4 text-left font-semibold text-slate-700 text-xs uppercase tracking-wide">Reference</th>
                          <th className="px-4 py-4 text-center font-semibold text-slate-700 text-xs uppercase tracking-wide rounded-tr-xl">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paginatedItems.map((item) => {
                          const status = citizenStatus(item);
                          const isMeeting = item.itemType === "meeting";
                          const secondaryLine = isMeeting
                            ? (item.scheduled_location || item.admin_comments || "Awaiting admin update")
                            : (item.callOutcome || item.resolutionSummary || item.statusReason || "Complaint under process");
                          const departmentLabel = isMeeting
                            ? (item.admin_referral || item.assignedAdminName || "General Admin Pool")
                            : (item.department || "Complaint Desk");
                          const referenceLabel = isMeeting
                            ? (item.relatedComplaint?.complaintId || item.meetingDocket || "No linked record")
                            : (item.relatedMeeting?.requestId || "No linked record");

                          return (
                            <tr key={`${item.itemType}-${item._id}`} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                              <td className="px-4 py-4"><span style={{ fontWeight: 600, color: C.purple, fontSize: 13 }}>{item.primaryId}</span></td>
                              <td className="px-4 py-4">
                                <div>
                                  <p style={{ fontWeight: 600, color: C.t1 }}>{item.primaryTitle}</p>
                                  <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{secondaryLine}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm" style={{ color: C.t2 }}>{departmentLabel}</td>
                              <td className="px-4 py-4">
                                <WorkspaceBadge>{status.label}</WorkspaceBadge>
                              </td>
                              <td className="px-4 py-4 text-sm" style={{ color: C.t2 }}>{item.currentOwner || "Pending"}</td>
                              <td className="px-4 py-4 text-sm" style={{ color: C.t2 }}>{referenceLabel}</td>
                              <td className="px-4 py-4 text-center">
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
                      const isMeeting = item.itemType === "meeting";
                      const departmentLabel = isMeeting
                        ? (item.admin_referral || item.assignedAdminName || "General Admin Pool")
                        : (item.department || "Complaint Desk");
                      const referenceLabel = isMeeting
                        ? (item.relatedComplaint?.complaintId || item.meetingDocket || "No linked record")
                        : (item.relatedMeeting?.requestId || "No linked record");

                      return (
                        <WorkspaceCard key={`${item.itemType}-${item._id}`} style={{ padding: 16 }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, marginBottom: 4 }}>{item.primaryId}</p>
                              <h3 style={{ fontWeight: 700, color: C.t1 }}>{item.primaryTitle}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <WorkspaceBadge>{status.label}</WorkspaceBadge>
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
