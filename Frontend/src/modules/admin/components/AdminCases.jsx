import { useEffect, useMemo, useState } from "react";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client.js";
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
    handoffType: item.handoffType || "",
    handoffByAdminUserId: item.handoffByAdminUserId || null,
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

function buildItemRoute(item, tab) {
  const sourceMap = {
    complaintPool: "work-queue",
    meetingPool: "work-queue",
    myCases: "my-cases",
    resolved: "work-queue",
    escalated: "work-queue",
  };
  const source = sourceMap[tab];
  return source ? `${item.route}?source=${source}` : item.route;
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

export default function AdminCases() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.bgElevated : "#F7F1FF";
  const [complaints, setComplaints] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("complaintPool");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [tabInitialized, setTabInitialized] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    let active = true;
    async function loadQueue() {
      if (!session?.role) {
        if (active) { setLoading(false); setError("Admin session not available"); }
        return;
      }
      try {
        setLoading(true);
        setError("");
        const response = await apiClient.get("/admin/work-queue");
        if (!active) return;
        setComplaints(Array.isArray(response.data?.complaints) ? response.data.complaints : []);
        setMeetings(Array.isArray(response.data?.meetings) ? response.data.meetings : []);
      } catch (loadError) {
        if (active) setError(loadError?.response?.data?.error || "Unable to load work queue");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadQueue();
    return () => { active = false; };
  }, [session?.role]);

  const complaintPool = complaints.filter((item) => !item.assignedAdminUserId && !isResolvedComplaint(item.status)).map(complaintRow);
  const meetingPool = meetings.filter((item) => !item.assignedAdminUserId && !isResolvedMeeting(item.status)).map(meetingRow);
  const myCases = [
    ...complaints.filter((item) => item.assignedAdminUserId === session?.user?.id && !isResolvedComplaint(item.status) && item.status !== "escalated_to_meeting").map(complaintRow),
    ...meetings.filter((item) => item.assignedAdminUserId === session?.user?.id && !isResolvedMeeting(item.status)).map(meetingRow),
  ];
  const resolved  = [...complaints.filter((item) => isResolvedComplaint(item.status)).map(complaintRow), ...meetings.filter((item) => isResolvedMeeting(item.status)).map(meetingRow)];
  const escalated = complaints.filter((item) => item.handoffByAdminUserId === session?.user?.id && ["escalated", "reassigned"].includes(item.handoffType) && !isResolvedComplaint(item.status)).map(complaintRow);

  const sections = { complaintPool, meetingPool, myCases, resolved, escalated };

  const activeRows = (sections[tab] || []).filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const haystack = [item.primaryId, item.itemType, item.title, item.citizenName, item.citizenId, item.owner, item.reference, item.statusLabel]
      .filter(Boolean).join(" ").toLowerCase();
    const search = query.trim().toLowerCase();
    return matchesStatus && (!search || haystack.includes(search));
  });

  useEffect(() => { setCurrentPage(1); }, [tab, query, statusFilter]);

  const totalPages    = Math.max(1, Math.ceil(activeRows.length / ITEMS_PER_PAGE));
  const paginatedRows = activeRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const statusOptions = Array.from(new Set((sections[tab] || []).map((item) => item.status).filter(Boolean))).sort();

  const tabs = [
    { id: "complaintPool", label: "Complaint Pool",       count: complaintPool.length },
    { id: "meetingPool",   label: "Meeting Pool",         count: meetingPool.length   },
    { id: "myCases",       label: "My Cases",             count: myCases.length       },
    { id: "resolved",      label: "Resolved / Completed", count: resolved.length      },
    { id: "escalated",     label: "Escalated / Reassigned", count: escalated.length },
  ];

  useEffect(() => {
    if (tabInitialized || loading) return;
    const preferredTab =
      tabs.find((t) => t.id === "myCases"       && t.count > 0)?.id ||
      tabs.find((t) => t.id === "complaintPool" && t.count > 0)?.id ||
      tabs.find((t) => t.id === "meetingPool"   && t.count > 0)?.id ||
      tabs.find((t) => t.id === "escalated"     && t.count > 0)?.id ||
      tabs.find((t) => t.id === "resolved"      && t.count > 0)?.id ||
      "complaintPool";
    if (preferredTab !== tab) setTab(preferredTab);
    setTabInitialized(true);
  }, [loading, tab, tabInitialized, tabs]);

  const columns = useMemo(() => {
    const baseColumns = [
      { key: "primaryId", label: "ID", align: "left" },
      { key: "itemType", label: "Type", align: "left" },
      { key: "title", label: "Title", align: "left" },
      { key: "citizen", label: "Citizen", align: "left" },
      { key: "owner", label: "Owner", align: "left" },
      { key: "reference", label: "Reference", align: "left" },
      { key: "createdAt", label: "Created", align: "left" },
      { key: "status", label: "Status", align: "center" },
      { key: "action", label: "Action", align: "center" },
    ];

    const hiddenColumns = {
      complaintPool: new Set(["itemType", "owner", "status"]),
      meetingPool: new Set(["itemType", "owner", "status"]),
      myCases: new Set(["owner", "reference"]),
      resolved: new Set(["owner"]),
      escalated: new Set(["owner", "reference"]),
    };

    return baseColumns.filter((column) => !hiddenColumns[tab]?.has(column.key));
  }, [tab]);

  return (
    <WorkspacePage
      width={1280}
      outerStyle={{ height: "calc(100vh - 73px)", overflow: "hidden" }}
      contentStyle={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* HEADER */}
        <WorkspaceSectionHeader
          
          title="WORK  QUEUE"
        />

        {/* STAT CARDS — 5 in one row, clickable to switch tab */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 18,
            marginBottom: 20,
            alignItems: "stretch",
          }}
        >
          {tabs.map((item) => (
            <div
              key={item.id}
              onClick={() => setTab(item.id)}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: tab === item.id ? C.purple : C.card,
                border: `1px solid ${tab === item.id ? C.purple : C.border}`,
                borderRadius: 14,
                padding: "11px 14px",
                minHeight: 74,
                width: "calc(100% - 8px)",
                justifySelf: "center",
                cursor: "pointer",
                transform: hoveredCard === item.id && tab !== item.id ? "perspective(900px) translateY(-3px) scale(1.02)" : "perspective(900px) translateY(0) scale(1)",
                boxShadow:
                  tab === item.id
                    ? `0 16px 32px ${C.purple}2f`
                    : hoveredCard === item.id
                      ? `0 14px 28px ${C.purple}26, 0 0 0 1px ${C.purple}1f inset`
                      : "0 8px 18px rgba(15, 23, 42, 0.06)",
                transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: tab === item.id ? "#fff" : C.t1, lineHeight: 1 }}>
                {item.count}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: tab === item.id ? "rgba(255,255,255,0.82)" : C.t3, marginTop: 5 }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* QUEUE FILTERS */}
        <div style={{ marginBottom: 20 }}>
          {/* <WorkspaceCard> */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(220px, 0.8fr)", gap: 16 }}>
              <div>
                
                <WorkspaceInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by ID, title, citizen name..."
                />
              </div>
              <div>
                <WorkspaceSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{humanizeStatus(status)}</option>
                  ))}
                </WorkspaceSelect>
              </div>
            </div>
          {/* </WorkspaceCard> */}
        </div>

        {/* TABLE / STATES */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {loading ? (
            <WorkspaceEmptyState title="Loading work queue..." />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger, marginBottom: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Unable to load work queue</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>{error}</div>
            </WorkspaceCard>
          ) : activeRows.length === 0 ? (
            <WorkspaceEmptyState title="No items found" subtitle="Try adjusting your current search or status filters." />
          ) : (
            <WorkspaceCard style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, marginBottom: 0 }}>
              <div className="overflow-x-auto" style={{ flex: 1, minHeight: 0 }}>
                <table className="w-full">
                  <colgroup>
                    <col style={idColumnStyle} />
                  </colgroup>
                  <thead style={{ background: tableHeaderBackground, borderBottom: `1px solid ${C.border}` }}>
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          style={{
                            width: column.key === "status" || column.key === "action" ? "1%" : undefined,
                            padding: column.key === "status" || column.key === "action" ? "13px 10px" : "13px 12px",
                            fontSize: 10,
                            fontWeight: 600,
                            color: tableHeaderText,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                            textAlign: column.align,
                            background: tableHeaderBackground,
                            verticalAlign: "middle",
                          }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((item, index) => (
                      <tr key={`${item.itemType}-${item.id}`} style={{ background: index % 2 === 0 ? C.card : alternateRowBackground, verticalAlign: "middle" }}>
                        {columns.map((column) => {
                          if (column.key === "primaryId") {
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: C.purple, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle" }}>
                                <span title={toTooltipText(item.primaryId)} style={{ display: "block", whiteSpace: "nowrap" }}>
                                  {item.primaryId}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "itemType") {
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, textTransform: "capitalize", color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(item.itemType)} style={tableCellTextStyle}>
                                  {item.itemType}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "title") {
                            return (
                            <td key={column.key} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.borderLight}`, maxWidth: 0, verticalAlign: "middle" }}>
                              <div
                                title={toTooltipText(item.title)}
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: C.t1,
                                  ...tableCellTextStyle,
                                }}
                                >
                                  {item.title}
                                </div>
                              </td>
                            );
                          }

                          if (column.key === "citizen") {
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <div title={toTooltipText(item.citizenName)} style={tableCellTextStyle}>
                                  {item.citizenName}
                                </div>
                              </td>
                            );
                          }

                          if (column.key === "owner") {
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(item.owner)} style={tableCellTextStyle}>
                                  {item.owner}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "reference") {
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t3, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(item.reference)} style={tableCellTextStyle}>
                                  {item.reference}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "createdAt") {
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "-")} style={tableCellTextStyle}>
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "-"}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "status") {
                            return (
                              <td key={column.key} style={{ width: "1%", padding: "10px 10px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                <WorkspaceBadge status={item.status}>{item.statusLabel}</WorkspaceBadge>
                              </td>
                            );
                          }

                          const isActionHovered = hoveredActionId === `${item.itemType}-${item.id}`;
                          return (
                            <td key={column.key} style={{ width: "1%", padding: "10px 10px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onMouseEnter={() => setHoveredActionId(`${item.itemType}-${item.id}`)}
                                onMouseLeave={() => setHoveredActionId(null)}
                                onClick={() => navigate(buildItemRoute(item, tab))}
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
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-3.5">
                  <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>
                    Showing <span style={{ fontWeight: 600 }}>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, activeRows.length)}</span>-<span style={{ fontWeight: 600 }}>{Math.min(currentPage * ITEMS_PER_PAGE, activeRows.length)}</span> of{" "}
                    <span style={{ fontWeight: 600 }}>{activeRows.length}</span> requests
                  </p>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <WorkspaceButton
                        type="button"
                        variant="outline"
                        disabled={currentPage === 1}
                        onMouseEnter={() => setHoveredPagerButton("previous")}
                        onMouseLeave={() => setHoveredPagerButton(null)}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        style={{
                          width: 92,
                          minHeight: 34,
                          padding: "8px 12px",
                          fontSize: 12,
                          background: hoveredPagerButton === "previous" && currentPage !== 1 ? C.purple : "transparent",
                          color: hoveredPagerButton === "previous" && currentPage !== 1 ? "#ffffff" : C.purple,
                          border: `1px solid ${C.purple}`,
                          opacity: currentPage === 1 ? 0.4 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <ChevronLeft size={16} /> Previous
                      </WorkspaceButton>

                      <span style={{ padding: "6px 10px", fontSize: 12, color: C.t3 }}>
                        Page <span style={{ fontWeight: 600 }}>{currentPage}</span> of <span style={{ fontWeight: 600 }}>{totalPages}</span>
                      </span>

                      <WorkspaceButton
                        type="button"
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onMouseEnter={() => setHoveredPagerButton("next")}
                        onMouseLeave={() => setHoveredPagerButton(null)}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        style={{
                          width: 92,
                          minHeight: 34,
                          padding: "8px 12px",
                          fontSize: 12,
                          background: hoveredPagerButton === "next" && currentPage !== totalPages ? C.purple : "transparent",
                          color: hoveredPagerButton === "next" && currentPage !== totalPages ? "#ffffff" : C.purple,
                          border: `1px solid ${C.purple}`,
                          opacity: currentPage === totalPages ? 0.4 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        Next <ChevronRight size={16} />
                      </WorkspaceButton>
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
