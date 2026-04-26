import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react";
import { FiClipboard } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspaceSectionHeader,
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
    category: item.complaintType || "-",
    citizenName: item.citizenSnapshot?.name || "-",
    citizenId: item.citizenSnapshot?.citizenId || "-",
    incidentDate: item.incidentDate || item.incident_date || "",
    owner: item.currentOwner || "Admin Pool",
    reference: item.relatedMeeting?.requestId || item.department || "-",
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.updatedAt || item.updated_at,
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
    updatedAt: item.completedAt || item.completed_at || item.updatedAt || item.updated_at,
    preferredTime: item.preferred_time || "",
    status: item.status,
    statusLabel: humanizeStatus(item.status),
    route: `/admin/meetings/${item.id}`,
  };
}

function buildItemRoute(item, tab) {
  const sourceMap = {
    complaintPool: "complaint-pool",
    meetingPool: "meeting-pool",
    myCases: "my-cases",
    resolvedComplaints: "resolved-complaints",
    completedMeetings: "completed-meetings",
    escalated: "escalated-reassigned",
  };
  const source = sourceMap[tab];
  return source ? `${item.route}?source=${source}` : item.route;
}

function buildWorkQueueTabSearch(tab) {
  const tabMap = {
    complaintPool: "complaint-pool",
    meetingPool: "meeting-pool",
    resolvedComplaints: "resolved-complaints",
    completedMeetings: "completed-meetings",
    escalated: "escalated",
  };
  const routeTab = tabMap[tab];
  return routeTab ? `?tab=${routeTab}` : "";
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

const complaintPoolColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  title: { width: "38%" },
  category: { width: "18%" },
  citizen: { width: "16%" },
  incidentDate: { width: 132, minWidth: 132, maxWidth: 132 },
  createdAt: { width: 112, minWidth: 112, maxWidth: 112 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};

const escalatedColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  title: { width: "26%" },
  category: { width: "14%" },
  citizen: { width: "14%" },
  incidentDate: { width: 118, minWidth: 118, maxWidth: 118 },
  createdAt: { width: 118, minWidth: 118, maxWidth: 118 },
  handoffDate: { width: 110, minWidth: 110, maxWidth: 110 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};

const resolvedComplaintsColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  title: { width: "38%" },
  category: { width: "18%" },
  citizen: { width: "18%" },
  createdAt: { width: 118, minWidth: 118, maxWidth: 118 },
  handoffDate: { width: 118, minWidth: 118, maxWidth: 118 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};

const completedMeetingsColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  title: { width: "40%" },
  citizen: { width: "16%" },
  createdAt: { width: 132, minWidth: 132, maxWidth: 132 },
  handoffDate: { width: 132, minWidth: 132, maxWidth: 132 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};

const myCasesColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  itemType: { width: 100, minWidth: 100, maxWidth: 100 },
  title: { width: "38%" },
  citizen: { width: "18%" },
  createdAt: { width: 118, minWidth: 118, maxWidth: 118 },
  status: { width: 128, minWidth: 128, maxWidth: 128 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};

function parseDateValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) return "";
  return parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function buildCalendarDays(monthStart) {
  const startDay = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startDay);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function calendarNavButtonStyle(C) {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.bgElevated,
    color: C.t2,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
}

function toTooltipText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatDateCell(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function getDateOnlyValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateValue(parsed);
}

function CustomDateFilter({ value, onChange, placeholder, min, max }) {
  const { C } = usePortalTheme();
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState("down");
  const [viewMode, setViewMode] = useState("day");
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateValue(value) || parseDateValue(min) || parseDateValue(max) || new Date());

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateDirection = () => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const dropdownHeight = 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "up" : "down");
    };

    const handlePointerDown = (event) => {
      const pickerRoot = event.target.closest?.('[data-admin-date-filter="true"]');
      if (!pickerRoot) {
        setIsOpen(false);
        setViewMode("day");
      }
    };

    updateDirection();
    window.addEventListener("resize", updateDirection);
    window.addEventListener("scroll", updateDirection, true);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", updateDirection);
      window.removeEventListener("scroll", updateDirection, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!value) return;
    const parsedValue = parseDateValue(value);
    if (parsedValue) setVisibleMonth(parsedValue);
  }, [value]);

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);
  const days = buildCalendarDays(monthStart);
  const yearStart = Math.floor(visibleMonth.getFullYear() / 12) * 12;

  function isMonthDisabled(monthIndex) {
    const firstDay = new Date(visibleMonth.getFullYear(), monthIndex, 1);
    const lastDay = new Date(visibleMonth.getFullYear(), monthIndex + 1, 0);
    if (minDate && lastDay < minDate) return true;
    if (maxDate && firstDay > maxDate) return true;
    return false;
  }

  function isYearDisabled(year) {
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    if (minDate && lastDay < minDate) return true;
    if (maxDate && firstDay > maxDate) return true;
    return false;
  }

  return (
    <div ref={rootRef} data-admin-date-filter="true" style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={{
          width: "100%",
          minHeight: 34,
          padding: "6px 14px",
          border: `1px solid ${C.border}`,
          background: C.inp,
          color: value ? C.t1 : C.t3,
          fontSize: 11,
          lineHeight: 1.2,
          outline: "none",
          borderRadius: "var(--portal-radius-sm, 10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value ? formatDisplayDate(value) : placeholder}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {value ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
                setIsOpen(false);
                setViewMode("day");
              }}
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                border: `1px solid ${C.border}`,
                background: C.bgElevated,
                color: C.t2,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                lineHeight: 1,
                cursor: "pointer",
                padding: 0,
              }}
              title="Clear filter"
            >
              ×
            </button>
          ) : null}
          <Calendar size={16} style={{ color: C.t3, flexShrink: 0 }} />
        </span>
      </button>

      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: openDirection === "down" ? "calc(100% + 6px)" : "auto",
            bottom: openDirection === "up" ? "calc(100% + 6px)" : "auto",
            left: 0,
            width: "100%",
            zIndex: 30,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.card,
            boxShadow: "0 16px 36px rgba(15, 23, 42, 0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (viewMode === "year") {
                  setVisibleMonth((current) => new Date(current.getFullYear() - 12, current.getMonth(), 1));
                } else {
                  setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
                }
              }}
              style={calendarNavButtonStyle(C)}
            >
              <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                style={{ border: "none", background: "transparent", color: C.t1, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {monthStart.toLocaleString("en-US", { month: "long" })}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("year")}
                style={{ border: "none", background: "transparent", color: C.t1, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {monthStart.getFullYear()}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (viewMode === "year") {
                  setVisibleMonth((current) => new Date(current.getFullYear() + 12, current.getMonth(), 1));
                } else {
                  setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
                }
              }}
              style={calendarNavButtonStyle(C)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {viewMode === "day" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.t3, padding: "6px 0" }}>{day}</div>
              ))}
              {days.map((day) => {
                const dayValue = formatDateValue(day);
                const isCurrentMonth = day.getMonth() === monthStart.getMonth();
                const isDisabled = (minDate && dayValue < min) || (maxDate && dayValue > max) || !isCurrentMonth;
                const isSelected = value === dayValue;

                return (
                  <button
                    key={dayValue}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      onChange(dayValue);
                      setIsOpen(false);
                      setViewMode("day");
                    }}
                    style={{
                      height: 34,
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? C.purple : "transparent"}`,
                      background: isSelected ? C.purple : "transparent",
                      color: isSelected ? "#ffffff" : isCurrentMonth ? C.t1 : C.t3,
                      opacity: isDisabled ? 0.35 : 1,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === "month" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const disabled = isMonthDisabled(monthIndex);
                const selected = monthIndex === visibleMonth.getMonth();
                return (
                  <button
                    key={monthIndex}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setVisibleMonth((current) => new Date(current.getFullYear(), monthIndex, 1));
                      setViewMode("day");
                    }}
                    style={{
                      minHeight: 36,
                      borderRadius: 8,
                      border: `1px solid ${selected ? C.purple : C.border}`,
                      background: selected ? `${C.purple}12` : "transparent",
                      color: C.t1,
                      opacity: disabled ? 0.35 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {new Date(2000, monthIndex, 1).toLocaleString("en-US", { month: "short" })}
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === "year" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {Array.from({ length: 12 }, (_, index) => {
                const year = yearStart + index;
                const disabled = isYearDisabled(year);
                const selected = year === visibleMonth.getFullYear();
                return (
                  <button
                    key={year}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setVisibleMonth((current) => new Date(year, current.getMonth(), 1));
                      setViewMode("month");
                    }}
                    style={{
                      minHeight: 36,
                      borderRadius: 8,
                      border: `1px solid ${selected ? C.purple : C.border}`,
                      background: selected ? `${C.purple}12` : "transparent",
                      color: C.t1,
                      opacity: disabled ? 0.35 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
              setViewMode("day");
            }}
            style={{
              width: "100%",
              marginTop: 10,
              minHeight: 34,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bgElevated,
              color: C.t2,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminCases() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [preferredDateFilter, setPreferredDateFilter] = useState("");
  const [incidentDateFilter, setIncidentDateFilter] = useState("");
  const [createdAtFilter, setCreatedAtFilter] = useState("");
  const [handoffDateFilter, setHandoffDateFilter] = useState("");
  const [handoffTypeFilter, setHandoffTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tabInitialized, setTabInitialized] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [showEntriesFocused, setShowEntriesFocused] = useState(false);
  const requestedTab = new URLSearchParams(location.search).get("tab");

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
  const resolvedComplaints = complaints.filter((item) => item.status === "resolved").map(complaintRow);
  const completedMeetings = meetings.filter((item) => item.status === "completed").map(meetingRow);
  const escalated = complaints.filter((item) => item.handoffByAdminUserId === session?.user?.id && item.handoffType === "reassigned" && !isResolvedComplaint(item.status)).map(complaintRow);

  const sections = { complaintPool, meetingPool, escalated, resolvedComplaints, completedMeetings };
  const today = formatDateValue(new Date());
  const isMeetingPoolTab = tab === "meetingPool";
  const isComplaintPoolTab = tab === "complaintPool";
  const isEscalatedTab = tab === "escalated";
  const isResolvedComplaintsTab = tab === "resolvedComplaints";
  const isCompletedMeetingsTab = tab === "completedMeetings";

  const activeRows = (sections[tab] || []).filter((item) => {
    const matchesStatus = isMeetingPoolTab || isComplaintPoolTab || isEscalatedTab || isResolvedComplaintsTab || isCompletedMeetingsTab ? true : statusFilter === "all" || item.status === statusFilter;
    const haystack = isComplaintPoolTab || isEscalatedTab
      ? [item.primaryId, item.title, item.category, item.citizenName, item.citizenId].filter(Boolean).join(" ").toLowerCase()
      : isResolvedComplaintsTab
        ? [item.primaryId, item.title, item.category, item.citizenName].filter(Boolean).join(" ").toLowerCase()
      : isCompletedMeetingsTab
        ? [item.primaryId, item.title, item.citizenName].filter(Boolean).join(" ").toLowerCase()
      : [item.primaryId, item.itemType, item.title, item.citizenName, item.citizenId, item.owner, item.reference, item.statusLabel].filter(Boolean).join(" ").toLowerCase();
    const search = query.trim().toLowerCase();
    const matchesPreferredDate = !preferredDateFilter || getDateOnlyValue(item.preferredTime) === preferredDateFilter;
    const matchesIncidentDate = !incidentDateFilter || getDateOnlyValue(item.incidentDate) === incidentDateFilter;
    const matchesCreatedAt = !createdAtFilter || getDateOnlyValue(item.createdAt) === createdAtFilter;
    const matchesHandoffDate = !handoffDateFilter || getDateOnlyValue(item.updatedAt) === handoffDateFilter;
    const matchesHandoffType = true;
    const matchesDateFilters = isMeetingPoolTab
      ? matchesPreferredDate && matchesCreatedAt
      : isComplaintPoolTab
        ? matchesIncidentDate && matchesCreatedAt
        : isEscalatedTab
          ? matchesIncidentDate && matchesCreatedAt && matchesHandoffDate
          : isResolvedComplaintsTab || isCompletedMeetingsTab
            ? matchesCreatedAt && matchesHandoffDate
            : true;
    return matchesStatus && (!search || haystack.includes(search)) && matchesDateFilters && matchesHandoffType;
  });

  useEffect(() => { setCurrentPage(1); }, [tab, query, statusFilter, preferredDateFilter, incidentDateFilter, createdAtFilter, handoffDateFilter, handoffTypeFilter, itemsPerPage]);

  const totalPages    = Math.max(1, Math.ceil(activeRows.length / itemsPerPage));
  const paginatedRows = activeRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);
  const statusOptions = Array.from(new Set((sections[tab] || []).map((item) => item.status).filter(Boolean))).sort();

  const tabs = [
    { id: "complaintPool", label: "Complaint Pool",       count: complaintPool.length },
    { id: "meetingPool",   label: "Meeting Pool",         count: meetingPool.length   },
    { id: "escalated",     label: "Reassigned Cases", count: escalated.length },
    { id: "resolvedComplaints", label: "Resolved Cases", count: resolvedComplaints.length },
    { id: "completedMeetings", label: "Completed Meetings", count: completedMeetings.length },
  ];
  const workPoolTabs = tabs.filter((item) => item.id === "complaintPool" || item.id === "meetingPool");
  const isResolvedComplaintsPage = requestedTab === "resolved-complaints";
  const isCompletedMeetingsPage = requestedTab === "completed-meetings";
  const isEscalatedPage = requestedTab === "escalated";
  const showWorkPoolCards = !isResolvedComplaintsPage && !isCompletedMeetingsPage && !isEscalatedPage;

  const handleTabChange = (nextTab) => {
    if (nextTab === tab) return;
    setTab(nextTab);

    const nextSearch = buildWorkQueueTabSearch(nextTab);
    if (location.search !== nextSearch) {
      navigate({
        pathname: location.pathname,
        search: nextSearch,
      });
    }
  };

  useEffect(() => {
    setQuery("");
    setStatusFilter("all");
    setPreferredDateFilter("");
    setIncidentDateFilter("");
    setCreatedAtFilter("");
    setHandoffDateFilter("");
    setHandoffTypeFilter("");
  }, [tab]);

  useEffect(() => {
    if (requestedTab === "complaint-pool" && tab !== "complaintPool") {
      setTab("complaintPool");
      setTabInitialized(true);
      return;
    }
    if (requestedTab === "meeting-pool" && tab !== "meetingPool") {
      setTab("meetingPool");
      setTabInitialized(true);
      return;
    }
    if (requestedTab === "resolved-complaints" && tab !== "resolvedComplaints") {
      setTab("resolvedComplaints");
      setTabInitialized(true);
      return;
    }
    if (requestedTab === "completed-meetings" && tab !== "completedMeetings") {
      setTab("completedMeetings");
      setTabInitialized(true);
      return;
    }
    if (requestedTab === "escalated" && tab !== "escalated") {
      setTab("escalated");
      setTabInitialized(true);
      return;
    }
    if (!requestedTab && !tabInitialized) {
      if (tab !== "complaintPool") {
        setTab("complaintPool");
      }
      setTabInitialized(true);
      return;
    }
    if (!requestedTab && (tab === "resolvedComplaints" || tab === "completedMeetings" || tab === "escalated")) {
      setTab("complaintPool");
    }
  }, [requestedTab, tab, tabInitialized]);

  useEffect(() => {
    if (tabInitialized || loading) return;
    setTabInitialized(true);
  }, [loading, tabInitialized]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const columns = useMemo(() => {
    if (isComplaintPoolTab) {
      return [
        { key: "primaryId", label: "Complaint Id", align: "left" },
        { key: "title", label: "Title", align: "left" },
        { key: "category", label: "Category", align: "left" },
        { key: "citizen", label: "Citizen Name", align: "left" },
        { key: "incidentDate", label: "Incident Date", align: "left" },
        { key: "createdAt", label: "Created At", align: "left" },
        { key: "action", label: "Action", align: "center" },
      ];
    }

    if (isEscalatedTab) {
      return [
        { key: "primaryId", label: "Complaint Id", align: "left" },
        { key: "title", label: "Title", align: "left" },
        { key: "category", label: "Category", align: "left" },
        { key: "citizen", label: "Citizen Name", align: "left" },
        { key: "incidentDate", label: "Incident Date", align: "left" },
        { key: "createdAt", label: "Created At", align: "left" },
        { key: "handoffDate", label: "Reassigned Date", align: "left" },
        { key: "action", label: "Action", align: "center" },
      ];
    }

    if (isResolvedComplaintsTab) {
      return [
        { key: "primaryId", label: "Complaint Id", align: "left" },
        { key: "title", label: "Title", align: "left" },
        { key: "category", label: "Category", align: "left" },
        { key: "citizen", label: "Citizen Name", align: "left" },
        { key: "createdAt", label: "Created At", align: "left" },
        { key: "handoffDate", label: "Resolved Date", align: "left" },
        { key: "action", label: "Action", align: "center" },
      ];
    }

    if (isCompletedMeetingsTab) {
      return [
        { key: "primaryId", label: "Meeting Id", align: "left" },
        { key: "title", label: "Title", align: "left" },
        { key: "citizen", label: "Citizen Name", align: "left" },
        { key: "createdAt", label: "Created At", align: "left" },
        { key: "handoffDate", label: "Completed Date", align: "left" },
        { key: "action", label: "Action", align: "center" },
      ];
    }

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
      resolvedComplaints: new Set(["owner"]),
      completedMeetings: new Set(["owner"]),
      escalated: new Set(["owner", "reference"]),
    };

    return baseColumns.filter((column) => !hiddenColumns[tab]?.has(column.key));
  }, [isComplaintPoolTab, isEscalatedTab, isResolvedComplaintsTab, isCompletedMeetingsTab, tab]);

  const meetingPoolColumns = useMemo(() => ([
    { key: "primaryId", label: "Meeting Id" },
    { key: "title", label: "Title" },
    { key: "citizen", label: "Citizen Name" },
    { key: "preferredTime", label: "Preferred Date" },
    { key: "createdAt", label: "Created At" },
    { key: "action", label: "Action" },
  ]), []);

  return (
    <div
      className="portal-citizen-page"
      style={{
        height: "calc(100vh - 73px)",
        overflow: "auto",
        padding: "16px 20px 8px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {/* HEADER */}
        {isResolvedComplaintsPage || isCompletedMeetingsPage || isEscalatedPage ? (
          <WorkspaceSectionHeader
            title={
              isResolvedComplaintsPage
                ? "RESOLVED COMPLAINTS"
                : isCompletedMeetingsPage
                  ? "COMPLETED MEETINGS"
                  : "ESCALATED CASES"
            }
          />
        ) : (
          <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <FiClipboard size={18} color={C.purple} />
            <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>WORK POOL</h1>
          </div>
        )}

        {showWorkPoolCards ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, max-content)",
              gap: 14,
              marginBottom: 14,
              alignItems: "stretch",
              justifyContent: "start",
            }}
          >
            {workPoolTabs.map((item) => (
              <div
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: tab === item.id ? C.purple : C.card,
                  border: `1px solid ${tab === item.id ? C.purple : C.border}`,
                  borderRadius: 14,
                  padding: "9px 15px",
                  minHeight: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  boxShadow:
                    tab === item.id
                      ? `0 8px 18px ${C.purple}26`
                      : hoveredCard === item.id
                        ? "0 6px 14px rgba(15, 23, 42, 0.08)"
                        : "0 6px 14px rgba(15, 23, 42, 0.05)",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: tab === item.id ? "#fff" : C.t1 }}>
                  {item.label} <span style={{ color: tab === item.id ? "rgba(255,255,255,0.82)" : C.t3 }}>({item.count})</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* QUEUE FILTERS */}
        <div style={{ marginBottom: 6 }}>
            <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ marginLeft: "auto", width: "50%", minWidth: 520, display: "grid", gap: 12, gridTemplateColumns: isEscalatedTab ? "minmax(0, 3fr) repeat(3, minmax(0, 1fr))" : isResolvedComplaintsTab || isCompletedMeetingsTab ? "minmax(0, 3fr) minmax(0, 1.35fr) minmax(0, 1.35fr)" : isComplaintPoolTab || isMeetingPoolTab ? "minmax(280px, 3fr) minmax(140px, 1fr) minmax(140px, 1fr)" : "minmax(0, 1.6fr) minmax(220px, 0.8fr)" }}>
              <div className={isComplaintPoolTab || isMeetingPoolTab ? "relative" : undefined}>
                {isComplaintPoolTab || isMeetingPoolTab ? <Search className="absolute left-3 top-2.5" size={17} style={{ color: C.t3 }} /> : null}
                <WorkspaceInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isMeetingPoolTab ? "Search by Meeting ID , Title , Citizen" : isComplaintPoolTab ? "Search by Complaint ID , Title , Category and Citizen" : isEscalatedTab ? "Search by Complaint Id , Title , Category and Citizen name" : isResolvedComplaintsTab ? "Search by Complaint ID , Title , Category and Citizen" : isCompletedMeetingsTab ? "Search by Meeting ID , Title and Citizen" : "Search by ID, title, citizen name..."}
                  style={
                    isComplaintPoolTab || isMeetingPoolTab
                      ? { paddingLeft: 36, minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }
                      : isEscalatedTab || isResolvedComplaintsTab || isCompletedMeetingsTab
                        ? { minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }
                        : undefined
                  }
                />
              </div>
              {isEscalatedTab ? (
                <>
                  <CustomDateFilter
                    value={incidentDateFilter}
                    onChange={setIncidentDateFilter}
                    placeholder="Date of incident"
                    max={today}
                  />
                  <CustomDateFilter
                    value={createdAtFilter}
                    onChange={setCreatedAtFilter}
                    placeholder="Created at"
                    max={today}
                  />
                  <CustomDateFilter
                    value={handoffDateFilter}
                    onChange={setHandoffDateFilter}
                    placeholder="Escalated/Reassigned date"
                    max={today}
                  />
                </>
              ) : isResolvedComplaintsTab || isCompletedMeetingsTab ? (
                <>
                  <CustomDateFilter
                    value={createdAtFilter}
                    onChange={setCreatedAtFilter}
                    placeholder="Created at"
                    max={today}
                  />
                  <CustomDateFilter
                    value={handoffDateFilter}
                    onChange={setHandoffDateFilter}
                    placeholder={isResolvedComplaintsTab ? "Resolved date" : "Completed date"}
                    max={today}
                  />
                </>
              ) : isMeetingPoolTab || isComplaintPoolTab ? (
                <>
                  <CustomDateFilter
                    value={isMeetingPoolTab ? preferredDateFilter : incidentDateFilter}
                    onChange={isMeetingPoolTab ? setPreferredDateFilter : setIncidentDateFilter}
                    placeholder={isMeetingPoolTab ? "Preferred Date" : "Incident Date"}
                    max={today}
                  />
                  {isComplaintPoolTab ? (
                    <CustomDateFilter
                      value={createdAtFilter}
                      onChange={setCreatedAtFilter}
                      placeholder="Created at"
                      max={today}
                    />
                  ) : (
                    <CustomDateFilter
                      value={createdAtFilter}
                      onChange={setCreatedAtFilter}
                      placeholder="Created at"
                      max={today}
                    />
                  )}
                </>
              ) : (
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: `1px solid ${C.border}`,
                      background: C.inp,
                      color: C.t1,
                      fontSize: 11,
                      lineHeight: "34px",
                      outline: "none",
                      cursor: "pointer",
                      borderRadius: "var(--portal-radius-sm, 10px)",
                    }}
                  >
                    <option value="all">All statuses</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{humanizeStatus(status)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABLE / STATES */}
        <div style={{ display: "flex", flexDirection: "column" }}>
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
            <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", marginBottom: 10 }}>
                {isMeetingPoolTab ? (
                  <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: 180, minWidth: 180, maxWidth: 180 }} />
                      <col style={{ width: "50%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: 132, minWidth: 132, maxWidth: 132 }} />
                      <col style={{ width: 118, minWidth: 118, maxWidth: 118 }} />
                      <col style={{ width: 84, minWidth: 84, maxWidth: 84 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {meetingPoolColumns.map((column, index) => (
                          <th
                            key={column.key}
                            style={{
                              minWidth: 0,
                              maxWidth: 0,
                              padding: column.key === "action" ? "13px 16px" : "13px 16px",
                              fontSize: 10,
                              fontWeight: 600,
                              color: tableHeaderText,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              whiteSpace: "nowrap",
                              textAlign: column.key === "action" ? "center" : "left",
                              background: tableHeaderBackground,
                              borderBottom: `1px solid ${C.border}`,
                              verticalAlign: "middle",
                              borderTopLeftRadius: index === 0 ? 12 : undefined,
                              borderTopRightRadius: index === meetingPoolColumns.length - 1 ? 12 : undefined,
                            }}
                          >
                            <span
                              title={column.label}
                              style={{
                                display: "block",
                                whiteSpace: column.key === "preferredTime" ? "nowrap" : "normal",
                                wordBreak: column.key === "preferredTime" ? "normal" : "break-word",
                                lineHeight: 1.25,
                              }}
                            >
                              {column.label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((item, index) => {
                        const isActionHovered = hoveredActionId === `${item.itemType}-${item.id}`;
                        return (
                          <tr key={`${item.itemType}-${item.id}`} style={{ borderBottom: `1px solid ${C.borderLight}`, background: index % 2 === 0 ? C.card : alternateRowBackground, verticalAlign: "middle" }}>
                            <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.t2, verticalAlign: "middle" }}>
                              <span title={toTooltipText(item.primaryId)} style={{ display: "block", whiteSpace: "nowrap" }}>
                                {item.primaryId}
                              </span>
                            </td>
                            <td style={{ padding: "10px 16px", verticalAlign: "middle", minWidth: 0 }}>
                              <div title={toTooltipText(item.title)} style={{ fontSize: 13, fontWeight: 600, color: C.t1, ...tableCellTextStyle }}>
                                {item.title}
                              </div>
                            </td>
                            <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", minWidth: 0 }}>
                              <div title={toTooltipText(item.citizenName)} style={tableCellTextStyle}>
                                {item.citizenName}
                              </div>
                            </td>
                            <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", minWidth: 0, maxWidth: 0 }}>
                              <span title={toTooltipText(formatDateCell(item.preferredTime))} style={tableCellTextStyle}>
                                {formatDateCell(item.preferredTime)}
                              </span>
                            </td>
                            <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", minWidth: 0, maxWidth: 0 }}>
                              <span title={toTooltipText(formatDateCell(item.createdAt))} style={tableCellTextStyle}>
                                {formatDateCell(item.createdAt)}
                              </span>
                            </td>
                            <td style={{ width: "1%", padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onMouseEnter={() => setHoveredActionId(`${item.itemType}-${item.id}`)}
                                onMouseLeave={() => setHoveredActionId(null)}
                                onClick={() => {
                                  setHoveredActionId(null);
                                  navigate(buildItemRoute(item, tab));
                                }}
                                title="View details"
                                style={{
                                  minWidth: 0,
                                  padding: 7,
                                  borderRadius: 10,
                                  border: "none",
                                  background: isActionHovered ? C.purple : "transparent",
                                  color: isActionHovered ? "#ffffff" : C.purple,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
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
                ) : (
                  <table className="w-full text-sm" style={isComplaintPoolTab || isEscalatedTab || isResolvedComplaintsTab || isCompletedMeetingsTab ? { borderCollapse: "collapse", tableLayout: "fixed" } : { borderCollapse: "collapse" }}>
                    <colgroup>
                      {isComplaintPoolTab
                        ? columns.map((column) => <col key={column.key} style={complaintPoolColumnStyles[column.key]} />)
                        : isEscalatedTab
                          ? columns.map((column) => <col key={column.key} style={escalatedColumnStyles[column.key]} />)
                          : isResolvedComplaintsTab
                            ? columns.map((column) => <col key={column.key} style={resolvedComplaintsColumnStyles[column.key]} />)
                            : isCompletedMeetingsTab
                              ? columns.map((column) => <col key={column.key} style={completedMeetingsColumnStyles[column.key]} />)
                        : <col style={idColumnStyle} />}
                    </colgroup>
                    <thead>
                      <tr>
                        {columns.map((column, index) => (
                          <th
                            key={column.key}
                            style={{
                              width: column.key === "status" || column.key === "action" ? "1%" : undefined,
                              padding: "13px 16px",
                              fontSize: 10,
                              fontWeight: 600,
                              color: tableHeaderText,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              whiteSpace: "nowrap",
                              textAlign: column.align,
                              background: tableHeaderBackground,
                              borderBottom: `1px solid ${C.border}`,
                              verticalAlign: "middle",
                              borderTopLeftRadius: index === 0 ? 12 : undefined,
                              borderTopRightRadius: index === columns.length - 1 ? 12 : undefined,
                            }}
                          >
                            <span
                              title={column.label}
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {column.label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((item, index) => (
                        <tr key={`${item.itemType}-${item.id}`} style={{ borderBottom: `1px solid ${C.borderLight}`, background: index % 2 === 0 ? C.card : alternateRowBackground, verticalAlign: "middle" }}>
                          {columns.map((column) => {
                          if (column.key === "primaryId") {
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                                <span title={toTooltipText(item.primaryId)} style={{ ...tableCellTextStyle, fontWeight: 600 }}>
                                  {item.primaryId}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "itemType") {
                            const itemTypeLabel = item.itemType === "complaint" ? "Complaint" : item.itemType === "meeting" ? "Meeting" : item.itemType;
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, textTransform: "capitalize", color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(itemTypeLabel)} style={tableCellTextStyle}>
                                  {itemTypeLabel}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "title") {
                            return (
                            <td key={column.key} style={{ padding: "10px 16px", maxWidth: 0, verticalAlign: "middle" }}>
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

                          if (column.key === "category") {
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                                <div title={toTooltipText(item.category)} style={tableCellTextStyle}>
                                  {item.category}
                                </div>
                              </td>
                            );
                          }

                          if (column.key === "handoffType") {
                            const handoffTypeLabel = item.handoffType === "reassigned"
                              ? "Reassigned"
                              : item.handoffType === "escalated"
                                ? "Escalated"
                                : "-";
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(handoffTypeLabel)} style={tableCellTextStyle}>
                                  {handoffTypeLabel}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "citizen") {
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                                <div title={toTooltipText(item.citizenName)} style={tableCellTextStyle}>
                                  {item.citizenName}
                                </div>
                              </td>
                            );
                          }

                          if (column.key === "incidentDate") {
                            const incidentDateLabel = formatDateCell(item.incidentDate);
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                                <span
                                  title={toTooltipText(incidentDateLabel)}
                                  style={{ display: "block", whiteSpace: "nowrap" }}
                                >
                                  {incidentDateLabel}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "owner") {
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(item.owner)} style={tableCellTextStyle}>
                                  {item.owner}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "reference") {
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t3, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(item.reference)} style={tableCellTextStyle}>
                                  {item.reference}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "createdAt") {
                            const createdAtLabel = formatDateCell(item.createdAt);
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0, whiteSpace: "nowrap" }}>
                                <span title={toTooltipText(createdAtLabel)} style={tableCellTextStyle}>
                                  {createdAtLabel}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "handoffDate") {
                            const handoffDateLabel = formatDateCell(item.updatedAt);
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0, whiteSpace: "nowrap" }}>
                                <span title={toTooltipText(handoffDateLabel)} style={tableCellTextStyle}>
                                  {handoffDateLabel}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "status") {
                            return (
                              <td key={column.key} style={{ width: "1%", padding: "10px 16px 10px 8px", textAlign: column.align, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                <div style={{ maxWidth: "100%", overflow: "hidden" }}>
                                  <WorkspaceBadge status={item.status} title={item.statusLabel} style={{ maxWidth: "100%" }}>
                                    {item.statusLabel}
                                  </WorkspaceBadge>
                                </div>
                              </td>
                            );
                          }

                          const isActionHovered = hoveredActionId === `${item.itemType}-${item.id}`;
                          return (
                            <td key={column.key} style={{ width: "1%", padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onMouseEnter={() => setHoveredActionId(`${item.itemType}-${item.id}`)}
                                onMouseLeave={() => setHoveredActionId(null)}
                                onClick={() => {
                                  setHoveredActionId(null);
                                  navigate(buildItemRoute(item, tab));
                                }}
                                title="View details"
                                style={{
                                  minWidth: 0,
                                  padding: 7,
                                  borderRadius: 10,
                                  border: "none",
                                  background: isActionHovered ? C.purple : "transparent",
                                  color: isActionHovered ? "#ffffff" : C.purple,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
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
                )}

              <div className="portal-citizen-table-footer" style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}>
                <div className="flex flex-col md:flex-row md:items-center gap-2 py-1.5" style={{ width: "calc(100% - 24px)", margin: "0 auto" }}>
                  <div className="flex items-center gap-2 md:flex-1 md:basis-0">
                    <span className="portal-citizen-caption" style={{ color: C.t2, whiteSpace: "nowrap" }}>
                      Show
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={itemsPerPage}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        if (!Number.isFinite(nextValue)) return;
                        setItemsPerPage(Math.min(25, Math.max(1, nextValue)));
                        setCurrentPage(1);
                      }}
                      onFocus={() => setShowEntriesFocused(true)}
                      onBlur={() => setShowEntriesFocused(false)}
                      style={{
                        width: 64,
                        minHeight: 34,
                        padding: "6px 14px",
                        border: `1px solid ${showEntriesFocused ? C.purple : C.border}`,
                        borderRadius: "var(--portal-radius-sm, 10px)",
                        background: C.inp,
                        color: C.t1,
                        fontSize: 13,
                        fontWeight: 500,
                        outline: "none",
                        boxShadow: showEntriesFocused ? `0 0 0 3px ${C.purple}1f` : "none",
                        transition: "border-color var(--portal-duration-fast) ease, box-shadow var(--portal-duration-fast) ease",
                      }}
                    />
                    <span className="portal-citizen-caption" style={{ color: C.t2, whiteSpace: "nowrap" }}>
                      Entries
                    </span>
                  </div>
                  <p className="portal-citizen-caption md:order-2" style={{ color: C.t2, margin: 0, whiteSpace: "nowrap", textAlign: "right", flex: 1, flexBasis: 0 }}>
                    Showing <span style={{ fontWeight: 600 }}>{Math.min((currentPage - 1) * itemsPerPage + 1, activeRows.length)}</span>-<span style={{ fontWeight: 600 }}>{Math.min(currentPage * itemsPerPage, activeRows.length)}</span> of{" "}
                    <span style={{ fontWeight: 600 }}>{activeRows.length}</span> requests
                  </p>

                  <div className="flex items-center gap-2 flex-wrap md:flex-1 md:basis-0 md:justify-center md:order-1">
                    {totalPages > 1 ? (
                      <>
                      <WorkspaceButton
                        type="button"
                        variant="outline"
                        disabled={currentPage === 1}
                        onMouseEnter={() => setHoveredPagerButton("previous")}
                        onMouseLeave={() => setHoveredPagerButton(null)}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        style={{
                          minWidth: 30,
                          minHeight: 30,
                          padding: "6px",
                          fontSize: 12,
                          background: "transparent",
                          color: hoveredPagerButton === "previous" && currentPage !== 1 ? "#ffffff" : C.purple,
                          border: "none",
                          opacity: currentPage === 1 ? 0.35 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          textShadow: hoveredPagerButton === "previous" && currentPage !== 1 ? "0 0 10px rgba(255,255,255,0.9)" : "none",
                          transition: "text-shadow 0.18s ease, color 0.18s ease",
                        }}
                      >
                        <ChevronLeft size={16} />
                      </WorkspaceButton>

                      {pageNumbers.map((pageNumber, index) => {
                        const previousPage = pageNumbers[index - 1];
                        const showGap = index > 0 && previousPage !== undefined && pageNumber - previousPage > 1;
                        return (
                          <div key={pageNumber} className="flex items-center gap-2">
                            {showGap ? <span style={{ fontSize: 12, color: C.t3, padding: "0 2px" }}>...</span> : null}
                            <WorkspaceButton
                              type="button"
                              variant="outline"
                              onMouseEnter={() => setHoveredPagerButton(`page-${pageNumber}`)}
                              onMouseLeave={() => setHoveredPagerButton(null)}
                              onClick={() => setCurrentPage(pageNumber)}
                              style={{
                                minWidth: 30,
                                minHeight: 30,
                                padding: "6px",
                                fontSize: 12,
                                background: "transparent",
                                color: currentPage === pageNumber || hoveredPagerButton === `page-${pageNumber}` ? "#ffffff" : C.purple,
                                border: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 8,
                                fontWeight: currentPage === pageNumber ? 700 : 600,
                                textShadow: currentPage === pageNumber || hoveredPagerButton === `page-${pageNumber}` ? "0 0 10px rgba(255,255,255,0.9)" : "none",
                                transition: "text-shadow 0.18s ease, color 0.18s ease",
                              }}
                            >
                              {pageNumber}
                            </WorkspaceButton>
                          </div>
                        );
                      })}

                      <WorkspaceButton
                        type="button"
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onMouseEnter={() => setHoveredPagerButton("next")}
                        onMouseLeave={() => setHoveredPagerButton(null)}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        style={{
                          minWidth: 30,
                          minHeight: 30,
                          padding: "6px",
                          fontSize: 12,
                          background: "transparent",
                          color: hoveredPagerButton === "next" && currentPage !== totalPages ? "#ffffff" : C.purple,
                          border: "none",
                          opacity: currentPage === totalPages ? 0.35 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          textShadow: hoveredPagerButton === "next" && currentPage !== totalPages ? "0 0 10px rgba(255,255,255,0.9)" : "none",
                          transition: "text-shadow 0.18s ease, color 0.18s ease",
                        }}
                      >
                        <ChevronRight size={16} />
                      </WorkspaceButton>
                      </>
                    ) : (
                      <span style={{ color: "#ffffff", fontSize: 14, fontWeight: 700, textShadow: "0 0 10px rgba(255,255,255,0.9)", lineHeight: 1 }}>
                        1
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
