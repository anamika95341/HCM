import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import { WorkspaceBadge, WorkspaceButton, WorkspaceCard, WorkspaceCardHeader, WorkspaceEmptyState, WorkspacePage, WorkspaceSectionHeader, WorkspaceTabs } from "../../../shared/components/WorkspaceUI.jsx";

const VIEW_OPTIONS = ["month", "week", "day"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getStaticData = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  return [
    {
      id: "1",
      sourceId: "src-1",
      title: "Project Kickoff",
      details: "Initial sync with the engineering team to discuss Q3 roadmap.",
      startsAt: new Date(y, m, d, 10, 0).toISOString(),
      endsAt: new Date(y, m, d, 11, 30).toISOString(),
      location: "Conference Room A",
      type: "Scheduled Meeting",
      source: "Internal",
    },
    {
      id: "2",
      sourceId: "src-2",
      title: "Client Presentation",
      details: "Presenting the new design mockups to the client.",
      startsAt: new Date(y, m, d + 1, 14, 0).toISOString(),
      endsAt: new Date(y, m, d + 1, 15, 0).toISOString(),
      location: "Zoom Meet",
      type: "Scheduled Meeting",
      source: "External",
    },
    {
      id: "3",
      sourceId: "src-3",
      title: "Team Lunch",
      details: "Monthly team lunch and team building activity.",
      startsAt: new Date(y, m, d + 2, 12, 30).toISOString(),
      endsAt: new Date(y, m, d + 2, 14, 0).toISOString(),
      location: "Downtown Cafe",
      type: "Scheduled Meeting",
      source: "Internal",
    },
    {
      id: "4",
      sourceId: "src-4",
      title: "Weekly Review",
      details: "Reviewing metrics and blocker resolution.",
      startsAt: new Date(y, m, d - 1, 9, 0).toISOString(),
      endsAt: new Date(y, m, d - 1, 10, 0).toISOString(),
      location: "Google Meet",
      type: "Scheduled Meeting",
      source: "Internal",
    }
  ];
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sortByStartTime(items) {
  return [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function getItemTone(item, C) {
  if (item.calendarKind === "complaintCall") return C.mint;
  return item.type === "VIP Meeting" ? C.warn : C.purple;
}

function DayMeetingsModal({ date, items, onClose, onSelectMeeting }) {
  const { C } = usePortalTheme();

  if (!date) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex sm:items-center justify-center overflow-y-auto">
        <div
          className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 fade-in duration-300"
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.dialogShadow }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-6 sm:px-8 py-6 border-b flex items-start justify-between gap-4" style={{ background: C.bgElevated, borderColor: C.border }}>
            <div className="min-w-0">
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em" }}>
                Meeting Schedule
              </div>
              <h3 className="mt-3 text-2xl font-bold break-words" style={{ color: C.t1 }}>
                {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h3>
              <div className="mt-2 text-sm" style={{ color: C.t2 }}>
                Total Meetings: {items.length}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg transition-colors flex-shrink-0"
              style={{ color: C.t2, background: "transparent" }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 sm:p-8 max-h-[320px] overflow-y-auto">
            {items.length === 0 ? (
              <div style={{ fontSize: 13, color: C.t3, textAlign: "center", padding: "24px 0" }}>No meetings for this date.</div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const tone = getItemTone(item, C);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectMeeting(item)}
                      className="w-full text-left rounded-xl p-4 transition-all"
                      style={{ border: `1px solid ${C.border}`, background: C.bgElevated }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: `${tone}33`, background: `${tone}12`, color: tone }}>
                            {item.type}
                          </div>
                          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: C.t1 }} className="break-words">
                            {item.title}
                          </div>
                          <div style={{ fontSize: 12, color: C.t2, marginTop: 6 }}>
                            {item.location || "Location pending"}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: C.t2, whiteSpace: "nowrap", fontWeight: 600 }}>
                          {formatTime(item.startsAt)} - {formatTime(item.endsAt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Modal({ item, mode, editForm, setEditForm, onClose, onSave, onModeChange, saving }) {
  const { C } = usePortalTheme();
  if (!item) return null;
  const tone = getItemTone(item, C);
  const isComplaintCall = item.calendarKind === "complaintCall";
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex  sm:items-center justify-center overflow-y-auto">
        <div 
          className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 fade-in duration-300"
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.dialogShadow }}
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="px-6 sm:px-8 py-6 sm:py-8 border-b flex items-start justify-between gap-4" style={{ background: C.bgElevated, borderColor: C.border }}>
            <div className="flex-1 min-w-0">
              <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: `${tone}33`, background: `${tone}12`, color: tone }}>
                {item.type}
              </div>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold break-words" style={{ color: C.t1 }}>{item.title}</h3>
              <div className="text-xs sm:text-sm mt-3 flex flex-wrap items-center gap-2" style={{ color: C.t2 }}>
                <span>{new Date(item.startsAt).toLocaleDateString()}</span>
                <span>•</span>
                <span className="font-medium">{formatTime(item.startsAt)}</span>
                <span>-</span>
                <span className="font-medium">{formatTime(item.endsAt)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg transition-colors flex-shrink-0"
              style={{ color: C.t2, background: "transparent" }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: C.card }}>
            <WorkspaceTabs
              items={isComplaintCall
                ? [{ id: "details", label: "Details" }, { id: "edit", label: "Edit" }]
                : [{ id: "details", label: "Details" }, { id: "edit", label: "Edit" }]}
              value={mode}
              onChange={onModeChange}
            />
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 max-h-[calc(100vh-300px)] sm:max-h-[70vh] overflow-y-auto">
            {mode === "details" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
                      {isComplaintCall ? "Citizen / Contact" : "Location"}
                    </p>
                    <p style={{ fontSize: 16, color: C.t1, fontWeight: 600 }} className="break-words">
                      {isComplaintCall ? item.location || "Contact pending" : item.location || "Location pending"}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>Source</p>
                    <p style={{ fontSize: 16, color: C.t1, fontWeight: 600 }}>{item.source}</p>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>Description</p>
                  <p style={{ color: C.t2, lineHeight: 1.75, fontSize: 14 }}>{item.details}</p>
                </div>
              </div>
            )}

            {mode === "edit" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onSave();
                }}
                className="space-y-5 sm:space-y-6 animate-in fade-in duration-200"
              >
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 10 }}>Title</label>
                  <input
                    value={editForm.title}
                    onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.inp, color: C.t1, fontSize: 14 }}
                    placeholder="Meeting title"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 10 }}>Description</label>
                  <textarea
                    value={editForm.details}
                    onChange={(event) => setEditForm((current) => ({ ...current, details: event.target.value }))}
                    rows={5}
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.inp, color: C.t1, fontSize: 14 }}
                    placeholder="Meeting description"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 10 }}>Date</label>
                    <input
                      type="date"
                      value={editForm.meetingDate}
                      onChange={(event) => setEditForm((current) => ({ ...current, meetingDate: event.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.inp, color: C.t1, fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 10 }}>Start Time</label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(event) => setEditForm((current) => ({ ...current, startTime: event.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.inp, color: C.t1, fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 10 }}>End Time</label>
                    <input
                      type="time"
                      value={editForm.endTime}
                      onChange={(event) => setEditForm((current) => ({ ...current, endTime: event.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.inp, color: C.t1, fontSize: 14 }}
                    />
                  </div>
                </div>

                {!isComplaintCall && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 10 }}>Location</label>
                    <input
                      value={editForm.location}
                      onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.inp, color: C.t1, fontSize: 14 }}
                      placeholder="Meeting location"
                    />
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <WorkspaceButton type="button" variant="ghost" onClick={onClose} style={{ flex: 1 }}>
                    Cancel
                  </WorkspaceButton>
                  <WorkspaceButton type="submit" disabled={saving} style={{ flex: 1 }}>
                    {saving ? "Saving..." : "Save Changes"}
                  </WorkspaceButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Calendar() {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedDateItems, setSelectedDateItems] = useState(null);
  const [modalMode, setModalMode] = useState("details");
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", details: "", meetingDate: "", startTime: "", endTime: "", location: "" });

  useEffect(() => {
    let mounted = true;

    async function loadCalendar() {
      try {
        const queueResponse = await apiClient.get("/admin/work-queue", authorizedConfig(session.accessToken));
        const data = queueResponse.data;
        const scheduledMeetings = (data.meetings || [])
          .filter((meeting) => meeting.status === "scheduled" && meeting.scheduled_at)
          .map((meeting) => ({
            id: meeting.id,
            calendarKind: "meeting",
            sourceId: meeting.requestId || meeting.id,
            ministerId: meeting.ministerId,
            title: meeting.title || meeting.purpose,
            details: meeting.admin_comments || meeting.purpose,
            startsAt: meeting.scheduled_at,
            endsAt: meeting.scheduled_end_at || new Date(new Date(meeting.scheduled_at).getTime() + 30 * 60 * 1000).toISOString(),
            location: meeting.scheduled_location || "Location pending",
            type: meeting.is_vip ? "VIP Meeting" : "Scheduled Meeting",
            source: "Citizen Meeting Workflow",
            isVip: Boolean(meeting.is_vip),
          }));

        const scheduledCalls = (data.complaints || [])
          .filter((complaint) => complaint.callScheduledAt)
          .map((complaint) => {
            const startAt = complaint.callScheduledAt;
            const endAt = new Date(new Date(startAt).getTime() + 30 * 60 * 1000).toISOString();
            return {
              id: complaint.id,
              calendarKind: "complaintCall",
              sourceId: complaint.complaintId || complaint.id,
              title: complaint.title || complaint.subject || "Scheduled Call",
              details: complaint.description || complaint.details || "Complaint follow-up call",
              startsAt: startAt,
              endsAt: endAt,
              location: complaint.citizenSnapshot?.name || complaint.currentOwner || "Citizen call",
              type: "Scheduled Call",
              source: "Complaint Workflow",
              callStatus: complaint.status,
            };
          });

        if (mounted) {
          const calendarItems = [...scheduledMeetings, ...scheduledCalls];
          setItems(calendarItems.length ? calendarItems : getStaticData());
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load admin calendar");
          setItems(getStaticData());
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken) {
      loadCalendar();
    }

    return () => {
      mounted = false;
    };
  }, [session?.accessToken]);

  const normalizedItems = useMemo(
    () => sortByStartTime(items.map((item) => ({ ...item, startDate: new Date(item.startsAt), endDate: new Date(item.endsAt) }))),
    [items]
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return {
        date,
        items: normalizedItems.filter((item) => isSameDay(item.startDate, date)),
      };
    });
  }, [cursorDate, normalizedItems]);

  const dayItems = useMemo(
    () => sortByStartTime(normalizedItems.filter((item) => item.startDate >= startOfDay(cursorDate) && item.startDate <= endOfDay(cursorDate))),
    [cursorDate, normalizedItems]
  );

  const filteredItems = useMemo(() => {
    if (view === "day") return dayItems;

    if (view === "week") {
      const weekStart = startOfWeek(cursorDate);
      const weekEnd = addDays(weekStart, 7);
      return normalizedItems.filter((item) => item.startDate >= weekStart && item.startDate < weekEnd);
    }

    const monthStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const monthEnd = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1);
    return normalizedItems.filter((item) => item.startDate >= monthStart && item.startDate < monthEnd);
  }, [cursorDate, dayItems, normalizedItems, view]);

  const monthGrid = useMemo(() => {
    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    const grid = [];
    let current = start;

    while (current.getMonth() === cursorDate.getMonth() || current <= first) {
      grid.push(current);
      current = addDays(current, 1);
    }

    while (current.getDay() !== 0) {
      grid.push(current);
      current = addDays(current, 1);
    }

    return grid;
  }, [cursorDate]);

  const visibleUpcomingItems = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const tomorrowEnd = endOfDay(tomorrow);

    return normalizedItems.filter((item) => item.startDate >= today && item.startDate <= tomorrowEnd);
  }, [normalizedItems]);

  const upcomingGroups = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    return [
      {
        key: "today",
        label: today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
        items: visibleUpcomingItems.filter((item) => isSameDay(item.startDate, today)),
      },
      {
        key: "tomorrow",
        label: tomorrow.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
        items: visibleUpcomingItems.filter((item) => isSameDay(item.startDate, tomorrow)),
      },
    ].filter((group) => group.items.length > 0);
  }, [visibleUpcomingItems]);

  const viewLabel = () => {
    if (view === "day") {
      return cursorDate.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    }

    if (view === "week") {
      const start = startOfWeek(cursorDate);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
    }

    return `${MONTHS[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
  };

  const openItem = (item, mode = "details") => {
    const start = item.startsAt ? new Date(item.startsAt) : null;
    const end = item.endsAt ? new Date(item.endsAt) : null;
    setSelectedItem(item);
    setModalMode(mode);
    setEditForm({
      title: item.title || "",
      details: item.details || "",
      meetingDate: item.startsAt?.slice(0, 10) || "",
      startTime: start ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}` : "",
      endTime: end ? `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}` : "",
      location: item.location || "",
    });
  };

  const openDateMeetings = (date, dayItemsForDate) => {
    setCursorDate(startOfDay(date));
    setSelectedDateItems({
      date: startOfDay(date),
      items: sortByStartTime(dayItemsForDate),
    });
  };

  const shiftCursor = (direction) => {
    const next = new Date(cursorDate);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setDate(next.getDate() + direction);
    setCursorDate(startOfDay(next));
  };

  const saveEdit = async () => {
    if (!selectedItem) return;
    if (selectedItem.calendarKind === "meeting" && !selectedItem.ministerId) {
      setError("This meeting cannot be edited from calendar because the assigned minister is missing.");
      return;
    }
    if (!editForm.meetingDate || !editForm.startTime || !editForm.endTime || (selectedItem.calendarKind === "meeting" && !editForm.location.trim())) {
      setError("Date, time, and location are required to update this meeting.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (selectedItem.calendarKind === "complaintCall") {
        await apiClient.patch(
          `/complaints/${selectedItem.id}/schedule-call`,
          {
            callScheduledAt: new Date(`${editForm.meetingDate}T${editForm.startTime}`).toISOString(),
          },
          authorizedConfig(session.accessToken)
        );
      } else {
        await apiClient.patch(
          `/meetings/${selectedItem.id}/schedule`,
          {
            ministerId: selectedItem.ministerId,
            startsAt: new Date(`${editForm.meetingDate}T${editForm.startTime}`).toISOString(),
            endsAt: new Date(`${editForm.meetingDate}T${editForm.endTime}`).toISOString(),
            location: editForm.location,
            isVip: selectedItem.isVip || false,
            comments: editForm.details,
          },
          authorizedConfig(session.accessToken)
        );
      }

      const updatedItem = {
        ...selectedItem,
        title: editForm.title,
        details: editForm.details,
        startsAt: new Date(`${editForm.meetingDate}T${editForm.startTime}`).toISOString(),
        endsAt: new Date(`${editForm.meetingDate}T${editForm.endTime}`).toISOString(),
        location: selectedItem.calendarKind === "complaintCall" ? selectedItem.location : editForm.location,
        isVip: selectedItem.isVip || false,
      };

      setItems((prevItems) => prevItems.map((item) => (item.id === selectedItem.id ? updatedItem : item)));

      openItem(updatedItem, "details");
      setSelectedDateItems((current) => {
        if (!current) return current;
        return {
          ...current,
          items: sortByStartTime(current.items.map((item) => (item.id === selectedItem.id ? updatedItem : item))),
        };
      });
    } catch (saveError) {
      setError(saveError?.response?.data?.error || "Unable to save meeting changes");
    } finally {
      setSaving(false);
    }
  };

  const rowsCount = monthGrid.length / 7;

  return (
    <WorkspacePage width={1280}>
      <WorkspaceSectionHeader eyebrow="Admin Workspace" title="Calendar" subtitle="Scheduled and VIP meetings aligned to the admin workflow." />

        {error && (
          <div className="mb-6 p-4 rounded-lg font-medium" style={{ background: `${C.danger}12`, border: `1px solid ${C.danger}33`, color: C.danger }}>
            {error}
          </div>
        )}

        {loading ? (
          <WorkspaceEmptyState title="Loading calendar..." />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6" style={{ alignItems: "start" }}>
            <WorkspaceCard style={{ marginBottom: 0 }}>
              <WorkspaceCardHeader
                title={viewLabel()}
                subtitle={`${filteredItems.length} event${filteredItems.length !== 1 ? "s" : ""} in view`}
                action={
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <select
                      value={view}
                      onChange={(event) => setView(event.target.value)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        background: C.bgElevated,
                        color: C.t1,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      {VIEW_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => shiftCursor(-1)}
                        aria-label="Previous"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${C.border}`,
                          background: C.bgElevated,
                          color: C.t1,
                          cursor: "pointer",
                        }}
                      >
                        <ChevronLeft size={18} color={C.t1} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCursorDate(startOfDay(new Date()))}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 8,
                          border: `1px solid ${C.border}`,
                          background: C.bgElevated,
                          color: C.t1,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => shiftCursor(1)}
                        aria-label="Next"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${C.border}`,
                          background: C.bgElevated,
                          color: C.t1,
                          cursor: "pointer",
                        }}
                      >
                        <ChevronRight size={18} color={C.t1} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                }
              />

              {view === "month" && (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.t3,
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                          textAlign: "center",
                        }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    {monthGrid.map((day) => {
                      const inMonth = day.getMonth() === cursorDate.getMonth();
                      const isToday = isSameDay(day, new Date());
                      const isSelected = selectedDateItems?.date && isSameDay(day, selectedDateItems.date);
                      const dayItemsForDate = normalizedItems.filter((item) => isSameDay(item.startDate, day));

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => openDateMeetings(day, dayItemsForDate)}
                          style={{
                            height: `calc((100vh - 280px) / ${rowsCount})`,
                            minHeight: 70,
                            borderRadius: 12,
                            border: `1px solid ${isSelected ? `${C.purple}60` : isToday ? `${C.purple}40` : C.border}`,
                            background: isSelected ? `${C.purple}08` : inMonth ? C.bgElevated : C.bg,
                            padding: 10,
                            display: "grid",
                            gap: 6,
                            alignContent: "start",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease, background 0.15s ease",
                          }}
                          onMouseEnter={(event) => {
                            if (!isSelected) event.currentTarget.style.borderColor = `${C.purple}40`;
                          }}
                          onMouseLeave={(event) => {
                            if (!isSelected) event.currentTarget.style.borderColor = isToday ? `${C.purple}40` : C.border;
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 24,
                              height: 24,
                              borderRadius: 99,
                              fontSize: 12,
                              fontWeight: 700,
                              background: isToday ? C.purple : "transparent",
                              color: isToday ? "#fff" : inMonth ? C.t1 : C.t3,
                            }}
                          >
                            {day.getDate()}
                          </div>

                          {dayItemsForDate.length > 0 && (
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: C.purple,
                                background: `${C.purple}12`,
                                border: `1px solid ${C.purple}30`,
                                borderRadius: 8,
                                padding: "4px 8px",
                                textAlign: "center",
                              }}
                            >
                              {dayItemsForDate.length} meeting{dayItemsForDate.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === "week" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day.date, new Date());
                    const isSelected = selectedDateItems?.date && isSameDay(day.date, selectedDateItems.date);

                    return (
                      <div
                        key={day.date.toISOString()}
                        style={{
                          border: `1px solid ${isSelected ? `${C.purple}60` : isToday ? `${C.purple}40` : C.border}`,
                          borderRadius: 12,
                          background: isSelected ? `${C.purple}08` : C.bgElevated,
                          padding: 10,
                          minHeight: 120,
                          cursor: "pointer",
                          transition: "border-color 0.15s ease, background 0.15s ease",
                        }}
                        onClick={() => openDateMeetings(day.date, day.items)}
                        onMouseEnter={(event) => {
                          if (!isSelected) event.currentTarget.style.borderColor = `${C.purple}40`;
                        }}
                        onMouseLeave={(event) => {
                          if (!isSelected) event.currentTarget.style.borderColor = isToday ? `${C.purple}40` : C.border;
                        }}
                      >
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                            {DAYS[day.date.getDay()]}
                          </div>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 26,
                              height: 26,
                              borderRadius: 99,
                              fontSize: 14,
                              fontWeight: 700,
                              marginTop: 4,
                              background: isToday ? C.purple : "transparent",
                              color: isToday ? "#fff" : C.t1,
                            }}
                          >
                            {day.date.getDate()}
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          {day.items.length > 0 ? (
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.purple,
                                background: `${C.purple}12`,
                                border: `1px solid ${C.purple}30`,
                                borderRadius: 8,
                                padding: "6px 10px",
                                textAlign: "center",
                              }}
                            >
                              {day.items.length} meeting{day.items.length !== 1 ? "s" : ""}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: C.t3 }}>No events</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {view === "day" && (
                <div style={{ display: "grid", gap: 10 }}>
                  {dayItems.length ? (
                    dayItems.map((item) => {
                      const tone = getItemTone(item, C);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openItem(item)}
                          style={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            background: C.bgElevated,
                            padding: 16,
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease, background 0.15s ease",
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.borderColor = `${tone}50`;
                            event.currentTarget.style.background = `${tone}06`;
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.borderColor = C.border;
                            event.currentTarget.style.background = C.bgElevated;
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 4 }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: 12, color: C.t2, marginBottom: 4 }}>
                                {formatTime(item.startsAt)} – {formatTime(item.endsAt)}
                              </div>
                              <div style={{ fontSize: 12, color: C.t3 }}>
                                {item.location || (item.calendarKind === "complaintCall" ? "Contact pending" : "Location pending")}
                              </div>
                            </div>
                            <WorkspaceBadge color={tone}>
                              {item.calendarKind === "complaintCall" ? "Call" : item.type === "VIP Meeting" ? "VIP" : "Standard"}
                            </WorkspaceBadge>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <WorkspaceEmptyState title="No events scheduled for this day" />
                  )}
                </div>
              )}
            </WorkspaceCard>

            <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 24, height: "fit-content" }}>
              <WorkspaceCard style={{ padding: 24, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>
                      Upcoming
                    </div>
                    <h3 className="text-lg font-bold" style={{ color: C.t1 }}>Next Meetings</h3>
                  </div>
                  <div style={{ background: `${C.purple}15`, padding: 8, borderRadius: "50%", color: C.purple }}>
                    <CalendarIcon size={18} />
                  </div>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {upcomingGroups.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.t3 }}>No meetings scheduled for today or tomorrow.</div>
                ) : (
                  upcomingGroups.map((group) => (
                    <div key={group.key}>
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3" style={{ color: C.t3 }}>
                        {group.label}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCursorDate(startOfDay(item.startDate));
                              openItem(item);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "stretch",
                              gap: 12,
                              padding: 16,
                              border: `1px solid ${C.border}`,
                              borderRadius: 12,
                              background: C.bgElevated,
                              textAlign: "left",
                              cursor: "pointer",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, background: getItemTone(item, C), borderRadius: "0 4px 4px 0" }} />

                            <div style={{ minWidth: 0, flex: 1, paddingLeft: 6 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{item.title}</div>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: getItemTone(item, C),
                                  background: `${getItemTone(item, C)}10`,
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                }}
                              >
                                {new Date(item.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                <span style={{ color: C.t3, fontWeight: 400 }}>{formatTime(item.startsAt)}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                </div>
              </WorkspaceCard>
            </div>
          </div>
        )}

      <DayMeetingsModal
        date={selectedDateItems?.date || null}
        items={selectedDateItems?.items || []}
        onClose={() => setSelectedDateItems(null)}
        onSelectMeeting={(item) => {
          setSelectedDateItems(null);
          openItem(item);
        }}
      />

      <Modal
        item={selectedItem}
        mode={modalMode}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={() => setSelectedItem(null)}
        onSave={saveEdit}
        onModeChange={setModalMode}
        saving={saving}
      />
    </WorkspacePage>
  );
}
