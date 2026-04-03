import { useEffect, useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../../routes/paths.js";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceSelect,
  WorkspaceStatGrid,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function statusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function isActiveComplaint(complaint) {
  return !["resolved", "completed", "closed", "escalated_to_meeting"].includes(complaint.status);
}

export default function AdminComplaintQueue() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const adminId = session?.user?.id;

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadComplaintQueue() {
      if (!session?.accessToken) return;
      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get("/admin/work-queue", authorizedConfig(session.accessToken));
        if (!active) return;
        setComplaints(Array.isArray(response.data?.complaints) ? response.data.complaints : []);
      } catch (loadError) {
        if (active) {
          setError(loadError?.response?.data?.error || "Unable to load complaint queue");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadComplaintQueue();
    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  const personalComplaintQueue = useMemo(
    () => complaints.filter((complaint) => complaint.assignedAdminUserId === adminId && isActiveComplaint(complaint)),
    [adminId, complaints]
  );

  const filteredComplaintQueue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personalComplaintQueue.filter((complaint) => {
      if (statusFilter !== "all" && complaint.status !== statusFilter) return false;
      if (!q) return true;
      return [
        complaint.complaintId,
        complaint.title,
        complaint.subject,
        complaint.description,
        complaint.citizenSnapshot?.name,
        complaint.citizenSnapshot?.citizenId,
        complaint.citizenSnapshot?.phoneNumbers?.[0],
        complaint.citizenSnapshot?.email,
        complaint.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [personalComplaintQueue, query, statusFilter]);

  const queueStats = useMemo(() => {
    const inReview = personalComplaintQueue.filter((complaint) => complaint.status === "in_review").length;
    const callsScheduled = personalComplaintQueue.filter((complaint) => complaint.status === "call_scheduled").length;
    return [
      { label: "My Complaint Queue", value: personalComplaintQueue.length },
      { label: "In Review", value: inReview },
      { label: "Calls Scheduled", value: callsScheduled },
    ];
  }, [personalComplaintQueue]);

  const statusOptions = useMemo(
    () => Array.from(new Set(personalComplaintQueue.map((complaint) => complaint.status).filter(Boolean))).sort(),
    [personalComplaintQueue]
  );

  return (
    <WorkspacePage width={1280}>
      <div style={{ maxWidth: "1150px", margin: "0 auto", width: "100%" }}>
        <WorkspaceSectionHeader
          eyebrow="Admin Workspace"
          title="Complaint Queue"
          subtitle="Complaints assigned to you appear here with the same detail workflow used in My Cases."
        />

        <div style={{ display: "grid", gap: 24 }}>
          <WorkspaceStatGrid items={queueStats} />

          <WorkspaceCard>
            <WorkspaceCardHeader
              title="Complaint Queue Filters"
              subtitle="Search and filter the complaints currently assigned to you."
            />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(220px, 0.8fr)", gap: 16 }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: C.t3 }} />
                <WorkspaceInput
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by complaint ID, title, citizen, contact, or department..."
                  style={{ paddingLeft: 40 }}
                />
              </div>
              <WorkspaceSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </WorkspaceSelect>
            </div>
          </WorkspaceCard>

          {loading ? (
            <WorkspaceEmptyState title="Loading complaint queue..." />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
          ) : filteredComplaintQueue.length === 0 ? (
            <WorkspaceEmptyState title="No assigned complaints found" subtitle="Complaints you assign to yourself from My Cases or Work Queue will appear here." />
          ) : (
            <WorkspaceCard style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.8fr 1.2fr 1.4fr 1.2fr auto 72px",
                  gap: 16,
                  padding: "12px 20px",
                  background: C.bgElevated,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {["Complaint ID", "Title", "Citizen", "Contact", "Department", "Status", "Action"].map((column) => (
                  <div
                    key={column}
                    style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: column === "Status" || column === "Action" ? "center" : "left" }}
                  >
                    {column}
                  </div>
                ))}
              </div>

              {filteredComplaintQueue.map((complaint, index) => (
                <div
                  key={complaint.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1.8fr 1.2fr 1.4fr 1.2fr auto 72px",
                    gap: 16,
                    padding: "14px 20px",
                    alignItems: "center",
                    background: index % 2 === 0 ? C.card : C.bgElevated,
                    borderBottom: `1px solid ${C.borderLight}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>{complaint.complaintId || complaint.id}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {complaint.title || complaint.subject || "Untitled Complaint"}
                    </div>
                    <div style={{ fontSize: 12, color: C.t3, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {complaint.description}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    {complaint.citizenSnapshot?.name || "Unknown Citizen"}
                  </div>
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    {complaint.citizenSnapshot?.phoneNumbers?.[0] || complaint.citizenSnapshot?.email || "No contact"}
                  </div>
                  <div style={{ fontSize: 13, color: C.t2 }}>{complaint.department || "Pending"}</div>
                  <div style={{ textAlign: "center" }}>
                    <WorkspaceBadge status={complaint.status}>{statusLabel(complaint.status)}</WorkspaceBadge>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => navigate(`${PATHS.admin.cases}/${complaint.id}?source=complaint-queue`)}
                      title="Open complaint"
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
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </WorkspaceCard>
          )}
        </div>
      </div>
    </WorkspacePage>
  );
}
