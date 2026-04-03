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

export default function AdminComplaintQueue() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const adminId = session?.user?.id;

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function loadComplaintQueue() {
      if (!session?.accessToken) {
        return;
      }
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
    () => complaints.filter(
      (complaint) => complaint.assignedAdminUserId === adminId && !["completed", "closed", "resolved", "escalated_to_meeting"].includes(complaint.status)
    ),
    [adminId, complaints]
  );

  const filteredComplaintQueue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personalComplaintQueue.filter((complaint) => {
      if (!q) return true;
      return [
        complaint.complaintId,
        complaint.title,
        complaint.description,
        complaint.citizenSnapshot?.name,
        complaint.citizenSnapshot?.citizenId,
        complaint.citizenSnapshot?.phoneNumbers?.[0],
        complaint.complaintLocation,
        complaint.complaintType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [personalComplaintQueue, query]);

  const queueStats = useMemo(() => {
    const inReview = personalComplaintQueue.filter((complaint) => complaint.status === "in_review").length;
    const followup = personalComplaintQueue.filter((complaint) => complaint.status === "followup_in_progress").length;
    return [
      { label: "My Complaint Queue", value: personalComplaintQueue.length },
      { label: "In Review", value: inReview },
      { label: "Follow Up", value: followup },
    ];
  }, [personalComplaintQueue]);

  return (
    <WorkspacePage width={1280} contentStyle={{ paddingLeft: 12, paddingRight: 12 }}>
      <div style={{ maxWidth: "1150px", margin: "0 auto", width: "100%" }}>
        <WorkspaceSectionHeader
          eyebrow="Admin Workspace"
          title="Complaint Queue"
          subtitle="Complaints assigned to you appear here for review and resolution actions."
        />

        <div style={{ display: "grid", gap: 24 }}>
          <WorkspaceStatGrid items={queueStats} />

          <WorkspaceCard>
            <WorkspaceCardHeader
              title="Complaint Queue Search"
              subtitle="Search the complaints currently assigned to you."
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: C.t3 }} />
              <WorkspaceInput
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by complaint ID, title, citizen, category, or location..."
                style={{ paddingLeft: 40 }}
              />
            </div>
          </WorkspaceCard>

          {loading ? (
            <WorkspaceEmptyState title="Loading complaint queue..." />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
          ) : filteredComplaintQueue.length === 0 ? (
            <WorkspaceEmptyState title="No assigned complaints found" subtitle="Complaints you assign to yourself will appear here." />
          ) : (
            <WorkspaceCard style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.7fr 1.2fr 1.3fr 1.4fr auto 72px",
                  gap: 16,
                  padding: "12px 20px",
                  background: C.bgElevated,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {["Complaint ID", "Complaint Title", "Citizen", "Category", "Location / Date", "Status", "Action"].map((column) => (
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
                    gridTemplateColumns: "1.1fr 1.7fr 1.2fr 1.3fr 1.4fr auto 72px",
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
                      {complaint.title || "Untitled Complaint"}
                    </div>
                    <div style={{ fontSize: 12, color: C.t3, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {complaint.description}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    {complaint.citizenSnapshot?.name || "Unknown Citizen"}
                  </div>
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    {complaint.complaintType || "Not provided"}
                  </div>
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    <div>{complaint.complaintLocation || "Not provided"}</div>
                    <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>
                      {complaint.incidentDate ? new Date(complaint.incidentDate).toLocaleDateString("en-IN") : "Date not provided"}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <WorkspaceBadge status={complaint.status}>{statusLabel(complaint.status)}</WorkspaceBadge>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => navigate(`${PATHS.admin.cases}/${complaint.id}?source=complaint-queue`)}
                      title="View details"
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
