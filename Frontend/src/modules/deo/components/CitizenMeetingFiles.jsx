import { useState, useRef } from "react";

// ── Icons ────────────────────────────────────────────────────────────────────

const PhotoIcon = ({ color = "currentColor", size = 18 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const VideoIcon = ({ color = "currentColor", size = 18 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const DocIcon = ({ color = "currentColor", size = 18 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const UploadIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const PaperclipIcon = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);
const SearchIcon = ({ size = 15 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
  </svg>
);
const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const TrashIcon = ({ size = 14 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const EditIcon = ({ size = 14 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// ── Data ─────────────────────────────────────────────────────────────────────

const INITIAL_MEETINGS = [
  { id: 1, title: "Document Verification",   whom: "District Collector",      date: "2025-03-31", time: "09:00", location: "Collectorate Office, Blo...", status: "Upcoming",   fileCount: 2 },
  { id: 2, title: "Land Record Review",       whom: "Revenue Officer",         date: "2025-04-01", time: "10:30", location: "Revenue Bhawan",             status: "Completed",  fileCount: 0 },
  { id: 3, title: "Budget Allocation Meeting",whom: "Finance Secretary",       date: "2025-04-02", time: "11:00", location: "Secretariat",                status: "Cancelled",  fileCount: 0 },
  { id: 4, title: "Public Grievance Hearing", whom: "Block Development Officer",date:"2025-05-03", time: "14:00", location: "Block Office",               status: "Upcoming",   fileCount: 2 },
  { id: 5, title: "Infrastructure Inspection",whom: "PWD Engineer",           date: "2025-05-04", time: "15:30", location: "PWD Office",                  status: "Upcoming",   fileCount: 0 },
  { id: 6, title: "Revenue Assessment",       whom: "Tehsildar",              date: "2025-05-05", time: "16:00", location: "Tehsil Bhawan",              status: "Completed",  fileCount: 0 },
  { id: 7, title: "Health Camp Coordination", whom: "CMO Representative",     date: "2025-05-06", time: "09:30", location: "District Hospital",          status: "Upcoming",   fileCount: 1 },
  { id: 8, title: "Water Supply Review",      whom: "Jal Nigam Engineer",     date: "2025-05-07", time: "11:00", location: "Municipal Office",           status: "Completed",  fileCount: 0 },
];

const STATUS_CONFIG = {
  Upcoming:  { bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" },
  Completed: { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  Cancelled: { bg: "#FFF1F2", color: "#E11D48", border: "#FECDD3" },
};

const TAB_CONFIG = [
  { id: "photos",    label: "Photos",    icon: PhotoIcon, accept: "image/*",     hint: "JPG, PNG, HEIC up to 20MB",  exts: [".jpg", ".png", ".heic"] },
  { id: "videos",    label: "Videos",    icon: VideoIcon, accept: "video/*",     hint: "MP4, MOV up to 500MB",       exts: [".mp4", ".mov"] },
  { id: "documents", label: "Documents", icon: DocIcon,   accept: ".pdf,.docx,.xlsx", hint: "PDF, DOCX, XLSX up to 50MB", exts: [".pdf", ".docx", ".xlsx"] },
];

const TAB_COLORS = {
  photos:    { color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
  videos:    { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  documents: { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
};

// ── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({ meeting, onClose, onUploaded }) {
  const [activeTab, setActiveTab] = useState("photos");
  const [uploadedFiles, setUploadedFiles] = useState({ photos: [], videos: [], documents: [] });
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const tab = TAB_CONFIG.find(t => t.id === activeTab);
  const tc = TAB_COLORS[activeTab];

  const addFiles = (fileList) => {
    const arr = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size > 1024 * 1024
        ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(f.size / 1024)} KB`,
    }));
    setUploadedFiles(prev => ({ ...prev, [activeTab]: [...prev[activeTab], ...arr] }));
  };

  const removeFile = (id) => {
    setUploadedFiles(prev => ({ ...prev, [activeTab]: prev[activeTab].filter(f => f.id !== id) }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSave = () => {
    const total = Object.values(uploadedFiles).reduce((s, arr) => s + arr.length, 0);
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      onUploaded(meeting.id, total);
      onClose();
    }, 800);
  };

  const totalFiles = Object.values(uploadedFiles).reduce((s, arr) => s + arr.length, 0);

  if (!meeting) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--portal-card, #fff)",
        borderRadius: 20, width: "100%", maxWidth: 560,
        border: "1px solid var(--portal-border, #E5E7EB)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--portal-border, #E5E7EB)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--portal-purple, #6366F1)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>
              File Upload
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--portal-text-strong, #111)" }}>
              {meeting.title}
            </div>
            <div style={{ fontSize: 12, color: "var(--portal-text-muted, #6B7280)", marginTop: 2 }}>
              {meeting.whom} · {meeting.date} {meeting.time}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            border: "1px solid var(--portal-border, #E5E7EB)",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--portal-text-muted, #6B7280)",
            transition: "all 0.15s",
          }}>
            <XIcon size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 0,
          borderBottom: "1px solid var(--portal-border, #E5E7EB)",
          padding: "0 24px",
        }}>
          {TAB_CONFIG.map(t => {
            const active = activeTab === t.id;
            const c = TAB_COLORS[t.id];
            const count = uploadedFiles[t.id].length;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "12px 16px", fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? c.color : "var(--portal-text-muted, #6B7280)",
                borderBottom: active ? `2px solid ${c.color}` : "2px solid transparent",
                background: "transparent", cursor: "pointer",
                transition: "all 0.15s", marginBottom: -1,
              }}>
                <t.icon color={active ? c.color : "var(--portal-text-muted, #9CA3AF)"} size={15} />
                {t.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: "1px 7px", borderRadius: 99,
                    background: c.bg, color: c.color,
                    border: `1px solid ${c.border}`,
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ padding: "20px 24px" }}>
          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? tc.color : "var(--portal-border, #D1D5DB)"}`,
              borderRadius: 14, padding: "28px 20px",
              textAlign: "center", cursor: "pointer",
              background: dragOver ? tc.bg : "var(--portal-bg-elevated, #F9FAFB)",
              transition: "all 0.15s",
              marginBottom: 16,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={tab.accept}
              style={{ display: "none" }}
              onChange={e => addFiles(e.target.files)}
            />
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: tc.bg, border: `1px solid ${tc.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px", color: tc.color,
            }}>
              <tab.icon color={tc.color} size={22} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tc.color, marginBottom: 4 }}>
              Click to upload {tab.label.toLowerCase()} or drag & drop
            </div>
            <div style={{ fontSize: 11, color: "var(--portal-text-muted, #9CA3AF)" }}>
              {tab.hint}
            </div>
          </div>

          {/* Uploaded files list for this tab */}
          {uploadedFiles[activeTab].length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
              {uploadedFiles[activeTab].map(f => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${tc.border}`,
                  background: tc.bg,
                }}>
                  <div style={{ color: tc.color, flexShrink: 0 }}>
                    <tab.icon color={tc.color} size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--portal-text-strong, #111)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--portal-text-muted, #9CA3AF)", marginTop: 1 }}>{f.size}</div>
                  </div>
                  <button onClick={() => removeFile(f.id)} style={{
                    width: 26, height: 26, borderRadius: 6,
                    border: "1px solid transparent", background: "transparent",
                    cursor: "pointer", color: "#EF4444",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.borderColor = "#FECACA"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px 20px",
          borderTop: "1px solid var(--portal-border, #E5E7EB)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 12, color: "var(--portal-text-muted, #6B7280)" }}>
            {totalFiles > 0
              ? <span style={{ color: "var(--portal-purple, #6366F1)", fontWeight: 600 }}>{totalFiles} file{totalFiles !== 1 ? "s" : ""} ready to upload</span>
              : "No files selected yet"
            }
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 10,
              border: "1px solid var(--portal-border, #D1D5DB)",
              background: "transparent", color: "var(--portal-text, #374151)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={totalFiles === 0 || uploading}
              style={{
                padding: "8px 20px", borderRadius: 10,
                background: totalFiles === 0 ? "#E5E7EB" : "var(--portal-purple, #6366F1)",
                color: totalFiles === 0 ? "#9CA3AF" : "#fff",
                border: "none", fontSize: 13, fontWeight: 700,
                cursor: totalFiles === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
                opacity: uploading ? 0.7 : 1,
              }}
            >
              <UploadIcon size={14} color={totalFiles === 0 ? "#9CA3AF" : "#fff"} />
              {uploading ? "Uploading…" : `Upload${totalFiles > 0 ? ` (${totalFiles})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, isError, visible }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      display: "flex", alignItems: "center", gap: 8,
      background: "var(--portal-card, #fff)",
      border: "1px solid var(--portal-border, #E5E7EB)",
      borderRadius: 12, padding: "10px 16px",
      fontSize: 13, fontWeight: 500,
      color: "var(--portal-text-strong, #111)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: isError ? "#EF4444" : "#22C55E", flexShrink: 0 }} />
      {message}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CitizenMeetingFiles() {
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toast, setToast] = useState({ visible: false, message: "", isError: false });

  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  };

  const handleUploaded = (meetingId, count) => {
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, fileCount: m.fileCount + count } : m));
    showToast(`${count} file${count !== 1 ? "s" : ""} uploaded successfully`);
  };

  const filtered = meetings.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.title.toLowerCase().includes(q) || m.whom.toLowerCase().includes(q) || m.location.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All Status" || m.status === statusFilter;
    const matchFrom = !dateFrom || m.date >= dateFrom;
    const matchTo = !dateTo || m.date <= dateTo;
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  return (
    <div style={{ width: "100%", padding: "28px 28px 48px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--portal-purple, #6366F1)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 }}>
          DEO Workspace
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--portal-text-strong, #111)" }}>
          Citizen Meeting Files
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--portal-text-muted, #6B7280)" }}>
          Manage and upload files for citizen meetings. Click the upload icon in Actions to attach files.
        </p>
      </div>

      {/* Table Container */}
      <div style={{
        border: "1px solid var(--portal-border, #E5E7EB)",
        borderRadius: 16, overflow: "hidden",
        background: "var(--portal-card, #fff)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        {/* Toolbar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid var(--portal-border, #E5E7EB)",
          background: "var(--portal-card, #fff)",
          flexWrap: "wrap",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}>
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events, person, location..."
              style={{
                width: "100%", padding: "8px 12px 8px 34px",
                borderRadius: 10, border: "1px solid var(--portal-border, #D1D5DB)",
                fontSize: 13, background: "var(--portal-bg-elevated, #F9FAFB)",
                color: "var(--portal-text-strong, #111)", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 10,
              border: "1px solid var(--portal-border, #D1D5DB)",
              fontSize: 13, background: "var(--portal-bg-elevated, #F9FAFB)",
              color: "var(--portal-text-strong, #111)", outline: "none",
              cursor: "pointer",
            }}
          >
            {["All Status", "Upcoming", "Completed", "Cancelled"].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>

          {/* Date range */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{
              padding: "8px 10px", borderRadius: 10,
              border: "1px solid var(--portal-border, #D1D5DB)",
              fontSize: 12, background: "var(--portal-bg-elevated, #F9FAFB)",
              color: "var(--portal-text-strong, #111)", outline: "none",
            }} />
            <span style={{ color: "#9CA3AF", fontSize: 13 }}>–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{
              padding: "8px 10px", borderRadius: 10,
              border: "1px solid var(--portal-border, #D1D5DB)",
              fontSize: 12, background: "var(--portal-bg-elevated, #F9FAFB)",
              color: "var(--portal-text-strong, #111)", outline: "none",
            }} />
          </div>

          {/* Count */}
          <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--portal-text-muted, #6B7280)", fontWeight: 500, whiteSpace: "nowrap" }}>
            {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            {/* Head */}
            <thead>
              <tr style={{ background: "var(--portal-bg-elevated, #F9FAFB)" }}>
                {["#", "EVENT TITLE", "WHOM TO MEET", "DATE & TIME", "LOCATION", "FILES", "STATUS", "ACTIONS"].map(col => (
                  <th key={col} style={{
                    padding: "11px 18px", textAlign: "left",
                    fontSize: 11, fontWeight: 700,
                    color: "var(--portal-text-muted, #9CA3AF)",
                    letterSpacing: ".06em", textTransform: "uppercase",
                    borderBottom: "1px solid var(--portal-border, #E5E7EB)",
                    whiteSpace: "nowrap",
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 20px", textAlign: "center", fontSize: 14, color: "var(--portal-text-muted, #9CA3AF)" }}>
                    No meetings found.
                  </td>
                </tr>
              ) : (
                filtered.map((m, idx) => {
                  const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.Upcoming;
                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: "1px solid var(--portal-border, #E5E7EB)",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--portal-bg-elevated, #F9FAFB)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* # */}
                      <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--portal-text-muted, #9CA3AF)", fontWeight: 500 }}>
                        {idx + 1}
                      </td>

                      {/* Title */}
                      <td style={{ padding: "16px 18px" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--portal-text-strong, #111)" }}>
                          {m.title}
                        </span>
                      </td>

                      {/* Whom */}
                      <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--portal-text, #374151)", fontWeight: 400 }}>
                        {m.whom}
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--portal-text-strong, #111)" }}>{m.date}</div>
                        <div style={{ fontSize: 12, color: "var(--portal-text-muted, #9CA3AF)", marginTop: 2 }}>{m.time}</div>
                      </td>

                      {/* Location */}
                      <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--portal-text, #374151)", maxWidth: 220 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {m.location}
                        </span>
                      </td>

                      {/* Files */}
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <PaperclipIcon size={14} color={m.fileCount > 0 ? "var(--portal-purple, #6366F1)" : "#D1D5DB"} />
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: m.fileCount > 0 ? "var(--portal-purple, #6366F1)" : "var(--portal-text-muted, #9CA3AF)",
                          }}>
                            {m.fileCount}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "16px 18px" }}>
                        <span style={{
                          display: "inline-block", padding: "5px 14px",
                          borderRadius: 99, fontSize: 12, fontWeight: 700,
                          background: sc.bg, color: sc.color,
                          border: `1px solid ${sc.border}`,
                          whiteSpace: "nowrap",
                        }}>
                          {m.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {/* Upload button */}
                          <button
                            onClick={() => setUploadTarget(m)}
                            title="Upload files"
                            style={{
                              width: 34, height: 34, borderRadius: 9,
                              border: "1px solid #E0E7FF",
                              background: "#EEF2FF",
                              color: "#6366F1", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#6366F1"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#6366F1"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = "#6366F1"; e.currentTarget.style.borderColor = "#E0E7FF"; }}
                          >
                            <UploadIcon size={14} color="currentColor" />
                          </button>

                          {/* Edit button */}
                          <button
                            title="Edit"
                            style={{
                              width: 34, height: 34, borderRadius: 9,
                              border: "1px solid #E0E7FF",
                              background: "#EEF2FF",
                              color: "#6366F1", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#6366F1"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#6366F1"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = "#6366F1"; e.currentTarget.style.borderColor = "#E0E7FF"; }}
                          >
                            <EditIcon size={14} />
                          </button>

                          {/* Delete button */}
                          <button
                            title="Delete"
                            style={{
                              width: 34, height: 34, borderRadius: 9,
                              border: "1px solid #FEE2E2",
                              background: "#FEF2F2",
                              color: "#EF4444", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#EF4444"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#EF4444"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.borderColor = "#FEE2E2"; }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadTarget && (
        <UploadModal
          meeting={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onUploaded={handleUploaded}
        />
      )}

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} isError={toast.isError} />
    </div>
  );
}