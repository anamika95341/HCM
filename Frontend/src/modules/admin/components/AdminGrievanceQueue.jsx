import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Eye, Filter, Search } from "lucide-react";
import { FiFileText } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHS } from "../../../routes/paths.js";
import { apiClient } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function statusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function grievanceQueueStatus(grievance) {
  if (grievance?.status === "assigned") return "accepted";
  if (["in_review", "call_scheduled", "followup_in_progress"].includes(grievance?.status)) return "grievance_logged";
  return grievance?.status || "";
}

const tableCellTextStyle = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const grievanceQueueGridTemplate = "180px minmax(0, 2fr) minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 0.9fr) 118px 96px 84px";

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

function formatDateOnly(value) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
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
  const { t } = useTranslation();
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
      const pickerRoot = event.target.closest?.('[data-admin-grievance-date-filter="true"]');
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
    <div ref={rootRef} data-admin-grievance-date-filter="true" style={{ position: "relative", width: "100%" }}>
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
            {t("admin.grievanceQueue.clearFilter")}
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

export default function AdminGrievanceQueue() {
  const { C } = usePortalTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.bgElevated : "#F7F1FF";
  const { session } = useAuth();
  const adminId = session?.user?.id;

  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [incidentDateFilter, setIncidentDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [showEntriesFocused, setShowEntriesFocused] = useState(false);

  const isChiefMinister = session?.user?.adminType === "chief_minister";

  useEffect(() => {
    let active = true;

    async function loadGrievanceQueue() {
      if (!session?.role) {
        return;
      }
      try {
        setLoading(true);
        setError("");
        // CM admin fetches all grievances; regular admin would not see this page
        const response = await apiClient.get("/grievances/cm-admin/all");
        if (!active) return;
        setGrievances(Array.isArray(response.data?.grievances) ? response.data.grievances : []);
      } catch (loadError) {
        if (active) {
          setError(loadError?.response?.data?.error || "Unable to load grievance queue");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadGrievanceQueue();
    return () => {
      active = false;
    };
  }, [session?.role]);

  const personalGrievanceQueue = useMemo(
    () => grievances.filter(
      (grievance) => !["completed", "closed"].includes(grievance.status)
    ),
    [grievances]
  );

  const filteredGrievanceQueue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personalGrievanceQueue.filter((grievance) => {
      const haystack = [
        grievance.grievanceId,
        grievance.title,
        grievance.grievanceType,
        grievance.citizenSnapshot?.name,
        grievance.grievanceLocation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus = statusFilter === "all" || grievanceQueueStatus(grievance) === statusFilter;
      const matchesIncidentDate = !incidentDateFilter || getDateOnlyValue(grievance.incidentDate) === incidentDateFilter;
      return matchesSearch && matchesStatus && matchesIncidentDate;
    });
  }, [incidentDateFilter, personalGrievanceQueue, query, statusFilter]);

  const statusOptions = useMemo(
    () => ["accepted", "grievance_logged"],
    []
  );

  const queueStats = useMemo(() => {
    const inReview = personalGrievanceQueue.filter((grievance) => grievance.status === "in_review").length;
    const followup = personalGrievanceQueue.filter((grievance) => grievance.status === "followup_in_progress").length;
    return [
      { label: t("admin.grievanceQueue.myQueue"), value: personalGrievanceQueue.length },
      { label: t("admin.grievanceQueue.inReview"), value: inReview },
      { label: t("admin.grievanceQueue.followUp"), value: followup },
    ];
  }, [personalGrievanceQueue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, incidentDateFilter, personalGrievanceQueue.length, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredGrievanceQueue.length / itemsPerPage));
  const paginatedGrievanceQueue = filteredGrievanceQueue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
        <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <FiFileText size={18} color={C.purple} />
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>{t("admin.grievanceQueue.title")}</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, max-content)",
              gap: 14,
              marginBottom: 14,
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

          <div style={{ marginBottom: 6 }}>
            <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ marginLeft: "auto", width: "50%", minWidth: 520, display: "grid", gap: 12, gridTemplateColumns: "minmax(280px, 3fr) minmax(140px, 1fr) minmax(140px, 1fr)" }}>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5" size={17} style={{ color: C.t3 }} />
                  <WorkspaceInput
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("admin.grievanceQueue.searchPlaceholder")}
                    style={{ paddingLeft: 36, minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }}
                  />
                </div>
                <CustomDateFilter
                  value={incidentDateFilter}
                  onChange={setIncidentDateFilter}
                  placeholder={t("admin.grievanceQueue.datePlaceholder")}
                  max={formatDateValue(new Date())}
                />
                <div className="relative">
                  <Filter className="absolute left-3 top-2.5" size={17} style={{ color: C.t3 }} />
                  <WorkspaceSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ paddingLeft: 36, minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }}>
                    <option value="all">{t("admin.grievanceQueue.allStatuses")}</option>
                      {statusOptions.map((status) => (
                      <option key={status} value={status}>{status === "accepted" ? t("admin.grievanceQueue.accepted") : status === "grievance_logged" ? t("admin.grievanceQueue.grievanceLogged") : statusLabel(status)}</option>
                    ))}
                  </WorkspaceSelect>
                </div>
              </div>
            </div>
          </div>
          

          <div style={{ display: "flex", flexDirection: "column" }}>
          {loading ? (
            <WorkspaceEmptyState title={t("admin.grievanceQueue.loading")} />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
          ) : filteredGrievanceQueue.length === 0 ? (
            <WorkspaceEmptyState title={t("admin.grievanceQueue.noGrievances")} subtitle={t("admin.grievanceQueue.noGrievancesSubtitle")} />
          ) : (
            <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", marginBottom: 10 }}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 160, minWidth: 160, maxWidth: 160 }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: 110, minWidth: 110, maxWidth: 110 }} />
                  <col style={{ width: 120, minWidth: 120, maxWidth: 120 }} />
                  <col style={{ width: 84, minWidth: 84, maxWidth: 84 }} />
                </colgroup>
                <thead>
                  <tr>
                    {[t("admin.grievanceQueue.colGrievanceId"), t("admin.grievanceQueue.colTitle"), t("admin.grievanceQueue.colCitizen"), t("admin.grievanceQueue.colState"), t("admin.grievanceQueue.colDistrict"), t("admin.grievanceQueue.colDate"), t("admin.grievanceQueue.colStatus"), t("admin.grievanceQueue.colAction")].map((column, index, all) => (
                      <th
                        key={column}
                        style={{
                          padding: "13px 16px",
                          fontSize: 10,
                          fontWeight: 600,
                          color: tableHeaderText,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          textAlign: index === 5 || index === 6 || index === 7 ? "center" : "left",
                          whiteSpace: "nowrap",
                          background: tableHeaderBackground,
                          borderBottom: `1px solid ${C.border}`,
                          verticalAlign: "middle",
                          borderTopLeftRadius: index === 0 ? 12 : undefined,
                          borderTopRightRadius: index === all.length - 1 ? 12 : undefined,
                        }}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedGrievanceQueue.map((grievance, index) => {
                    const isActionHovered = hoveredActionId === grievance.id;
                    return (
                      <tr key={grievance.id} style={{ background: index % 2 === 0 ? C.card : alternateRowBackground, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle" }}>
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.t2, verticalAlign: "middle" }}>
                          <span title={grievance.grievanceId || grievance.id} style={{ ...tableCellTextStyle, fontWeight: 600 }}>
                            {grievance.grievanceId || grievance.id}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 0 }}>
                          <div title={toTooltipText(grievance.title || t("admin.grievanceQueue.untitled"))} style={{ fontSize: 13, fontWeight: 600, color: C.t1, ...tableCellTextStyle }}>
                            {grievance.title || t("admin.grievanceQueue.untitled")}
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                          <div title={toTooltipText(grievance.citizenSnapshot?.name || t("admin.grievanceQueue.unknownCitizen"))} style={tableCellTextStyle}>
                            {grievance.citizenSnapshot?.name || t("admin.grievanceQueue.unknownCitizen")}
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                          <div title={toTooltipText(grievance.state || grievance.citizenSnapshot?.state || t("admin.grievanceQueue.notProvided"))} style={tableCellTextStyle}>
                            {grievance.state || grievance.citizenSnapshot?.state || t("admin.grievanceQueue.notProvided")}
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                          <div title={toTooltipText(grievance.district || grievance.citizenSnapshot?.district || t("admin.grievanceQueue.notProvided"))} style={tableCellTextStyle}>
                            {grievance.district || grievance.citizenSnapshot?.district || t("admin.grievanceQueue.notProvided")}
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", textAlign: "center", whiteSpace: "nowrap" }}>
                          <span title={toTooltipText(formatDateOnly(grievance.incidentDate))} style={tableCellTextStyle}>
                            {formatDateOnly(grievance.incidentDate)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle" }}>
                          <div style={{ maxWidth: "100%", overflow: "hidden" }}>
                            <WorkspaceBadge status={grievanceQueueStatus(grievance)} title={statusLabel(grievanceQueueStatus(grievance))} style={{ maxWidth: "100%" }}>
                              {statusLabel(grievanceQueueStatus(grievance))}
                            </WorkspaceBadge>
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            onMouseEnter={() => setHoveredActionId(grievance.id)}
                            onMouseLeave={() => setHoveredActionId(null)}
                            onClick={() => navigate(`${PATHS.admin.cases}/${grievance.id}?source=grievance-queue`)}
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
                      {t("admin.grievanceQueue.show")}
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
                      {t("admin.grievanceQueue.entries")}
                    </span>
                  </div>
                  <p className="portal-citizen-caption md:order-2" style={{ color: C.t2, margin: 0, whiteSpace: "nowrap", textAlign: "right", flex: 1, flexBasis: 0 }}>
                    Showing <span style={{ fontWeight: 600 }}>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredGrievanceQueue.length)}</span>-<span style={{ fontWeight: 600 }}>{Math.min(currentPage * itemsPerPage, filteredGrievanceQueue.length)}</span> of{" "}
                    <span style={{ fontWeight: 600 }}>{filteredGrievanceQueue.length}</span> {t("admin.grievanceQueue.requests")}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap md:flex-1 md:basis-0 md:justify-center md:order-1">
                    {totalPages > 1 ? (
                      <>
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onMouseEnter={() => setHoveredPagerButton("previous")}
                        onMouseLeave={() => setHoveredPagerButton(null)}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        style={{
                          minWidth: 30,
                          minHeight: 30,
                          padding: "6px",
                          fontSize: 12,
                          background: "transparent",
                          color: hoveredPagerButton === "previous" && currentPage !== 1 ? "#ffffff" : C.purple,
                          border: "none",
                          borderRadius: 8,
                          opacity: currentPage === 1 ? 0.35 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: currentPage === 1 ? "default" : "pointer",
                          textShadow: hoveredPagerButton === "previous" && currentPage !== 1 ? "0 0 10px rgba(255,255,255,0.9)" : "none",
                          transition: "text-shadow 0.18s ease, color 0.18s ease",
                        }}
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {pageNumbers.map((pageNumber, index) => {
                        const previousPage = pageNumbers[index - 1];
                        const showGap = index > 0 && previousPage !== undefined && pageNumber - previousPage > 1;
                        return (
                          <div key={pageNumber} className="flex items-center gap-2">
                            {showGap ? <span style={{ fontSize: 12, color: C.t3, padding: "0 2px" }}>...</span> : null}
                            <button
                              type="button"
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
                                fontWeight: currentPage === pageNumber ? 700 : 600,
                                borderRadius: 8,
                                cursor: "pointer",
                                textShadow: currentPage === pageNumber || hoveredPagerButton === `page-${pageNumber}` ? "0 0 10px rgba(255,255,255,0.9)" : "none",
                                transition: "text-shadow 0.18s ease, color 0.18s ease",
                              }}
                            >
                              {pageNumber}
                            </button>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onMouseEnter={() => setHoveredPagerButton("next")}
                        onMouseLeave={() => setHoveredPagerButton(null)}
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        style={{
                          minWidth: 30,
                          minHeight: 30,
                          padding: "6px",
                          fontSize: 12,
                          background: "transparent",
                          color: hoveredPagerButton === "next" && currentPage !== totalPages ? "#ffffff" : C.purple,
                          border: "none",
                          borderRadius: 8,
                          opacity: currentPage === totalPages ? 0.35 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: currentPage === totalPages ? "default" : "pointer",
                          textShadow: hoveredPagerButton === "next" && currentPage !== totalPages ? "0 0 10px rgba(255,255,255,0.9)" : "none",
                          transition: "text-shadow 0.18s ease, color 0.18s ease",
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
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
    </div>
  );
}
