import { useState, useRef } from "react";

const typeLabels = {
  photo: "Click to upload photo",
  video: "Click to upload video",
  doc: "Click to upload document",
};
const typeHints = {
  photo: "JPG, PNG, HEIC up to 20MB",
  video: "MP4, MOV up to 500MB",
  doc: "PDF, DOCX, XLSX up to 50MB",
};

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
const EyeIcon = () => (
  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const TrashIcon = () => (
  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const SearchIcon = () => (
  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
  </svg>
);
const FolderIcon = () => (
  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const FILE_ICON_CONFIG = {
  photo: { color: "#3B6D11", bg: "bg-green-50", component: PhotoIcon },
  video: { color: "#854F0B", bg: "bg-amber-50", component: VideoIcon },
  doc:   { color: "#185FA5", bg: "bg-blue-50",  component: DocIcon  },
};
const BADGE_CONFIG = {
  photo: "bg-green-50 text-green-800",
  video: "bg-amber-50 text-amber-800",
  doc:   "bg-blue-50 text-blue-800",
};
const DELETE_REASONS = [
  "Duplicate file",
  "Wrong citizen",
  "Incorrect date",
  "Privacy concern",
  "Quality issue",
  "Other",
];
const INITIAL_FILES = [
  { id: 1, name: "meeting_photo_001.jpg",    type: "photo", citizen: "Ramesh Sharma",  date: "01 Apr 2026", subject: "Land dispute",          size: "2.4 MB" },
  { id: 2, name: "session_recording.mp4",    type: "video", citizen: "Priya Patel",    date: "31 Mar 2026", subject: "Water supply complaint", size: "84.2 MB" },
  { id: 3, name: "complaint_form_signed.pdf",type: "doc",   citizen: "Suresh Kumar",   date: "30 Mar 2026", subject: "Road construction",     size: "1.1 MB" },
  { id: 4, name: "id_proof_scan.jpg",        type: "photo", citizen: "Anjali Verma",   date: "29 Mar 2026", subject: "Ration card update",    size: "0.8 MB" },
  { id: 5, name: "noc_application.docx",     type: "doc",   citizen: "Mohammad Irfan", date: "28 Mar 2026", subject: "Business license",      size: "0.4 MB" },
];

function Toast({ message, isError, visible }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl px-4 py-2.5 text-sm shadow-md transition-all duration-200 text-[var(--portal-text-strong)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isError ? "bg-red-500" : "bg-green-500"}`} />
      {message}
    </div>
  );
}

function DeleteModal({ file, onClose, onConfirm }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [extraNote, setExtraNote] = useState("");

  const handleConfirm = () => {
    const reason = selectedReason || extraNote.trim();
    if (!reason) return;
    onConfirm(reason);
    setSelectedReason("");
    setExtraNote("");
  };

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--portal-card)] rounded-2xl border border-[var(--portal-border)] p-6 w-96 max-w-[90vw]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <TrashIcon />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--portal-text-strong)]">Delete file?</p>
            <p className="text-[12px] text-[var(--portal-text-muted)] mt-0.5 break-all">{file.name}</p>
          </div>
        </div>

        <p className="text-[12px] font-medium text-[var(--portal-text)] mb-2">Select reason for deletion</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {DELETE_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedReason(r === selectedReason ? "" : r)}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${
                selectedReason === r
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "border-[var(--portal-border)] text-[var(--portal-text-muted)] hover:bg-[var(--portal-bg-elevated)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          placeholder="Add additional reason or details..."
          className="w-full text-xs border border-[var(--portal-border)] rounded-lg p-2.5 resize-none h-16 focus:outline-none focus:border-[var(--portal-purple)] bg-[var(--portal-bg-elevated)] text-[var(--portal-text)]"
        />
        {!selectedReason && !extraNote.trim() && (
          <p className="text-xs text-red-500 mt-1">Please select or enter a reason.</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs border border-[var(--portal-border)] rounded-lg text-[var(--portal-text)] hover:bg-[var(--portal-bg-elevated)] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Delete file
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CitizenMeetingFiles() {
  const [files, setFiles] = useState(INITIAL_FILES);
  const [nextId, setNextId] = useState(6);
  const [selectedType, setSelectedType] = useState("photo");
  const [citizenName, setCitizenName] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", isError: false });
  const fileInputRef = useRef();

  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) setFileName(e.target.files[0].name);
  };

  const handleUpload = () => {
    if (!citizenName.trim()) { showToast("Please enter citizen name", true); return; }
    const name = fileName || (selectedType === "photo" ? "photo_upload.jpg" : selectedType === "video" ? "video_upload.mp4" : "document.pdf");
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    setFiles((prev) => [
      { id: nextId, name, type: selectedType, citizen: citizenName, date: meetingDate || today, subject: subject || "—", size: "—" },
      ...prev,
    ]);
    setNextId((n) => n + 1);
    setCitizenName(""); setMeetingDate(""); setSubject(""); setNotes(""); setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    showToast("File uploaded successfully");
  };

  const handleDelete = (reason) => {
    setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
    showToast(`File deleted: ${reason}`, true);
    setDeleteTarget(null);
  };

  const filtered = files.filter((f) => {
    const matchFilter = activeFilter === "all" || f.type === activeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || f.name.toLowerCase().includes(q) || f.citizen.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    photo: files.filter((f) => f.type === "photo").length,
    video: files.filter((f) => f.type === "video").length,
    doc: files.filter((f) => f.type === "doc").length,
  };

  return (
    <div className="w-full px-6 py-6 pb-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--portal-purple)] mb-1">DEO Workspace</p>
      <h1 className="text-xl font-semibold text-[var(--portal-text-strong)]" style={{ marginTop: 4 }}>Citizen Meeting Files</h1>
      <p className="text-[13px] text-[var(--portal-text-muted)] mt-1">Upload and manage citizen meeting documents, photos, and videos.</p>
      <hr className="my-5 border-[var(--portal-border-light)]" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {[
          { label: "Total Files", val: files.length, sub: "All uploads",        color: "text-[var(--portal-text-strong)]" },
          { label: "Photos",      val: counts.photo,  sub: "Image files",        color: "text-green-600" },
          { label: "Videos",      val: counts.video,  sub: "Video recordings",   color: "text-amber-600" },
          { label: "Documents",   val: counts.doc,    sub: "PDF / Word files",   color: "text-blue-600"  },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--portal-bg-elevated)] border border-[var(--portal-border-light)] rounded-xl p-3.5">
            <p className="text-[11px] font-medium text-[var(--portal-text-muted)] mb-1">{s.label}</p>
            <p className={`text-2xl font-medium ${s.color}`}>{s.val}</p>
            <p className="text-[11px] text-[var(--portal-text-muted)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-[360px_1fr] gap-4">
        {/* Upload Panel */}
        <div className="bg-[var(--portal-card)] border border-[var(--portal-border-light)] rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--portal-text-strong)] border-b border-[var(--portal-border-light)] pb-3">
            <UploadIcon size={16} color="currentColor" />
            Upload Files
          </div>

          {/* Type Tabs */}
          <div>
            <p className="text-[12px] font-medium text-[var(--portal-text)] mb-1.5">File type</p>
            <div className="flex gap-1.5">
              {["photo", "video", "doc"].map((t) => {
                const cfg = FILE_ICON_CONFIG[t];
                const IconComp = cfg.component;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`flex-1 py-2 flex flex-col items-center gap-1 text-[11px] border rounded-xl transition-all ${
                      selectedType === t
                        ? "border-[var(--portal-purple)] bg-[var(--portal-purple-dim)] text-[var(--portal-purple)]"
                        : "border-[var(--portal-border)] text-[var(--portal-text-muted)] hover:bg-[var(--portal-bg-elevated)]"
                    }`}
                  >
                    <IconComp color={selectedType === t ? "var(--portal-purple)" : cfg.color} size={16} />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--portal-border)] rounded-xl p-5 text-center cursor-pointer hover:bg-[var(--portal-bg-elevated)] transition"
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <div className="w-8 h-8 rounded-full bg-[var(--portal-purple-dim)] flex items-center justify-center mx-auto mb-2">
              <UploadIcon size={15} color="var(--portal-purple)" />
            </div>
            <p className="text-xs font-medium text-[var(--portal-purple)] mb-0.5">
              {fileName || typeLabels[selectedType]}
            </p>
            <p className="text-[11px] text-[var(--portal-text-muted)]">{typeHints[selectedType]}</p>
          </div>

          {/* Citizen Details */}
          <div className="flex flex-col gap-3">
            <p className="text-[12px] font-semibold text-[var(--portal-text)] border-b border-[var(--portal-border-light)] pb-1">Citizen Details</p>
            {[
              { label: "Citizen name",      val: citizenName, set: setCitizenName, ph: "Enter full name"  },
              { label: "Meeting date",      val: meetingDate, set: setMeetingDate, ph: "DD/MM/YYYY"       },
              { label: "Subject / purpose", val: subject,     set: setSubject,     ph: "Meeting subject"  },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-[12px] font-medium text-[var(--portal-text)] mb-1">{f.label}</p>
                <input
                  type="text"
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="w-full text-xs border border-[var(--portal-border)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--portal-purple)] bg-[var(--portal-bg-elevated)] text-[var(--portal-text-strong)]"
                />
              </div>
            ))}
            <div>
              <p className="text-[12px] font-medium text-[var(--portal-text)] mb-1">Notes (optional)</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="w-full text-xs border border-[var(--portal-border)] rounded-lg px-2.5 py-1.5 resize-none h-14 focus:outline-none focus:border-[var(--portal-purple)] bg-[var(--portal-bg-elevated)] text-[var(--portal-text-strong)]"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            className="w-full py-2.5 bg-[var(--portal-purple)] hover:opacity-90 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition"
          >
            <UploadIcon size={15} color="#fff" />
            Upload File
          </button>
        </div>

        {/* Files List Panel */}
        <div className="bg-[var(--portal-card)] border border-[var(--portal-border-light)] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--portal-text-strong)] mb-4">
            <FolderIcon />
            Uploaded Files
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--portal-text-muted)]">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files or citizen name..."
                className="w-full text-xs border border-[var(--portal-border)] rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:border-[var(--portal-purple)] bg-[var(--portal-bg-elevated)] text-[var(--portal-text-strong)]"
              />
            </div>
            {["all", "photo", "video", "doc"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 text-xs border rounded-lg transition ${
                  activeFilter === f
                    ? "bg-[var(--portal-purple-dim)] border-[var(--portal-purple)] text-[var(--portal-purple)]"
                    : "border-[var(--portal-border)] text-[var(--portal-text-muted)] hover:bg-[var(--portal-bg-elevated)]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* File Rows */}
          <div className="flex flex-col gap-1.5">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-[var(--portal-text-muted)]">No files found.</div>
            ) : (
              filtered.map((f) => {
                const cfg = FILE_ICON_CONFIG[f.type];
                const IconComp = cfg.component;
                return (
                  <div
                    key={f.id}
                    className="grid items-center gap-3 px-3 py-2.5 border border-[var(--portal-border-light)] rounded-xl hover:bg-[var(--portal-bg-elevated)] transition"
                    style={{ gridTemplateColumns: "36px 1fr auto auto auto" }}
                  >
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <IconComp color={cfg.color} size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--portal-text-strong)] truncate">{f.name}</p>
                      <p className="text-[12px] text-[var(--portal-text-muted)] mt-0.5">{f.citizen} · {f.subject} · {f.size}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${BADGE_CONFIG[f.type]}`}>
                      {f.type}
                    </span>
                    <span className="text-[11px] text-[var(--portal-text-muted)] whitespace-nowrap">{f.date}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => showToast(`Preview: ${f.name}`)}
                        className="w-7 h-7 rounded-lg border border-[var(--portal-border)] flex items-center justify-center hover:bg-[var(--portal-bg-elevated)] transition text-[var(--portal-text-muted)]"
                      >
                        <EyeIcon />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(f)}
                        className="w-7 h-7 rounded-lg border border-[var(--portal-border)] flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition text-[var(--portal-text-muted)]"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              }) 
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        file={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} isError={toast.isError} />
    </div>
  );
}
