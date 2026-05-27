import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react";
import { FiClipboard } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function humanizeStatus(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isResolvedGrievance(status) {
  return status === "resolved" || status === "completed" || status === "closed";
}

function isResolvedAppointment(status) {
  return status === "completed" || status === "cancelled" || status === "rejected";
}

function grievanceRow(item) {
  return {
    id: item.id,
    itemType: "grievance",
    primaryId: item.grievanceId || item.id,
    title: item.title || item.subject || "Untitled Grievance",
    category: item.grievanceType || "-",
    citizenName: item.citizenSnapshot?.name || "-",
    citizenId: item.citizenSnapshot?.citizenId || "-",
    incidentDate: item.incidentDate || item.incident_date || "",
    owner: item.currentOwner || "Admin Pool",
    reference: item.relatedAppointment?.requestId || item.department || "-",
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.updatedAt || item.updated_at,
    status: item.status,
    statusLabel: item.statusLabel || humanizeStatus(item.status),
    route: `/admin/cases/${item.id}`,
  };
}

function appointmentRow(item) {
  return {
    id: item.id,
    itemType: "appointment",
    primaryId: item.requestId || item.id,
    title: item.title || item.purpose || "Untitled Appointment",
    citizenName: item.citizenSnapshot?.name || "-",
    citizenId: item.citizenSnapshot?.citizenId || "-",
    state: item.citizenSnapshot?.state || "-",
    district: item.citizenSnapshot?.district || "-",
    owner: item.currentOwner || "Admin Queue",
    reference: item.relatedGrievance?.grievanceId || item.visitorId || item.appointmentDocket || "-",
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.completedAt || item.completed_at || item.updatedAt || item.updated_at,
    preferredTime: item.preferred_time || "",
    status: item.status,
    statusLabel: humanizeStatus(item.status),
    route: `/admin/appointments/${item.id}`,
  };
}

function buildItemRoute(item, tab) {
  const sourceMap = {
    grievancePool: "grievance-pool",
    appointmentPool: "appointment-pool",
    myCases: "my-cases",
    resolvedGrievances: "resolved-grievances",
    completedAppointments: "completed-appointments",
  };
  const source = sourceMap[tab];
  return source ? `${item.route}?source=${source}` : item.route;
}

function buildWorkQueueTabSearch(tab) {
  const tabMap = {
    grievancePool: "grievance-pool",
    appointmentPool: "appointment-pool",
    resolvedGrievances: "resolved-grievances",
    completedAppointments: "completed-appointments",
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

const grievancePoolColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  title: { width: "38%" },
  category: { width: "18%" },
  citizen: { width: "16%" },
  incidentDate: { width: 132, minWidth: 132, maxWidth: 132 },
  createdAt: { width: 112, minWidth: 112, maxWidth: 112 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};


const resolvedGrievancesColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  title: { width: "38%" },
  category: { width: "18%" },
  citizen: { width: "18%" },
  createdAt: { width: 118, minWidth: 118, maxWidth: 118 },
  action: { width: 84, minWidth: 84, maxWidth: 84 },
};

const completedAppointmentsColumnStyles = {
  primaryId: { width: 180, minWidth: 180, maxWidth: 180 },
  title: { width: "30%" },
  citizen: { width: "14%" },
  state: { width: "10%" },
  district: { width: "10%" },
  createdAt: { width: 118, minWidth: 118, maxWidth: 118 },
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
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[parsedDate.getMonth()];
  const year = String(parsedDate.getFullYear()).slice(-2);
  return `${day} ${mon},${year}`;
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
  const day = String(parsed.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[parsed.getMonth()];
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day} ${mon},${year}`;
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.bgElevated : "#F7F1FF";
  const [grievances, setGrievances] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("appointmentPool");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preferredDateFilter, setPreferredDateFilter] = useState("");
  const [incidentDateFilter, setIncidentDateFilter] = useState("");
  const [createdAtFilter, setCreatedAtFilter] = useState("");
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
        setGrievances(Array.isArray(response.data?.grievances) ? response.data.grievances : []);
        setAppointments(Array.isArray(response.data?.appointments) ? response.data.appointments : []);
      } catch (loadError) {
        if (active) setError(loadError?.response?.data?.error || "Unable to load work queue");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadQueue();
    return () => { active = false; };
  }, [session?.role]);

  const grievancePool = grievances.filter((item) => !item.assignedAdminUserId && !isResolvedGrievance(item.status)).map(grievanceRow);
  const appointmentPool = appointments.filter((item) => !item.assignedAdminUserId && !isResolvedAppointment(item.status)).map(appointmentRow);
  const resolvedGrievances = grievances.filter((item) => item.status === "resolved").map(grievanceRow);
  const completedAppointments = appointments.filter((item) => item.status === "completed" && item.assignedAdminUserId === session?.user?.id).map(appointmentRow);
  const sections = { grievancePool, appointmentPool, resolvedGrievances, completedAppointments };
  const today = formatDateValue(new Date());
  const isAppointmentPoolTab = tab === "appointmentPool";
  const isGrievancePoolTab = tab === "grievancePool";
  const isResolvedGrievancesTab = tab === "resolvedGrievances";
  const isCompletedAppointmentsTab = tab === "completedAppointments";

  const activeRows = (sections[tab] || []).filter((item) => {
    const matchesStatus = isAppointmentPoolTab || isGrievancePoolTab || isResolvedGrievancesTab || isCompletedAppointmentsTab ? true : statusFilter === "all" || item.status === statusFilter;
    const haystack = isGrievancePoolTab
      ? [item.primaryId, item.title, item.category, item.citizenName, item.citizenId].filter(Boolean).join(" ").toLowerCase()
      : isResolvedGrievancesTab
        ? [item.primaryId, item.title, item.category, item.citizenName].filter(Boolean).join(" ").toLowerCase()
      : isCompletedAppointmentsTab
        ? [item.primaryId, item.title, item.citizenName].filter(Boolean).join(" ").toLowerCase()
      : [item.primaryId, item.itemType, item.title, item.citizenName, item.citizenId, item.owner, item.reference, item.statusLabel].filter(Boolean).join(" ").toLowerCase();
    const search = query.trim().toLowerCase();
    const matchesPreferredDate = !preferredDateFilter || getDateOnlyValue(item.preferredTime) === preferredDateFilter;
    const matchesIncidentDate = !incidentDateFilter || getDateOnlyValue(item.incidentDate) === incidentDateFilter;
    const matchesCreatedAt = !createdAtFilter || getDateOnlyValue(item.createdAt) === createdAtFilter;
    const matchesDateFilters = isAppointmentPoolTab
      ? matchesPreferredDate && matchesCreatedAt
      : isGrievancePoolTab
        ? matchesIncidentDate && matchesCreatedAt
        : isResolvedGrievancesTab || isCompletedAppointmentsTab
          ? matchesCreatedAt
          : true;
    return matchesStatus && (!search || haystack.includes(search)) && matchesDateFilters;
  });

  useEffect(() => { setCurrentPage(1); }, [tab, query, statusFilter, preferredDateFilter, incidentDateFilter, createdAtFilter, itemsPerPage]);

  const totalPages    = Math.max(1, Math.ceil(activeRows.length / itemsPerPage));
  const paginatedRows = activeRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);
  const statusOptions = Array.from(new Set((sections[tab] || []).map((item) => item.status).filter(Boolean))).sort();

  const tabs = [
    { id: "appointmentPool", label: t("admin.workQueue.totalAppointmentsInPool"), count: appointmentPool.length },
    { id: "resolvedGrievances", label: t("admin.workQueue.resolvedGrievances"), count: resolvedGrievances.length },
    { id: "completedAppointments", label: t("admin.workQueue.completedAppointments"), count: completedAppointments.length },
  ];
  const workPoolTabs = tabs.filter((item) => item.id === "appointmentPool");
  const isResolvedGrievancesPage = requestedTab === "resolved-grievances";
  const isCompletedAppointmentsPage = requestedTab === "completed-appointments";
  const showWorkPoolCards = !isResolvedGrievancesPage && !isCompletedAppointmentsPage;

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
  }, [tab]);

  useEffect(() => {
    if (requestedTab === "appointment-pool" && tab !== "appointmentPool") {
      setTab("appointmentPool");
      setTabInitialized(true);
      return;
    }
    if (requestedTab === "resolved-grievances" && tab !== "resolvedGrievances") {
      setTab("resolvedGrievances");
      setTabInitialized(true);
      return;
    }
    if (requestedTab === "completed-appointments" && tab !== "completedAppointments") {
      setTab("completedAppointments");
      setTabInitialized(true);
      return;
    }
    if (!requestedTab && !tabInitialized) {
      if (tab !== "appointmentPool") {
        setTab("appointmentPool");
      }
      setTabInitialized(true);
      return;
    }
    if (!requestedTab && (tab === "resolvedGrievances" || tab === "completedAppointments")) {
      setTab("appointmentPool");
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
    if (isGrievancePoolTab) {
      return [
        { key: "primaryId", label: t("admin.workQueue.colGrievanceId"), align: "left" },
        { key: "title", label: t("admin.workQueue.colTitle"), align: "left" },
        { key: "category", label: t("admin.workQueue.colCategory"), align: "left" },
        { key: "citizen", label: t("admin.workQueue.colCitizenName"), align: "left" },
        { key: "incidentDate", label: t("admin.workQueue.colIncidentDate"), align: "left" },
        { key: "createdAt", label: t("admin.workQueue.colCreatedAt"), align: "left" },
        { key: "action", label: t("admin.workQueue.colAction"), align: "center" },
      ];
    }

    if (isResolvedGrievancesTab) {
      return [
        { key: "primaryId", label: t("admin.workQueue.colGrievanceId"), align: "left" },
        { key: "title", label: t("admin.workQueue.colTitle"), align: "left" },
        { key: "category", label: t("admin.workQueue.colCategory"), align: "left" },
        { key: "citizen", label: t("admin.workQueue.colCitizenName"), align: "left" },
        { key: "createdAt", label: t("admin.workQueue.colCreatedAt"), align: "left" },
        { key: "action", label: t("admin.workQueue.colAction"), align: "center" },
      ];
    }

    if (isCompletedAppointmentsTab) {
      return [
        { key: "primaryId", label: t("admin.workQueue.colAppointmentId"), align: "left" },
        { key: "title", label: t("admin.workQueue.colTitle"), align: "left" },
        { key: "citizen", label: t("admin.workQueue.colCitizenName"), align: "left" },
        { key: "state", label: t("admin.workQueue.colState"), align: "left" },
        { key: "district", label: t("admin.workQueue.colDistrict"), align: "left" },
        { key: "createdAt", label: t("admin.workQueue.colCreatedAt"), align: "left" },
        { key: "action", label: t("admin.workQueue.colAction"), align: "center" },
      ];
    }

    const baseColumns = [
      { key: "primaryId", label: t("admin.workQueue.colId"), align: "left" },
      { key: "itemType", label: t("admin.workQueue.colType"), align: "left" },
      { key: "title", label: t("admin.workQueue.colTitle"), align: "left" },
      { key: "citizen", label: t("admin.workQueue.colCitizen"), align: "left" },
      { key: "owner", label: t("admin.workQueue.colOwner"), align: "left" },
      { key: "reference", label: t("admin.workQueue.colReference"), align: "left" },
      { key: "createdAt", label: t("admin.workQueue.colCreated"), align: "left" },
      { key: "status", label: t("admin.workQueue.colStatus"), align: "center" },
      { key: "action", label: t("admin.workQueue.colAction"), align: "center" },
    ];

    const hiddenColumns = {
      grievancePool: new Set(["itemType", "owner", "status"]),
      appointmentPool: new Set(["itemType", "owner", "status"]),
      resolvedGrievances: new Set(["owner"]),
      completedAppointments: new Set(["owner"]),
    };

    return baseColumns.filter((column) => !hiddenColumns[tab]?.has(column.key));
  }, [isGrievancePoolTab, isResolvedGrievancesTab, isCompletedAppointmentsTab, tab]);

  const appointmentPoolColumns = useMemo(() => ([
    { key: "primaryId", label: t("admin.workQueue.colAppointmentId") },
    { key: "title", label: t("admin.workQueue.colTitle") },
    { key: "citizen", label: t("admin.workQueue.colCitizenName") },
    { key: "state", label: t("admin.workQueue.colState") },
    { key: "district", label: t("admin.workQueue.colDistrict") },
    { key: "createdAt", label: t("admin.workQueue.colCreatedAt") },
    { key: "action", label: t("admin.workQueue.colAction") },
  ]), [t]);

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
        {isResolvedGrievancesPage || isCompletedAppointmentsPage ? (
          <WorkspaceSectionHeader
            title={
              isResolvedGrievancesPage
                ? t("admin.workQueue.resolvedGrievancesHeader")
                : t("admin.workQueue.completedAppointmentsHeader")
            }
          />
        ) : (
          <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <FiClipboard size={18} color={C.purple} />
            <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>{t("admin.workQueue.appointmentPoolHeader")}</h1>
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
              <div style={{ marginLeft: "auto", width: "50%", minWidth: 520, display: "grid", gap: 12, gridTemplateColumns: isResolvedGrievancesTab || isCompletedAppointmentsTab ? "minmax(0, 3fr)" : isGrievancePoolTab || isAppointmentPoolTab ? "minmax(280px, 3fr) minmax(140px, 1fr) minmax(140px, 1fr)" : "minmax(0, 1.6fr) minmax(220px, 0.8fr)" }}>
              <div className={isGrievancePoolTab || isAppointmentPoolTab ? "relative" : undefined}>
                {isGrievancePoolTab || isAppointmentPoolTab ? <Search className="absolute left-3 top-2.5" size={17} style={{ color: C.t3 }} /> : null}
                <WorkspaceInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isAppointmentPoolTab ? t("admin.workQueue.searchByAppointment") : isGrievancePoolTab ? t("admin.workQueue.searchByGrievance") : isResolvedGrievancesTab ? t("admin.workQueue.searchByGrievance") : isCompletedAppointmentsTab ? t("admin.workQueue.searchByAppointment") : t("admin.workQueue.searchByAll")}
                  style={
                    isGrievancePoolTab || isAppointmentPoolTab
                      ? { paddingLeft: 36, minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }
                      : isResolvedGrievancesTab || isCompletedAppointmentsTab
                        ? { minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }
                        : undefined
                  }
                />
              </div>
              {isResolvedGrievancesTab || isCompletedAppointmentsTab ? null : isAppointmentPoolTab || isGrievancePoolTab ? (
                <>
                  <CustomDateFilter
                    value={isAppointmentPoolTab ? preferredDateFilter : incidentDateFilter}
                    onChange={isAppointmentPoolTab ? setPreferredDateFilter : setIncidentDateFilter}
                    placeholder={isAppointmentPoolTab ? t("admin.workQueue.preferredDate") : t("admin.workQueue.incidentDate")}
                    max={today}
                  />
                  {isGrievancePoolTab ? (
                    <CustomDateFilter
                      value={createdAtFilter}
                      onChange={setCreatedAtFilter}
                      placeholder={t("admin.workQueue.createdAt_filter")}
                      max={today}
                    />
                  ) : (
                    <CustomDateFilter
                      value={createdAtFilter}
                      onChange={setCreatedAtFilter}
                      placeholder={t("admin.workQueue.createdAt_filter")}
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
                    <option value="all">{t("admin.workQueue.allStatuses")}</option>
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
            <WorkspaceEmptyState title={t("admin.workQueue.loadingWorkQueue")} />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger, marginBottom: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t("admin.workQueue.unableToLoad")}</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>{error}</div>
            </WorkspaceCard>
          ) : activeRows.length === 0 ? (
            <WorkspaceEmptyState title={t("admin.workQueue.noItems")} subtitle={t("admin.workQueue.noItemsSubtitle")} />
          ) : (
            <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", marginBottom: 10 }}>
                {isAppointmentPoolTab ? (
                  <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: 180, minWidth: 180, maxWidth: 180 }} />
                      <col style={{ width: "34%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: 118, minWidth: 118, maxWidth: 118 }} />
                      <col style={{ width: 84, minWidth: 84, maxWidth: 84 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {appointmentPoolColumns.map((column, index) => (
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
                              borderTopRightRadius: index === appointmentPoolColumns.length - 1 ? 12 : undefined,
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
                              <span title={toTooltipText(item.state)} style={tableCellTextStyle}>
                                {item.state}
                              </span>
                            </td>
                            <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", minWidth: 0, maxWidth: 0 }}>
                              <span title={toTooltipText(item.district)} style={tableCellTextStyle}>
                                {item.district}
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
                  <table className="w-full text-sm" style={isGrievancePoolTab || isResolvedGrievancesTab || isCompletedAppointmentsTab ? { borderCollapse: "collapse", tableLayout: "fixed" } : { borderCollapse: "collapse" }}>
                    <colgroup>
                      {isGrievancePoolTab
                        ? columns.map((column) => <col key={column.key} style={grievancePoolColumnStyles[column.key]} />)
                        : isResolvedGrievancesTab
                          ? columns.map((column) => <col key={column.key} style={resolvedGrievancesColumnStyles[column.key]} />)
                          : isCompletedAppointmentsTab
                            ? columns.map((column) => <col key={column.key} style={completedAppointmentsColumnStyles[column.key]} />)
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
                            const itemTypeLabel = item.itemType === "grievance" ? "Grievance" : item.itemType === "appointment" ? "Appointment" : item.itemType;
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

                          if (column.key === "state") {
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(item.state)} style={tableCellTextStyle}>
                                  {item.state}
                                </span>
                              </td>
                            );
                          }

                          if (column.key === "district") {
                            return (
                              <td key={column.key} style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                                <span title={toTooltipText(item.district)} style={tableCellTextStyle}>
                                  {item.district}
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
