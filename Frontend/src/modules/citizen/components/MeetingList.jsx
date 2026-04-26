import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Calendar, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { useNotifications } from "../../../shared/notifications/NotificationContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function meetingStatus(item) {
  const status = item.status || "pending";
  const label = String(status)
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
  return { value: status, label };
}

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
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = String(parsedDate.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
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

function getDateOnlyValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateValue(parsed);
}

function formatTableDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function CustomDateFilter({ value, onChange, placeholder, max }) {
  const { C } = usePortalTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [openDirection, setOpenDirection] = useState("down");
  const [viewMode, setViewMode] = useState("day");
  const rootRef = useRef(null);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateValue(value) || parseDateValue(max) || new Date());

  useEffect(() => {
    if (!isOpen || !rootRef?.current) return undefined;

    const updateDirection = () => {
      const rect = rootRef.current.getBoundingClientRect();
      const dropdownHeight = 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "up" : "down");
    };

    const handlePointerDown = (event) => {
      const pickerRoot = event.target.closest?.('[data-citizen-meeting-date-filter="true"]');
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
  const maxDate = parseDateValue(max);
  const days = buildCalendarDays(monthStart);
  const yearStart = Math.floor(visibleMonth.getFullYear() / 12) * 12;

  function isMonthDisabled(monthIndex) {
    const firstDay = new Date(visibleMonth.getFullYear(), monthIndex, 1);
    return Boolean(maxDate && firstDay > maxDate);
  }

  function isYearDisabled(year) {
    const firstDay = new Date(year, 0, 1);
    return Boolean(maxDate && firstDay > maxDate);
  }

  return (
    <div ref={rootRef} data-citizen-meeting-date-filter="true" style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          minHeight: 34,
          padding: "6px 14px",
          border: `1px solid ${focused ? C.purple : C.border}`,
          background: C.inp,
          color: value ? C.t1 : C.t3,
          fontSize: 11,
          lineHeight: 1.2,
          outline: "none",
          boxShadow: focused ? `0 0 0 3px ${C.purpleDim}` : "none",
          borderRadius: "var(--portal-radius-sm, 10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          textAlign: "left",
          transition: "border-color var(--portal-duration-fast) ease, box-shadow var(--portal-duration-fast) ease",
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
          <span style={{ color: C.t3, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
            <Calendar size={16} />
          </span>
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
              <button type="button" onClick={() => setViewMode("month")} style={{ border: "none", background: "transparent", color: C.t1, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {monthStart.toLocaleString("en-US", { month: "long" })}
              </button>
              <button type="button" onClick={() => setViewMode("year")} style={{ border: "none", background: "transparent", color: C.t1, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
                const isDisabled = (maxDate && dayValue > max) || !isCurrentMonth;
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
        </div>
      ) : null}
    </div>
  );
}

const tableCellTextStyle = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const idColumnStyle = {
  width: 180,
  minWidth: 180,
  maxWidth: 180,
};

const titleColumnStyle = {
  width: "32%",
};

const dateColumnStyle = {
  width: 132,
  minWidth: 132,
  maxWidth: 132,
};

const locationColumnStyle = {
  width: "16%",
};

const statusColumnStyle = {
  width: 120,
  minWidth: 120,
  maxWidth: 120,
};

const actionColumnStyle = {
  width: 96,
  minWidth: 96,
  maxWidth: 96,
};

function toTooltipText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function MeetingList() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { eventVersion } = useNotifications();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.card : "#F7F1FF";
  const pageHeight = "calc(100vh - 73px)";
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [showEntriesFocused, setShowEntriesFocused] = useState(false);
  
  // Pagination and Filter State
  const [filters, setFilters] = useState({ q: "", status: "all", createdAt: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const todayDate = formatDateValue(new Date());

  useEffect(() => {
    let mounted = true;

    async function loadMeetings() {
      try {
        const { data } = await apiClient.get("/meetings/my");
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

    if (session?.role) {
      loadMeetings();
    }

    return () => {
      mounted = false;
    };
  }, [session?.role, eventVersion]);

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
      const createdAtValue = getDateOnlyValue(item.created_at);
      const createdAtOk = !filters.createdAt || createdAtValue === filters.createdAt;
      const q = filters.q.trim().toLowerCase();
      
      const searchText = [
        item.primaryTitle,
        item.primaryId,
        item.scheduled_location,
      ].filter(Boolean).join(" ").toLowerCase();
      
      return statusOk && createdAtOk && (!q || searchText.includes(q));
    });
  }, [meetings, filters]);

  // Pagination Math
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);
  // Dynamic Status Options for the dropdown
  const statusOptions = useMemo(() => {
    return Array.from(new Set(meetings.map((item) => item.status).filter(Boolean))).sort();
  }, [meetings]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <div
      className="portal-citizen-page"
      style={{
        height: pageHeight,
        overflow: "auto",
        padding: "16px 20px 8px",
        display: "flex",
        flexDirection: "column",
      }}
    >
        <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <Calendar size={20} style={{ color: C.purple, flexShrink: 0 }} />
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>MY MEETINGS</h1>
        </div>

        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ marginLeft: "auto", width: "50%", minWidth: 520, display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 2.4fr) minmax(170px, 1.2fr) minmax(140px, 1fr)" }}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5" size={17} style={{ color: C.t3 }} />
                <WorkspaceInput
                  value={filters.q}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, q: event.target.value }));
                    setCurrentPage(1);
                  }}
                  placeholder="Search by Meeting Id , Title and Location"
                  style={{ paddingLeft: 36, minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }}
                />
              </div>
              <CustomDateFilter
                value={filters.createdAt}
                onChange={(nextValue) => {
                  setFilters((current) => ({ ...current, createdAt: nextValue }));
                  setCurrentPage(1);
                }}
                placeholder="Created At"
                max={todayDate}
              />
              <div className="relative">
                <Filter className="absolute left-3 top-2.5" size={17} style={{ color: C.t3 }} />
                <WorkspaceSelect
                  value={filters.status}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, status: event.target.value }));
                  setCurrentPage(1);
                }}
                style={{ paddingLeft: 36, minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }}
              >
                  <option value="all">All status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ").charAt(0).toUpperCase() + status.replace(/_/g, " ").slice(1)}
                    </option>
                  ))}
                </WorkspaceSelect>
              </div>
            </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading && <WorkspaceEmptyState title="Loading your meetings..." />}
          {error && <div style={{ color: C.danger, padding: "12px 0" }}>{error}</div>}

          {!loading && !error && (
            <>
              {items.length === 0 ? (
                <WorkspaceEmptyState title="No meeting requests found" subtitle="Try adjusting your filters." />
              ) : (
                <>
                  <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", marginBottom: 10 }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                          <colgroup>
                            <col style={idColumnStyle} />
                            <col style={titleColumnStyle} />
                            <col style={dateColumnStyle} />
                            <col style={dateColumnStyle} />
                            <col style={locationColumnStyle} />
                            <col style={statusColumnStyle} />
                            <col style={actionColumnStyle} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", borderTopLeftRadius: 12 }}>Meeting ID</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Title</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Created At</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Scheduled Date</th>
                              <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Scheduled Location</th>
                              <th style={{ width: "1%", padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Status</th>
                              <th style={{ width: "1%", padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", borderTopRightRadius: 12 }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedItems.map((item, index) => {
                              const statusObj = meetingStatus(item);
                              const scheduledDateLabel = formatTableDate(item.scheduled_at);
                              const createdAtLabel = formatTableDate(item.created_at);
                              const locationLabel = item.scheduled_location || "";
                              const isActionHovered = hoveredActionId === item.id;

                              const rowBackground = index % 2 === 0 ? C.card : alternateRowBackground;

                              return (
                                <tr key={`${item.itemType}-${item.id}`} style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBackground, verticalAlign: "middle" }}>
                                  <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                                    <span title={toTooltipText(item.primaryId || "-")} style={{ ...tableCellTextStyle, fontWeight: 600 }}>
                                      {item.primaryId || "-"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 0 }}>
                                    <span title={toTooltipText(item.primaryTitle)} style={{ ...tableCellTextStyle, fontSize: 13, fontWeight: 600, color: C.t1 }}>
                                      {item.primaryTitle}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                    <span title={toTooltipText(createdAtLabel)} style={tableCellTextStyle}>
                                      {createdAtLabel || "--"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                    {scheduledDateLabel ? (
                                      <span title={toTooltipText(scheduledDateLabel)} style={tableCellTextStyle}>
                                        {scheduledDateLabel}
                                      </span>
                                    ) : (
                                      <WorkspaceBadge status="pending" title="Pending" style={{ maxWidth: "100%" }}>Pending</WorkspaceBadge>
                                    )}
                                  </td>
                                  <td style={{ padding: "10px 8px 10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                                    {locationLabel ? (
                                      <span title={toTooltipText(locationLabel)} style={tableCellTextStyle}>
                                        {locationLabel}
                                      </span>
                                    ) : (
                                      <WorkspaceBadge status="pending" title="Pending" style={{ maxWidth: "100%" }}>Pending</WorkspaceBadge>
                                    )}
                                  </td>
                                  <td style={{ width: "1%", padding: "10px 16px 10px 8px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                    <WorkspaceBadge status={statusObj.value} title={statusObj.label} style={{ maxWidth: "100%" }}>{statusObj.label}</WorkspaceBadge>
                                  </td>
                                  <td style={{ width: "1%", padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                    <button
                                      type="button"
                                      onMouseEnter={() => setHoveredActionId(item.id)}
                                      onMouseLeave={() => setHoveredActionId(null)}
                                      onClick={() => navigate(`/citizen/meetings/${item.id}`, { state: { meetingData: item, itemType: item.itemType } })}
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
                              boxShadow: showEntriesFocused ? `0 0 0 3px ${C.purpleDim}` : "none",
                              transition: "border-color var(--portal-duration-fast) ease, box-shadow var(--portal-duration-fast) ease",
                            }}
                          />
                          <span className="portal-citizen-caption" style={{ color: C.t2, whiteSpace: "nowrap" }}>
                            Entries
                          </span>
                        </div>

                        <div className="portal-citizen-pager flex items-center gap-2 flex-wrap md:flex-1 md:basis-0 md:justify-center">
                          {totalPages > 1 ? (
                            <>
                            <WorkspaceButton
                              className="portal-citizen-pager-btn"
                              onMouseEnter={() => setHoveredPagerButton("previous")}
                              onMouseLeave={() => setHoveredPagerButton(null)}
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              variant="outline"
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
                                transform: hoveredPagerButton === "previous" && currentPage !== 1 ? "scale(1.08)" : "scale(1)",
                                transition: "transform 0.18s ease, text-shadow 0.18s ease",
                              }}
                            >
                              <ChevronLeft size={16} />
                            </WorkspaceButton>

                            {pageNumbers.map((pageNumber, index) => {
                              const previousPage = pageNumbers[index - 1];
                              const showGap = index > 0 && previousPage !== undefined && pageNumber - previousPage > 1;
                              return (
                                <div key={pageNumber} className="flex items-center gap-2">
                                  {showGap ? (
                                    <span className="portal-citizen-caption" style={{ color: C.t3, padding: "0 2px" }}>
                                      ...
                                    </span>
                                  ) : null}
                                  <WorkspaceButton
                                    className="portal-citizen-pager-btn"
                                    onMouseEnter={() => setHoveredPagerButton(`page-${pageNumber}`)}
                                    onMouseLeave={() => setHoveredPagerButton(null)}
                                    onClick={() => setCurrentPage(pageNumber)}
                                    variant="outline"
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
                                      fontWeight: currentPage === pageNumber ? 700 : 600,
                                      borderRadius: 8,
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
                              className="portal-citizen-pager-btn"
                              onMouseEnter={() => setHoveredPagerButton("next")}
                              onMouseLeave={() => setHoveredPagerButton(null)}
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              variant="outline"
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

                        <p className="portal-citizen-caption" style={{ color: C.t2, margin: 0, whiteSpace: "nowrap", textAlign: "right", flex: 1, flexBasis: 0 }}>
                          Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, items.length)}</span>-<span className="font-semibold">{Math.min(currentPage * itemsPerPage, items.length)}</span> of <span className="font-semibold">{items.length}</span> requests
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:hidden space-y-3">
                    {paginatedItems.map((item) => {
                      const statusObj = meetingStatus(item);
                      const scheduledDateLabel = formatTableDate(item.scheduled_at);
                      const locationLabel = item.scheduled_location || "";
                      const createdAtLabel = formatTableDate(item.created_at);

                      return (
                        <div key={`${item.itemType}-${item.id}`} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, background: C.card }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="portal-citizen-label" style={{ color: C.t3, marginBottom: 6 }}>
                                Meeting ID: {item.primaryId || "-"}
                              </div>
                              <h3 style={{ margin: 0, fontWeight: 700, color: C.t1, lineHeight: 1.5, wordBreak: "break-word" }}>{item.primaryTitle}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <WorkspaceBadge status={statusObj.value}>{statusObj.label}</WorkspaceBadge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p className="portal-citizen-label" style={{ margin: "0 0 4px", textTransform: "uppercase", color: C.t3 }}>Created At</p>
                              <p className="portal-citizen-value" style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{createdAtLabel || "--"}</p>
                            </div>
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p className="portal-citizen-label" style={{ margin: "0 0 4px", textTransform: "uppercase", color: C.t3 }}>Scheduled Date</p>
                              {scheduledDateLabel ? (
                                <p className="portal-citizen-value" style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{scheduledDateLabel}</p>
                              ) : (
                                <WorkspaceBadge status="pending" title="Pending">Pending</WorkspaceBadge>
                              )}
                            </div>
                            <div className="col-span-2" style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p className="portal-citizen-label" style={{ margin: "0 0 4px", textTransform: "uppercase", color: C.t3 }}>Scheduled Location</p>
                              {locationLabel ? (
                                <p className="portal-citizen-value" style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{locationLabel}</p>
                              ) : (
                                <WorkspaceBadge status="pending" title="Pending">Pending</WorkspaceBadge>
                              )}
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
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}



// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { Eye, Clock, CheckCircle2, AlertCircle, Calendar, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
// import { apiClient } from "../../../shared/api/client.js";
// import { useAuth } from "../../../shared/auth/AuthContext.jsx";
// import { useNotifications } from "../../../shared/notifications/NotificationContext.jsx";
// import {
//   WorkspaceBadge,
//   WorkspaceButton,
//   WorkspaceCard,
//   WorkspaceEmptyState,
//   WorkspaceInput,
//   WorkspaceSelect,
// } from "../../../shared/components/WorkspaceUI.jsx";
// import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

// function meetingStatus(item) {
//   const status = item.status || "pending";
//   const label = String(status)
//     .split("_")
//     .filter(Boolean)
//     .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
//     .join(" ");
//   return { value: status, label };
// }

// const tableCellTextStyle = {
//   display: "block",
//   maxWidth: "100%",
//   overflow: "hidden",
//   textOverflow: "ellipsis",
//   whiteSpace: "nowrap",
// };

// const idColumnStyle = {
//   width: 160,
//   minWidth: 160,
//   maxWidth: 160,
// };

// function toTooltipText(value) {
//   if (value === null || value === undefined) return "";
//   return String(value);
// }

// export default function MeetingList() {
//   const { C } = usePortalTheme();
//   const navigate = useNavigate();
//   const { session } = useAuth();
//   const { eventVersion } = useNotifications();
//   const tableHeaderBackground = C.purple;
//   const tableHeaderText = "#FFFFFF";
//   const alternateRowBackground = C.name === "dark" ? C.card : "#F7F1FF";
//   const pageHeight = "calc(100vh - 73px)";

//   const [meetings, setMeetings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [hoveredActionId, setHoveredActionId] = useState(null);
//   const [hoveredPagerButton, setHoveredPagerButton] = useState(null);

//   // Pagination and Filter State
//   const [filters, setFilters] = useState({ q: "", status: "all" });
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 8;

//   useEffect(() => {
//     let mounted = true;

//     async function loadMeetings() {
//       try {
//         const { data } = await apiClient.get("/meetings/my");
//         if (mounted) {
//           setMeetings(data.meetings || []);
//         }
//       } catch (loadError) {
//         if (mounted) {
//           setError(loadError?.response?.data?.error || "Unable to load meetings");
//         }
//       } finally {
//         if (mounted) {
//           setLoading(false);
//         }
//       }
//     }

//     if (session?.role) {
//       loadMeetings();
//     }

//     return () => {
//       mounted = false;
//     };
//   }, [session?.role, eventVersion]);

//   // Unified items calculation with filtering and sorting
//   const items = useMemo(() => {
//     const meetingItems = meetings.map((item) => ({
//       ...item,
//       itemType: "meeting",
//       primaryTitle: item.title,
//       primaryId: item.requestId || item.id, // Fallback to id if requestId isn't present
//     })).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

//     return meetingItems.filter((item) => {
//       const statusObj = meetingStatus(item);
//       const statusOk = filters.status === "all" || statusObj.value === filters.status;
//       const q = filters.q.trim().toLowerCase();

//       const searchText = [
//         item.primaryTitle,
//         item.primaryId,
//         item.purpose,
//         statusObj.label,
//         item.scheduled_location,
//       ].filter(Boolean).join(" ").toLowerCase();

//       return statusOk && (!q || searchText.includes(q));
//     });
//   }, [meetings, filters]);

//   // Pagination Math
//   const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
//   const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   // Dynamic Status Options for the dropdown
//   const statusOptions = useMemo(() => {
//     return Array.from(new Set(meetings.map((item) => item.status).filter(Boolean))).sort();
//   }, [meetings]);

//   return (
//     <div
//       style={{
//         height: pageHeight,
//         overflow: "hidden",
//         padding: "20px 20px 0",
//         display: "flex",
//         flexDirection: "column",
//       }}
//     >
//       <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
//         <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
//           <Calendar size={20} style={{ color: C.purple, flexShrink: 0 }} />
//           <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>MY MEETINGS</h1>
//         </div>

//         <div style={{ marginBottom: 20 }}>
//           <div className="grid md:grid-cols-2 gap-3">
//             <div className="relative">
//               <Search className="absolute left-3 top-3" size={18} style={{ color: C.t3 }} />
//               <WorkspaceInput
//                 value={filters.q}
//                 onChange={(event) => {
//                   setFilters((current) => ({ ...current, q: event.target.value }));
//                   setCurrentPage(1);
//                 }}
//                 placeholder="Search title, purpose, location..."
//                 style={{ paddingLeft: 38 }}
//               />
//             </div>
//             <div className="relative">
//               <Filter className="absolute left-3 top-3" size={18} style={{ color: C.t3 }} />
//               <WorkspaceSelect
//                 value={filters.status}
//                 onChange={(event) => {
//                   setFilters((current) => ({ ...current, status: event.target.value }));
//                   setCurrentPage(1);
//                 }}
//                 style={{ paddingLeft: 38 }}
//               >
//                 <option value="all">All status</option>
//                 {statusOptions.map((status) => (
//                   <option key={status} value={status}>
//                     {status.replace(/_/g, " ").charAt(0).toUpperCase() + status.replace(/_/g, " ").slice(1)}
//                   </option>
//                 ))}
//               </WorkspaceSelect>
//             </div>
//           </div>
//         </div>

//         <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
//           {loading && <WorkspaceEmptyState title="Loading your meetings..." />}
//           {error && <div style={{ color: C.danger, padding: "12px 0" }}>{error}</div>}

//           {!loading && !error && (
//             <>
//               {items.length === 0 ? (
//                 <WorkspaceEmptyState title="No meeting requests found" subtitle="Try adjusting your filters." />
//               ) : (
//                 <>
//                   <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
//                     <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
//                       <colgroup>
//                         <col style={{ width: "14.28%" }} />
//                         <col style={{ width: "14.28%" }} />
//                         <col style={{ width: "14.28%" }} />
//                         <col style={{ width: "14.28%" }} />
//                         <col style={{ width: "14.28%" }} />
//                         <col style={{ width: "14.28%" }} />
//                         <col style={{ width: "14.28%" }} />
//                       </colgroup>
//                       <thead>
//                         <tr>
//                           <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Meeting ID</th>
//                           <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Meeting Title</th>
//                           <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Created At</th>
//                           <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Scheduled Time</th>
//                           <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Location</th>
//                           <th style={{ width: "1%", padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Status</th>
//                           <th style={{ width: "1%", padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Action</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {paginatedItems.map((item, index) => {
//                           const statusObj = meetingStatus(item);
//                           const scheduledTimeLabel = item.scheduled_at ? new Date(item.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
//                           const createdAtLabel = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "--";
//                           const locationLabel = item.scheduled_location || "-";
//                           const isActionHovered = hoveredActionId === item.id;

//                           const rowBackground = index % 2 === 0 ? C.card : alternateRowBackground;

//                           return (
//                             <tr key={`${item.itemType}-${item.id}`} style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBackground, verticalAlign: "middle" }}>
//                               <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
//                                 <span title={toTooltipText(item.primaryId || "-")} style={{ display: "block", whiteSpace: "nowrap" }}>
//                                   {item.primaryId || "-"}
//                                 </span>
//                               </td>
//                               <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 0 }}>
//                                 <span title={toTooltipText(item.primaryTitle)} style={{ ...tableCellTextStyle, fontSize: 13, fontWeight: 600, color: C.t1 }}>
//                                   {item.primaryTitle}
//                                 </span>
//                               </td>
//                               <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
//                                 <span title={toTooltipText(createdAtLabel)} style={tableCellTextStyle}>
//                                   {createdAtLabel}
//                                 </span>
//                               </td>
//                               <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
//                                 <span title={toTooltipText(scheduledTimeLabel)} style={tableCellTextStyle}>
//                                   {scheduledTimeLabel}
//                                 </span>
//                               </td>
//                               <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
//                                 <span title={toTooltipText(locationLabel)} style={tableCellTextStyle}>
//                                   {locationLabel}
//                                 </span>
//                               </td>
//                               <td style={{ width: "1%", padding: "10px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
//                                 <WorkspaceBadge status={statusObj.value}>{statusObj.label}</WorkspaceBadge>
//                               </td>
//                               <td style={{ width: "1%", padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
//                                 <button
//                                   type="button"
//                                   onMouseEnter={() => setHoveredActionId(item.id)}
//                                   onMouseLeave={() => setHoveredActionId(null)}
//                                   onClick={() => navigate(`/citizen/meetings/${item.id}`, { state: { meetingData: item, itemType: item.itemType } })}
//                                   title="View details"
//                                   style={{
//                                     minWidth: 0,
//                                     padding: 7,
//                                     borderRadius: 10,
//                                     border: `1px solid ${C.purple}`,
//                                     background: isActionHovered ? C.purple : "transparent",
//                                     color: isActionHovered ? "#ffffff" : C.purple,
//                                     display: "inline-flex",
//                                     alignItems: "center",
//                                     justifyContent: "center",
//                                     cursor: "pointer",
//                                     transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease, border-color var(--portal-duration-fast) ease",
//                                   }}
//                                 >
//                                   <Eye size={18} />
//                                 </button>
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>

//                     <div style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}`, margin: "0 0 8px" }}>
//                       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-3.5">
//                         <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>
//                           Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, items.length)}</span>-<span className="font-semibold">{Math.min(currentPage * itemsPerPage, items.length)}</span> of <span className="font-semibold">{items.length}</span> requests
//                         </p>

//                         {totalPages > 1 && (
//                           <div className="flex items-center gap-2 flex-wrap">
//                             <WorkspaceButton
//                               onMouseEnter={() => setHoveredPagerButton("previous")}
//                               onMouseLeave={() => setHoveredPagerButton(null)}
//                               onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
//                               disabled={currentPage === 1}
//                               variant="outline"
//                               style={{ width: 92, minHeight: 34, padding: "8px 12px", fontSize: 12, background: hoveredPagerButton === "previous" && currentPage !== 1 ? C.purple : "transparent", color: hoveredPagerButton === "previous" && currentPage !== 1 ? "#ffffff" : C.purple, border: `1px solid ${C.purple}`, opacity: currentPage === 1 ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
//                             >
//                               <ChevronLeft size={16} /> Previous
//                             </WorkspaceButton>

//                             <span style={{ padding: "6px 10px", fontSize: 12, color: C.t3 }}>
//                               Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
//                             </span>

//                             <WorkspaceButton
//                               onMouseEnter={() => setHoveredPagerButton("next")}
//                               onMouseLeave={() => setHoveredPagerButton(null)}
//                               onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
//                               disabled={currentPage === totalPages}
//                               variant="outline"
//                               style={{ width: 92, minHeight: 34, padding: "8px 12px", fontSize: 12, background: hoveredPagerButton === "next" && currentPage !== totalPages ? C.purple : "transparent", color: hoveredPagerButton === "next" && currentPage !== totalPages ? "#ffffff" : C.purple, border: `1px solid ${C.purple}`, opacity: currentPage === totalPages ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
//                             >
//                               Next <ChevronRight size={16} />
//                             </WorkspaceButton>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="lg:hidden space-y-3">
//                     {paginatedItems.map((item) => {
//                       const statusObj = meetingStatus(item);
//                       const scheduledTimeLabel = item.scheduled_at ? new Date(item.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
//                       const locationLabel = item.scheduled_location || "-";
//                       const createdAtLabel = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "--";

//                       return (
//                         <div key={`${item.itemType}-${item.id}`} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, background: C.card }}>
//                           <div className="flex items-start justify-between gap-3 mb-3">
//                             <div className="flex-1">
//                               <div style={{ fontSize: 11, color: C.t3, marginBottom: 6, fontWeight: 600 }}>
//                                 Meeting ID: {item.primaryId || "-"}
//                               </div>
//                               <h3 style={{ margin: 0, fontWeight: 700, color: C.t1, lineHeight: 1.5, wordBreak: "break-word" }}>{item.primaryTitle}</h3>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <WorkspaceBadge status={statusObj.value}>{statusObj.label}</WorkspaceBadge>
//                             </div>
//                           </div>

//                           <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
//                             <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
//                               <p style={{ margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, fontWeight: 600 }}>Created At</p>
//                               <p style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{createdAtLabel}</p>
//                             </div>
//                             <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
//                               <p style={{ margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, fontWeight: 600 }}>Scheduled Time</p>
//                               <p style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{scheduledTimeLabel}</p>
//                             </div>
//                             <div className="col-span-2" style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
//                               <p style={{ margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, fontWeight: 600 }}>Location</p>
//                               <p style={{ margin: 0, color: C.t2, fontWeight: 600 }}>{locationLabel}</p>
//                             </div>
//                           </div>

//                           <WorkspaceButton
//                             type="button"
//                             onClick={() => navigate(`/citizen/meetings/${item.id}`, { state: { meetingData: item, itemType: item.itemType } })}
//                             variant="outline"
//                             style={{ width: "100%" }}
//                           >
//                             <Eye size={16} /> View Details
//                           </WorkspaceButton>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </>
//               )}
//             </>
//           )}
//         </div>

//       </div>
//     </div>
//   );
// }
