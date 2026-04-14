import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
    resolved: "resolved-completed",
    escalated: "escalated-reassigned",
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

const complaintPoolColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  title: { width: "38%" },
  category: { width: "18%" },
  citizen: { width: "16%" },
  incidentDate: { width: 112, minWidth: 112, maxWidth: 112 },
  createdAt: { width: 112, minWidth: 112, maxWidth: 112 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};

const escalatedColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  handoffType: { width: 130, minWidth: 130, maxWidth: 130 },
  title: { width: "26%" },
  category: { width: "14%" },
  citizen: { width: "14%" },
  incidentDate: { width: 118, minWidth: 118, maxWidth: 118 },
  createdAt: { width: 118, minWidth: 118, maxWidth: 118 },
  handoffDate: { width: 110, minWidth: 110, maxWidth: 110 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};

const resolvedColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  itemType: { width: 100, minWidth: 100, maxWidth: 100 },
  handoffType: { width: 130, minWidth: 130, maxWidth: 130 },
  title: { width: "32%" },
  citizen: { width: "18%" },
  createdAt: { width: 118, minWidth: 118, maxWidth: 118 },
  handoffDate: { width: 118, minWidth: 118, maxWidth: 118 },
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
  return parsedDate.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
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
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
          minHeight: 42,
          padding: "10px 14px",
          border: `1px solid ${C.border}`,
          background: C.inp,
          color: value ? C.t1 : C.t3,
          fontSize: 13,
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
  const [myCasesTypeFilter, setMyCasesTypeFilter] = useState("");
  const [resolvedTypeFilter, setResolvedTypeFilter] = useState("");
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
  const today = formatDateValue(new Date());
  const isMeetingPoolTab = tab === "meetingPool";
  const isComplaintPoolTab = tab === "complaintPool";
  const isEscalatedTab = tab === "escalated";
  const isResolvedTab = tab === "resolved";
  const isMyCasesTab = tab === "myCases";

  const activeRows = (sections[tab] || []).filter((item) => {
    const matchesStatus = isMeetingPoolTab || isComplaintPoolTab || isEscalatedTab || isResolvedTab ? true : statusFilter === "all" || item.status === statusFilter;
    const haystack = isComplaintPoolTab || isEscalatedTab
      ? [item.primaryId, item.title, item.category, item.citizenName, item.citizenId].filter(Boolean).join(" ").toLowerCase()
      : isResolvedTab
        ? [item.primaryId, item.title, item.citizenName].filter(Boolean).join(" ").toLowerCase()
      : isMyCasesTab
        ? [item.primaryId, item.title, item.citizenName].filter(Boolean).join(" ").toLowerCase()
      : [item.primaryId, item.itemType, item.title, item.citizenName, item.citizenId, item.owner, item.reference, item.statusLabel].filter(Boolean).join(" ").toLowerCase();
    const search = query.trim().toLowerCase();
    const matchesPreferredDate = !preferredDateFilter || getDateOnlyValue(item.preferredTime) === preferredDateFilter;
    const matchesIncidentDate = !incidentDateFilter || getDateOnlyValue(item.incidentDate) === incidentDateFilter;
    const matchesCreatedAt = !createdAtFilter || getDateOnlyValue(item.createdAt) === createdAtFilter;
    const matchesHandoffDate = !handoffDateFilter || getDateOnlyValue(item.updatedAt) === handoffDateFilter;
    const matchesMyCasesType = !myCasesTypeFilter || item.itemType === myCasesTypeFilter;
    const matchesResolvedType = !resolvedTypeFilter || item.itemType === resolvedTypeFilter;
    const matchesHandoffType = isResolvedTab
      ? !handoffTypeFilter || (handoffTypeFilter === "resolved" ? item.itemType === "complaint" : item.itemType === "meeting")
      : !handoffTypeFilter || item.handoffType === handoffTypeFilter;
    const matchesDateFilters = isMeetingPoolTab
      ? matchesPreferredDate && matchesCreatedAt
      : isComplaintPoolTab
        ? matchesIncidentDate && matchesCreatedAt
        : isEscalatedTab
          ? matchesIncidentDate && matchesCreatedAt && matchesHandoffDate
          : isResolvedTab
            ? matchesCreatedAt && matchesHandoffDate
            : true;
    return matchesStatus && matchesMyCasesType && matchesResolvedType && (!search || haystack.includes(search)) && matchesDateFilters && matchesHandoffType;
  });

  useEffect(() => { setCurrentPage(1); }, [tab, query, statusFilter, myCasesTypeFilter, resolvedTypeFilter, preferredDateFilter, incidentDateFilter, createdAtFilter, handoffDateFilter, handoffTypeFilter]);

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
    setQuery("");
    setStatusFilter("all");
    setMyCasesTypeFilter("");
    setResolvedTypeFilter("");
    setPreferredDateFilter("");
    setIncidentDateFilter("");
    setCreatedAtFilter("");
    setHandoffDateFilter("");
    setHandoffTypeFilter("");
  }, [tab]);

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
    if (isComplaintPoolTab) {
      return [
        { key: "primaryId", label: "Complaint Id", align: "left" },
        { key: "title", label: "Title", align: "left" },
        { key: "category", label: "Category", align: "left" },
        { key: "citizen", label: "Citizen Name", align: "left" },
        { key: "incidentDate", label: "Date of Incident", align: "left" },
        { key: "createdAt", label: "Created At", align: "left" },
        { key: "action", label: "Action", align: "center" },
      ];
    }

    if (isEscalatedTab) {
      return [
        { key: "primaryId", label: "Complaint Id", align: "left" },
        { key: "handoffType", label: "Handoff Type", align: "left" },
        { key: "title", label: "Title", align: "left" },
        { key: "category", label: "Category", align: "left" },
        { key: "citizen", label: "Citizen Name", align: "left" },
        { key: "incidentDate", label: "Date of Incident", align: "left" },
        { key: "createdAt", label: "Created At", align: "left" },
        { key: "handoffDate", label: "Escalated/Reassigned Date", align: "left" },
        { key: "action", label: "Action", align: "center" },
      ];
    }

    if (isResolvedTab) {
      return [
        { key: "primaryId", label: "ID", align: "left" },
        { key: "itemType", label: "Type", align: "left" },
        { key: "handoffType", label: "Handoff Type", align: "left" },
        { key: "title", label: "Title", align: "left" },
        { key: "citizen", label: "Citizen Name", align: "left" },
        { key: "createdAt", label: "Created At", align: "left" },
        { key: "handoffDate", label: "Resolved/Completed Date", align: "left" },
        { key: "action", label: "Action", align: "center" },
      ];
    }

    if (isMyCasesTab) {
      return [
        { key: "primaryId", label: "ID", align: "left" },
        { key: "itemType", label: "Type", align: "left" },
        { key: "title", label: "Title", align: "left" },
        { key: "citizen", label: "Citizen", align: "left" },
        { key: "createdAt", label: "Created At", align: "left" },
        { key: "status", label: "Status", align: "center" },
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
      myCases: new Set(["owner", "reference"]),
      resolved: new Set(["owner"]),
      escalated: new Set(["owner", "reference"]),
    };

    return baseColumns.filter((column) => !hiddenColumns[tab]?.has(column.key));
  }, [isComplaintPoolTab, isEscalatedTab, isResolvedTab, isMyCasesTab, tab]);

  const meetingPoolColumns = useMemo(() => ([
    { key: "primaryId", label: "Meeting Id" },
    { key: "title", label: "Title" },
    { key: "citizen", label: "Citizen Name" },
    { key: "preferredTime", label: "Preferred Meeting Date" },
    { key: "createdAt", label: "Created At" },
    { key: "action", label: "Action" },
  ]), []);

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
            <div style={{ display: "grid", gridTemplateColumns: isEscalatedTab ? "minmax(0, 3fr) repeat(4, minmax(0, 1fr))" : isResolvedTab ? "minmax(0, 2.25fr) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1.35fr) minmax(0, 1.35fr)" : isMyCasesTab ? "minmax(0, 2.7fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.15fr)" : isMeetingPoolTab || isComplaintPoolTab ? "minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1.6fr) minmax(220px, 0.8fr)", gap: 16 }}>
              <div>
                <WorkspaceInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isMeetingPoolTab ? "Search by Meeting ID , Title , Citizen" : isComplaintPoolTab ? "Search by Complaint ID , Title , Category and Citizen" : isEscalatedTab ? "Search by Complaint Id , Title , Category and Citizen name" : isResolvedTab ? "Search by ID , Title and Citizen Name" : isMyCasesTab ? "Search by ID , Title and Citizen" : "Search by ID, title, citizen name..."}
                />
              </div>
              {isEscalatedTab ? (
                <>
                  <div>
                    <select
                      value={handoffTypeFilter}
                      onChange={(e) => setHandoffTypeFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: `1px solid ${C.border}`,
                        background: C.inp,
                        color: C.t1,
                        fontSize: 13,
                        outline: "none",
                        cursor: "pointer",
                        borderRadius: "var(--portal-radius-sm, 10px)",
                      }}
                    >
                      <option value="">Handoff Type</option>
                      <option value="escalated">Escalated</option>
                      <option value="reassigned">Reassigned</option>
                    </select>
                  </div>
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
              ) : isResolvedTab ? (
                <>
                  <div>
                    <select
                      value={resolvedTypeFilter}
                      onChange={(e) => setResolvedTypeFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: `1px solid ${C.border}`,
                        background: C.inp,
                        color: C.t1,
                        fontSize: 13,
                        outline: "none",
                        cursor: "pointer",
                        borderRadius: "var(--portal-radius-sm, 10px)",
                      }}
                    >
                      <option value="">Type</option>
                      <option value="complaint">Complaint</option>
                      <option value="meeting">Meeting</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={handoffTypeFilter}
                      onChange={(e) => setHandoffTypeFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: `1px solid ${C.border}`,
                        background: C.inp,
                        color: C.t1,
                        fontSize: 13,
                        outline: "none",
                        cursor: "pointer",
                        borderRadius: "var(--portal-radius-sm, 10px)",
                      }}
                    >
                      <option value="">Handoff Type</option>
                      <option value="resolved">Resolved</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <CustomDateFilter
                    value={createdAtFilter}
                    onChange={setCreatedAtFilter}
                    placeholder="Created at"
                    max={today}
                  />
                  <CustomDateFilter
                    value={handoffDateFilter}
                    onChange={setHandoffDateFilter}
                    placeholder="Resolved/Completed date"
                    max={today}
                  />
                </>
              ) : isMyCasesTab ? (
                <>
                  <div>
                    <select
                      value={myCasesTypeFilter}
                      onChange={(e) => setMyCasesTypeFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: `1px solid ${C.border}`,
                        background: C.inp,
                        color: C.t1,
                        fontSize: 13,
                        outline: "none",
                        cursor: "pointer",
                        borderRadius: "var(--portal-radius-sm, 10px)",
                      }}
                    >
                      <option value="">Type</option>
                      <option value="complaint">Complaint</option>
                      <option value="meeting">Meeting</option>
                    </select>
                  </div>
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
                        fontSize: 13,
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
                  <CustomDateFilter
                    value={createdAtFilter}
                    onChange={setCreatedAtFilter}
                    placeholder="Created at"
                    max={today}
                  />
                </>
              ) : isMeetingPoolTab || isComplaintPoolTab ? (
                <>
                  <CustomDateFilter
                    value={isMeetingPoolTab ? preferredDateFilter : incidentDateFilter}
                    onChange={isMeetingPoolTab ? setPreferredDateFilter : setIncidentDateFilter}
                    placeholder={isMeetingPoolTab ? "Preferred meeting date" : "Date of incident"}
                    max={today}
                  />
                  <CustomDateFilter
                    value={createdAtFilter}
                    onChange={setCreatedAtFilter}
                    placeholder="Created at"
                    max={today}
                  />
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
                      fontSize: 13,
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
                {isMeetingPoolTab ? (
                  <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: 180, minWidth: 180, maxWidth: 180 }} />
                      <col style={{ width: "54%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: 118, minWidth: 118, maxWidth: 118 }} />
                      <col style={{ width: 118, minWidth: 118, maxWidth: 118 }} />
                      <col style={{ width: 84, minWidth: 84, maxWidth: 84 }} />
                    </colgroup>
                    <thead style={{ background: tableHeaderBackground, borderBottom: `1px solid ${C.border}` }}>
                      <tr>
                        {meetingPoolColumns.map((column) => (
                          <th
                            key={column.key}
                            style={{
                              minWidth: 0,
                              maxWidth: 0,
                              padding: column.key === "action" ? "13px 10px" : "13px 12px",
                              fontSize: 10,
                              fontWeight: 600,
                              color: tableHeaderText,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              whiteSpace: "nowrap",
                              textAlign: column.key === "action" ? "center" : "left",
                              background: tableHeaderBackground,
                              verticalAlign: "middle",
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
                      {paginatedRows.map((item, index) => {
                        const isActionHovered = hoveredActionId === `${item.itemType}-${item.id}`;
                        return (
                          <tr key={`${item.itemType}-${item.id}`} style={{ background: index % 2 === 0 ? C.card : alternateRowBackground, verticalAlign: "middle" }}>
                            <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: C.purple, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle" }}>
                              <span title={toTooltipText(item.primaryId)} style={{ display: "block", whiteSpace: "nowrap" }}>
                                {item.primaryId}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", minWidth: 0 }}>
                              <div title={toTooltipText(item.title)} style={{ fontSize: 13, fontWeight: 600, color: C.t1, ...tableCellTextStyle }}>
                                {item.title}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", minWidth: 0 }}>
                              <div title={toTooltipText(item.citizenName)} style={tableCellTextStyle}>
                                {item.citizenName}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", minWidth: 0, maxWidth: 0 }}>
                              <span title={toTooltipText(formatDateCell(item.preferredTime))} style={tableCellTextStyle}>
                                {formatDateCell(item.preferredTime)}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", minWidth: 0, maxWidth: 0 }}>
                              <span title={toTooltipText(formatDateCell(item.createdAt))} style={tableCellTextStyle}>
                                {formatDateCell(item.createdAt)}
                              </span>
                            </td>
                            <td style={{ width: "1%", padding: "10px 10px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", whiteSpace: "nowrap" }}>
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full" style={isComplaintPoolTab || isEscalatedTab || isResolvedTab || isMyCasesTab ? { tableLayout: "fixed" } : undefined}>
                    <colgroup>
                      {isComplaintPoolTab
                        ? columns.map((column) => <col key={column.key} style={complaintPoolColumnStyles[column.key]} />)
                        : isEscalatedTab
                          ? columns.map((column) => <col key={column.key} style={escalatedColumnStyles[column.key]} />)
                          : isResolvedTab
                            ? columns.map((column) => <col key={column.key} style={resolvedColumnStyles[column.key]} />)
                            : isMyCasesTab
                              ? columns.map((column) => <col key={column.key} style={myCasesColumnStyles[column.key]} />)
                        : <col style={idColumnStyle} />}
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
                            const itemTypeLabel = item.itemType === "complaint" ? "Complaint" : item.itemType === "meeting" ? "Meeting" : item.itemType;
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, textTransform: "capitalize", color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(itemTypeLabel)} style={tableCellTextStyle}>
                                  {itemTypeLabel}
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

                          if (column.key === "category") {
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <div title={toTooltipText(item.category)} style={tableCellTextStyle}>
                                  {item.category}
                                </div>
                              </td>
                            );
                          }

                          if (column.key === "handoffType") {
                            const handoffTypeLabel = isResolvedTab
                              ? item.itemType === "meeting"
                                ? "Completed"
                                : "Resolved"
                              : item.handoffType === "reassigned"
                                ? "Reassigned"
                                : item.handoffType === "escalated"
                                  ? "Escalated"
                                  : "-";
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(handoffTypeLabel)} style={tableCellTextStyle}>
                                  {handoffTypeLabel}
                                </span>
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

                          if (column.key === "incidentDate") {
                            const incidentDateLabel = formatDateCell(item.incidentDate);
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(incidentDateLabel)} style={tableCellTextStyle}>
                                  {incidentDateLabel}
                                </span>
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
                            const createdAtLabel = formatDateCell(item.createdAt);
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(createdAtLabel)} style={tableCellTextStyle}>
                                  {createdAtLabel}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "handoffDate") {
                            const handoffDateLabel = formatDateCell(item.updatedAt);
                            return (
                              <td key={column.key} style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(handoffDateLabel)} style={tableCellTextStyle}>
                                  {handoffDateLabel}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "status") {
                            return (
                              <td key={column.key} style={{ width: "1%", padding: "10px 10px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", whiteSpace: "nowrap" }}>
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
                )}
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
