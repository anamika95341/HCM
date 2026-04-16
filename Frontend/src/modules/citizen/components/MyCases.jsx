import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, FileText, Search, Filter, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { useNotifications } from "../../../shared/notifications/NotificationContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function citizenStatus(item) {
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

function getIncidentDateValue(item) {
  return item.incidentDate || item.incident_date || item.dateOfIncident || item.date_of_incident || "";
}

function getIncidentDateOnlyValue(item) {
  const rawValue = getIncidentDateValue(item);
  if (!rawValue) return "";
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateValue(parsed);
}

function formatIncidentDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB");
}

function CustomDateFilter({ value, onChange, placeholder, max }) {
  const { C } = usePortalTheme();
  const [isOpen, setIsOpen] = useState(false);
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
      const pickerRoot = event.target.closest?.('[data-citizen-complaint-date-filter="true"]');
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
    <div ref={rootRef} data-citizen-complaint-date-filter="true" style={{ position: "relative", width: "100%" }}>
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
  width: "26%",
};

const categoryColumnStyle = {
  width: "19%",
};

const locationColumnStyle = {
  width: "16%",
};

const incidentDateColumnStyle = {
  width: 128,
  minWidth: 128,
  maxWidth: 128,
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

export default function MyCases() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { eventVersion } = useNotifications();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.card : "#F7F1FF";
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [filters, setFilters] = useState({ q: "", incidentDate: "", status: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const todayDate = formatDateValue(new Date());

  useEffect(() => {
    let mounted = true;

    async function loadCases() {
      try {
        const { data: response } = await apiClient.get("/citizen/my-cases");
        if (mounted) {
          setComplaints(response.complaints || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load your complaints");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.role) {
      loadCases();
    }

    return () => {
      mounted = false;
    };
  }, [session?.role, eventVersion]);

  const items = useMemo(() => {
    const complaintItems = complaints.map((item) => ({
      ...item,
      itemType: "complaint",
      primaryTitle: item.title || item.subject,
      primaryId: item.complaintId,
    })).sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0) - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0));

    return complaintItems.filter((item) => {
      const status = citizenStatus(item);
      const statusOk = filters.status === "all" || status.value === filters.status;
      const incidentDateOk = !filters.incidentDate || getIncidentDateOnlyValue(item) === filters.incidentDate;
      const q = filters.q.trim().toLowerCase();
      const searchText = [
        item.primaryTitle,
        item.primaryId,
        item.complaintType,
        item.complaintLocation,
      ].filter(Boolean).join(" ").toLowerCase();
      return statusOk && incidentDateOk && (!q || searchText.includes(q));
    });
  }, [complaints, filters]);

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(complaints.map((item) => item.status).filter(Boolean))).sort();
  }, [complaints]);

  return (
    <div
      className="portal-citizen-page"
      style={{
        minHeight: "100%",
        padding: "20px 20px 12px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={20} style={{ color: C.purple, flexShrink: 0 }} />
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>MY COMPLAINTS</h1>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="grid gap-3 md:grid-cols-[3fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-3" size={18} style={{ color: C.t3 }} />
              <WorkspaceInput
                value={filters.q}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, q: event.target.value }));
                  setCurrentPage(1);
                }}
                placeholder=" Search by Complaint Id , Title , Category and Location"
                style={{ paddingLeft: 38 }}
              />
            </div>
            <CustomDateFilter
              value={filters.incidentDate}
              onChange={(nextValue) => {
                setFilters((current) => ({ ...current, incidentDate: nextValue }));
                setCurrentPage(1);
              }}
              placeholder="Date of Incident"
              max={todayDate}
            />
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
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {loading && (
            <WorkspaceEmptyState title="Loading your complaints..." />
          )}

          {error && <div style={{ color: C.danger, padding: "12px 0" }}>{error}</div>}

          {!loading && !error && (
            <>
              {items.length === 0 ? (
                <WorkspaceEmptyState title="No complaints found" subtitle="Try adjusting your filters." />
              ) : (
                <>
                  <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <colgroup>
                        <col style={idColumnStyle} />
                        <col style={titleColumnStyle} />
                        <col style={categoryColumnStyle} />
                        <col style={locationColumnStyle} />
                        <col style={incidentDateColumnStyle} />
                        <col style={statusColumnStyle} />
                        <col style={actionColumnStyle} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Complaint ID</th>
                          <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Title</th>
                          <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Category</th>
                          <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Location</th>
                          <th style={{ padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Date of Incident</th>
                          <th style={{ width: "1%", padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Status</th>
                          <th style={{ width: "1%", padding: "13px 16px", fontSize: 10, fontWeight: 600, color: tableHeaderText, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", whiteSpace: "nowrap", background: tableHeaderBackground, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item, index) => {
                          const status = citizenStatus(item);
                          const categoryLabel = item.complaintType || "-";
                          const locationLabel = item.complaintLocation || "-";
                          const incidentDateLabel = formatIncidentDate(getIncidentDateValue(item));
                          const rowBackground = index % 2 === 0 ? C.card : alternateRowBackground;
                          const isActionHovered = hoveredActionId === item._id;

                          return (
                            <tr key={`${item.itemType}-${item._id}`} style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBackground, verticalAlign: "middle" }}>
                              <td style={{ padding: "10px 16px", verticalAlign: "middle" }}>
                                <span title={toTooltipText(item.primaryId)} style={{ ...tableCellTextStyle, fontWeight: 600, color: C.purple, fontSize: 13 }}>
                                  {item.primaryId}
                                </span>
                              </td>
                              <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 0 }}>
                                <div title={toTooltipText(item.primaryTitle)} style={{ ...tableCellTextStyle, fontSize: 13, fontWeight: 600, color: C.t1, margin: 0 }}>
                                  {item.primaryTitle}
                                </div>
                              </td>
                              <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                                <span title={toTooltipText(categoryLabel)} style={tableCellTextStyle}>
                                  {categoryLabel}
                                </span>
                              </td>
                              <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle" }}>
                                <span title={toTooltipText(locationLabel)} style={tableCellTextStyle}>
                                  {locationLabel}
                                </span>
                              </td>
                              <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                <span title={toTooltipText(incidentDateLabel || "--")} style={tableCellTextStyle}>
                                  {incidentDateLabel || "--"}
                                </span>
                              </td>
                              <td style={{ width: "1%", padding: "10px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                <WorkspaceBadge status={status.value} title={status.label} style={{ maxWidth: "100%" }}>{status.label}</WorkspaceBadge>
                              </td>
                              <td style={{ width: "1%", padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                <button
                                  type="button"
                                  onMouseEnter={() => setHoveredActionId(item._id)}
                                  onMouseLeave={() => setHoveredActionId(null)}
                                  onClick={() => navigate(`/citizen/cases/${item._id}`, { state: { caseData: item, itemType: item.itemType } })}
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

                    <div className="portal-citizen-table-footer" style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-3.5">
                        <p className="portal-citizen-caption" style={{ color: C.t2, margin: 0 }}>
                          Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, items.length)}</span>-<span className="font-semibold">{Math.min(currentPage * itemsPerPage, items.length)}</span> of <span className="font-semibold">{items.length}</span> requests
                        </p>

                        {totalPages > 1 && (
                          <div className="portal-citizen-pager flex items-center gap-2 flex-wrap">
                            <WorkspaceButton
                              className="portal-citizen-pager-btn"
                              onMouseEnter={() => setHoveredPagerButton("previous")}
                              onMouseLeave={() => setHoveredPagerButton(null)}
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              variant="outline"
                              style={{ minHeight: 34, padding: "8px 12px", fontSize: 12, background: hoveredPagerButton === "previous" && currentPage !== 1 ? C.purple : "transparent", color: hoveredPagerButton === "previous" && currentPage !== 1 ? "#ffffff" : C.purple, border: `1px solid ${C.purple}`, opacity: currentPage === 1 ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              <ChevronLeft size={16} /> Previous
                            </WorkspaceButton>

                            <span className="portal-citizen-caption" style={{ padding: "6px 10px", color: C.t3 }}>
                              Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                            </span>

                            <WorkspaceButton
                              className="portal-citizen-pager-btn"
                              onMouseEnter={() => setHoveredPagerButton("next")}
                              onMouseLeave={() => setHoveredPagerButton(null)}
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              variant="outline"
                              style={{ minHeight: 34, padding: "8px 12px", fontSize: 12, background: hoveredPagerButton === "next" && currentPage !== totalPages ? C.purple : "transparent", color: hoveredPagerButton === "next" && currentPage !== totalPages ? "#ffffff" : C.purple, border: `1px solid ${C.purple}`, opacity: currentPage === totalPages ? 0.4 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              Next <ChevronRight size={16} />
                            </WorkspaceButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:hidden space-y-3 pb-2">
                    {paginatedItems.map((item) => {
                      const status = citizenStatus(item);
                      const categoryLabel = item.complaintType || "-";
                      const locationLabel = item.complaintLocation || "-";
                      const incidentDateLabel = formatIncidentDate(getIncidentDateValue(item));

                      return (
                        <WorkspaceCard key={`${item.itemType}-${item._id}`} style={{ padding: 16 }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <p className="portal-citizen-label" style={{ textTransform: "uppercase", color: C.t3, marginBottom: 4 }}>{item.primaryId}</p>
                              <h3 style={{ fontWeight: 700, color: C.t1 }}>{item.primaryTitle}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <WorkspaceBadge status={status.value}>{status.label}</WorkspaceBadge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 mb-3 text-xs">
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p className="portal-citizen-label" style={{ textTransform: "uppercase", color: C.t3, marginBottom: 4 }}>Category</p>
                              <p className="portal-citizen-value" style={{ color: C.t2, fontWeight: 600 }}>{categoryLabel}</p>
                            </div>
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p className="portal-citizen-label" style={{ textTransform: "uppercase", color: C.t3, marginBottom: 4 }}>Location</p>
                              <p className="portal-citizen-value" style={{ color: C.t2, fontWeight: 600 }}>{locationLabel}</p>
                            </div>
                            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                              <p className="portal-citizen-label" style={{ textTransform: "uppercase", color: C.t3, marginBottom: 4 }}>Date of Incident</p>
                              <p className="portal-citizen-value" style={{ color: C.t2, fontWeight: 600 }}>{incidentDateLabel || "--"}</p>
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

      </div>
    </div>
  );
}
