import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronLeft, ChevronRight, Clock, Eye, FileText, Filter, Search } from "lucide-react";
import { RiTeamLine } from "react-icons/ri";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PATHS } from "../../../routes/paths.js";
import { apiClient } from "../../../shared/api/client.js";
import { openDownloadUrl } from "../../../shared/api/downloads.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import { ErrorText, ModalShell, SuccessModal, WorkspaceTextArea } from "./AdminCaseDetail.jsx";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

function getDateOnlyValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateValue(parsed);
}

function statusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
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

function formatDateTimeLabel(value) {
  if (!value) return "Pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Pending";
  const day = String(parsed.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[parsed.getMonth()];
  const yr = String(parsed.getFullYear()).slice(-2);
  const dateLabel = `${day} ${mon},${yr}`;
  const timeLabel = parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateLabel} ${timeLabel}`;
}

function formatTimeOnly(value) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasAppointmentSchedulePassed(appointment) {
  const referenceValue = appointment?.scheduled_at;
  if (!referenceValue) return false;
  const scheduledAt = new Date(referenceValue);
  if (Number.isNaN(scheduledAt.getTime())) return false;
  return scheduledAt.getTime() <= Date.now();
}

function isScheduledLikeStatus(status) {
  return status === "scheduled" || status === "rescheduled";
}

const SCHEDULE_LOCATION_OPTIONS = [
  "Minister's Residence",
  "Kartavya Bhawan - Culture ministry",
  "Transport Bhawan - Tourism Ministry",
  "Jodhpur",
  "Others",
];

function deriveScheduleLocationFields(location) {
  const trimmed = String(location || "").trim();
  if (!trimmed) {
    return { locationOption: "", otherLocation: "" };
  }
  if (SCHEDULE_LOCATION_OPTIONS.includes(trimmed) && trimmed !== "Others") {
    return { locationOption: trimmed, otherLocation: "" };
  }
  return { locationOption: "Others", otherLocation: trimmed };
}

function CustomDateFilter({ value, onChange, placeholder, min, max }) {
  const { C } = usePortalTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState("down");
  const [viewMode, setViewMode] = useState("day");
  const rootRef = useRef(null);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateValue(value) || parseDateValue(min) || parseDateValue(max) || new Date());

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
      const pickerRoot = event.target.closest?.('[data-admin-appointment-date-filter="true"]');
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
  }, [isOpen, rootRef]);

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
    <div ref={rootRef} data-admin-appointment-date-filter="true" style={{ position: "relative", width: "100%" }}>
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
          <span style={{ color: C.t3, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18" />
            </svg>
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
            {t("admin.appointmentQueue.clearFilter")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function splitDateTimeParts(value) {
  if (!value) {
    return { date: "", time: "" };
  }
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return { date: "", time: "" };
  }
  const localValue = new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [date, time] = localValue.split("T");
  return { date: date || "", time: time || "" };
}

function combineDateAndTime(date, time) {
  if (!date || !time) return "";
  return new Date(`${date}T${time}`).toISOString();
}

function addMinutesToDateTime(date, time, minutes) {
  const iso = combineDateAndTime(date, time);
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(parsed.getTime() + minutes * 60 * 1000).toISOString();
}

function formatTimeOptionLabel(value) {
  const [hourPart, minutePart] = String(value || "").split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

const HALF_HOUR_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  const value = `${hour}:${minute}`;
  return { value, label: formatTimeOptionLabel(value) };
});

function ScheduleDatePicker({ value, onChange, min, placeholder = "Select start date" }) {
  const { C } = usePortalTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState("down");
  const [viewMode, setViewMode] = useState("day");
  const rootRef = useRef(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    if (value) return parseDateValue(value);
    return parseDateValue(min) || new Date();
  });

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

    updateDirection();

    const handlePointerDown = (event) => {
      const pickerRoot = event.target.closest?.('[data-admin-schedule-date-picker="true"]');
      if (!pickerRoot) {
        setIsOpen(false);
        setViewMode("day");
      }
    };

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
  const days = buildCalendarDays(monthStart);
  const yearStart = Math.floor(visibleMonth.getFullYear() / 12) * 12;

  function isMonthDisabled(monthIndex) {
    const firstDay = new Date(visibleMonth.getFullYear(), monthIndex, 1);
    const lastDay = new Date(visibleMonth.getFullYear(), monthIndex + 1, 0);
    if (minDate && lastDay < minDate) return true;
    return false;
  }

  function isYearDisabled(year) {
    const lastDay = new Date(year, 11, 31);
    if (minDate && lastDay < minDate) return true;
    return false;
  }

  return (
    <div ref={rootRef} data-admin-schedule-date-picker="true" style={{ position: "relative" }}>
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
          cursor: "pointer",
        }}
      >
        <span>{value ? formatDisplayDate(value) : placeholder}</span>
        <Calendar size={16} style={{ color: C.t3 }} />
      </button>

      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: openDirection === "down" ? "calc(100% + 6px)" : "auto",
            bottom: openDirection === "up" ? "calc(100% + 6px)" : "auto",
            left: 0,
            width: "100%",
            minWidth: 280,
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
                if (viewMode === "year") setVisibleMonth((current) => new Date(current.getFullYear() - 12, current.getMonth(), 1));
                else setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
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
                if (viewMode === "year") setVisibleMonth((current) => new Date(current.getFullYear() + 12, current.getMonth(), 1));
                else setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
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
                const isDisabled = (minDate && dayValue < min) || !isCurrentMonth;
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

function ScheduleTimePicker({ value, onChange, options }) {
  const { C } = usePortalTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState("down");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateDirection = () => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const dropdownHeight = 232;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "up" : "down");
    };

    updateDirection();

    const handlePointerDown = (event) => {
      const pickerRoot = event.target.closest?.('[data-admin-schedule-time-picker="true"]');
      if (!pickerRoot) setIsOpen(false);
    };

    window.addEventListener("resize", updateDirection);
    window.addEventListener("scroll", updateDirection, true);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", updateDirection);
      window.removeEventListener("scroll", updateDirection, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} data-admin-schedule-time-picker="true" style={{ position: "relative" }}>
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
          cursor: "pointer",
        }}
      >
        <span>{selectedOption?.label || t("admin.appointmentDetail.selectTimeSlot")}</span>
        <Clock size={16} style={{ color: C.t3 }} />
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
            maxHeight: 220,
            overflowY: "auto",
            padding: 6,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.card,
            boxShadow: "0 16px 36px rgba(15, 23, 42, 0.14)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            style={{
              width: "100%",
              minHeight: 34,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: C.t3,
              textAlign: "left",
              padding: "8px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {t("admin.appointmentDetail.selectTimeSlot")}
          </button>
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  minHeight: 34,
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? C.purple : "transparent"}`,
                  background: isSelected ? C.purple : "transparent",
                  color: isSelected ? "#ffffff" : C.t1,
                  textAlign: "left",
                  padding: "8px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function buildAppointmentActions(appointment, adminId, t) {
  if (!appointment?.status) return [];
  const { status, assignedAdminUserId } = appointment;
  const isAssigned = assignedAdminUserId === adminId;
  if (!isAssigned) return [];
  const actions = [];
  if (status === "not_verified") return [["reject", t("admin.appointmentDetail.actionReject")]];
  if (["pending"].includes(status)) actions.push(["accept", t("admin.appointmentDetail.actionAccept")]);
  if (["pending", "accepted", "verification_pending", "verified"].includes(status)) actions.push(["reject", t("admin.appointmentDetail.actionReject")]);
  if (["accepted"].includes(status)) actions.push(["sendVerification", t("admin.appointmentDetail.actionSendVerification")]);
  if (["accepted", "verified", "VERIFIED_BY_DEO"].includes(status)) actions.push(["schedule", t("admin.appointmentDetail.actionSchedule")]);
  if (isScheduledLikeStatus(status)) {
    actions.push(["logs", t("admin.appointmentDetail.actionLogs")]);
    actions.push(["reschedule", t("admin.appointmentDetail.actionReschedule")]);
    actions.push(["scheduledReject", t("admin.appointmentDetail.actionCancel")]);
    actions.push(["resolve", t("admin.appointmentDetail.actionResolve")]);
  }
  return actions;
}

function DetailItem({ label, value }) {
  const { C } = usePortalTheme();
  return (
    <div>
      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{label}</p>
      <div style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function InlineDetailGrid({ columns = 3, children }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 20,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

function NoticeBox({ tone, label, value }) {
  const { C } = usePortalTheme();
  const color = { red: C.danger, amber: C.warn, blue: C.purple, green: C.mint }[tone] || C.purple;
  return (
    <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}12` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 13, color: C.t2 }}>{value}</p>
    </div>
  );
}

const APPOINTMENT_TIMELINE_STATUSES = new Set(["accepted", "verification_pending", "verified", "scheduled", "cancelled", "rejected", "rescheduled", "completed"]);

function buildAppointmentTimeline(history, currentStatus) {
  const filteredHistory = Array.isArray(history)
    ? history.filter((event) => APPOINTMENT_TIMELINE_STATUSES.has(event?.new_status))
    : [];

  const deduped = filteredHistory.reduce((items, event) => {
    const existingIndex = items.findIndex((item) => item.new_status === event.new_status);
    if (existingIndex >= 0) items[existingIndex] = event;
    else items.push(event);
    return items;
  }, []);

  if (APPOINTMENT_TIMELINE_STATUSES.has(currentStatus) && !deduped.some((event) => event.new_status === currentStatus)) {
    deduped.push({ new_status: currentStatus, actor_role: "", created_at: null });
  }

  return deduped;
}

function buildAppointmentNoticeItems(appointment, t) {
  if (!appointment) return [];

  const hasContent = (value) => typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  const items = [];
  if (hasContent(appointment.rejection_reason)) items.push({ tone: "red", label: t("admin.appointmentDetail.noticeRejectionReason"), value: appointment.rejection_reason.trim() });
  if (hasContent(appointment.verification_reason)) items.push({ tone: "amber", label: t("admin.appointmentDetail.noticeVerificationReason"), value: appointment.verification_reason.trim() });
  if (hasContent(appointment.admin_comments)) {
    items.push({
      tone: "blue",
      label: appointment.status === "rescheduled" ? t("admin.appointmentDetail.noticeRescheduledReason") : t("admin.appointmentDetail.noticeScheduleSummary"),
      value: appointment.admin_comments.trim(),
    });
  }
  if (hasContent(appointment.completionNote)) items.push({ tone: "green", label: t("admin.appointmentDetail.noticeCompletedSummary"), value: appointment.completionNote.trim() });
  if (hasContent(appointment.cancellationReason)) items.push({ tone: "red", label: t("admin.appointmentDetail.noticeCancellationReason"), value: appointment.cancellationReason.trim() });
  return items;
}

function AppointmentTimeline({ history }) {
  const { C } = usePortalTheme();
  const { t } = useTranslation();

  return (
    <div style={{ display: "grid", gap: 18, overflowY: "auto", paddingRight: 6, flex: 1, minHeight: 0 }}>
      {history.length === 0 ? (
        <p style={{ fontSize: 13, color: C.t3 }}>{t("admin.appointmentDetail.noTimelineEvents")}</p>
      ) : (
        history.map((event, index) => (
          <div key={`${event.new_status}-${event.created_at || index}`} className="flex gap-4">
            <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
              <div className="h-3 w-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
              {index !== history.length - 1 ? <div className="mt-2 w-0.5 flex-1 min-h-10" style={{ background: C.purple }} /> : null}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: C.t1 }}>{statusLabel(event.new_status)}</p>
                  {event.actor_role ? <p style={{ fontSize: 12, color: C.t3, marginTop: 4, marginBottom: 0 }}>{event.actor_role}</p> : null}
                </div>
                {event.created_at ? (
                  <p style={{ fontSize: 12, color: C.t3, whiteSpace: "nowrap", margin: 0 }}>
                    {(() => { const _d = new Date(event.created_at); return `${String(_d.getDate()).padStart(2,"0")} ${MONTH_NAMES[_d.getMonth()]},${String(_d.getFullYear()).slice(-2)}`; })()}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PurpleOutlineButton({ children, style, ...props }) {
  const { C } = usePortalTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = Boolean(props.disabled);

  return (
    <button
      {...props}
      type={props.type || "button"}
      onMouseEnter={(event) => {
        setIsHovered(true);
        props.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setIsHovered(false);
        setIsPressed(false);
        props.onMouseLeave?.(event);
      }}
      onMouseDown={(event) => {
        setIsPressed(true);
        props.onMouseDown?.(event);
      }}
      onMouseUp={(event) => {
        setIsPressed(false);
        props.onMouseUp?.(event);
      }}
      style={{
        minHeight: 38,
        padding: "0 16px",
        borderRadius: 10,
        border: `1px solid ${C.purple}`,
        background: isHovered && !isDisabled ? C.purple : "transparent",
        color: isHovered && !isDisabled ? "#ffffff" : C.purple,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.2,
        opacity: isDisabled ? 0.4 : 1,
        transform: isPressed && !isDisabled ? "scale(0.98)" : "none",
        transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease, transform var(--portal-duration-fast) ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default function AdminAppointment() {
  const { C } = usePortalTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.bgElevated : "#F7F1FF";
  const { appointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const adminId = session?.user?.id;
  const source = searchParams.get("source") || "";
  const isAppointmentPoolDetail = source === "appointment-pool";
  const isAppointmentQueueDetail = source === "appointment-queue";
  const isMyCasesDetail = source === "my-cases";
  const isResolvedCompletedDetail = source === "resolved-completed" || source === "completed-appointments";
  const isWorkQueueDetail = isAppointmentPoolDetail || isResolvedCompletedDetail;
  const appointmentPoolBackPath = `${PATHS.admin.workQueue}?tab=appointment-pool`;

  const [appointments, setAppointments] = useState([]);
  const [workflowDirectory, setWorkflowDirectory] = useState({ deos: [], ministers: [] });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [history, setHistory] = useState([]);
  const [appointmentFiles, setAppointmentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingSuccessRedirect, setPendingSuccessRedirect] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdAtFilter, setCreatedAtFilter] = useState("");
  const [verificationForm, setVerificationForm] = useState({ deoId: "" });
  const [scheduleForm, setScheduleForm] = useState({
    ministerId: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    locationOption: "",
    otherLocation: "",
    isVip: false,
    comments: "",
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [scheduledRejectNote, setScheduledRejectNote] = useState("");
  const [meetingLogNote, setMeetingLogNote] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [isBackHovered, setIsBackHovered] = useState(false);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [showEntriesFocused, setShowEntriesFocused] = useState(false);
  const detailCardRef = useRef(null);
  const [detailContentHeight, setDetailContentHeight] = useState(null);

  function getResolvedScheduleLocation(form = scheduleForm) {
    if (form.locationOption === "Others") {
      return form.otherLocation.trim();
    }
    return form.locationOption.trim();
  }

  async function loadAppointmentPool() {
    const [queueResponse, directoryResponse] = await Promise.all([
      apiClient.get("/admin/work-queue"),
      apiClient.get("/admin/workflow-directory"),
    ]);
    setAppointments(Array.isArray(queueResponse.data?.appointments) ? queueResponse.data.appointments : []);
    setWorkflowDirectory(directoryResponse.data || { deos: [], ministers: [] });
  }

  async function loadAppointmentDetail(id) {
    setDetailLoading(true);
    try {
      const [detailResult, filesResult] = await Promise.allSettled([
        apiClient.get(`/appointments/${id}/admin-view`),
        apiClient.get(`/appointments/${id}/files`),
      ]);
      if (detailResult.status === "rejected") {
        throw detailResult.reason;
      }
      const { data } = detailResult.value;
      const startParts = splitDateTimeParts(data.appointment?.scheduled_at);
      const endParts = splitDateTimeParts(data.appointment?.scheduled_end_at);
      setSelectedAppointment(data.appointment || null);
      setHistory(data.history || []);
      setAppointmentFiles(filesResult.status === "fulfilled" ? (filesResult.value.data?.files || []) : []);
      setScheduleForm({
        ministerId: data.appointment?.ministerId || "",
        startDate: startParts.date,
        startTime: startParts.time,
        endDate: endParts.date,
        endTime: endParts.time,
        ...deriveScheduleLocationFields(data.appointment?.scheduled_location || ""),
        isVip: Boolean(data.appointment?.is_vip),
        comments: data.appointment?.admin_comments || "",
      });
      setScheduleError("");
      setVerificationForm({ deoId: data.appointment?.assignedDeoId || "" });
    } catch (detailError) {
      setError(detailError?.response?.data?.error || "Unable to load appointment details");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!session?.role) return;
      try {
        setLoading(true);
        setError("");
        await loadAppointmentPool();
        if (!active) return;
        if (appointmentId) {
          await loadAppointmentDetail(appointmentId);
        } else {
          setSelectedAppointment(null);
          setHistory([]);
          setAppointmentFiles([]);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError?.response?.data?.error || "Unable to load appointment pool");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [appointmentId, session?.role]);

  const personalAppointmentQueue = useMemo(
    () => appointments.filter(
      (appointment) => appointment.assignedAdminUserId === adminId && appointment.status !== "completed"
    ),
    [adminId, appointments]
  );

  const filteredAppointmentQueue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personalAppointmentQueue.filter((appointment) => {
      const haystack = [
        appointment.requestId,
        appointment.title || appointment.purpose,
        [appointment.first_name, appointment.last_name].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
      const matchesCreatedAt = !createdAtFilter || getDateOnlyValue(appointment.createdAt || appointment.created_at) === createdAtFilter;
      return matchesSearch && matchesStatus && matchesCreatedAt;
    });
  }, [createdAtFilter, personalAppointmentQueue, query, statusFilter]);

  const appointmentStatusOptions = useMemo(
    () => {
      const statuses = new Set(personalAppointmentQueue.map((appointment) => appointment.status).filter((status) => status && status !== "pending"));
      statuses.add("rejected");
      statuses.add("cancelled");
      return Array.from(statuses).sort();
    },
    [personalAppointmentQueue]
  );

  const queueStats = useMemo(() => {
    const scheduled = appointments.filter((appointment) => isScheduledLikeStatus(appointment.status) && appointment.assignedAdminUserId === adminId).length;
    return [
      { label: t("admin.appointmentQueue.totalAppointments"), value: personalAppointmentQueue.length },
      { label: t("admin.appointmentQueue.scheduledLabel"), value: scheduled },
    ];
  }, [appointments, personalAppointmentQueue.length, adminId, t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, createdAtFilter, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointmentQueue.length / itemsPerPage));
  const paginatedAppointmentQueue = filteredAppointmentQueue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useLayoutEffect(() => {
    if (!detailCardRef.current || typeof ResizeObserver === "undefined") return undefined;
    const updateHeight = () => {
      if (!detailCardRef.current) return;
      setDetailContentHeight(detailCardRef.current.offsetHeight || null);
    };
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(detailCardRef.current);
    return () => observer.disconnect();
  }, [selectedAppointment, history, selectedAction, actionError, successMessage]);

  const availableActions = useMemo(
    () => buildAppointmentActions(selectedAppointment || {}, adminId, t),
    [selectedAppointment, adminId, t]
  );

  async function refreshAll(id = appointmentId) {
    await loadAppointmentPool();
    if (id) {
      await loadAppointmentDetail(id);
    }
  }

  async function assignAppointmentToCurrentAdmin() {
    return runAction(
      () => apiClient.patch(`/appointments/${appointmentId}/assign-self`, {}),
      {
        successMessage: t("admin.appointmentDetail.assignedToYou"),
        successRedirect: PATHS.admin.appointments,
      }
    );
  }

  async function runAction(request, options = {}) {
    setActionLoading(true);
    setActionError("");
    try {
      await request();
      if (options.successMessage) {
        setSuccessMessage(options.successMessage);
      }
      setPendingSuccessRedirect(options.successRedirect || "");
      if (options.navigateToPool) {
        await loadAppointmentPool();
        navigate(isAppointmentPoolDetail ? appointmentPoolBackPath : isWorkQueueDetail ? PATHS.admin.workQueue : PATHS.admin.appointments);
        return true;
      }
      if (options.navigateToAppointmentQueue) {
        await loadAppointmentPool();
        navigate(PATHS.admin.appointments);
        return true;
      }
      await refreshAll();
      return true;
    } catch (actionErrorValue) {
      setActionError(actionErrorValue?.response?.data?.error || "Unable to update appointment");
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function uploadAppointmentPhoto() {
    if (!uploadFile) return;
    setUploadingFile(true);
    setActionError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      await apiClient.post(`/appointments/${appointmentId}/photos`, formData);
      await loadAppointmentDetail(appointmentId);
      setUploadFile(null);
    } catch (uploadError) {
      setActionError(uploadError?.response?.data?.error || "Unable to upload appointment photo");
    } finally {
      setUploadingFile(false);
    }
  }

  function closeActionModal() {
    setSelectedAction("");
  }

  function handleWorkflowActionChange(nextAction) {
    setSelectedAction(nextAction);
  }

  function handleSuccessModalClose() {
    const redirectPath = pendingSuccessRedirect;
    setSuccessMessage("");
    setPendingSuccessRedirect("");
    if (redirectPath) {
      navigate(redirectPath);
    }
  }

  if (appointmentId) {
    if (loading || detailLoading || !selectedAppointment) {
      return (
        <WorkspacePage width={1200}>
          {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : <WorkspaceEmptyState title={t("admin.appointmentDetail.loadingDetails")} />}
        </WorkspacePage>
      );
    }

    const isAssignedToCurrentAdmin = selectedAppointment.assignedAdminUserId === adminId;
    const isUnassignedPoolAppointment = selectedAppointment.status === "pending" && !selectedAppointment.assignedAdminUserId;
    const canSendVerification = isAssignedToCurrentAdmin && ["accepted", "verification_pending", "verified"].includes(selectedAppointment.status);
    const canSchedule = isAssignedToCurrentAdmin && ["accepted", "verified", "VERIFIED_BY_DEO", "scheduled", "rescheduled"].includes(selectedAppointment.status);
    const canUploadPhotos = isAssignedToCurrentAdmin && ["scheduled", "rescheduled", "completed"].includes(selectedAppointment.status);
    const verificationPending = ["verification_pending", "SENT_FOR_DEO_VERIFICATION"].includes(selectedAppointment.status);
    const verificationDone = ["verified", "VERIFIED_BY_DEO"].includes(selectedAppointment.status);
    const appointmentScheduled = isScheduledLikeStatus(selectedAppointment.status);
    const workflowDisplayLabel =
      verificationPending || verificationDone
        ? t("admin.appointmentDetail.workflowSendForDeo")
        : appointmentScheduled
          ? t("admin.appointmentDetail.workflowActions")
          : t("admin.appointmentDetail.selectWorkflowAction");
    const citizenAppointmentFiles = appointmentFiles.filter((file) => file.kind !== "appointment_photo");
    const isCompletedAppointmentDetail = selectedAppointment.status === "completed";
    const isCancelledAppointmentDetail = selectedAppointment.status === "cancelled";
    const showAssignToMeButton = !selectedAppointment.assignedAdminUserId && (isAppointmentPoolDetail || isUnassignedPoolAppointment);
    const isDeoRejected = selectedAppointment.status === "not_verified";
    const isAdminRejected = selectedAppointment.status === "rejected";
    const showWorkflowActions = !showAssignToMeButton && !isResolvedCompletedDetail && !["completed", "cancelled", "rejected"].includes(selectedAppointment.status);

    const backPath = isMyCasesDetail
      ? PATHS.admin.cases
      : source === "appointment-queue"
          ? PATHS.admin.appointments
          : isAppointmentPoolDetail
            ? appointmentPoolBackPath
          : isResolvedCompletedDetail
            ? `${PATHS.admin.workQueue}?tab=completed-appointments`
          : isUnassignedPoolAppointment
            ? PATHS.admin.workQueue
            : PATHS.admin.appointments;
    const backLabel = isAppointmentPoolDetail
      ? t("common.back")
      : isResolvedCompletedDetail
        ? t("common.back")
      : isWorkQueueDetail
        ? t("admin.appointmentDetail.backToWorkQueue")
      : isAppointmentQueueDetail
        ? t("common.back")
        : t("admin.appointmentDetail.backToAppointmentQueue");
    const citizenName = [selectedAppointment.first_name, selectedAppointment.last_name].filter(Boolean).join(" ") || t("common.unknown");
    const citizenPhone = selectedAppointment.mobile_number || t("common.notProvided");
    const citizenDistrict = selectedAppointment.citizenSnapshot?.district || t("common.notProvided");
    const citizenLocalMp = selectedAppointment.citizenSnapshot?.localMp || t("common.notProvided");
    const createdAtLabel = formatDateOnly(selectedAppointment.createdAt || selectedAppointment.created_at);
    const updatedAtLabel = formatDateOnly(selectedAppointment.updatedAt || selectedAppointment.updated_at || selectedAppointment.createdAt || selectedAppointment.created_at);
    const preferredAppointmentDateLabel = selectedAppointment.preferred_time ? formatDateOnly(selectedAppointment.preferred_time) : t("common.notProvided");
    const preferredAppointmentTimeLabel = selectedAppointment.preferred_time ? formatTimeOnly(selectedAppointment.preferred_time) : t("common.notProvided");
    const appointmentStatusLabel = statusLabel(selectedAppointment.status);
    const citizenContact = selectedAppointment.mobile_number || selectedAppointment.email || t("common.notProvided");
    const scheduledAtLabel = selectedAppointment.scheduled_at ? formatDateTimeLabel(selectedAppointment.scheduled_at) : t("common.pending");
    const scheduledLocationLabel = selectedAppointment.scheduled_location || t("common.pending");
    const appointmentTimeline = buildAppointmentTimeline(history, selectedAppointment.status);
    const appointmentNoticeItems = buildAppointmentNoticeItems(selectedAppointment, t);
    return (
      <WorkspacePage
        width={1280}
        outerStyle={isWorkQueueDetail && !isCompletedAppointmentDetail ? { height: "calc(100vh - 73px)", overflow: "auto" } : undefined}
        contentStyle={isWorkQueueDetail && !isCompletedAppointmentDetail ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } : undefined}
      >
        <SuccessModal open={!!successMessage} message={successMessage} onClose={handleSuccessModalClose} />

        {isAppointmentPoolDetail || isAppointmentQueueDetail || isResolvedCompletedDetail ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 16, gap: 12 }}>
            <div style={{ justifySelf: "start" }}>
              <button
                type="button"
                onClick={() => {
                  setIsBackHovered(false);
                  navigate(backPath);
                }}
                onMouseEnter={() => setIsBackHovered(true)}
                onMouseLeave={() => setIsBackHovered(false)}
                style={{
                  minHeight: 38,
                  padding: "0 16px",
                  borderRadius: 10,
                  border: `1px solid ${C.purple}`,
                  background: isBackHovered ? C.purple : "transparent",
                  color: isBackHovered ? "#ffffff" : C.purple,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
                }}
              >
                <ChevronLeft size={16} />
                {backLabel}
              </button>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.t1, textAlign: "center" }}>{t("admin.appointmentDetail.title")}</h2>
            <div />
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.t1 }}>{selectedAppointment.requestId || selectedAppointment.id}</h2>
            <button
              type="button"
              onClick={() => {
                setIsBackHovered(false);
                navigate(backPath);
              }}
              onMouseEnter={() => setIsBackHovered(true)}
              onMouseLeave={() => setIsBackHovered(false)}
              style={{
                minHeight: 38,
                padding: "0 16px",
                borderRadius: 10,
                border: `1px solid ${C.purple}`,
                background: isBackHovered ? C.purple : "transparent",
                color: isBackHovered ? "#ffffff" : C.purple,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
              }}
            >
              <ChevronLeft size={16} />
              {backLabel}
            </button>
          </div>
        )}

        <div style={{ display: "grid", gap: isWorkQueueDetail ? 16 : 24, flex: isWorkQueueDetail ? 1 : undefined, minHeight: isWorkQueueDetail ? 0 : undefined }}>
          {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : null}
          {actionError ? <WorkspaceCard style={{ color: C.danger }}>{actionError}</WorkspaceCard> : null}

          <div style={isWorkQueueDetail ? undefined : { maxWidth: 320 }}>
            {showAssignToMeButton && !isAppointmentPoolDetail ? (
              <WorkspaceButton
                type="button"
                disabled={actionLoading}
                onClick={assignAppointmentToCurrentAdmin}
                style={isWorkQueueDetail ? { boxShadow: "none" } : undefined}
              >
                {t("admin.appointmentDetail.assignToMe")}
              </WorkspaceButton>
            ) : showWorkflowActions && isWorkQueueDetail ? (
              <div>
                <WorkspaceSelect
                  value={selectedAction}
                  onChange={(event) => handleWorkflowActionChange(event.target.value)}
                >
                  <option value="">{t("admin.appointmentDetail.selectWorkflowAction")}</option>
                  {availableActions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </WorkspaceSelect>
              </div>
            ) : null}
          </div>

          {isWorkQueueDetail ? (
            isCompletedAppointmentDetail ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gap: 24,
                    gridTemplateColumns: "minmax(0, 7fr) minmax(280px, 3fr)",
                    alignItems: "start",
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <div ref={detailCardRef}>
                    <WorkspaceCard style={{ marginBottom: 0, display: "flex", flexDirection: "column" }}>
                    <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          minHeight: 38,
                          padding: "0 16px",
                          borderRadius: 10,
                          background: C.mint,
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          cursor: "default",
                          userSelect: "none",
                        }}
                      >
                        <span aria-hidden="true">✓</span>
                        {t("admin.appointmentDetail.completed")}
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 18, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
                      <InlineDetailGrid columns={3}>
                        <DetailItem label={t("admin.appointmentDetail.appointmentId")} value={selectedAppointment.requestId || selectedAppointment.id} />
                        <div />
                        <DetailItem label={t("admin.appointmentDetail.completionDate")} value={formatDateOnly(selectedAppointment.completedAt || selectedAppointment.updated_at || selectedAppointment.updatedAt)} />
                      </InlineDetailGrid>
                      <InlineDetailGrid columns={3}>
                        <DetailItem label={t("admin.appointmentDetail.createdAt")} value={createdAtLabel} />
                        <DetailItem label={t("admin.grievanceDetail.citizenName")} value={citizenName} />
                        <DetailItem label={t("admin.grievanceDetail.citizenPhone")} value={citizenPhone} />
                      </InlineDetailGrid>
                      <InlineDetailGrid columns={3}>
                        <DetailItem label={t("admin.workQueue.colDistrict")} value={citizenDistrict} />
                        <DetailItem label={t("admin.grievanceDetail.mpOfDistrict")} value={citizenLocalMp} />
                        <div />
                      </InlineDetailGrid>
                      <div>
                        <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{t("admin.appointmentDetail.appointmentTitle")}</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {selectedAppointment.title || selectedAppointment.purpose || t("admin.appointmentDetail.untitledAppointment")}
                        </p>
                      </div>
                      <InlineDetailGrid columns={3}>
                        <DetailItem label={t("admin.appointmentDetail.preferredDate")} value={preferredAppointmentDateLabel} />
                        <DetailItem label={t("admin.appointmentDetail.preferredTime")} value={preferredAppointmentTimeLabel} />
                        <div />
                      </InlineDetailGrid>
                      <InlineDetailGrid columns={3}>
                        <DetailItem label={t("admin.appointmentDetail.scheduledAt")} value={scheduledAtLabel} />
                        <DetailItem label={t("admin.appointmentDetail.scheduledLocation")} value={scheduledLocationLabel} />
                        <DetailItem
                          label={t("admin.appointmentDetail.vipAppointment")}
                          value={(
                            <WorkspaceBadge color={selectedAppointment.is_vip ? C.mint : C.danger} title={selectedAppointment.is_vip ? t("common.yes") : t("common.no")}>
                              {selectedAppointment.is_vip ? t("common.yes") : t("common.no")}
                            </WorkspaceBadge>
                          )}
                        />
                      </InlineDetailGrid>
                      <div>
                        <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{t("admin.appointmentDetail.purposeOfAppointment")}</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {selectedAppointment.purpose || selectedAppointment.description || t("common.notProvided")}
                        </p>
                      </div>
                      {appointmentNoticeItems.length ? (
                        <div className="space-y-3">
                          {appointmentNoticeItems.map((item) => (
                            <NoticeBox key={`${item.label}-${item.value}`} tone={item.tone} label={item.label} value={item.value} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    </WorkspaceCard>
                  </div>

                  <WorkspaceCard
                    style={{
                      marginBottom: 0,
                      height: detailContentHeight || "auto",
                      maxHeight: detailContentHeight || "none",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-6">
                      <FileText size={22} color={C.purple} />
                      <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>{t("admin.appointmentDetail.timeline")}</h2>
                    </div>
                    <AppointmentTimeline history={appointmentTimeline} />
                  </WorkspaceCard>
                </div>

                <WorkspaceCard style={{ marginBottom: 0 }}>
                <WorkspaceCardHeader
                  title={t("admin.appointmentDetail.appointmentFiles")}
                  subtitle={t("admin.appointmentDetail.filesSubtitle")}
                />
                {appointmentFiles.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>{t("admin.appointmentDetail.noFilesAttached")}</div>
                ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {appointmentFiles.map((file) => (
                        <div key={file.id} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                              <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType}</div>
                            </div>
                            <WorkspaceButton
                              type="button"
                              variant="outline"
                              onClick={() => openDownloadUrl(file.downloadUrl)}
                            >
                              {t("common.download")}
                            </WorkspaceButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </WorkspaceCard>
              </>
            ) : (
              <>
                <WorkspaceCard
                  style={
                    isAppointmentPoolDetail
                      ? { marginBottom: 0, height: "auto", display: "flex", flexDirection: "column", paddingTop: 14 }
                      : { marginBottom: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingTop: 24 }
                  }
                >
                  {isAppointmentPoolDetail ? (
                    <div style={{ padding: "0 0 14px 0", marginLeft: 2, borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
                      <WorkspaceButton
                        type="button"
                        disabled={actionLoading}
                        onClick={assignAppointmentToCurrentAdmin}
                        style={{ boxShadow: "none" }}
                      >
                        {t("admin.appointmentDetail.assignToMe")}
                      </WorkspaceButton>
                    </div>
                  ) : (
                    <WorkspaceCardHeader title={t("admin.appointmentDetail.appointmentInfo")} />
                  )}
                  <div
                    style={
                      isAppointmentPoolDetail
                        ? { display: "grid", gap: 18, paddingRight: 2 }
                        : { display: "grid", gap: 18, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }
                    }
                  >
                    <div className="grid md:grid-cols-3 gap-6">
                      <DetailItem label={t("admin.appointmentDetail.appointmentId")} value={selectedAppointment.requestId || selectedAppointment.id} />
                      <DetailItem label={t("admin.appointmentDetail.updatedAt")} value={updatedAtLabel} />
                      <DetailItem
                        label={t("common.status")}
                        value={(
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                            <WorkspaceBadge status={selectedAppointment.status} title={appointmentStatusLabel}>
                              {appointmentStatusLabel}
                            </WorkspaceBadge>
                          </div>
                        )}
                      />
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                      <DetailItem label={t("admin.appointmentDetail.createdAt")} value={createdAtLabel} />
                      <DetailItem label={t("admin.grievanceDetail.citizenName")} value={citizenName} />
                      <DetailItem label={t("admin.grievanceDetail.citizenPhone")} value={citizenPhone} />
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                      <DetailItem label={t("admin.workQueue.colDistrict")} value={citizenDistrict} />
                      <DetailItem label={t("admin.grievanceDetail.mpOfDistrict")} value={citizenLocalMp} />
                      <div />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{t("admin.appointmentDetail.appointmentTitle")}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>
                        {selectedAppointment.title || selectedAppointment.purpose || t("admin.appointmentDetail.untitledAppointment")}
                      </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                      <DetailItem label={t("admin.appointmentDetail.preferredDate")} value={preferredAppointmentDateLabel} />
                      <DetailItem label={t("admin.appointmentDetail.preferredTime")} value={preferredAppointmentTimeLabel} />
                      <div />
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                      <DetailItem label={t("admin.appointmentDetail.scheduledAt")} value={scheduledAtLabel} />
                      <DetailItem label={t("admin.appointmentDetail.scheduledLocation")} value={scheduledLocationLabel} />
                      <DetailItem
                        label={t("admin.appointmentDetail.vipAppointment")}
                        value={(
                          <WorkspaceBadge color={selectedAppointment.is_vip ? C.mint : C.danger} title={selectedAppointment.is_vip ? t("common.yes") : t("common.no")}>
                            {selectedAppointment.is_vip ? t("common.yes") : t("common.no")}
                          </WorkspaceBadge>
                        )}
                      />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{t("admin.appointmentDetail.purposeOfAppointment")}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {selectedAppointment.purpose || selectedAppointment.description || t("common.notProvided")}
                      </p>
                    </div>
                  </div>
                  {appointmentNoticeItems.length ? (
                    <div className="mt-6 space-y-3">
                      {appointmentNoticeItems.map((item) => (
                        <NoticeBox key={`${item.label}-${item.value}`} tone={item.tone} label={item.label} value={item.value} />
                      ))}
                    </div>
                  ) : null}
                </WorkspaceCard>

                <WorkspaceCard style={{ marginBottom: 0 }}>
                <WorkspaceCardHeader
                  title={t("admin.appointmentDetail.appointmentFiles")}
                  subtitle={t("admin.appointmentDetail.filesSubtitle")}
                />
                {appointmentFiles.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>{t("admin.appointmentDetail.noFilesAttached")}</div>
                ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {appointmentFiles.map((file) => (
                        <div key={file.id} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                              <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType}</div>
                            </div>
                            <WorkspaceButton
                              type="button"
                              variant="outline"
                              onClick={() => openDownloadUrl(file.downloadUrl)}
                            >
                              {t("common.download")}
                            </WorkspaceButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </WorkspaceCard>
              </>
            )
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gap: 24,
                  gridTemplateColumns: "minmax(0, 7fr) minmax(280px, 3fr)",
                  alignItems: "start",
                }}
              >
                <div ref={detailCardRef}>
                  <WorkspaceCard style={{ marginBottom: 0, height: "auto", display: "flex", flexDirection: "column" }}>
                  {showWorkflowActions ? (
                    <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                      <WorkspaceSelect
                        value={selectedAction}
                        onChange={(event) => handleWorkflowActionChange(event.target.value)}
                        style={{ maxWidth: 320 }}
                      >
                        <option value="">{workflowDisplayLabel}</option>
                        {availableActions.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </WorkspaceSelect>
                      {isDeoRejected ? <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.danger }}>{t("admin.appointmentDetail.deoRejectsVerification")}</div> : null}
                      {verificationPending ? <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.danger }}>{t("admin.appointmentDetail.sentForDeoVerification")}</div> : null}
                      {verificationDone ? <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.mint }}>{t("admin.appointmentDetail.deoVerificationSuccessful")}</div> : null}
                      {appointmentScheduled ? <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.mint }}>{t("admin.appointmentDetail.meetingScheduled")}</div> : null}
                    </div>
                  ) : isAdminRejected ? (
                    <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 38,
                          padding: "0 16px",
                          borderRadius: 10,
                          background: C.danger,
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          cursor: "not-allowed",
                          userSelect: "none",
                          opacity: 0.85,
                        }}
                      >
                        {t("admin.appointmentDetail.rejected")}
                      </div>
                    </div>
                  ) : isCompletedAppointmentDetail ? (
                    <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 38,
                          padding: "0 16px",
                          borderRadius: 10,
                          background: C.mint,
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          cursor: "default",
                          userSelect: "none",
                        }}
                      >
                        {t("admin.appointmentDetail.completed")}
                      </div>
                    </div>
                  ) : isCancelledAppointmentDetail ? (
                    <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 38,
                          padding: "0 16px",
                          borderRadius: 10,
                          background: C.danger,
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          cursor: "default",
                          userSelect: "none",
                        }}
                      >
                        {t("admin.appointmentDetail.cancelled")}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ display: "grid", gap: 18 }}>
                    <InlineDetailGrid columns={3}>
                      <DetailItem label={t("admin.appointmentDetail.appointmentId")} value={selectedAppointment.requestId || selectedAppointment.id} />
                      <DetailItem label={t("admin.appointmentDetail.updatedAt")} value={updatedAtLabel} />
                      <DetailItem
                        label={t("common.status")}
                        value={(
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                            <WorkspaceBadge status={selectedAppointment.status} title={appointmentStatusLabel}>
                              {appointmentStatusLabel}
                            </WorkspaceBadge>
                          </div>
                        )}
                      />
                    </InlineDetailGrid>
                    <InlineDetailGrid columns={3}>
                      <DetailItem label={t("admin.appointmentDetail.createdAt")} value={createdAtLabel} />
                      <DetailItem label={t("admin.grievanceDetail.citizenName")} value={citizenName} />
                      <DetailItem label={t("admin.grievanceDetail.citizenPhone")} value={citizenPhone} />
                    </InlineDetailGrid>
                    <InlineDetailGrid columns={3}>
                      <DetailItem label={t("admin.workQueue.colDistrict")} value={citizenDistrict} />
                      <DetailItem label={t("admin.grievanceDetail.mpOfDistrict")} value={citizenLocalMp} />
                      <div />
                    </InlineDetailGrid>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{t("admin.appointmentDetail.appointmentTitle")}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>
                        {selectedAppointment.title || selectedAppointment.purpose || t("admin.appointmentDetail.untitledAppointment")}
                      </p>
                    </div>
                    <InlineDetailGrid columns={3}>
                      <DetailItem label={t("admin.appointmentDetail.preferredDate")} value={preferredAppointmentDateLabel} />
                      <DetailItem label={t("admin.appointmentDetail.preferredTime")} value={preferredAppointmentTimeLabel} />
                      <div />
                    </InlineDetailGrid>
                    <InlineDetailGrid columns={3}>
                      <DetailItem
                        label={t("admin.appointmentDetail.scheduledAt")}
                        value={(
                          <WorkspaceBadge status={selectedAppointment.scheduled_at ? "scheduled" : "pending"} color={selectedAppointment.scheduled_at ? C.mint : undefined} title={scheduledAtLabel}>
                            {scheduledAtLabel}
                          </WorkspaceBadge>
                        )}
                      />
                      <DetailItem
                        label={t("admin.appointmentDetail.scheduledLocation")}
                        value={(
                          <WorkspaceBadge status={selectedAppointment.scheduled_location ? "scheduled" : "pending"} color={selectedAppointment.scheduled_location ? C.mint : undefined} title={scheduledLocationLabel}>
                            {scheduledLocationLabel}
                          </WorkspaceBadge>
                        )}
                      />
                      <DetailItem
                        label={t("admin.appointmentDetail.vipAppointment")}
                        value={(
                          <WorkspaceBadge color={selectedAppointment.is_vip ? C.mint : C.danger} title={selectedAppointment.is_vip ? t("common.yes") : t("common.no")}>
                            {selectedAppointment.is_vip ? t("common.yes") : t("common.no")}
                          </WorkspaceBadge>
                        )}
                      />
                    </InlineDetailGrid>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{t("admin.appointmentDetail.purposeOfAppointment")}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {selectedAppointment.purpose || t("common.notProvided")}
                      </p>
                    </div>
                    {appointmentNoticeItems.length ? (
                      <div className="space-y-3">
                        {appointmentNoticeItems.map((item) => (
                          <NoticeBox key={`${item.label}-${item.value}`} tone={item.tone} label={item.label} value={item.value} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  </WorkspaceCard>
                </div>

                <WorkspaceCard
                  style={{
                    marginBottom: 0,
                    height: detailContentHeight || "auto",
                    maxHeight: detailContentHeight || "none",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div className="flex items-center gap-2 mb-6">
                    <FileText size={22} color={C.purple} />
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>{t("admin.appointmentDetail.timeline")}</h2>
                  </div>
                  <AppointmentTimeline history={appointmentTimeline} />
                </WorkspaceCard>
              </div>

              <WorkspaceCard style={{ marginBottom: 0 }}>
                <WorkspaceCardHeader
                  title={t("admin.appointmentDetail.appointmentFiles")}
                  subtitle={t("admin.appointmentDetail.citizenFilesSubtitle")}
                />
                {citizenAppointmentFiles.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>{t("admin.appointmentDetail.noFilesAttached")}</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {citizenAppointmentFiles.map((file) => (
                      <div key={file.id} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType}</div>
                          </div>
                          <WorkspaceButton
                            type="button"
                            variant="outline"
                            onClick={() => openDownloadUrl(file.downloadUrl)}
                          >
                            Download
                          </WorkspaceButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </WorkspaceCard>
            </>
          )}
        </div>

        {selectedAction === "accept" ? (
          <ModalShell
            title={t("admin.appointmentDetail.acceptTitle")}
            subtitle={t("admin.appointmentDetail.acceptSubtitle")}
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ fontSize: 13, color: C.t3 }}>{t("admin.appointmentDetail.acceptBody")}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/appointments/${appointmentId}/accept`, {}),
                      { successMessage: t("admin.appointmentDetail.acceptSuccess") }
                    ).then((ok) => { if (ok) setSelectedAction(""); })
                  }
                >
                  {t("admin.appointmentDetail.confirmAccept")}
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "reject" ? (
          <ModalShell
            title={t("admin.appointmentDetail.rejectTitle")}
            subtitle={t("admin.appointmentDetail.rejectSubtitle")}
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  {t("admin.appointmentDetail.reasonForRejection")}
                </div>
                <WorkspaceTextArea rows={6} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder={t("admin.appointmentDetail.rejectionReasonPlaceholder")} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <PurpleOutlineButton
                  disabled={actionLoading || rejectReason.trim().length < 5}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/appointments/${appointmentId}/reject`, { reason: rejectReason }),
                      { successMessage: t("admin.appointmentDetail.rejectSuccess") }
                    ).then((ok) => { if (ok) setSelectedAction(""); })
                  }
                >
                  {t("admin.appointmentDetail.confirm")}
                </PurpleOutlineButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "sendVerification" && canSendVerification ? (
          <ModalShell
            title={t("admin.appointmentDetail.sendVerificationTitle")}
            subtitle={t("admin.appointmentDetail.sendVerificationSubtitle")}
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.6 }}>
                {t("admin.appointmentDetail.sendVerificationBody")}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <PurpleOutlineButton
                  disabled={actionLoading}
                  style={{ minHeight: 30, padding: "0 10px" }}
                  onClick={() => {
                    const deoId = workflowDirectory.deos[0]?.id;
                    runAction(
                      () => apiClient.patch(`/appointments/${appointmentId}/assign-verification`, { deoId }),
                      { successMessage: t("admin.appointmentDetail.sendVerificationSuccess") }
                    ).then((ok) => { if (ok) setSelectedAction(""); });
                  }}
                >
                  {t("admin.appointmentDetail.send")}
                </PurpleOutlineButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {(selectedAction === "schedule" || selectedAction === "reschedule") && canSchedule ? (
          <ModalShell
            title={selectedAction === "reschedule" ? t("admin.appointmentDetail.rescheduleTitle") : t("admin.appointmentDetail.scheduleTitle")}
            subtitle={t("admin.appointmentDetail.scheduleSubtitle")}
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{t("admin.appointmentDetail.locationLabel")}</div>
                <WorkspaceSelect
                  value={scheduleForm.locationOption}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      locationOption: event.target.value,
                      otherLocation: event.target.value === "Others" ? current.otherLocation : "",
                    }))
                  }
                >
                  <option value="">{t("admin.appointmentDetail.selectLocation")}</option>
                  {SCHEDULE_LOCATION_OPTIONS.map((location) => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </WorkspaceSelect>
                {scheduleForm.locationOption === "Others" ? (
                  <WorkspaceInput
                    value={scheduleForm.otherLocation}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, otherLocation: event.target.value }))}
                    placeholder={t("admin.appointmentDetail.enterLocation")}
                  />
                ) : null}
              </div>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{t("admin.appointmentDetail.dateLabel")}</div>
                  <ScheduleDatePicker
                    value={scheduleForm.startDate}
                    onChange={(nextDate) => {
                      setScheduleError("");
                      setScheduleForm((current) => ({ ...current, startDate: nextDate }));
                    }}
                    min={formatDateValue(new Date())}
                    placeholder={t("admin.appointmentDetail.selectDate")}
                  />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{t("admin.appointmentDetail.timeLabel")}</div>
                  <ScheduleTimePicker
                    value={scheduleForm.startTime}
                    onChange={(nextTime) => {
                      setScheduleError("");
                      setScheduleForm((current) => ({ ...current, startTime: nextTime }));
                    }}
                    options={HALF_HOUR_TIME_OPTIONS}
                  />
                </div>
              </div>
              <ErrorText>{scheduleError}</ErrorText>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <PurpleOutlineButton
                  disabled={actionLoading || !scheduleForm.startDate || !scheduleForm.startTime || !getResolvedScheduleLocation()}
                  onClick={() => {
                    setScheduleError("");
                    setActionError("");
                    if (["verification_pending", "SENT_FOR_DEO_VERIFICATION"].includes(selectedAppointment.status)) {
                      setScheduleError(t("admin.appointmentDetail.scheduleVerificationError"));
                      return;
                    }
                    runAction(
                      () => apiClient.patch(`/appointments/${appointmentId}/schedule`, {
                        ministerId: scheduleForm.ministerId || workflowDirectory.ministers[0]?.id,
                        startsAt: combineDateAndTime(scheduleForm.startDate, scheduleForm.startTime),
                        endsAt: addMinutesToDateTime(scheduleForm.startDate, scheduleForm.startTime, 30),
                        location: getResolvedScheduleLocation(),
                        isVip: scheduleForm.isVip,
                        comments: scheduleForm.comments,
                      }),
                      { successMessage: t("admin.appointmentDetail.meetingScheduledSuccess") }
                    ).then((ok) => { if (ok) setSelectedAction(""); });
                  }}
                >
                  {selectedAction === "reschedule" ? t("admin.appointmentDetail.updateSchedule") : t("admin.appointmentDetail.confirm")}
                </PurpleOutlineButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "scheduledReject" ? (
          <ModalShell
            title={t("admin.appointmentDetail.cancelTitle")}
            subtitle={t("admin.appointmentDetail.cancelSubtitle")}
            onClose={closeActionModal}
            maxWidth={520}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  {t("admin.appointmentDetail.commentsLabel")}
                </div>
                <WorkspaceTextArea rows={6} value={scheduledRejectNote} onChange={(event) => setScheduledRejectNote(event.target.value)} placeholder={t("admin.appointmentDetail.enterComments")} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton
                  type="button"
                  variant="danger"
                  disabled={actionLoading || scheduledRejectNote.trim().length < 3}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/appointments/${appointmentId}/cancel`, { reason: scheduledRejectNote.trim() }),
                      { successMessage: t("admin.appointmentDetail.cancelSuccess") }
                    ).then((ok) => { if (ok) setSelectedAction(""); })
                  }
                >
                  {t("admin.appointmentDetail.confirmCancel")}
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "logs" ? (
          <ModalShell
            title={t("admin.appointmentDetail.logsTitle")}
            subtitle={t("admin.appointmentDetail.logsSubtitle")}
            onClose={closeActionModal}
            maxWidth={520}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  {t("admin.appointmentDetail.meetingNotesLabel")}
                </div>
                <WorkspaceTextArea rows={6} value={meetingLogNote} onChange={(event) => setMeetingLogNote(event.target.value)} placeholder={t("admin.appointmentDetail.enterMeetingNotes")} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <PurpleOutlineButton
                  disabled={actionLoading}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/appointments/${appointmentId}/log`, { notes: meetingLogNote.trim() }),
                      { successMessage: t("admin.appointmentDetail.logsSuccess") }
                    ).then((ok) => { if (ok) { setSelectedAction(""); setMeetingLogNote(""); } })
                  }
                >
                  {t("admin.appointmentDetail.saveLogs")}
                </PurpleOutlineButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "resolve" ? (
          <ModalShell
            title={t("admin.appointmentDetail.resolveTitle")}
            subtitle={t("admin.appointmentDetail.resolveSubtitle")}
            onClose={closeActionModal}
            maxWidth={520}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  {t("admin.appointmentDetail.resolutionNoteLabel")}
                </div>
                <WorkspaceTextArea rows={6} value={resolveNote} onChange={(event) => setResolveNote(event.target.value)} placeholder={t("admin.appointmentDetail.enterResolutionNote")} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || resolveNote.trim().length < 3}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/appointments/${appointmentId}/complete`, { reason: resolveNote.trim() }),
                      { successMessage: t("admin.appointmentDetail.resolveSuccess") }
                    ).then((ok) => { if (ok) { setSelectedAction(""); setResolveNote(""); } })
                  }
                >
                  {t("admin.appointmentDetail.confirmResolve")}
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}
      </WorkspacePage>
    );
  }

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
          <RiTeamLine size={18} color={C.purple} />
          <h1 style={{ margin: 0, fontSize: 20, lineHeight: 1.3, fontWeight: 600, color: C.t1 }}>{t("admin.appointmentQueue.title")}</h1>
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
                    placeholder={t("admin.appointmentQueue.searchPlaceholder")}
                    style={{ paddingLeft: 36, minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }}
                  />
                </div>
                <CustomDateFilter
                  value={createdAtFilter}
                  onChange={setCreatedAtFilter}
                  placeholder={t("admin.appointmentQueue.createdAtPlaceholder")}
                  max={formatDateValue(new Date())}
                />
                <div className="relative">
                  <Filter className="absolute left-3 top-2.5" size={17} style={{ color: C.t3 }} />
                  <WorkspaceSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ paddingLeft: 36, minHeight: 34, paddingTop: 0, paddingBottom: 0, fontSize: 11, lineHeight: "34px" }}>
                    <option value="all">{t("admin.appointmentQueue.allStatus")}</option>
                    {appointmentStatusOptions.map((status) => (
                      <option key={status} value={status}>{statusLabel(status)}</option>
                    ))}
                  </WorkspaceSelect>
                </div>
              </div>
            </div>
          </div>
          

          <div style={{ display: "flex", flexDirection: "column" }}>
          {loading ? (
            <WorkspaceEmptyState title={t("admin.appointmentQueue.loading")} />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
          ) : filteredAppointmentQueue.length === 0 ? (
            <WorkspaceEmptyState title={t("admin.appointmentQueue.noAppointments")} subtitle={t("admin.appointmentQueue.noAppointmentsSubtitle")} />
          ) : (
            <div className="hidden lg:block" style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", marginBottom: 10 }}>
                <table className="w-full text-sm" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 180, minWidth: 180, maxWidth: 180 }} />
                    <col style={{ width: "34%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: 118, minWidth: 118, maxWidth: 118 }} />
                    <col style={{ width: 128, minWidth: 128, maxWidth: 128 }} />
                    <col style={{ width: 84, minWidth: 84, maxWidth: 84 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[t("admin.appointmentQueue.colAppointmentId"), t("admin.appointmentQueue.colTitle"), t("admin.appointmentQueue.colCitizen"), t("admin.workQueue.colState"), t("admin.workQueue.colDistrict"), t("admin.appointmentQueue.colCreatedAt"), t("admin.appointmentQueue.colStatus"), t("admin.appointmentQueue.colAction")].map((column, index, all) => (
                        <th
                          key={column}
                          style={{
                            minWidth: 0,
                            maxWidth: 0,
                            padding: "13px 16px",
                            fontSize: 10,
                            fontWeight: 600,
                            color: tableHeaderText,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                            textAlign: index === 6 || index === 7 ? "center" : "left",
                            background: tableHeaderBackground,
                            borderBottom: `1px solid ${C.border}`,
                            verticalAlign: "middle",
                            borderTopLeftRadius: index === 0 ? 12 : undefined,
                            borderTopRightRadius: index === all.length - 1 ? 12 : undefined,
                          }}
                        >
                          <span title={column} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {column}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAppointmentQueue.map((appointment, index) => {
                      const citizenLabel = [appointment.first_name, appointment.last_name].filter(Boolean).join(" ") || t("admin.appointmentQueue.unknownCitizen");
                      const appointmentTitle = appointment.title || appointment.purpose || t("admin.appointmentDetail.untitledAppointment");
                      const createdAtLabel = formatDateOnly(appointment.createdAt || appointment.created_at);
                      const appointmentStatusLabel = statusLabel(appointment.status);
                      const isActionHovered = hoveredActionId === appointment.id;
                      return (
                        <tr key={appointment.id} style={{ background: index % 2 === 0 ? C.card : alternateRowBackground, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle" }}>
                          <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: C.t2, verticalAlign: "middle" }}>
                            <span title={appointment.requestId || appointment.id} style={{ display: "block", whiteSpace: "nowrap" }}>
                              {appointment.requestId || appointment.id}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px", verticalAlign: "middle", maxWidth: 0 }}>
                            <div title={appointmentTitle} style={{ fontSize: 13, fontWeight: 600, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {appointmentTitle}
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                            <span title={citizenLabel} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {citizenLabel}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                            <span title={appointment.citizenSnapshot?.state || "-"} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {appointment.citizenSnapshot?.state || "-"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                            <span title={appointment.citizenSnapshot?.district || "-"} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {appointment.citizenSnapshot?.district || "-"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: C.t2, verticalAlign: "middle", maxWidth: 0 }}>
                            <span title={createdAtLabel} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {createdAtLabel}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px 10px 8px", textAlign: "center", verticalAlign: "middle", maxWidth: 0 }}>
                            <div style={{ maxWidth: "100%", overflow: "hidden" }}>
                              <WorkspaceBadge status={appointment.status} title={appointmentStatusLabel} style={{ maxWidth: "100%" }}>
                                {appointmentStatusLabel}
                              </WorkspaceBadge>
                            </div>
                          </td>
                          <td style={{ width: "1%", padding: "10px 16px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredActionId(appointment.id)}
                              onMouseLeave={() => setHoveredActionId(null)}
                              onClick={() => {
                                setHoveredActionId(null);
                                navigate(`${PATHS.admin.appointments}/${appointment.id}?source=appointment-queue`);
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
              <div className="portal-citizen-table-footer" style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}>
                <div className="flex flex-col md:flex-row md:items-center gap-2 py-1.5" style={{ width: "calc(100% - 24px)", margin: "0 auto" }}>
                  <div className="flex items-center gap-2 md:flex-1 md:basis-0">
                    <span className="portal-citizen-caption" style={{ color: C.t2, whiteSpace: "nowrap" }}>
                      {t("admin.appointmentQueue.show")}
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
                      {t("admin.appointmentQueue.entries")}
                    </span>
                  </div>
                  <p className="portal-citizen-caption md:order-2" style={{ color: C.t2, margin: 0, whiteSpace: "nowrap", textAlign: "right", flex: 1, flexBasis: 0 }}>
                    Showing <span style={{ fontWeight: 600 }}>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAppointmentQueue.length)}</span>-<span style={{ fontWeight: 600 }}>{Math.min(currentPage * itemsPerPage, filteredAppointmentQueue.length)}</span> of{" "}
                    <span style={{ fontWeight: 600 }}>{filteredAppointmentQueue.length}</span> {t("admin.appointmentQueue.requests")}
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
    </div>
  );
}
