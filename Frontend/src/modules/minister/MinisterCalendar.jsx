import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Film,
  Image as ImageIcon,
  MapPin,
  Users,
  X,
  Calendar, 
  Star, 
  TrendingUp, 
} from "lucide-react";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceTabs,
} from "../../shared/components/WorkspaceUI.jsx";

// ── Constants ────────────────────────────────────────────────────────────────

const VIEW_OPTIONS = ["month", "week", "day"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Utility functions ────────────────────────────────────────────────────────

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
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

function formatDuration(item) {
  const ms = new Date(item.endsAt) - new Date(item.startsAt);
  const mins = Math.round(ms / 60000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

function formatFileSize(size = 0) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

// ── Mock data (UI scaffolding — replace with API response when available) ────

const _t = new Date();
const _y = _t.getFullYear();
const _m = _t.getMonth();
const _d = _t.getDate();

const MOCK_ITEMS = [
  {
    id: "mock-1",
    sourceId: "meeting-001",
    title: "Budget Review Meeting",
    details:
      "Quarterly review of departmental budgets with the finance team. Key focus areas include infrastructure spending, pending allocations, and upcoming project financing.",
    startsAt: new Date(_y, _m, _d, 10, 0).toISOString(),
    endsAt: new Date(_y, _m, _d, 11, 30).toISOString(),
    location: "Conference Room A, Main Building",
    type: "Scheduled Meeting",
    source: "Minister Calendar",
    participants: ["Finance Director", "Deputy Minister", "Budget Officer"],
  },
  {
    id: "mock-2",
    sourceId: "meeting-002",
    title: "State Infrastructure Summit",
    details:
      "High-priority summit with state governors to discuss infrastructure development plans, fund allocation, and timelines for regional projects slated for Q3.",
    startsAt: new Date(_y, _m, _d, 14, 0).toISOString(),
    endsAt: new Date(_y, _m, _d, 16, 0).toISOString(),
    location: "Main Hall, State Secretariat",
    type: "VIP Meeting",
    source: "Minister Priority",
    participants: ["State Governors", "Infrastructure Secretary", "Planning Commission Head"],
  },
  {
    id: "mock-3",
    sourceId: "meeting-003",
    title: "Citizen Grievance Hearing",
    details:
      "Monthly public grievance hearing to address pending complaints and concerns raised by citizens across various districts.",
    startsAt: new Date(_y, _m, _d + 1, 9, 0).toISOString(),
    endsAt: new Date(_y, _m, _d + 1, 12, 0).toISOString(),
    location: "Public Hall, District Office",
    type: "Scheduled Meeting",
    source: "Minister Calendar",
    participants: ["District Collectors", "Citizens Representatives", "Grievance Officer"],
  },
  {
    id: "mock-4",
    sourceId: "meeting-004",
    title: "Policy Review with PM Office",
    details:
      "Urgent policy review meeting regarding new agricultural reforms, implementation timeline, and cross-ministry coordination requirements.",
    startsAt: new Date(_y, _m, _d + 2, 11, 0).toISOString(),
    endsAt: new Date(_y, _m, _d + 2, 13, 0).toISOString(),
    location: "PM Office, New Delhi",
    type: "VIP Meeting",
    source: "Minister Priority",
    participants: ["PM's Principal Secretary", "Cabinet Secretary", "Policy Advisors"],
  },
  {
    id: "mock-5",
    sourceId: "meeting-005",
    title: "Press Conference — Development Projects",
    details:
      "Press conference to announce the completion of key development projects and upcoming public-sector initiatives for the current fiscal year.",
    startsAt: new Date(_y, _m, _d - 1, 15, 0).toISOString(),
    endsAt: new Date(_y, _m, _d - 1, 16, 0).toISOString(),
    location: "Media Centre, Secretariat",
    type: "Scheduled Meeting",
    source: "Minister Calendar",
    participants: ["Press Corps", "PR Team", "Development Secretary"],
  },
  {
    id: "mock-6",
    sourceId: "meeting-006",
    title: "Bilateral Trade Discussion",
    details:
      "Confidential bilateral trade discussion with foreign delegation regarding trade agreements, tariff schedules, and long-term economic collaboration.",
    startsAt: new Date(_y, _m, _d + 4, 10, 30).toISOString(),
    endsAt: new Date(_y, _m, _d + 4, 12, 30).toISOString(),
    location: "Ministry Conference Suite",
    type: "VIP Meeting",
    source: "Minister Priority",
    participants: ["Foreign Trade Delegation", "Commerce Secretary", "Economic Advisors"],
  },
];

// Mock files — UI scaffolding only, no backend integration
const MOCK_FILES = {
  photos: [
    { id: "ph1", name: "Venue setup.jpg", size: 2.4 * 1024 * 1024 },
    { id: "ph2", name: "Attendees group photo.jpg", size: 1.8 * 1024 * 1024 },
    { id: "ph3", name: "Agenda board.jpg", size: 3.1 * 1024 * 1024 },
    { id: "ph4", name: "Signing ceremony.jpg", size: 2.9 * 1024 * 1024 },
  ],
  videos: [
    { id: "vi1", name: "Opening remarks.mp4", size: 45 * 1024 * 1024, duration: "12:34" },
    { id: "vi2", name: "Discussion highlights.mp4", size: 82 * 1024 * 1024, duration: "28:15" },
  ],
  documents: [
    { id: "do1", name: "Meeting Agenda.pdf", size: 450 * 1024 },
    { id: "do2", name: "Presentation Slides.pptx", size: 8.2 * 1024 * 1024 },
    { id: "do3", name: "Minutes of Meeting.docx", size: 230 * 1024 },
    { id: "do4", name: "Action Items.xlsx", size: 120 * 1024 },
  ],
};

// ── EventPill ────────────────────────────────────────────────────────────────

function EventPill({ item, compact = false, onClick }) {
  const { C } = usePortalTheme();
  const tone = item.type === "VIP Meeting" ? C.warn : C.purple;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-2 transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] ${compact ? "text-[10px]" : "text-xs"}`}
      style={{ border: `1px solid ${tone}33`, background: `${tone}12`, color: tone }}
    >
      <div className="font-semibold truncate">{item.title}</div>
      <div className="opacity-70 mt-0.5">{formatTime(item.startsAt)}</div>
    </button>
  );
}

// ── FilesSection (UI only — no API calls, no upload logic) ───────────────────

const FILE_TABS = [
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Film },
  { id: "documents", label: "Documents", icon: FileText },
];

function FilePlaceholderIcon({ type, tone }) {
  const Icon = type === "photos" ? ImageIcon : type === "videos" ? Film : FileText;
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "4 / 3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `${tone}10`,
        borderRadius: 8,
        gap: 6,
        color: tone,
        opacity: 0.7,
      }}
    >
      <Icon size={22} />
    </div>
  );
}

function FilesSection({ C, tone }) {
  const [activeTab, setActiveTab] = useState("photos");
  const files = MOCK_FILES[activeTab] || [];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        {FILE_TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          const count = MOCK_FILES[id].length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: active ? `1px solid ${tone}40` : `1px solid transparent`,
                background: active ? `${tone}12` : "transparent",
                color: active ? tone : C.t3,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={13} />
              {label}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 99,
                  background: active ? `${tone}20` : `${C.t3}15`,
                  color: active ? tone : C.t3,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* File grid */}
      {files.length === 0 ? (
        <div style={{ color: C.t3, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
          No {activeTab} attached to this meeting.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 10,
                background: C.bgElevated,
                cursor: "default",
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${tone}40`)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              <FilePlaceholderIcon type={activeTab} tone={tone} />
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.t1,
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {file.name}
              </div>
              <div style={{ marginTop: 4, fontSize: 10, color: C.t3 }}>
                {file.duration ? `Video · ${file.duration}` : formatFileSize(file.size)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          padding: "8px 12px",
          borderRadius: 8,
          background: `${C.t3}10`,
          fontSize: 11,
          color: C.t3,
          fontStyle: "italic",
        }}
      >
        File preview — backend integration pending.
      </div>
    </div>
  );
}

// ── DayMeetingsModal ─────────────────────────────────────────────────────────

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
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-6 sm:px-8 py-6 border-b flex items-start justify-between gap-4"
            style={{ background: C.bgElevated, borderColor: C.border }}
          >
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
              <div style={{ fontSize: 13, color: C.t3, textAlign: "center", padding: "24px 0" }}>
                No meetings for this date.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const tone = item.type === "VIP Meeting" ? C.warn : C.purple;
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
                          <div
                            className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border"
                            style={{ borderColor: `${tone}33`, background: `${tone}12`, color: tone }}
                          >
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

// ── MeetingDetailModal ────────────────────────────────────────────────────────

function MeetingDetailModal({ meeting, onClose }) {
  const { C } = usePortalTheme();
  if (!meeting) return null;
  const tone = meeting.type === "VIP Meeting" ? C.warn : C.purple;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[70] flex sm:items-center justify-center overflow-y-auto">
        <div
          className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 fade-in duration-300"
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.dialogShadow }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 sm:px-8 py-6 sm:py-8 border-b flex items-start justify-between gap-4"
            style={{ background: C.bgElevated, borderColor: C.border }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex-shrink-0 mt-1"
              style={{ color: C.t2, background: C.bgElevated, border: `1px solid ${C.border}` }}
              aria-label="Back"
            >
              ← Back
            </button>
            <div className="flex-1 min-w-0">
              <div
                className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ borderColor: `${tone}33`, background: `${tone}12`, color: tone }}
              >
                {meeting.type}
              </div>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold break-words" style={{ color: C.t1 }}>
                {meeting.title}
              </h3>
              <div className="text-xs sm:text-sm mt-3 flex flex-wrap items-center gap-2" style={{ color: C.t2 }}>
                <span>{new Date(meeting.startsAt).toLocaleDateString()}</span>
                <span>•</span>
                <span className="font-medium">{formatTime(meeting.startsAt)}</span>
                <span>-</span>
                <span className="font-medium">{formatTime(meeting.endsAt)}</span>
                <span>•</span>
                <span style={{ color: C.t3 }}>{formatDuration(meeting)}</span>
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

          {/* Scrollable content */}
          <div className="p-6 sm:p-8 max-h-[calc(100vh-300px)] sm:max-h-[70vh] overflow-y-auto">
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Info grid */}
              <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
                    Location
                  </p>
                  <p style={{ fontSize: 15, color: C.t1, fontWeight: 600 }} className="break-words">
                    {meeting.location || "Location pending"}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
                    Source
                  </p>
                  <p style={{ fontSize: 15, color: C.t1, fontWeight: 600 }}>
                    {meeting.source}
                  </p>
                </div>
              </div>

              {/* Participants */}
              {Array.isArray(meeting.participants) && meeting.participants.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
                    <Users size={11} /> Participants
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {meeting.participants.map((p) => (
                      <span
                        key={p}
                        style={{
                          fontSize: 12,
                          padding: "4px 12px",
                          borderRadius: 99,
                          background: `${tone}10`,
                          color: tone,
                          border: `1px solid ${tone}25`,
                          fontWeight: 500,
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
                  Description
                </p>
                <p style={{ color: C.t2, lineHeight: 1.75, fontSize: 14 }}>
                  {meeting.details || "No description available."}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: C.border }} />

              {/* Files section — UI only */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16 }}>
                  Files
                </p>
                <FilesSection C={C} tone={tone} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main MinisterCalendar component ──────────────────────────────────────────

export default function MinisterCalendar() {
  const { C } = usePortalTheme();
  const { session } = useAuth();

  // Data
  const [items, setItems] = useState(MOCK_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Calendar navigation
  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));

  // Modal state
  const [selectedDate, setSelectedDate] = useState(null);   // controls DayMeetingsModal
  const [selectedMeeting, setSelectedMeeting] = useState(null); // controls MeetingDetailModal

  // Load from API; fall back silently to mock data
  useEffect(() => {
    let mounted = true;

    async function loadCalendar() {
      try {
        const { data } = await apiClient.get("/minister/calendar", authorizedConfig(session.accessToken));
        const mapped = (data.events || []).map((event) => ({
          id: event.id,
          sourceId: event.meeting_id || event.id,
          title: event.title,
          details: event.comments || "",
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          location: event.location,
          type: event.is_vip ? "VIP Meeting" : "Scheduled Meeting",
          source: event.is_vip ? "Minister Priority" : "Minister Calendar",
          participants: event.participants || [],
        }));
        if (mounted) {
          setItems(mapped.length > 0 ? mapped : MOCK_ITEMS);
        }
      } catch {
        if (mounted) setItems(MOCK_ITEMS);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (session?.accessToken) {
      loadCalendar();
    } else {
      setLoading(false);
    }

    return () => { mounted = false; };
  }, [session?.accessToken]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    if (view === "day") {
      return items.filter((item) => isSameDay(item.startsAt, cursorDate));
    }
    if (view === "week") {
      const weekStart = startOfWeek(cursorDate);
      const weekEnd = addDays(weekStart, 7);
      return items.filter(
        (item) => new Date(item.startsAt) >= weekStart && new Date(item.startsAt) < weekEnd
      );
    }
    const monthStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const monthEnd = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1);
    return items.filter(
      (item) => new Date(item.startsAt) >= monthStart && new Date(item.startsAt) < monthEnd
    );
  }, [items, view, cursorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursorDate]);

  // Updated monthGrid Logic: Generates exactly the number of weeks needed (no redundant bottom rows)
  const monthGrid = useMemo(() => {
    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    
    const grid = [];
    let current = start;
    
    // Add days until we finish the current month
    while (current.getMonth() === cursorDate.getMonth() || current <= first) {
      grid.push(current);
      current = addDays(current, 1);
    }
    
    // Keep adding days to complete the last week (until we hit Sunday again)
    while (current.getDay() !== 0) {
      grid.push(current);
      current = addDays(current, 1);
    }
    
    return grid;
  }, [cursorDate]);

  const meetingsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return items
      .filter((item) => isSameDay(item.startsAt, selectedDate))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  }, [items, selectedDate]);

  const dayItems = useMemo(
    () => filteredItems.slice().sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [filteredItems]
  );

  const nextTwoMeetings = useMemo(() => {
    const now = new Date();
    return items
      .filter((item) => new Date(item.startsAt) >= now)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
      .slice(0, 2);
  }, [items]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function shiftCursor(direction) {
    const delta = direction === "next" ? 1 : -1;
    if (view === "day") { setCursorDate((c) => addDays(c, delta)); return; }
    if (view === "week") { setCursorDate((c) => addDays(c, 7 * delta)); return; }
    setCursorDate((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function viewLabel() {
    if (view === "day") {
      return cursorDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    }
    if (view === "week") {
      const start = startOfWeek(cursorDate);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return `${MONTHS[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
  }

  function handleDateSelect(day) {
    setSelectedDate(day);
    setSelectedMeeting(null);
  }

  function handleEventPillClick(day, meeting) {
    setSelectedDate(day);
    setSelectedMeeting(meeting);
  }

  function handleSelectMeeting(meeting) {
    setSelectedMeeting(meeting);
  }

  function handleCloseMeetingDetail() {
    setSelectedMeeting(null);
  }

  function handleCloseDayModal() {
    setSelectedDate(null);
    setSelectedMeeting(null);
  }

  // Calculate dynamic height based on the exact number of weeks needed (monthGrid.length / 7)
  const rowsCount = monthGrid.length / 7;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <WorkspacePage width={1400}>

      {loading ? (
        <WorkspaceEmptyState title="Loading calendar…" />
      ) : error ? (
        <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
      ) : (
        <div>
          {/* Main Grid: Calendar & Right Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6" style={{ alignItems: "start" }}>
            
            {/* Left: Calendar Card */}
            <WorkspaceCard style={{ marginBottom: 0 }}>
              <WorkspaceCardHeader
                title={viewLabel()}
                subtitle={`${filteredItems.length} event${filteredItems.length !== 1 ? "s" : ""} in view`}
                action={
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* View Dropdown */}
                    <select
                      value={view}
                      onChange={(e) => {
                        setView(e.target.value);
                        handleCloseDayModal();
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        background: C.bgElevated,
                        color: C.t1,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        outline: "none"
                      }}
                    >
                      {VIEW_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o.charAt(0).toUpperCase() + o.slice(1)}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => shiftCursor("prev")}
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
                          cursor: "pointer"
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
                          cursor: "pointer"
                        }}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => shiftCursor("next")}
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
                          cursor: "pointer"
                        }}
                      >
                        <ChevronRight size={18} color={C.t1} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                }
              />

              {/* ── Month View ── */}
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
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const eventsForDay = items.filter((item) => isSameDay(item.startsAt, day));

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => handleDateSelect(day)}
                          style={{
                            height: `calc((100vh - 280px) / ${rowsCount})`,
                            minHeight: 70,
                            borderRadius: 12,
                            border: `1px solid ${isSelected ? C.purple + "60" : isToday ? C.purple + "40" : C.border}`,
                            background: isSelected
                              ? `${C.purple}08`
                              : inMonth
                              ? C.bgElevated
                              : C.bg,
                            padding: 10,
                            display: "grid",
                            gap: 6,
                            alignContent: "start",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease, background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.borderColor = `${C.purple}40`;
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.borderColor = isToday
                                ? `${C.purple}40`
                                : C.border;
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
                          {eventsForDay.length > 0 && (
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
                              {eventsForDay.length} meeting{eventsForDay.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Week View ── */}
              {view === "week" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
                  {weekDays.map((day) => {
                    const eventsForDay = items.filter((item) => isSameDay(item.startsAt, day));
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          border: `1px solid ${isSelected ? C.purple + "60" : isToday ? C.purple + "40" : C.border}`,
                          borderRadius: 12,
                          background: isSelected ? `${C.purple}08` : C.bgElevated,
                          padding: 10,
                          minHeight: 120,
                          cursor: "pointer",
                          transition: "border-color 0.15s ease, background 0.15s ease",
                        }}
                        onClick={() => handleDateSelect(day)}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.borderColor = `${C.purple}40`;
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.borderColor = isToday
                              ? `${C.purple}40`
                              : C.border;
                        }}
                      >
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                            {DAYS[day.getDay()]}
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
                            {day.getDate()}
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          {eventsForDay.length > 0 ? (
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
                              {eventsForDay.length} meeting{eventsForDay.length !== 1 ? "s" : ""}
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

              {/* ── Day View ── */}
              {view === "day" && (
                <div style={{ display: "grid", gap: 10 }}>
                  {dayItems.length ? (
                    dayItems.map((item) => {
                      const tone = item.type === "VIP Meeting" ? C.warn : C.purple;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleEventPillClick(cursorDate, item)}
                          style={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            background: C.bgElevated,
                            padding: 16,
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease, background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = `${tone}50`;
                            e.currentTarget.style.background = `${tone}06`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.background = C.bgElevated;
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 4 }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: 12, color: C.t2, marginBottom: 4 }}>
                                {formatTime(item.startsAt)} – {formatTime(item.endsAt)} · {formatDuration(item)}
                              </div>
                              <div style={{ fontSize: 12, color: C.t3 }}>
                                {item.location || "Location pending"}
                              </div>
                            </div>
                            <WorkspaceBadge color={tone}>
                              {item.type === "VIP Meeting" ? "VIP" : "Standard"}
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

            {/* Right Panel: Upcoming Meetings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 24, height: "fit-content" }}>
              
              {/* Upcoming Meetings */}
              <WorkspaceCard style={{ padding: 24, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Upcoming</div>
                    <h3 className="text-lg font-bold" style={{ color: C.t1 }}>Next Meetings</h3>
                  </div>
                  <div style={{ background: `${C.purple}15`, padding: 8, borderRadius: '50%', color: C.purple }}>
                    <Calendar size={18} />
                  </div>
                </div>

                {nextTwoMeetings.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.t3 }}>No upcoming meetings scheduled.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {nextTwoMeetings.map((item) => {
                      const tone = item.type === "VIP Meeting" ? C.warn : C.purple;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setSelectedDate(startOfDay(new Date(item.startsAt))); setSelectedMeeting(item); }}
                          style={{
                            display: "flex",
                            alignItems: "stretch",
                            gap: 12,
                            padding: "16px",
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            background: C.bgElevated,
                            textAlign: "left",
                            cursor: "pointer",
                            position: "relative",
                            overflow: "hidden"
                          }}
                        >
                          {/* Colored left bar like in the image */}
                          <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, background: tone, borderRadius: "0 4px 4px 0" }} />
                          
                          <div style={{ minWidth: 0, flex: 1, paddingLeft: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{item.title}</div>
                            <div 
                              style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: 8,
                                fontSize: 12, 
                                fontWeight: 600,
                                color: tone,
                                background: `${tone}10`,
                                padding: "4px 10px",
                                borderRadius: 6
                              }}
                            >
                              {new Date(item.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                              <span style={{ color: C.t3, fontWeight: 400 }}>{formatTime(item.startsAt)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </WorkspaceCard>

            </div>
          </div>
        </div>
      )}

      {/* Day meetings modal — shows when a date is selected */}
      {selectedDate && !selectedMeeting && (
        <DayMeetingsModal
          date={selectedDate}
          items={meetingsForDate}
          onClose={handleCloseDayModal}
          onSelectMeeting={handleSelectMeeting}
        />
      )}

      {/* Meeting detail modal — opens on top when a meeting is selected */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={handleCloseMeetingDetail}
        />
      )}
    </WorkspacePage>
  );
}