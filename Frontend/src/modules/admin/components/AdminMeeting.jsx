import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, FileText, Search } from "lucide-react";
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
  WorkspaceSectionHeader,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import { ErrorText, ModalShell, SuccessModal, WorkspaceTextArea } from "./AdminCaseDetail.jsx";

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
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function CustomDateFilter({ value, onChange, placeholder, min, max }) {
  const { C } = usePortalTheme();
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
      const pickerRoot = event.target.closest?.('[data-admin-meeting-date-filter="true"]');
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
    <div ref={rootRef} data-admin-meeting-date-filter="true" style={{ position: "relative", width: "100%" }}>
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
            Clear
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

function buildMeetingActions(meeting, adminId) {
  if (!meeting?.status) return [];
  const { status, assignedAdminUserId } = meeting;
  const isAssigned = assignedAdminUserId === adminId;
  if (!isAssigned) return [];
  const actions = [];
  if (["pending", "not_verified"].includes(status)) actions.push(["accept", "Accept Meeting"]);
  if (["pending", "accepted", "verification_pending", "verified", "not_verified"].includes(status)) actions.push(["reject", "Reject Meeting"]);
  if (["accepted", "not_verified", "verification_pending", "verified"].includes(status)) actions.push(["sendVerification", "Send for DEO Verification"]);
  if (["accepted", "verification_pending", "verified"].includes(status)) actions.push(["schedule", "Schedule Meeting"]);
  if (status === "scheduled") {
    actions.push(["reschedule", "Reschedule Meeting"]);
    actions.push(["complete", "Mark as Completed"]);
    actions.push(["scheduledReject", "Reject Scheduled Meeting"]);
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

export default function AdminMeeting() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const tableHeaderBackground = C.purple;
  const tableHeaderText = "#FFFFFF";
  const alternateRowBackground = C.name === "dark" ? C.bgElevated : "#F7F1FF";
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const adminId = session?.user?.id;
  const source = searchParams.get("source") || "";
  const isMeetingPoolDetail = source === "meeting-pool";
  const isMyCasesDetail = source === "my-cases";
  const isResolvedCompletedDetail = source === "resolved-completed";
  const isWorkQueueDetail = isMeetingPoolDetail || isResolvedCompletedDetail;

  const [meetings, setMeetings] = useState([]);
  const [workflowDirectory, setWorkflowDirectory] = useState({ deos: [], ministers: [] });
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [history, setHistory] = useState([]);
  const [meetingFiles, setMeetingFiles] = useState([]);
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
    location: "",
    isVip: false,
    comments: "",
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [completeNote, setCompleteNote] = useState("");
  const [scheduledRejectNote, setScheduledRejectNote] = useState("");
  const [isBackHovered, setIsBackHovered] = useState(false);
  const [hoveredActionId, setHoveredActionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredPagerButton, setHoveredPagerButton] = useState(null);
  const ITEMS_PER_PAGE = 7;

  async function loadMeetingPool() {
    const [queueResponse, directoryResponse] = await Promise.all([
      apiClient.get("/admin/work-queue"),
      apiClient.get("/admin/workflow-directory"),
    ]);
    setMeetings(Array.isArray(queueResponse.data?.meetings) ? queueResponse.data.meetings : []);
    setWorkflowDirectory(directoryResponse.data || { deos: [], ministers: [] });
  }

  async function loadMeetingDetail(id) {
    setDetailLoading(true);
    try {
      const [detailResult, filesResult] = await Promise.allSettled([
        apiClient.get(`/meetings/${id}/admin-view`),
        apiClient.get(`/meetings/${id}/files`),
      ]);
      if (detailResult.status === "rejected") {
        throw detailResult.reason;
      }
      const { data } = detailResult.value;
      const startParts = splitDateTimeParts(data.meeting?.scheduled_at);
      const endParts = splitDateTimeParts(data.meeting?.scheduled_end_at);
      setSelectedMeeting(data.meeting || null);
      setHistory(data.history || []);
      setMeetingFiles(filesResult.status === "fulfilled" ? (filesResult.value.data?.files || []) : []);
      setScheduleForm({
        ministerId: data.meeting?.ministerId || "",
        startDate: startParts.date,
        startTime: startParts.time,
        endDate: endParts.date,
        endTime: endParts.time,
        location: data.meeting?.scheduled_location || "",
        isVip: Boolean(data.meeting?.is_vip),
        comments: data.meeting?.admin_comments || "",
      });
      setScheduleError("");
      setVerificationForm({ deoId: data.meeting?.assignedDeoId || "" });
    } catch (detailError) {
      setError(detailError?.response?.data?.error || "Unable to load meeting details");
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
        await loadMeetingPool();
        if (!active) return;
        if (meetingId) {
          await loadMeetingDetail(meetingId);
        } else {
          setSelectedMeeting(null);
          setHistory([]);
          setMeetingFiles([]);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError?.response?.data?.error || "Unable to load meeting pool");
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
  }, [meetingId, session?.role]);

  const personalMeetingQueue = useMemo(
    () => meetings.filter(
      (meeting) => meeting.assignedAdminUserId === adminId && !["completed", "cancelled", "rejected"].includes(meeting.status)
    ),
    [adminId, meetings]
  );

  const filteredMeetingQueue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personalMeetingQueue.filter((meeting) => {
      const haystack = [
        meeting.requestId,
        meeting.title || meeting.purpose,
        [meeting.first_name, meeting.last_name].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesStatus = statusFilter === "all" || meeting.status === statusFilter;
      const matchesCreatedAt = !createdAtFilter || getDateOnlyValue(meeting.createdAt || meeting.created_at) === createdAtFilter;
      return matchesSearch && matchesStatus && matchesCreatedAt;
    });
  }, [createdAtFilter, personalMeetingQueue, query, statusFilter]);

  const meetingStatusOptions = useMemo(
    () => Array.from(new Set(personalMeetingQueue.map((meeting) => meeting.status).filter(Boolean))).sort(),
    [personalMeetingQueue]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, createdAtFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMeetingQueue.length / ITEMS_PER_PAGE));
  const paginatedMeetingQueue = filteredMeetingQueue.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const queueStats = useMemo(() => {
    const accepted = meetings.filter((meeting) => meeting.status === "accepted").length;
    const scheduled = meetings.filter((meeting) => meeting.status === "scheduled").length;
    return [
      { label: "My Meeting Queue", value: personalMeetingQueue.length },
      { label: "Accepted", value: accepted },
      { label: "Scheduled", value: scheduled },
    ];
  }, [meetings, personalMeetingQueue.length]);

  const availableActions = useMemo(
    () => buildMeetingActions(selectedMeeting || {}, adminId),
    [selectedMeeting, adminId]
  );

  async function refreshAll(id = meetingId) {
    await loadMeetingPool();
    if (id) {
      await loadMeetingDetail(id);
    }
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
        await loadMeetingPool();
        navigate(isWorkQueueDetail ? PATHS.admin.workQueue : PATHS.admin.meetings);
        return true;
      }
      if (options.navigateToMeetingQueue) {
        await loadMeetingPool();
        navigate(PATHS.admin.meetings);
        return true;
      }
      await refreshAll();
      return true;
    } catch (actionErrorValue) {
      setActionError(actionErrorValue?.response?.data?.error || "Unable to update meeting");
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function uploadMeetingPhoto() {
    if (!uploadFile) return;
    setUploadingFile(true);
    setActionError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      await apiClient.post(`/meetings/${meetingId}/photos`, formData);
      await loadMeetingDetail(meetingId);
      setUploadFile(null);
    } catch (uploadError) {
      setActionError(uploadError?.response?.data?.error || "Unable to upload meeting photo");
    } finally {
      setUploadingFile(false);
    }
  }

  function closeActionModal() {
    setSelectedAction("");
  }

  function handleSuccessModalClose() {
    const redirectPath = pendingSuccessRedirect;
    setSuccessMessage("");
    setPendingSuccessRedirect("");
    if (redirectPath) {
      navigate(redirectPath);
    }
  }

  if (meetingId) {
    if (loading || detailLoading || !selectedMeeting) {
      return (
        <WorkspacePage width={1200}>
          {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : <WorkspaceEmptyState title="Loading meeting details..." />}
        </WorkspacePage>
      );
    }

    const isAssignedToCurrentAdmin = selectedMeeting.assignedAdminUserId === adminId;
    const isUnassignedPoolMeeting = selectedMeeting.status === "pending" && !selectedMeeting.assignedAdminUserId;
    const canSendVerification = isAssignedToCurrentAdmin && ["accepted", "not_verified", "verification_pending", "verified"].includes(selectedMeeting.status);
    const canSchedule = isAssignedToCurrentAdmin && ["accepted", "verification_pending", "verified", "scheduled"].includes(selectedMeeting.status);
    const canUploadPhotos = isAssignedToCurrentAdmin && ["scheduled", "completed"].includes(selectedMeeting.status);
    const verificationPending = selectedMeeting.status === "verification_pending";
    const verificationDone = selectedMeeting.status === "verified";
    const isCompletedMeetingDetail = isResolvedCompletedDetail && selectedMeeting.status === "completed";
    const showAssignToMeButton = !selectedMeeting.assignedAdminUserId && (isMeetingPoolDetail || isUnassignedPoolMeeting);
    const showWorkflowActions = !showAssignToMeButton && !isResolvedCompletedDetail;

    const backPath = isMyCasesDetail
      ? PATHS.admin.cases
      : source === "meeting-queue"
          ? PATHS.admin.meetings
          : isMeetingPoolDetail || isResolvedCompletedDetail || isUnassignedPoolMeeting
            ? PATHS.admin.workQueue
            : PATHS.admin.meetings;
    const citizenName = [selectedMeeting.first_name, selectedMeeting.last_name].filter(Boolean).join(" ") || "Unknown";
    const citizenPhone = selectedMeeting.mobile_number || "Not provided";
    const createdAtLabel = formatDateOnly(selectedMeeting.createdAt || selectedMeeting.created_at);
    const updatedAtLabel = formatDateOnly(selectedMeeting.updatedAt || selectedMeeting.updated_at || selectedMeeting.createdAt || selectedMeeting.created_at);
    const preferredMeetingDateLabel = formatDateOnly(selectedMeeting.preferred_time);
    const preferredMeetingTimeLabel = formatTimeOnly(selectedMeeting.preferred_time);
    const meetingStatusLabel = statusLabel(selectedMeeting.status);
    const citizenContact = selectedMeeting.mobile_number || selectedMeeting.email || "Not provided";
    const scheduledAtLabel = selectedMeeting.scheduled_at ? new Date(selectedMeeting.scheduled_at).toLocaleString("en-IN") : "Pending";
    const scheduledLocationLabel = selectedMeeting.scheduled_location || "Pending";
    const hasReasonDetails = Boolean(
      selectedMeeting.rejection_reason ||
      selectedMeeting.verification_reason ||
      selectedMeeting.admin_comments ||
      selectedMeeting.completionNote ||
      selectedMeeting.cancellationReason
    );
    const detailPanelHeight = hasReasonDetails ? "auto" : 540;

    return (
      <WorkspacePage
        width={1280}
        outerStyle={isWorkQueueDetail ? { height: "calc(100vh - 73px)", overflow: "hidden" } : undefined}
        contentStyle={isWorkQueueDetail ? { height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } : undefined}
      >
        <SuccessModal open={!!successMessage} message={successMessage} onClose={handleSuccessModalClose} />

        <WorkspaceSectionHeader
          title={selectedMeeting.requestId || selectedMeeting.id}
          action={
            <button
              type="button"
              onClick={() => navigate(backPath)}
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
              <ChevronLeft size={16} />{isWorkQueueDetail ? "Back to Work Queue" : "Back to Meeting Queue"}
            </button>
          }
        />

        <div style={{ display: "grid", gap: isWorkQueueDetail ? 16 : 24, flex: isWorkQueueDetail ? 1 : undefined, minHeight: isWorkQueueDetail ? 0 : undefined, overflow: isWorkQueueDetail ? "hidden" : undefined }}>
          {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : null}
          {actionError ? <WorkspaceCard style={{ color: C.danger }}>{actionError}</WorkspaceCard> : null}

          <div style={isWorkQueueDetail ? undefined : { maxWidth: 320 }}>
            {showAssignToMeButton ? (
              <WorkspaceButton
                type="button"
                disabled={actionLoading}
                onClick={() => runAction(
                  () => apiClient.patch(`/meetings/${meetingId}/assign-self`, {}),
                  { successMessage: "Meeting successfully assigned to you.", successRedirect: PATHS.admin.meetings }
                )}
                style={isWorkQueueDetail ? { boxShadow: "none" } : undefined}
              >
                Assign to Me
              </WorkspaceButton>
            ) : showWorkflowActions ? (
              <div>
                <WorkspaceSelect
                  value={selectedAction}
                  onChange={(event) => setSelectedAction(event.target.value)}
                >
                  <option value="">Select workflow action</option>
                  {availableActions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </WorkspaceSelect>
              </div>
            ) : null}
          </div>

          {isWorkQueueDetail ? (
            <WorkspaceCard style={{ marginBottom: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <WorkspaceCardHeader title="Meeting Information" />
              <div style={{ display: "grid", gap: 18, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
                {isCompletedMeetingDetail ? (
                  <>
                    <div className="grid md:grid-cols-3 gap-6">
                      <DetailItem label="Meeting Id" value={selectedMeeting.requestId || selectedMeeting.id} />
                      <DetailItem label="Handoff Type" value="Mark as Completed" />
                      <DetailItem label="Completed Date" value={formatDateOnly(selectedMeeting.updated_at || selectedMeeting.updatedAt)} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Title</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>
                        {selectedMeeting.title || selectedMeeting.purpose || "Untitled Meeting"}
                      </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                      <DetailItem label="Created At" value={createdAtLabel} />
                      <DetailItem label="Citizen Name" value={citizenName} />
                      <DetailItem label="Citizen Phone Number" value={citizenPhone} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <DetailItem label="Preferred Date" value={preferredMeetingDateLabel} />
                      <DetailItem label="Preferred Time" value={preferredMeetingTimeLabel} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Description</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {selectedMeeting.purpose || selectedMeeting.description || "Not provided"}
                      </p>
                    </div>
                    {selectedMeeting.completionNote ? <NoticeBox tone="green" label="Summary" value={selectedMeeting.completionNote} /> : null}
                  </>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <DetailItem label="Meeting Id" value={selectedMeeting.requestId || selectedMeeting.id} />
                      <DetailItem label="Created At" value={createdAtLabel} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Title</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>
                        {selectedMeeting.title || selectedMeeting.purpose || "Untitled Meeting"}
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <DetailItem label="Citizen Name" value={citizenName} />
                      <DetailItem label="Citizen Phone Number" value={citizenPhone} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <DetailItem label="Preferred Date" value={preferredMeetingDateLabel} />
                      <DetailItem label="Preferred Time" value={preferredMeetingTimeLabel} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Description</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {selectedMeeting.purpose || selectedMeeting.description || "Not provided"}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {(!isCompletedMeetingDetail && (selectedMeeting.rejection_reason || selectedMeeting.verification_reason || selectedMeeting.admin_comments || selectedMeeting.completionNote || selectedMeeting.cancellationReason)) ? (
                <div className="mt-6 space-y-3">
                  {selectedMeeting.rejection_reason ? <NoticeBox tone="red" label="Rejection Reason" value={selectedMeeting.rejection_reason} /> : null}
                  {selectedMeeting.verification_reason ? <NoticeBox tone="amber" label="Verification Reason" value={selectedMeeting.verification_reason} /> : null}
                  {selectedMeeting.admin_comments ? <NoticeBox tone="blue" label="Admin Comments" value={selectedMeeting.admin_comments} /> : null}
                  {selectedMeeting.completionNote ? <NoticeBox tone="blue" label="Completion Note" value={selectedMeeting.completionNote} /> : null}
                  {selectedMeeting.cancellationReason ? <NoticeBox tone="red" label="Cancellation Reason" value={selectedMeeting.cancellationReason} /> : null}
                </div>
              ) : null}
            </WorkspaceCard>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gap: 24,
                  gridTemplateColumns: "minmax(0, 7fr) minmax(280px, 3fr)",
                  alignItems: "stretch",
                }}
              >
                <WorkspaceCard style={{ marginBottom: 0, minHeight: 540, height: detailPanelHeight, display: "flex", flexDirection: "column" }}>
                  <WorkspaceCardHeader title="Meeting Information" />
                  <div style={{ display: "grid", gap: 18, flex: 1 }}>
                    <InlineDetailGrid columns={3}>
                      <DetailItem label="Meeting Id" value={selectedMeeting.requestId || selectedMeeting.id} />
                      <DetailItem label="Updated At" value={updatedAtLabel} />
                      <DetailItem
                        label="Status"
                        value={(
                          <WorkspaceBadge status={selectedMeeting.status} title={meetingStatusLabel}>
                            {meetingStatusLabel}
                          </WorkspaceBadge>
                        )}
                      />
                    </InlineDetailGrid>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Meeting Title</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>
                        {selectedMeeting.title || selectedMeeting.purpose || "Untitled Meeting"}
                      </p>
                    </div>
                    <InlineDetailGrid columns={3}>
                      <DetailItem label="Citizen Id" value={selectedMeeting.citizen_code || selectedMeeting.citizen_id || "Pending"} />
                      <DetailItem label="Citizen Name" value={citizenName} />
                      <DetailItem label="Contact" value={citizenContact} />
                    </InlineDetailGrid>
                    <InlineDetailGrid columns={3}>
                      <DetailItem label="Created At" value={createdAtLabel} />
                      <DetailItem label="Preferred Date" value={preferredMeetingDateLabel} />
                      <DetailItem label="Preferred Time" value={preferredMeetingTimeLabel} />
                    </InlineDetailGrid>
                    <InlineDetailGrid columns={3}>
                      <DetailItem
                        label="Scheduled At"
                        value={(
                          <WorkspaceBadge status={selectedMeeting.scheduled_at ? "scheduled" : "pending"} color={selectedMeeting.scheduled_at ? C.mint : undefined} title={scheduledAtLabel}>
                            {scheduledAtLabel}
                          </WorkspaceBadge>
                        )}
                      />
                      <DetailItem
                        label="Scheduled Location"
                        value={(
                          <WorkspaceBadge status={selectedMeeting.scheduled_location ? "scheduled" : "pending"} color={selectedMeeting.scheduled_location ? C.mint : undefined} title={scheduledLocationLabel}>
                            {scheduledLocationLabel}
                          </WorkspaceBadge>
                        )}
                      />
                      <DetailItem
                        label="VIP Meeting"
                        value={(
                          <WorkspaceBadge color={selectedMeeting.is_vip ? C.mint : C.danger} title={selectedMeeting.is_vip ? "Yes" : "No"}>
                            {selectedMeeting.is_vip ? "Yes" : "No"}
                          </WorkspaceBadge>
                        )}
                      />
                    </InlineDetailGrid>
                    <div>
                      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Purpose Of Meeting</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {selectedMeeting.purpose || "Not provided"}
                      </p>
                    </div>
                    {selectedMeeting.rejection_reason ? (
                      <div>
                        <p style={{ fontSize: 11, color: C.danger, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Reason For Rejection</p>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.danger, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {selectedMeeting.rejection_reason}
                        </p>
                      </div>
                    ) : null}
                    {(selectedMeeting.verification_reason || selectedMeeting.admin_comments || selectedMeeting.completionNote || selectedMeeting.cancellationReason) ? (
                      <div className="space-y-3">
                        {selectedMeeting.verification_reason ? <NoticeBox tone="amber" label="Verification Reason" value={selectedMeeting.verification_reason} /> : null}
                        {selectedMeeting.admin_comments ? <NoticeBox tone="blue" label="Admin Comments" value={selectedMeeting.admin_comments} /> : null}
                        {selectedMeeting.completionNote ? <NoticeBox tone="blue" label="Completion Note" value={selectedMeeting.completionNote} /> : null}
                        {selectedMeeting.cancellationReason ? <NoticeBox tone="red" label="Cancellation Reason" value={selectedMeeting.cancellationReason} /> : null}
                      </div>
                    ) : null}
                  </div>
                </WorkspaceCard>

                <WorkspaceCard style={{ marginBottom: 0, minHeight: 540, height: detailPanelHeight, display: "flex", flexDirection: "column" }}>
                  <div className="flex items-center gap-2 mb-6">
                    <FileText size={22} color={C.purple} />
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>Timeline</h2>
                  </div>
                  <div style={{ display: "grid", gap: 18, overflowY: "auto", paddingRight: 6, flex: 1, minHeight: 0 }}>
                    {history.length === 0 ? (
                      <p style={{ fontSize: 13, color: C.t3 }}>No timeline events yet.</p>
                    ) : (
                      history.map((event, index) => (
                        <div key={`${event.created_at}-${index}`} className="flex gap-4">
                          <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
                            <div className="h-3 w-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
                            {index !== history.length - 1 ? <div className="mt-2 w-0.5 flex-1 min-h-10" style={{ background: C.purple }} /> : null}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p style={{ margin: 0, fontWeight: 600, color: C.t1 }}>{statusLabel(event.new_status)}</p>
                                <p style={{ fontSize: 12, color: C.t3, marginTop: 4, marginBottom: 0 }}>{event.actor_role}</p>
                              </div>
                              <p style={{ fontSize: 12, color: C.t3, whiteSpace: "nowrap", margin: 0 }}>{new Date(event.created_at).toLocaleDateString("en-IN")}</p>
                            </div>
                            {(event.new_status === "verification_pending" ? "Sent to DEO for Verification" : event.note) ? (
                              <p style={{ fontSize: 13, color: C.t2, marginTop: 8, marginBottom: 0, whiteSpace: "normal", wordBreak: "break-word" }}>
                                {event.new_status === "verification_pending" ? "Sent to DEO for Verification" : event.note}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </WorkspaceCard>
              </div>

              <WorkspaceCard>
                <WorkspaceCardHeader
                  title="Meeting Files"
                  subtitle={canUploadPhotos ? "Meeting photos uploaded here are visible from the minister calendar." : "View the citizen submission files and uploaded meeting artifacts."}
                />
                {canUploadPhotos ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="file" accept="image/png,image/jpeg" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
                    <WorkspaceButton type="button" disabled={!uploadFile || uploadingFile} onClick={uploadMeetingPhoto}>
                      {uploadingFile ? "Uploading..." : "Upload Photo"}
                    </WorkspaceButton>
                  </div>
                ) : null}
                {meetingFiles.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>No files attached to this meeting yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {meetingFiles.map((file) => (
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
            title="Accept Meeting"
            subtitle="Confirm before accepting this meeting into your workflow."
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ fontSize: 13, color: C.t3 }}>This will move the meeting to the accepted state.</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/meetings/${meetingId}/accept`, {}),
                      { successMessage: "Meeting accepted successfully." }
                    ).then((ok) => { if (ok) setSelectedAction(""); })
                  }
                >
                  Confirm Accept
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "reject" ? (
          <ModalShell
            title="Reject Meeting"
            subtitle="Provide a reason for rejection before confirming."
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  Reason For Rejection
                </div>
                <WorkspaceTextArea rows={6} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Enter the rejection reason" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
                <WorkspaceButton
                  type="button"
                  variant="danger"
                  disabled={actionLoading || rejectReason.trim().length < 5}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/meetings/${meetingId}/reject`, { reason: rejectReason }),
                      { successMessage: "Meeting rejected successfully." }
                    ).then((ok) => { if (ok) setSelectedAction(""); })
                  }
                >
                  Confirm Reject
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "sendVerification" && canSendVerification ? (
          <ModalShell
            title="Send For DEO Verification"
            subtitle="Assign a verified DEO to review the accepted meeting."
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  Assign To DEO
                </div>
                <WorkspaceSelect
                  value={verificationForm.deoId}
                  disabled={verificationPending || verificationDone}
                  onChange={(event) => setVerificationForm({ deoId: event.target.value })}
                >
                  <option value="">Select DEO</option>
                  {workflowDirectory.deos.map((deo) => (
                    <option key={deo.id} value={deo.id}>
                      {[deo.first_name, deo.last_name].filter(Boolean).join(" ")}{deo.designation ? ` · ${deo.designation}` : ""}
                    </option>
                  ))}
                </WorkspaceSelect>
                {verificationPending ? <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.danger }}>Sent for verification</div> : null}
                {verificationDone ? <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.mint }}>Verified successfully. You can now schedule the meeting.</div> : null}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || !verificationForm.deoId || verificationPending || verificationDone}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/meetings/${meetingId}/assign-verification`, { deoId: verificationForm.deoId }),
                      { successMessage: "Meeting sent for verification successfully." }
                    ).then((ok) => { if (ok) setSelectedAction(""); })
                  }
                >
                  Send For Verification
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {(selectedAction === "schedule" || selectedAction === "reschedule") && canSchedule ? (
          <ModalShell
            title={selectedAction === "reschedule" ? "Reschedule Meeting" : "Schedule Meeting"}
            subtitle="Choose the minister, time window, and meeting location before confirming."
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <label className="flex items-center gap-2" style={{ fontSize: 12, color: C.t2 }}>
                <input
                  type="checkbox"
                  checked={scheduleForm.isVip}
                  style={{ width: 14, height: 14 }}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, isVip: event.target.checked }))}
                />
                Mark as VIP meeting
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <WorkspaceSelect
                  value={scheduleForm.ministerId}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, ministerId: event.target.value }))}
                >
                  <option value="">Select Minister</option>
                  {workflowDirectory.ministers.map((minister) => (
                    <option key={minister.id} value={minister.id}>
                      {[minister.first_name, minister.last_name].filter(Boolean).join(" ")}
                    </option>
                  ))}
                </WorkspaceSelect>
                <WorkspaceInput
                  value={scheduleForm.location}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Location"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Start</div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
                    <WorkspaceInput type="date" value={scheduleForm.startDate} onChange={(event) => { setScheduleError(""); setScheduleForm((current) => ({ ...current, startDate: event.target.value })); }} />
                    <WorkspaceInput type="time" value={scheduleForm.startTime} onChange={(event) => { setScheduleError(""); setScheduleForm((current) => ({ ...current, startTime: event.target.value })); }} />
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>End</div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
                    <WorkspaceInput type="date" value={scheduleForm.endDate} onChange={(event) => { setScheduleError(""); setScheduleForm((current) => ({ ...current, endDate: event.target.value })); }} />
                    <WorkspaceInput type="time" value={scheduleForm.endTime} onChange={(event) => { setScheduleError(""); setScheduleForm((current) => ({ ...current, endTime: event.target.value })); }} />
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  Comments
                </div>
                <WorkspaceTextArea rows={6} value={scheduleForm.comments} onChange={(event) => setScheduleForm((current) => ({ ...current, comments: event.target.value }))} placeholder="Comments" />
                <ErrorText>{scheduleError}</ErrorText>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || !scheduleForm.ministerId || !scheduleForm.startDate || !scheduleForm.startTime || !scheduleForm.endDate || !scheduleForm.endTime || !scheduleForm.location.trim()}
                  onClick={() => {
                    setScheduleError("");
                    if (selectedMeeting.status === "verification_pending") {
                      setScheduleError("You can schedule after verification");
                      return;
                    }
                    runAction(
                      () => apiClient.patch(`/meetings/${meetingId}/schedule`, {
                        ministerId: scheduleForm.ministerId,
                        startsAt: combineDateAndTime(scheduleForm.startDate, scheduleForm.startTime),
                        endsAt: combineDateAndTime(scheduleForm.endDate, scheduleForm.endTime),
                        location: scheduleForm.location.trim(),
                        isVip: scheduleForm.isVip,
                        comments: scheduleForm.comments,
                      }),
                      { successMessage: "Meeting scheduled successfully." }
                    ).then((ok) => { if (ok) setSelectedAction(""); });
                  }}
                >
                  {selectedAction === "reschedule" ? "Update Schedule" : "Schedule Meeting"}
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "complete" ? (
          <ModalShell
            title="Mark Meeting As Completed"
            subtitle="Write completion comments before confirming."
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  Comments
                </div>
                <WorkspaceTextArea rows={6} value={completeNote} onChange={(event) => setCompleteNote(event.target.value)} placeholder="Enter comments" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || completeNote.trim().length < 3}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/meetings/${meetingId}/complete`, { reason: completeNote.trim() }),
                      { successMessage: "Meeting marked as completed." }
                    ).then((ok) => { if (ok) setSelectedAction(""); })
                  }
                >
                  Confirm Completion
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {selectedAction === "scheduledReject" ? (
          <ModalShell
            title="Reject Scheduled Meeting"
            subtitle="Write rejection comments before confirming."
            onClose={closeActionModal}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  Comments
                </div>
                <WorkspaceTextArea rows={6} value={scheduledRejectNote} onChange={(event) => setScheduledRejectNote(event.target.value)} placeholder="Enter comments" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
                <WorkspaceButton
                  type="button"
                  variant="danger"
                  disabled={actionLoading || scheduledRejectNote.trim().length < 3}
                  onClick={() =>
                    runAction(
                      () => apiClient.patch(`/meetings/${meetingId}/cancel`, { reason: scheduledRejectNote.trim() }),
                      { successMessage: "Meeting rejected successfully." }
                    ).then((ok) => { if (ok) setSelectedAction(""); })
                  }
                >
                  Confirm Reject
                </WorkspaceButton>
              </div>
            </div>
          </ModalShell>
        ) : null}
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage
      width={1280}
      outerStyle={{ height: "calc(100vh - 73px)", overflow: "hidden" }}
      contentStyle={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <WorkspaceSectionHeader
          
          title="MEETING QUEUE"
        
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
                placeholder="Search by Meeting Id , Title and Citizen"
                style={{ paddingLeft: 40 }}
              />
            </div>
            <WorkspaceSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {meetingStatusOptions.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </WorkspaceSelect>
            <CustomDateFilter
              value={createdAtFilter}
              onChange={setCreatedAtFilter}
              placeholder="Created at"
              max={formatDateValue(new Date())}
            />
          </div>
          

          {loading ? (
            <WorkspaceEmptyState title="Loading meeting queue..." />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
          ) : filteredMeetingQueue.length === 0 ? (
            <WorkspaceEmptyState title="No assigned meetings found" subtitle="Meetings you assign to yourself from the Meeting Pool will appear here." />
          ) : (
            <WorkspaceCard style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, marginBottom: 0 }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 180, minWidth: 180, maxWidth: 180 }} />
                    <col style={{ width: "46%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: 118, minWidth: 118, maxWidth: 118 }} />
                    <col style={{ width: 128, minWidth: 128, maxWidth: 128 }} />
                    <col style={{ width: 84, minWidth: 84, maxWidth: 84 }} />
                  </colgroup>
                  <thead style={{ background: tableHeaderBackground, borderBottom: `1px solid ${C.border}` }}>
                    <tr>
                      {["Meeting Id", "Title", "Citizen", "Created At", "Status", "Action"].map((column) => (
                        <th
                          key={column}
                          style={{
                            minWidth: 0,
                            maxWidth: 0,
                            padding: column === "Action" ? "13px 10px" : "13px 12px",
                            fontSize: 10,
                            fontWeight: 600,
                            color: tableHeaderText,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                            textAlign: column === "Status" || column === "Action" ? "center" : "left",
                            background: tableHeaderBackground,
                            verticalAlign: "middle",
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
                    {paginatedMeetingQueue.map((meeting, index) => {
                      const citizenLabel = [meeting.first_name, meeting.last_name].filter(Boolean).join(" ") || "Unknown Citizen";
                      const meetingTitle = meeting.title || meeting.purpose || "Untitled Meeting";
                      const createdAtLabel = formatDateOnly(meeting.createdAt || meeting.created_at);
                      const meetingStatusLabel = statusLabel(meeting.status);
                      const isActionHovered = hoveredActionId === meeting.id;
                      return (
                        <tr key={meeting.id} style={{ background: index % 2 === 0 ? C.card : alternateRowBackground, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle" }}>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: C.purple, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle" }}>
                            <span title={meeting.requestId || meeting.id} style={{ display: "block", whiteSpace: "nowrap" }}>
                              {meeting.requestId || meeting.id}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                            <div title={meetingTitle} style={{ fontSize: 13, fontWeight: 600, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {meetingTitle}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                            <span title={citizenLabel} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {citizenLabel}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, color: C.t2, borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                            <span title={createdAtLabel} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {createdAtLabel}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", maxWidth: 0 }}>
                            <div style={{ maxWidth: "100%", overflow: "hidden" }}>
                              <WorkspaceBadge status={meeting.status} title={meetingStatusLabel} style={{ maxWidth: "100%" }}>
                                {meetingStatusLabel}
                              </WorkspaceBadge>
                            </div>
                          </td>
                          <td style={{ width: "1%", padding: "10px 10px", textAlign: "center", borderBottom: `1px solid ${C.borderLight}`, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredActionId(meeting.id)}
                              onMouseLeave={() => setHoveredActionId(null)}
                              onClick={() => navigate(`${PATHS.admin.meetings}/${meeting.id}?source=meeting-queue`)}
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
              </div>

              <div style={{ background: C.bgElevated, borderTop: `1px solid ${C.border}` }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-3.5">
                  <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>
                    Showing <span style={{ fontWeight: 600 }}>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredMeetingQueue.length)}</span>-<span style={{ fontWeight: 600 }}>{Math.min(currentPage * ITEMS_PER_PAGE, filteredMeetingQueue.length)}</span> of{" "}
                    <span style={{ fontWeight: 600 }}>{filteredMeetingQueue.length}</span> requests
                  </p>

                  {totalPages > 1 ? (
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
                  ) : null}
                </div>
              </div>
            </WorkspaceCard>
          )}
        </div>
      </div>
    </WorkspacePage>
  );
}
