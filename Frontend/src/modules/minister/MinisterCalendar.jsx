import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceTabs,
} from "../../shared/components/WorkspaceUI.jsx";

const VIEW_OPTIONS = ["month", "week", "day"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
  return new Date(dateString).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTimeRange(item) {
  return `${new Date(item.startsAt).toLocaleString("en-IN")} to ${new Date(item.endsAt).toLocaleString("en-IN")}`;
}

function EventPill({ item, compact = false, onClick }) {
  const { C } = usePortalTheme();
  const tone = item.type === "VIP Meeting" ? C.warn : C.purple;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-2 transition-all hover:shadow-sm ${compact ? "text-[10px]" : "text-xs"}`}
      style={{ border: `1px solid ${tone}33`, background: `${tone}12`, color: tone }}
    >
      <div className="font-semibold truncate">{item.title}</div>
      <div className="opacity-70 mt-0.5">{formatTime(item.startsAt)}</div>
    </button>
  );
}

function EventModal({ item, onClose }) {
  const { C } = usePortalTheme();
  if (!item) return null;
  const tone = item.type === "VIP Meeting" ? C.warn : C.purple;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex sm:items-center justify-center overflow-y-auto p-4">
        <div
          className="w-full max-w-2xl rounded-2xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 24px 80px rgba(15,23,42,0.18)" }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-6 py-6 border-b flex items-start justify-between gap-4" style={{ background: C.bgElevated, borderColor: C.border }}>
            <div>
              <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: `${tone}33`, background: `${tone}12`, color: tone }}>
                {item.type}
              </div>
              <h3 style={{ margin: "16px 0 0", fontSize: 28, lineHeight: 1.15, fontWeight: 700, color: C.t1 }}>{item.title}</h3>
              <div style={{ marginTop: 10, color: C.t2, fontSize: 13 }}>{formatDateTimeRange(item)}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              style={{ border: "none", background: "transparent", color: C.t2, cursor: "pointer", padding: 6 }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: 24, display: "grid", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>Location</div>
              <div style={{ color: C.t1, fontSize: 15 }}>{item.location || "Location pending"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>Source</div>
              <div style={{ color: C.t1, fontSize: 15 }}>{item.source}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>Comments</div>
              <div style={{ color: C.t2, fontSize: 14, lineHeight: 1.7 }}>{item.details || "No additional comments available."}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function MinisterCalendar() {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadCalendar() {
      try {
        const { data } = await apiClient.get("/minister/calendar", authorizedConfig(session.accessToken));
        const mappedItems = (data.events || []).map((event) => ({
          id: event.id,
          sourceId: event.meeting_id || event.id,
          title: event.title,
          details: event.comments || "",
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          location: event.location,
          type: event.is_vip ? "VIP Meeting" : "Scheduled Meeting",
          source: event.is_vip ? "Minister Priority" : "Minister Calendar",
        }));
        if (mounted) {
          setItems(mappedItems);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load minister calendar");
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

  const filteredItems = useMemo(() => {
    if (view === "day") {
      return items.filter((item) => isSameDay(item.startsAt, cursorDate));
    }

    if (view === "week") {
      const weekStart = startOfWeek(cursorDate);
      const weekEnd = addDays(weekStart, 7);
      return items.filter((item) => new Date(item.startsAt) >= weekStart && new Date(item.startsAt) < weekEnd);
    }

    const monthStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const monthEnd = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1);
    return items.filter((item) => new Date(item.startsAt) >= monthStart && new Date(item.startsAt) < monthEnd);
  }, [items, view, cursorDate]);

  const dayItems = useMemo(
    () => filteredItems.slice().sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [filteredItems]
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [cursorDate]);

  const monthGrid = useMemo(() => {
    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [cursorDate]);

  function shiftCursor(direction) {
    const delta = direction === "next" ? 1 : -1;
    if (view === "day") {
      setCursorDate((current) => addDays(current, delta));
      return;
    }
    if (view === "week") {
      setCursorDate((current) => addDays(current, 7 * delta));
      return;
    }
    setCursorDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function viewLabel() {
    if (view === "day") {
      return cursorDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    }
    if (view === "week") {
      const start = startOfWeek(cursorDate);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return `${MONTHS[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
  }

  return (
    <WorkspacePage>
      <WorkspaceSectionHeader
        eyebrow="Minister Workspace"
        title="Minister Calendar"
        subtitle="Read-only month, week, and day views for scheduled and VIP meetings."
        action={
          <WorkspaceTabs
            items={VIEW_OPTIONS.map((option) => ({ id: option, label: option.charAt(0).toUpperCase() + option.slice(1) }))}
            value={view}
            onChange={setView}
          />
        }
      />

      {loading ? (
        <WorkspaceEmptyState title="Loading calendar..." />
      ) : error ? (
        <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          <WorkspaceCard>
            <WorkspaceCardHeader
              title={viewLabel()}
              subtitle={`${filteredItems.length} event(s) in view`}
              action={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <WorkspaceButton variant="ghost" onClick={() => shiftCursor("prev")} aria-label="Previous period">
                    <ChevronLeft size={16} />
                  </WorkspaceButton>
                  <WorkspaceButton variant="ghost" onClick={() => setCursorDate(startOfDay(new Date()))}>
                    Today
                  </WorkspaceButton>
                  <WorkspaceButton variant="ghost" onClick={() => shiftCursor("next")} aria-label="Next period">
                    <ChevronRight size={16} />
                  </WorkspaceButton>
                </div>
              }
            />

            {items.length === 0 ? (
              <WorkspaceEmptyState title="No minister calendar items yet" subtitle="Scheduled meetings will appear here after the admin workflow places them on the calendar." />
            ) : view === "month" ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
                  {DAYS.map((day) => (
                    <div key={day} style={{ fontSize: 12, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: "center" }}>
                      {day}
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 12 }}>
                  {monthGrid.map((day) => {
                    const inMonth = day.getMonth() === cursorDate.getMonth();
                    const eventsForDay = items.filter((item) => isSameDay(item.startsAt, day));
                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          minHeight: 140,
                          borderRadius: 12,
                          border: `1px solid ${C.border}`,
                          background: inMonth ? C.bgElevated : C.bg,
                          padding: 12,
                          display: "grid",
                          gap: 8,
                          alignContent: "start",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: inMonth ? C.t1 : C.t3 }}>{day.getDate()}</div>
                        {eventsForDay.slice(0, 3).map((item) => (
                          <EventPill key={item.id} item={item} compact onClick={() => setSelectedItem(item)} />
                        ))}
                        {eventsForDay.length > 3 ? <div style={{ fontSize: 11, color: C.t3 }}>+{eventsForDay.length - 3} more</div> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : view === "week" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 12 }}>
                {weekDays.map((day) => {
                  const eventsForDay = items.filter((item) => isSameDay(item.startsAt, day));
                  return (
                    <div key={day.toISOString()} style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.bgElevated, padding: 12 }}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{DAYS[day.getDay()]}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginTop: 4 }}>{day.getDate()}</div>
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {eventsForDay.length ? eventsForDay.map((item) => (
                          <EventPill key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                        )) : <div style={{ fontSize: 12, color: C.t3 }}>No events</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {dayItems.length ? dayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      background: C.bgElevated,
                      padding: 16,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{item.title}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: C.t2 }}>{formatDateTimeRange(item)}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: C.t3 }}>{item.location || "Location pending"}</div>
                      </div>
                      <WorkspaceBadge color={item.type === "VIP Meeting" ? C.warn : C.purple}>{item.type === "VIP Meeting" ? "VIP" : "Standard"}</WorkspaceBadge>
                    </div>
                  </button>
                )) : <WorkspaceEmptyState title="No events scheduled for this day" />}
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard>
            <WorkspaceCardHeader title="Calendar Summary" subtitle="High-level visibility for minister planning" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.bgElevated, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Total Events</div>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: C.purple }}>{items.length}</div>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.bgElevated, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>VIP Meetings</div>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: C.warn }}>{items.filter((item) => item.type === "VIP Meeting").length}</div>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.bgElevated, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Today</div>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: C.mint }}>{items.filter((item) => isSameDay(item.startsAt, new Date())).length}</div>
              </div>
            </div>
          </WorkspaceCard>
        </div>
      )}

      <EventModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </WorkspacePage>
  );
}
