import { useEffect, useState } from "react";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceSelect,
  WorkspaceStatGrid,
  WorkspaceTabs,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function humanizeStatus(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isResolvedComplaint(status) {
  return status === "resolved" || status === "completed" || status === "closed";
}

function isResolvedMeeting(status) {
  return status === "completed" || status === "cancelled" || status === "rejected";
}

function complaintRow(item) {
  return {
    id: item.id,
    itemType: "complaint",
    primaryId: item.complaintId || item.id,
    title: item.title || item.subject || "Untitled Complaint",
    citizenName: item.citizenSnapshot?.name || "-",
    citizenId: item.citizenSnapshot?.citizenId || "-",
    owner: item.currentOwner || "Admin Pool",
    reference: item.relatedMeeting?.requestId || item.department || "-",
    createdAt: item.createdAt || item.created_at,
    status: item.status,
    statusLabel: item.statusLabel || humanizeStatus(item.status),
    route: `/admin/cases/${item.id}`,
  };
}

function meetingRow(item) {
  return {
    id: item.id,
    itemType: "meeting",
    primaryId: item.requestId || item.id,
    title: item.title || item.purpose || "Untitled Meeting",
    citizenName: item.citizenSnapshot?.name || "-",
    citizenId: item.citizenSnapshot?.citizenId || "-",
    owner: item.currentOwner || "Admin Queue",
    reference: item.relatedComplaint?.complaintId || item.visitorId || item.meetingDocket || "-",
    createdAt: item.createdAt || item.created_at,
    status: item.status,
    statusLabel: humanizeStatus(item.status),
    route: `/admin/meetings/${item.id}`,
  };
}

export default function AdminCases() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("complaintPool");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [tabInitialized, setTabInitialized] = useState(false);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    let active = true;

    async function loadQueue() {
      if (!session?.accessToken) {
        if (active) {
          setLoading(false);
          setError("Admin session not available");
        }
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get("/admin/work-queue", authorizedConfig(session.accessToken));
        if (!active) {
          return;
        }
        setComplaints(Array.isArray(response.data?.complaints) ? response.data.complaints : []);
        setMeetings(Array.isArray(response.data?.meetings) ? response.data.meetings : []);
      } catch (loadError) {
        if (active) {
          setError(loadError?.response?.data?.error || "Unable to load work queue");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadQueue();

    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  const complaintPool = complaints.filter((item) => !item.assignedAdminUserId && !isResolvedComplaint(item.status)).map(complaintRow);
  const meetingQueue = meetings.filter((item) => !isResolvedMeeting(item.status)).map(meetingRow);
  const myCases = [
    ...complaints
      .filter((item) => item.assignedAdminUserId === session?.user?.id && !isResolvedComplaint(item.status) && item.status !== "escalated_to_meeting")
      .map(complaintRow),
    ...meetings.filter((item) => item.assignedAdminUserId === session?.user?.id && !isResolvedMeeting(item.status)).map(meetingRow),
  ];
  const resolved = [
    ...complaints.filter((item) => isResolvedComplaint(item.status)).map(complaintRow),
    ...meetings.filter((item) => isResolvedMeeting(item.status)).map(meetingRow),
  ];
  const escalated = complaints.filter((item) => item.status === "escalated_to_meeting").map(complaintRow);

  const sections = {
    complaintPool,
    meetingQueue,
    myCases,
    resolved,
    escalated,
  };

  const activeRows = (sections[tab] || []).filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const haystack = [
      item.primaryId,
      item.itemType,
      item.title,
      item.citizenName,
      item.citizenId,
      item.owner,
      item.reference,
      item.statusLabel,
    ].filter(Boolean).join(" ").toLowerCase();
    const search = query.trim().toLowerCase();
    return matchesStatus && (!search || haystack.includes(search));
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(activeRows.length / ITEMS_PER_PAGE));
  const paginatedRows = activeRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const statusOptions = Array.from(new Set((sections[tab] || []).map((item) => item.status).filter(Boolean))).sort();

  const tabs = [
    { id: "complaintPool", label: "Complaint Pool", count: complaintPool.length },
    { id: "meetingQueue", label: "Meeting Queue", count: meetingQueue.length },
    { id: "myCases", label: "My Cases", count: myCases.length },
    { id: "resolved", label: "Resolved / Completed", count: resolved.length },
    { id: "escalated", label: "Escalated Requests", count: escalated.length },
  ];

  useEffect(() => {
    if (tabInitialized || loading) {
      return;
    }
    const preferredTab = tabs.find((item) => item.id === "myCases" && item.count > 0)?.id
      || tabs.find((item) => item.id === "complaintPool" && item.count > 0)?.id
      || tabs.find((item) => item.id === "meetingQueue" && item.count > 0)?.id
      || tabs.find((item) => item.id === "escalated" && item.count > 0)?.id
      || tabs.find((item) => item.id === "resolved" && item.count > 0)?.id
      || "complaintPool";
    if (preferredTab !== tab) {
      setTab(preferredTab);
    }
    setTabInitialized(true);
  }, [loading, tab, tabInitialized, tabs]);

  return (
    <WorkspacePage>
      <WorkspaceSectionHeader
        eyebrow="Admin Workspace"
        title="Work Queue"
        subtitle="Manage complaint pool, meeting queue, assigned cases, escalations, and completed records."
      />

      <div style={{ marginBottom: 20 }}>
        <WorkspaceTabs items={tabs} value={tab} onChange={setTab} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <WorkspaceStatGrid items={tabs.map((item) => ({ label: item.label, value: item.count }))} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <WorkspaceCard>
          <WorkspaceCardHeader
            title="Queue Filters"
            subtitle="Refine the current lane without leaving the work queue."
          />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(220px, 0.8fr)", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
                Search
              </div>
              <WorkspaceInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by ID, title, citizen name..."
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
                Status
              </div>
              <WorkspaceSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{humanizeStatus(status)}</option>
                ))}
              </WorkspaceSelect>
            </div>
          </div>
        </WorkspaceCard>
      </div>

      {loading ? (
        <WorkspaceEmptyState title="Loading work queue..." />
      ) : error ? (
        <WorkspaceCard style={{ color: C.danger }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Unable to load work queue</div>
          <div style={{ marginTop: 8, fontSize: 12 }}>{error}</div>
        </WorkspaceCard>
      ) : activeRows.length === 0 ? (
        <WorkspaceEmptyState title="No items found" subtitle="Try adjusting your current search or status filters." />
      ) : (
        <WorkspaceCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", background: `linear-gradient(180deg, ${C.card} 0%, ${C.bgElevated} 100%)`, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{tabs.find((item) => item.id === tab)?.label || "Queue Items"}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>
                  {activeRows.length} item{activeRows.length === 1 ? "" : "s"} match the current view.
                </div>
              </div>
              <WorkspaceBadge>{statusFilter === "all" ? "All statuses" : humanizeStatus(statusFilter)}</WorkspaceBadge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
                <thead style={{ background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
                  <tr>
                    {["ID", "Type", "Title", "Citizen", "Owner", "Reference", "Created", "Status", "Action"].map((label) => (
                      <th key={label} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: C.t3, textAlign: label === "Status" || label === "Action" ? "center" : "left" }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((item, index) => (
                    <tr key={`${item.itemType}-${item.id}`} style={{ background: index % 2 === 0 ? C.card : C.bgElevated }}>
                      <td className="px-6 py-4 text-sm font-semibold" style={{ color: C.purple, borderBottom: `1px solid ${C.borderLight}` }}>{item.primaryId}</td>
                      <td className="px-6 py-4 text-sm capitalize" style={{ color: C.t2, borderBottom: `1px solid ${C.borderLight}` }}>{item.itemType}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: C.t1, borderBottom: `1px solid ${C.borderLight}` }}>{item.title}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: C.t2, borderBottom: `1px solid ${C.borderLight}` }}>
                        <div>{item.citizenName}</div>
                        <div className="text-xs" style={{ color: C.t3 }}>{item.citizenId}</div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: C.t2, borderBottom: `1px solid ${C.borderLight}` }}>{item.owner}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: C.t3, borderBottom: `1px solid ${C.borderLight}` }}>{item.reference}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: C.t3, borderBottom: `1px solid ${C.borderLight}` }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "-"}</td>
                      <td className="px-6 py-4 text-center" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <WorkspaceBadge status={item.status}>{item.statusLabel}</WorkspaceBadge>
                      </td>
                      <td className="px-6 py-4 text-center" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <button
                          onClick={() => navigate(item.route)}
                          className="transition-colors"
                          style={{
                            color: C.purple,
                            background: `${C.purple}10`,
                            border: `1px solid ${C.purple}22`,
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
                          }}
                          title="View details"
                        >
                          <Eye size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4" style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}>
                <WorkspaceButton
                  type="button"
                  variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  <ChevronLeft size={16} />
                  Previous
                </WorkspaceButton>

                <span style={{ fontSize: 12, color: C.t3 }}>Page {currentPage} of {totalPages}</span>

                <WorkspaceButton
                  type="button"
                  variant="ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Next
                  <ChevronRight size={16} />
                </WorkspaceButton>
              </div>
            )}
        </WorkspaceCard>
      )}
    </WorkspacePage>
  );
}
