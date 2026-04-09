import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../../routes/paths.js";
import { apiClient } from "../../../shared/api/client.js";
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

const ITEMS_PER_PAGE = 6;

const tableCellTextStyle = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function toTooltipText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadComplaintQueue() {
      if (!session?.role) {
        return;
      }
      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get("/admin/work-queue");
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
  }, [session?.role]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [query, personalComplaintQueue.length]);

  const totalPages = Math.max(1, Math.ceil(filteredComplaintQueue.length / ITEMS_PER_PAGE));
  const paginatedComplaintQueue = filteredComplaintQueue.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
    <WorkspacePage
      width={1280}
      outerStyle={{ height: "calc(100vh - 73px)", overflow: "hidden" }}
      contentStyle={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <WorkspaceSectionHeader
          
          title="COMPLAINT QUEUE"
          
        />

        <div style={{ display: "grid", gap: 24, flex: 1, minHeight: 0 }}>
          <WorkspaceStatGrid items={queueStats} />

          
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
          

          {loading ? (
            <WorkspaceEmptyState title="Loading complaint queue..." />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
          ) : filteredComplaintQueue.length === 0 ? (
            <WorkspaceEmptyState title="No assigned complaints found" subtitle="Complaints you assign to yourself will appear here." />
          ) : (
            <WorkspaceCard style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, marginBottom: 0 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px minmax(0, 1.9fr) minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.1fr) auto 56px",
                  gap: 12,
                  padding: "12px 12px",
                  background: C.bgElevated,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {["Complaint ID", "Complaint Title", "Citizen", "Category", "Location / Date", "Status", "Action"].map((column) => (
                  <div
                    key={column}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: C.t3,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      textAlign: column === "Status" || column === "Action" ? "center" : "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {column}
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, minHeight: 0 }}>
                {paginatedComplaintQueue.map((complaint, index) => (
                  <div
                    key={complaint.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "160px minmax(0, 1.9fr) minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.1fr) auto 56px",
                      gap: 12,
                      padding: "14px 12px",
                      alignItems: "center",
                      background: index % 2 === 0 ? C.card : C.bgElevated,
                      borderBottom: `1px solid ${C.borderLight}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.purple, whiteSpace: "nowrap" }}>
                      {complaint.complaintId || complaint.id}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div title={toTooltipText(complaint.title || "Untitled Complaint")} style={{ fontSize: 14, fontWeight: 700, color: C.t1, ...tableCellTextStyle }}>
                        {complaint.title || "Untitled Complaint"}
                      </div>
                      <div title={toTooltipText(complaint.description)} style={{ fontSize: 12, color: C.t3, marginTop: 4, ...tableCellTextStyle }}>
                        {complaint.description}
                      </div>
                    </div>
                    <div title={toTooltipText(complaint.citizenSnapshot?.name || "Unknown Citizen")} style={{ fontSize: 13, color: C.t2, minWidth: 0, ...tableCellTextStyle }}>
                      {complaint.citizenSnapshot?.name || "Unknown Citizen"}
                    </div>
                    <div title={toTooltipText(complaint.complaintType || "Not provided")} style={{ fontSize: 13, color: C.t2, minWidth: 0, ...tableCellTextStyle }}>
                      {complaint.complaintType || "Not provided"}
                    </div>
                    <div style={{ fontSize: 13, color: C.t2, minWidth: 0 }}>
                      <div title={toTooltipText(complaint.complaintLocation || "Not provided")} style={tableCellTextStyle}>
                        {complaint.complaintLocation || "Not provided"}
                      </div>
                      <div title={toTooltipText(complaint.incidentDate ? new Date(complaint.incidentDate).toLocaleDateString("en-IN") : "Date not provided")} style={{ fontSize: 12, color: C.t3, marginTop: 4, ...tableCellTextStyle }}>
                        {complaint.incidentDate ? new Date(complaint.incidentDate).toLocaleDateString("en-IN") : "Date not provided"}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <WorkspaceBadge status={complaint.status}>{statusLabel(complaint.status)}</WorkspaceBadge>
                    </div>
                    <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
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
              </div>

              <div style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-3.5">
                  <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>
                    Showing <span style={{ fontWeight: 600 }}>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredComplaintQueue.length)}</span>-<span style={{ fontWeight: 600 }}>{Math.min(currentPage * ITEMS_PER_PAGE, filteredComplaintQueue.length)}</span> of{" "}
                    <span style={{ fontWeight: 600 }}>{filteredComplaintQueue.length}</span> requests
                  </p>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onMouseEnter={() => setHoveredPagerButton("previous")}
                        onMouseLeave={() => setHoveredPagerButton(null)}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        style={{
                          width: 92,
                          minHeight: 34,
                          padding: "8px 12px",
                          fontSize: 12,
                          background: hoveredPagerButton === "previous" && currentPage !== 1 ? C.purple : "transparent",
                          color: hoveredPagerButton === "previous" && currentPage !== 1 ? "#ffffff" : C.purple,
                          border: `1px solid ${C.purple}`,
                          borderRadius: 12,
                          opacity: currentPage === 1 ? 0.4 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          cursor: currentPage === 1 ? "default" : "pointer",
                        }}
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>

                      <span style={{ padding: "6px 10px", fontSize: 12, color: C.t3 }}>
                        Page <span style={{ fontWeight: 600 }}>{currentPage}</span> of <span style={{ fontWeight: 600 }}>{totalPages}</span>
                      </span>

                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onMouseEnter={() => setHoveredPagerButton("next")}
                        onMouseLeave={() => setHoveredPagerButton(null)}
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        style={{
                          width: 92,
                          minHeight: 34,
                          padding: "8px 12px",
                          fontSize: 12,
                          background: hoveredPagerButton === "next" && currentPage !== totalPages ? C.purple : "transparent",
                          color: hoveredPagerButton === "next" && currentPage !== totalPages ? "#ffffff" : C.purple,
                          border: `1px solid ${C.purple}`,
                          borderRadius: 12,
                          opacity: currentPage === totalPages ? 0.4 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          cursor: currentPage === totalPages ? "default" : "pointer",
                        }}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </WorkspaceCard>
          )}
        </div>
      </div>
    </WorkspacePage>
  );
}
