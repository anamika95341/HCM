import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../../routes/paths.js";
import { apiClient } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceSelect,
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

const complaintQueueGridTemplate = "180px minmax(0, 2fr) minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 0.9fr) 118px 96px 84px";

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

function formatDateOnly(value) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
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
    if (!isOpen || !rootRef.current) return undefined;

    const updateDirection = () => {
      const rect = rootRef.current.getBoundingClientRect();
      const dropdownHeight = 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "up" : "down");
    };

    const handlePointerDown = (event) => {
      const pickerRoot = event.target.closest?.('[data-admin-complaint-date-filter="true"]');
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
    <div ref={rootRef} data-admin-complaint-date-filter="true" style={{ position: "relative", width: "100%" }}>
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
            <button type="button" onClick={() => {
              if (viewMode === "year") setVisibleMonth((current) => new Date(current.getFullYear() - 12, current.getMonth(), 1));
              else setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
            }} style={calendarNavButtonStyle(C)}>
              <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setViewMode("month")} style={{ border: "none", background: "transparent", color: C.t1, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {monthStart.toLocaleString("en-US", { month: "long" })}
              </button>
              <button type="button" onClick={() => setViewMode("year")} style={{ border: "none", background: "transparent", color: C.t1, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {monthStart.getFullYear()}
              </button>
            </div>
            <button type="button" onClick={() => {
              if (viewMode === "year") setVisibleMonth((current) => new Date(current.getFullYear() + 12, current.getMonth(), 1));
              else setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
            }} style={calendarNavButtonStyle(C)}>
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

function toTooltipText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function AdminComplaintQueue() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.bgElevated : "#F7F1FF";
  const { session } = useAuth();
  const adminId = session?.user?.id;

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [incidentDateFilter, setIncidentDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [hoveredActionId, setHoveredActionId] = useState(null);

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
      const haystack = [
        complaint.complaintId,
        complaint.title,
        complaint.complaintType,
        complaint.citizenSnapshot?.name,
        complaint.complaintLocation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus = statusFilter === "all" || complaint.status === statusFilter;
      const matchesIncidentDate = !incidentDateFilter || getDateOnlyValue(complaint.incidentDate) === incidentDateFilter;
      return matchesSearch && matchesStatus && matchesIncidentDate;
    });
  }, [incidentDateFilter, personalComplaintQueue, query, statusFilter]);

  const statusOptions = useMemo(
    () => Array.from(new Set(personalComplaintQueue.map((complaint) => complaint.status).filter(Boolean))).sort(),
    [personalComplaintQueue]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, incidentDateFilter, personalComplaintQueue.length]);

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

        <div style={{ display: "grid", gap: 12, flex: 1, minHeight: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, max-content)",
              gap: 14,
              alignItems: "stretch",
              justifyContent: "start",
            }}
          >
            {queueStats.map((item) => (
              <div
                key={item.label}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: "9px 15px",
                  minHeight: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>
                  {item.label} <span style={{ color: C.t3 }}>({item.value})</span>
                </span>
              </div>
            ))}
          </div>

          
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2.8fr) minmax(0, 1fr) minmax(0, 1.1fr)", gap: 16, marginTop: -2 }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: C.t3 }} />
              <WorkspaceInput
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by Complaint Id , Title , Category , Citizen and Location"
                style={{ paddingLeft: 40 }}
              />
            </div>
            <WorkspaceSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </WorkspaceSelect>
            <CustomDateFilter
              value={incidentDateFilter}
              onChange={setIncidentDateFilter}
              placeholder="Date of incident"
              max={formatDateValue(new Date())}
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
                  gridTemplateColumns: complaintQueueGridTemplate,
                  gap: 12,
                  padding: "12px 12px",
                  background: tableHeaderBackground,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {["Complaint Id", "Title", "Category", "Citizen", "Location", "Date of Incident", "Status", "Action"].map((column) => (
                  <div
                    key={column}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: tableHeaderText,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      textAlign: column === "Status" || column === "Action" ? "center" : "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {column}
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, minHeight: 0 }}>
                {paginatedComplaintQueue.map((complaint, index) => {
                  const isActionHovered = hoveredActionId === complaint.id;
                  return (
                  <div
                    key={complaint.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: complaintQueueGridTemplate,
                      gap: 12,
                      padding: "14px 12px",
                      alignItems: "center",
                      background: index % 2 === 0 ? C.card : alternateRowBackground,
                      borderBottom: `1px solid ${C.borderLight}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.purple, whiteSpace: "nowrap" }}>
                      {complaint.complaintId || complaint.id}
                    </div>
                    <div title={toTooltipText(complaint.title || "Untitled Complaint")} style={{ fontSize: 13, fontWeight: 600, color: C.t1, minWidth: 0, ...tableCellTextStyle }}>
                        {complaint.title || "Untitled Complaint"}
                    </div>
                    <div title={toTooltipText(complaint.complaintType || "Not provided")} style={{ fontSize: 13, color: C.t2, minWidth: 0, ...tableCellTextStyle }}>
                      {complaint.complaintType || "Not provided"}
                    </div>
                    <div title={toTooltipText(complaint.citizenSnapshot?.name || "Unknown Citizen")} style={{ fontSize: 13, color: C.t2, minWidth: 0, ...tableCellTextStyle }}>
                      {complaint.citizenSnapshot?.name || "Unknown Citizen"}
                    </div>
                    <div title={toTooltipText(complaint.complaintLocation || "Not provided")} style={{ fontSize: 13, color: C.t2, minWidth: 0, ...tableCellTextStyle }}>
                      {complaint.complaintLocation || "Not provided"}
                    </div>
                    <div style={{ fontSize: 13, color: C.t2, minWidth: 0 }}>
                      <span title={toTooltipText(formatDateOnly(complaint.incidentDate))} style={tableCellTextStyle}>
                        {formatDateOnly(complaint.incidentDate)}
                      </span>
                    </div>
                    <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ maxWidth: "100%", overflow: "hidden" }}>
                        <WorkspaceBadge status={complaint.status} title={statusLabel(complaint.status)} style={{ maxWidth: "100%" }}>
                          {statusLabel(complaint.status)}
                        </WorkspaceBadge>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredActionId(complaint.id)}
                        onMouseLeave={() => setHoveredActionId(null)}
                        onClick={() => navigate(`${PATHS.admin.cases}/${complaint.id}?source=complaint-queue`)}
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
                    </div>
                  </div>
                );
                })}
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
