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
import { apiClient } from "../../shared/api/client.js";
import { getDownloadUrl, listVisibleFiles } from "../../shared/api/privateFiles.js";
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

function getItemKind(item) {
  return item.kind === "event" ? "event" : "meeting";
}

function getItemSummary(items) {
  const meetings = items.filter((item) => getItemKind(item) === "meeting").length;
  const events = items.filter((item) => getItemKind(item) === "event").length;
  const parts = [];
  if (meetings) parts.push(`${meetings} meeting${meetings !== 1 ? "s" : ""}`);
  if (events) parts.push(`${events} event${events !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function getItemTypeLabel(item) {
  if (getItemKind(item) === "event") {
    return item.isVip ? "VIP Event" : "Scheduled Event";
  }
  return item.isVip ? "VIP Meeting" : "Scheduled Meeting";
}

// ── EventPill ────────────────────────────────────────────────────────────────

function EventPill({ item, compact = false, onClick }) {
  const { C } = usePortalTheme();
  const tone = item.isVip ? C.warn : C.purple;
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

// ── FilesSection ──────────────────────────────────────────────────────────────

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

function FilesSection({ item, C, tone, defaultTab = "photos" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadFiles() {
      try {
        setLoading(true);
        setError("");
        const result = await listVisibleFiles({
          contextType: getItemKind(item),
          contextId: item.sourceId,
        });
        if (mounted) {
          setFiles(result);
        }
      } catch (loadError) {
        if (mounted) {
          setFiles([]);
          setError(loadError?.response?.data?.error || loadError.message || "Unable to load files");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (item?.sourceId) {
      loadFiles();
    } else {
      setFiles([]);
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [item]);

  const filesByTab = useMemo(() => ({
    photos: files.filter((file) => file.fileCategory === "image"),
    videos: files.filter((file) => file.fileCategory === "video"),
    documents: files.filter((file) => file.fileCategory === "document"),
  }), [files]);

  async function handleDownload(fileId) {
    try {
      const url = await getDownloadUrl({ fileId });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(downloadError?.response?.data?.error || downloadError.message || "Unable to download file");
    }
  }

  const filesForTab = filesByTab[activeTab] || [];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        {FILE_TABS.map(({ id, label }) => {
          const active = activeTab === id;
          const count = filesByTab[id]?.length || 0;
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
              {id === "photos" ? <ImageIcon size={13} /> : id === "videos" ? <Film size={13} /> : <FileText size={13} />}
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
      {loading ? (
        <div style={{ color: C.t3, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
          Loading files...
        </div>
      ) : filesForTab.length === 0 ? (
        <div style={{ color: C.t3, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
          No {activeTab} attached to this {getItemKind(item)}.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          {filesForTab.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => handleDownload(file.id)}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 10,
                background: C.bgElevated,
                cursor: "pointer",
                transition: "border-color 0.15s ease",
                textAlign: "left",
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
                {formatFileSize(file.size)}
              </div>
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div
          style={{
            marginTop: 14,
            padding: "8px 12px",
            borderRadius: 8,
            background: `${C.danger}12`,
            fontSize: 11,
            color: C.danger,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

// ── DayMeetingsPanel (Side Panel that pushes content) ────────────────────────

function DayMeetingsPanel({ date, items, onClose, onSelectMeeting, isVisible }) {
  const { C } = usePortalTheme();

  return (
    <div
      style={{
        width: 300,
        height: "100%",
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : "translateX(-20px)",
        transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div 
            style={{ 
              fontSize: 10, 
              fontWeight: 700, 
              color: C.t3, 
              textTransform: "uppercase", 
              letterSpacing: ".08em",
              marginBottom: 4,
            }}
          >
            Schedule
          </div>
          <h3 
            style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              color: C.t1,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {date?.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.bgElevated,
            color: C.t2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = C.purple;
            e.currentTarget.style.color = C.purple;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.t2;
          }}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "16px 20px",
        }}
      >
        {items.length === 0 ? (
          <div 
            style={{ 
              fontSize: 13, 
              color: C.t3, 
              textAlign: "center", 
              padding: "32px 16px",
              background: `${C.t3}06`,
              borderRadius: 10,
              border: `1px dashed ${C.border}`,
            }}
          >
            No schedule for this date.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item) => {
              const tone = item.isVip ? C.warn : C.purple;
              const kindLabel = getItemKind(item) === "event" ? "Event" : "Meeting";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectMeeting(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    borderRadius: 10,
                    padding: "14px",
                    paddingLeft: "16px",
                    border: `1px solid ${tone}30`,
                    background: `${tone}06`,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${tone}60`;
                    e.currentTarget.style.background = `${tone}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${tone}30`;
                    e.currentTarget.style.background = `${tone}06`;
                  }}
                >
                  {/* Left accent bar */}
                  <div 
                    style={{ 
                      position: "absolute", 
                      left: 0, 
                      top: 10, 
                      bottom: 10, 
                      width: 3, 
                      background: tone, 
                      borderRadius: "0 3px 3px 0",
                    }} 
                  />
                  
                  {/* Badge */}
                  <div
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 5,
                      fontSize: 10,
                      fontWeight: 600,
                      border: `1px solid ${tone}40`,
                      background: C.card,
                      color: tone,
                      marginBottom: 8,
                    }}
                  >
                    {kindLabel}
                  </div>
                  
                  {/* Title */}
                  <div 
                    style={{ 
                      fontSize: 14, 
                      fontWeight: 700, 
                      color: C.t1,
                      lineHeight: 1.4,
                      marginBottom: 4,
                    }}
                  >
                    {item.title}
                  </div>
                  
                  {/* Time */}
                  <div 
                    style={{ 
                      fontSize: 12, 
                      color: C.t2,
                      fontWeight: 500,
                    }}
                  >
                    {formatTime(item.startsAt)} - {formatTime(item.endsAt)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal Tabs Configuration ──────────────────────────────────────────────────

const MODAL_TABS = [
  { id: "details", label: "Details", icon: FileText },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Film },
  { id: "documents", label: "Documents", icon: FileText },
];

// ── FileGridSection (for individual file tabs in modal) ───────────────────────

function FileGridSection({ type, C, tone }) {
  const files = MOCK_FILES[type] || [];
  
  if (files.length === 0) {
    return (
      <div 
        style={{ 
          color: C.t3, 
          fontSize: 13, 
          textAlign: "center", 
          padding: "48px 24px",
          background: `${C.t3}06`,
          borderRadius: 12,
          border: `1px dashed ${C.border}`,
        }}
      >
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
          {type === "photos" ? <ImageIcon size={32} style={{ opacity: 0.4 }} /> : 
           type === "videos" ? <Film size={32} style={{ opacity: 0.4 }} /> : 
           <FileText size={32} style={{ opacity: 0.4 }} />}
        </div>
        No {type} attached to this meeting.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 14,
        }}
      >
        {files.map((file) => (
          <div
            key={file.id}
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 12,
              background: C.bgElevated,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${tone}40`;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 4px 12px ${tone}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <FilePlaceholderIcon type={type} tone={tone} />
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
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
            <div style={{ marginTop: 6, fontSize: 11, color: C.t3 }}>
              {file.duration ? `${file.duration}` : formatFileSize(file.size)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 8,
          background: `${C.t3}08`,
          fontSize: 11,
          color: C.t3,
          fontStyle: "italic",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Clock size={12} />
        File preview — backend integration pending.
      </div>
    </div>
  );
}

// ── MeetingDetailModal ────────────────────────────────────────────────────────

function MeetingDetailModal({ meeting, onClose }) {
  const { C } = usePortalTheme();
  const [activeTab, setActiveTab] = useState("details");
  
  if (!meeting) return null;
  const tone = meeting.isVip ? C.warn : C.purple;

  const getTabCount = () => null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[70] flex sm:items-center justify-center overflow-y-auto p-4">
        <div
          className="w-full max-w-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 fade-in duration-300"
          style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: C.dialogShadow }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{ 
              padding: "20px 24px", 
              background: C.bgElevated, 
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "inline-flex",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    border: `1px solid ${tone}33`,
                    background: `${tone}12`,
                    color: tone,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  {getItemTypeLabel(meeting)}
                </div>
                <h3 
                  style={{ 
                    marginTop: 12, 
                    fontSize: 22, 
                    fontWeight: 700, 
                    color: C.t1,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {meeting.title}
                </h3>
                <div 
                  style={{ 
                    marginTop: 10, 
                    fontSize: 13, 
                    color: C.t2,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {new Date(meeting.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span style={{ color: C.t3 }}>•</span>
                  <span style={{ fontWeight: 600, color: tone }}>
                    {formatTime(meeting.startsAt)} – {formatTime(meeting.endsAt)}
                  </span>
                  <span 
                    style={{ 
                      fontSize: 11, 
                      padding: "2px 8px", 
                      borderRadius: 4, 
                      background: `${C.t3}10`, 
                      color: C.t3,
                      fontWeight: 500,
                    }}
                  >
                    {formatDuration(meeting)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: C.t2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.danger;
                  e.currentTarget.style.color = C.danger;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.t2;
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div 
              style={{ 
                display: "flex", 
                gap: 6, 
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              {MODAL_TABS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                const count = getTabCount(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: isActive ? `1px solid ${tone}40` : `1px solid transparent`,
                      background: isActive ? `${tone}10` : "transparent",
                      color: isActive ? tone : C.t3,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = `${C.t3}10`;
                        e.currentTarget.style.color = C.t1;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = C.t3;
                      }
                    }}
                  >
                    <Icon size={14} />
                    {label}
                    {count !== null && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: isActive ? `${tone}20` : `${C.t3}15`,
                          color: isActive ? tone : C.t3,
                          minWidth: 18,
                          textAlign: "center",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div 
            style={{ 
              padding: 24, 
              maxHeight: "calc(100vh - 320px)", 
              overflowY: "auto",
            }}
          >
            {/* Details Tab */}
            {activeTab === "details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                  <div 
                    style={{ 
                      padding: 16, 
                      borderRadius: 10, 
                      background: C.bgElevated,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ padding: 6, borderRadius: 6, background: `${tone}12`, color: tone }}>
                        <MapPin size={14} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                        Location
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: C.t1, fontWeight: 600, wordBreak: "break-word", margin: 0 }}>
                      {meeting.location || "Location pending"}
                    </p>
                  </div>
                  <div 
                    style={{ 
                      padding: 16, 
                      borderRadius: 10, 
                      background: C.bgElevated,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ padding: 6, borderRadius: 6, background: `${tone}12`, color: tone }}>
                        <Calendar size={14} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                        Source
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: C.t1, fontWeight: 600, margin: 0 }}>
                      {meeting.source}
                    </p>
                  </div>
                </div>

                {/* Participants */}
                {Array.isArray(meeting.participants) && meeting.participants.length > 0 && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ padding: 6, borderRadius: 6, background: `${tone}12`, color: tone }}>
                        <Users size={14} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                        Participants
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {meeting.participants.map((p) => (
                        <span
                          key={p}
                          style={{
                            fontSize: 12,
                            padding: "6px 14px",
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
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
                    Description
                  </p>
                  <p style={{ color: C.t2, lineHeight: 1.75, fontSize: 14, margin: 0 ,
                    wordBreak: "break-word",whiteSpace: "pre-wrap"}}>
                    {meeting.details || "No description available."}
                  </p>
                </div>
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === "photos" && (
              <FilesSection item={meeting} C={C} tone={tone} defaultTab="photos" />
            )}

            {/* Videos Tab */}
            {activeTab === "videos" && (
              <FilesSection item={meeting} C={C} tone={tone} defaultTab="videos" />
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <FilesSection item={meeting} C={C} tone={tone} defaultTab="documents" />
            )}
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Calendar navigation
  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));

  // Modal state
  const [selectedDate, setSelectedDate] = useState(null);   // controls DayMeetingsDrawer
  const [selectedMeeting, setSelectedMeeting] = useState(null); // controls MeetingDetailModal

  useEffect(() => {
    let mounted = true;

    async function loadCalendar() {
      try {
        const { data } = await apiClient.get("/minister/calendar");
        const mapped = (data.events || []).map((event) => ({
          id: event.id,
          sourceId: event.meeting_id || event.id,
          title: event.title,
          details: event.comments || "",
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          location: event.location,
          source: event.meeting_id ? (event.is_vip ? "Minister Priority" : "Minister Calendar") : "DEO Event",
          participants: event.participants || [],
          kind: event.meeting_id ? "meeting" : "event",
          isVip: Boolean(event.is_vip),
          whoToMeet: event.who_to_meet || "",
        }));
        if (mounted) {
          setItems(mapped);
          setError("");
        }
      } catch (loadError) {
        if (mounted) {
          setItems([]);
          setError(loadError?.response?.data?.error || "Unable to load calendar");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (session?.role) {
      loadCalendar();
    } else {
      setLoading(false);
    }

    return () => { mounted = false; };
  }, [session?.role]);

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

  function handleCloseDayDrawer() {
    setSelectedDate(null);
    setSelectedMeeting(null);
  }

  // Calculate dynamic height based on the exact number of weeks needed (monthGrid.length / 7)
  const rowsCount = monthGrid.length / 7;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <WorkspacePage width={1320}>

      {loading ? (
        <WorkspaceEmptyState title="Loading calendar…" />
      ) : error ? (
        <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
      ) : (
        <div>
          {/* Main Grid: Drawer, Calendar & Right Panel */}
          <div style={{ display: "flex", gap: 24, alignItems: "stretch", height: "calc(100vh - 120px)" }}>
            
            {/* Schedule Panel - Separate div outside calendar */}
            <div 
              style={{ 
                width: selectedDate ? 300 : 0,
                flexShrink: 0,
                overflow: "hidden",
                transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <DayMeetingsPanel
                date={selectedDate}
                items={meetingsForDate}
                onClose={handleCloseDayDrawer}
                onSelectMeeting={handleSelectMeeting}
                isVisible={selectedDate !== null}
              />
            </div>

            {/* Calendar Card */}
            <WorkspaceCard style={{ marginBottom: 0, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)" }}>
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
                        handleCloseDayDrawer();
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
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
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
                      gridTemplateRows: `repeat(${rowsCount}, 1fr)`,
                      gap: 8,
                      flex: 1,
                      minHeight: 0,
                    }}
                  >
                    {monthGrid.map((day) => {
                      const inMonth = day.getMonth() === cursorDate.getMonth();
                      const isToday = isSameDay(day, new Date());
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const eventsForDay = items.filter((item) => isSameDay(item.startsAt, day));
                      const daySummary = getItemSummary(eventsForDay);

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => handleDateSelect(day)}
                          style={{
                            borderRadius: 12,
                            border: `1px solid ${isSelected ? C.purple + "60" : isToday ? C.purple + "40" : C.border}`,
                            background: isSelected
                              ? `${C.purple}08`
                              : inMonth
                              ? C.bgElevated
                              : C.bg,
                            padding: 10,
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            cursor: "pointer",
                            transition: "border-color 0.15s ease, background 0.15s ease",
                            overflow: "hidden",
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
                                fontSize: 10,
                                fontWeight: 600,
                                color: C.purple,
                                background: `${C.purple}12`,
                                border: `1px solid ${C.purple}30`,
                                borderRadius: 6,
                                padding: "3px 6px",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {eventsForDay.length} {eventsForDay.length === 1 ? "meeting" : "meetings"}
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
                    const daySummary = getItemSummary(eventsForDay);
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
                              {daySummary}
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
                      const tone = item.isVip ? C.warn : C.purple;
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
                              {getItemKind(item) === "event" ? "Event" : item.isVip ? "VIP" : "Standard"}
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

              {/* Footer hint when panel is open */}
             
            </WorkspaceCard>

            {/* Right Panel: Upcoming Meetings */}
            <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column" }}>
              
              {/* Upcoming Meetings */}
              <WorkspaceCard style={{ padding: 24, marginBottom: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Upcoming</div>
                    <h3 className="text-lg font-bold" style={{ color: C.t1 }}>Next Schedule</h3>
                  </div>
                  <div style={{ background: `${C.purple}15`, padding: 8, borderRadius: '50%', color: C.purple }}>
                    <Calendar size={18} />
                  </div>
                </div>

                {nextTwoMeetings.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.t3 }}>No upcoming meetings or events scheduled.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {nextTwoMeetings.map((item) => {
                      const tone = item.isVip ? C.warn : C.purple;
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