import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiChevronDown,
  FiDownload,
  FiEdit2,
  FiFile,
  FiImage,
  FiPaperclip,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiVideo,
  FiX,
} from "react-icons/fi";
import { apiClient } from "../../../shared/api/client.js";
import { DEO_ACCEPT, getFileUiType, uploadPrivateFile } from "../../../shared/api/privateFiles.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";

const PAGE_SIZE = 8;

function formatMeetingDate(value) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function mapMeetingToRow(meeting) {
  return {
    id: meeting.id,
    citizen: [meeting.first_name, meeting.last_name].filter(Boolean).join(" ") || "Unknown",
    subject: meeting.title || meeting.purpose || "Untitled meeting",
    date: formatMeetingDate(meeting.created_at),
    status: meeting.status === "completed" ? "Completed" : meeting.status,
    requestId: meeting.request_id || meeting.id,
    contact: meeting.mobile_number || meeting.email || "",
    files: Array.isArray(meeting.files)
      ? meeting.files.map((file) => ({
          id: file.id,
          name: file.name,
          type: file.type || getFileUiType(file.mimeType),
          size: file.size || "",
          mimeType: file.mimeType,
          createdAt: file.createdAt,
        }))
      : [],
    raw: meeting,
  };
}

function FileIcon({ type }) {
  if (type === "photo") return <FiImage size={15} color="var(--portal-purple)" />;
  if (type === "video") return <FiVideo size={15} className="text-sky-500" />;
  return <FiFile size={15} className="text-amber-500" />;
}

function UploadModal({ meeting, onClose, onEdit, onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  if (!meeting) return null;

  async function handleUpload() {
    if (!selectedFile || uploading) return;
    try {
      setUploading(true);
      setError("");
      await uploadPrivateFile({
        file: selectedFile,
        contextType: "meeting",
        contextId: meeting.id,
      });
      await onUploaded?.();
      onClose();
    } catch (uploadError) {
      setError(uploadError?.response?.data?.error || uploadError.message || "Unable to upload file");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-[var(--portal-card)] rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[var(--portal-border-light)] flex items-center justify-between shrink-0">
          <div className="text-lg font-bold text-[var(--portal-text-strong)] flex items-center gap-2">
            <FiUploadCloud size={18} color="var(--portal-purple)" /> Upload Files
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-bg-elevated)] transition-colors"
              onClick={onEdit}
            >
              Edit
            </button>
            <button className="flex items-center justify-center w-8 h-8 bg-[var(--portal-bg-elevated)] rounded-lg text-[var(--portal-text-muted)] hover:bg-[var(--portal-border)] transition-colors" onClick={onClose}>
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-5">
            <div>
              <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Citizen Name</label>
              <input
                className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]"
                value={meeting.citizen}
                readOnly
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Meeting Subject</label>
              <input
                className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]"
                value={meeting.subject}
                readOnly
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Upload File</label>
              <div
                className="border-2 border-dashed border-[var(--portal-border)] rounded-xl p-6 text-center cursor-pointer bg-[var(--portal-bg-elevated)] hover:bg-[var(--portal-card-hover)]"
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={DEO_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    setSelectedFile(event.target.files?.[0] || null);
                    setError("");
                  }}
                />
                <div className="flex justify-center mb-2">
                  <FiUploadCloud size={26} color="var(--portal-purple)" />
                </div>
                <div className="text-sm font-semibold text-[var(--portal-text)] mb-1">
                  {selectedFile?.name || "Select PDF, JPG, PNG, MP4, MPEG, or WEBM"}
                </div>
                <div className="text-xs text-[var(--portal-text-muted)]">PDF up to 5MB, images up to 20MB, video up to 100MB</div>
              </div>
            </div>
            {error ? <div className="text-sm text-red-500">{error}</div> : null}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--portal-border-light)] flex justify-end gap-3 shrink-0 bg-[var(--portal-bg-elevated)] rounded-b-xl">
          <button className="px-5 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-card-hover)] transition-colors" onClick={onClose}>Cancel</button>
          <button
            className={`px-6 py-2 text-sm font-semibold text-white border-none rounded-lg transition-opacity ${uploading || !selectedFile ? "bg-[var(--portal-purple)] opacity-50 cursor-not-allowed" : "bg-[var(--portal-purple)] hover:opacity-90"}`}
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageMediaModal({ meeting, selectedIds, onToggleItem, onToggleAll, onDeleteSelected, onClose, onBack }) {
  const [activeType, setActiveType] = useState("photo");
  if (!meeting) return null;

  const mediaTabs = [
    { key: "photo", label: "Photos", icon: FiImage },
    { key: "video", label: "Videos", icon: FiVideo },
    { key: "document", label: "Documents", icon: FiFile },
  ];
  const visibleFiles = meeting.files.filter((file) => file.type === activeType);
  const allSelected = visibleFiles.length > 0 && visibleFiles.every((file) => selectedIds.includes(file.id));

  return (
    <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-[var(--portal-card)] rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[var(--portal-border-light)] flex items-center justify-between shrink-0">
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-bg-elevated)] transition-colors"
            onClick={onBack}
          >
            <FiArrowLeft size={14} /> Back
          </button>
          <div className="text-lg font-bold text-[var(--portal-text-strong)] flex items-center gap-2">
            <FiEdit2 size={18} color="var(--portal-purple)" /> Edit Media
          </div>
          <button className="flex items-center justify-center w-8 h-8 bg-[var(--portal-bg-elevated)] rounded-lg text-[var(--portal-text-muted)] hover:bg-[var(--portal-border)] transition-colors" onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Citizen Name</label>
                <input className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]" value={meeting.citizen} readOnly />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Meeting Subject</label>
                <input className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]" value={meeting.subject} readOnly />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Media Type</label>
              <div className="flex gap-1.5">
                {mediaTabs.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveType(tab.key)}
                      className={`flex-1 py-2 flex flex-col items-center gap-1 text-[11px] border rounded-xl transition-all ${activeType === tab.key
                          ? "border-[var(--portal-purple)] bg-[var(--portal-purple-dim)] text-[var(--portal-purple)]"
                          : "border-[var(--portal-border)] text-[var(--portal-text-muted)] hover:bg-[var(--portal-bg-elevated)]"
                        }`}
                    >
                      <TabIcon size={16} color={activeType === tab.key ? "var(--portal-purple)" : "currentColor"} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                className="px-5 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-bg-elevated)] transition-colors"
                onClick={onToggleAll}
              >
                {allSelected ? "Clear Selection" : "Select All"}
              </button>
              <button
                className="px-6 py-2 text-sm font-semibold text-white rounded-lg transition-opacity bg-red-500 opacity-50 cursor-not-allowed"
                onClick={(event) => event.preventDefault()}
                disabled
                title="Delete is not available yet for uploaded files"
              >
                Delete
              </button>
            </div>

            <div className="space-y-2">
              {visibleFiles.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <FiPaperclip size={36} className="text-[var(--portal-border)] mx-auto mb-3" />
                  <div className="text-sm font-semibold text-[var(--portal-text)] mb-1">No files found</div>
                  <div className="text-xs text-[var(--portal-text-muted)]">There are no uploaded files in this section.</div>
                </div>
              ) : (
                visibleFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-2.5 border border-[var(--portal-border)] rounded-lg bg-[var(--portal-bg-elevated)]">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(file.id)}
                      onChange={() => onToggleItem(file.id)}
                      className="w-4 h-4"
                    />
                    <FileIcon type={file.type} />
                    <span className="flex-1 text-sm font-medium text-[var(--portal-text)] truncate">{file.name}</span>
                    <span className="text-xs text-[var(--portal-text-muted)] mr-1">{file.size}</span>
                    <span className="text-xs font-medium text-[var(--portal-text-muted)] capitalize">{file.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--portal-border-light)] flex justify-end gap-3 shrink-0 bg-[var(--portal-bg-elevated)] rounded-b-xl">
          <button className="px-5 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-card-hover)] transition-colors" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function CitizenMeetingFiles() {
  const { session } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [uploadMeeting, setUploadMeeting] = useState(null);
  const [editMeeting, setEditMeeting] = useState(null);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAssignedMeetings() {
      try {
        setLoading(true);
        setError("");
        const { data } = await apiClient.get("/deo/completed-meetings");
        if (!mounted) return;
        setMeetings((data.meetings || []).map(mapMeetingToRow));
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load completed citizen meetings");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.role) {
      loadAssignedMeetings();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [session?.role]);

  async function reloadCompletedMeetings() {
    const { data } = await apiClient.get("/deo/completed-meetings");
    setMeetings((data.meetings || []).map(mapMeetingToRow));
  }

  const counts = {
    All: meetings.length,
    Upcoming: meetings.length,
    Completed: meetings.filter((meeting) => meeting.status === "Completed").length,
    Cancelled: meetings.filter((meeting) => meeting.status === "Cancelled").length,
  };

  const filtered = useMemo(() => {
    const query = search.toLowerCase();

    return meetings.filter((meeting) => {
      const totalFiles = meeting.files.length;
      return (
        (!search || [meeting.citizen, meeting.subject, meeting.date, String(totalFiles)].join(" ").toLowerCase().includes(query))
        && (activeTab === "All" || meeting.status === activeTab)
        && (!statusFilter || meeting.status === statusFilter)
        && (!dateFrom || meeting.date >= dateFrom)
        && (!dateTo || meeting.date <= dateTo)
      );
    });
  }, [activeTab, dateFrom, dateTo, meetings, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || statusFilter || dateFrom || dateTo;

  const handleExport = (type) => {
    setShowExportMenu(false);
    console.log(`Export ${type}`, filtered);
  };

  const handleOpenEdit = (meeting) => {
    setUploadMeeting(null);
    setSelectedFileIds([]);
    setEditMeeting(meeting);
  };

  const handleCloseModals = () => {
    setUploadMeeting(null);
    setEditMeeting(null);
    setSelectedFileIds([]);
  };

  const handleToggleFile = (fileId) => {
    setSelectedFileIds((current) => (
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId]
    ));
  };

  const handleToggleAllFiles = () => {
    if (!editMeeting) return;
    const ids = editMeeting.files.map((file) => file.id);
    setSelectedFileIds((current) => (current.length === ids.length ? [] : ids));
  };

  const handleDeleteSelected = () => {
    if (!editMeeting || !selectedFileIds.length) return;

    setMeetings((current) => current.map((meeting) => (
      meeting.id === editMeeting.id
        ? { ...meeting, files: meeting.files.filter((file) => !selectedFileIds.includes(file.id)) }
        : meeting
    )));

    setEditMeeting((current) => (
      current
        ? { ...current, files: current.files.filter((file) => !selectedFileIds.includes(file.id)) }
        : current
    ));
    setSelectedFileIds([]);
  };

  return (
    <div className="min-h-screen bg-[var(--portal-bg)] w-full box-border" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="bg-[var(--portal-card)] border-b border-[var(--portal-border)] px-7 py-3.5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--portal-text-strong)] m-0">Citizen Meeting Files</h1>
        <div className="flex items-center gap-2.5">
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              <FiDownload size={14} /> Export <FiChevronDown size={14} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-[var(--portal-card)] border border-[var(--portal-border)] shadow-lg rounded-lg overflow-hidden z-50">
                <button onClick={() => handleExport("excel")} className="w-full text-left px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-[var(--portal-bg-elevated)] transition-colors">
                  Export as Excel
                </button>
                <div className="h-[1px] bg-[var(--portal-border-light)] w-full" />
                <button onClick={() => handleExport("pdf")} className="w-full text-left px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-[var(--portal-bg-elevated)] transition-colors">
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[var(--portal-card)] border-b border-[var(--portal-border)] px-7 flex overflow-x-auto overflow-y-hidden">
        {["All", "Upcoming", "Completed", "Cancelled"].map((tab) => (
          <button
            key={tab}
            className={`px-6 py-3.5 text-[13px] flex items-center gap-2 transition-all whitespace-nowrap border-b-4 ${activeTab === tab ? "border-[var(--portal-purple)] font-semibold text-[var(--portal-purple)]" : "border-transparent font-medium text-[var(--portal-text-muted)] hover:text-[var(--portal-text)]"}`}
            onClick={() => { setActiveTab(tab); setPage(1); }}
          >
            {tab}
            <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[11px] font-bold px-1.5 ${activeTab === tab ? "bg-[var(--portal-purple)] text-white" : "bg-[var(--portal-bg-elevated)] text-[var(--portal-text-muted)]"}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      <div className="px-7 pt-5 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-4 py-2 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl h-11">
            <FiSearch size={16} className="text-[var(--portal-text-muted)]" />
            <input className="border-none bg-transparent outline-none text-sm text-[var(--portal-text-strong)] w-full" placeholder="Search citizen, subject, date..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>

          <div className="relative flex items-center gap-1.5 px-3 h-11 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl min-w-[130px]">
            <span className="text-sm text-[var(--portal-text)] pointer-events-none whitespace-nowrap flex-1">{statusFilter || "All Status"}</span>
            <FiChevronDown size={14} className="text-[var(--portal-text-muted)]" />
            <select className="absolute inset-0 opacity-0 cursor-pointer w-full text-sm" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option>Upcoming</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 h-11 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl">
            <span className="text-sm text-[var(--portal-text-muted)] whitespace-nowrap">Date</span>
            <input type="date" className="bg-transparent border-none text-sm text-[var(--portal-text)] outline-none cursor-pointer" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
            <span className="text-xs text-[var(--portal-text-muted)]">–</span>
            <input type="date" className="bg-transparent border-none text-sm text-[var(--portal-text)] outline-none cursor-pointer" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
          </div>

          {hasFilters && (
            <button className="flex items-center gap-1.5 px-4 h-11 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl hover:bg-[var(--portal-bg-elevated)] transition-colors" onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}>
              <FiX size={14} /> Clear filters
            </button>
          )}

          <div className="flex-1" />
          <span className="text-xs font-medium text-[var(--portal-text-muted)] whitespace-nowrap px-2">{filtered.length} meeting{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="px-7 pb-7">
        <div className="bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-[var(--portal-bg-elevated)]">
                  {["#", "Citizen Name", "Meeting Subject", "Meeting Date", "Files", "Status", "Actions"].map((header, index) => (
                    <th key={header} className={`px-4 py-3 text-xs font-bold tracking-wider uppercase text-[var(--portal-text-muted)] border-b border-[var(--portal-border)] whitespace-nowrap ${index === 6 ? "text-center" : ""}`}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="py-12 px-6 text-center">
                        <FiPaperclip size={36} className="text-[var(--portal-border)] mx-auto mb-3" />
                        <div className="text-sm font-semibold text-[var(--portal-text)] mb-1">{loading ? "Loading meetings..." : error ? "Unable to load meetings" : "No meetings found"}</div>
                        <div className="text-xs text-[var(--portal-text-muted)]">{error || "Try adjusting your filters"}</div>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((meeting, index) => (
                  <tr key={meeting.id} className={`border-b border-[var(--portal-border-light)] hover:bg-[var(--portal-bg-elevated)] transition-colors ${index % 2 === 0 ? "bg-[var(--portal-card)]" : "bg-[var(--portal-bg-elevated)]"}`}>
                    <td className="px-4 py-3.5 text-xs text-[var(--portal-text-muted)] align-middle">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 py-3.5 align-middle"><span className="font-semibold text-[var(--portal-text-strong)]">{meeting.citizen}</span></td>
                    <td className="px-4 py-3.5 text-[var(--portal-text)] align-middle">{meeting.subject}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="font-semibold text-sm text-[var(--portal-text-strong)]">{meeting.date}</div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <FiPaperclip size={13} color={meeting.files.length ? "var(--portal-purple)" : "var(--portal-border)"} />
                        <span className="text-xs font-semibold" style={{ color: meeting.files.length ? "var(--portal-purple)" : "var(--portal-border)" }}>{meeting.files.length}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[var(--portal-purple-dim)] text-[var(--portal-purple)]">
                        {meeting.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--portal-purple-dim)] bg-[var(--portal-purple-dim)] text-[var(--portal-purple)] hover:opacity-80 transition-opacity" onClick={() => { setSelectedFileIds([]); setUploadMeeting(meeting); }} title="Upload">
                          <FiUploadCloud size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--portal-border-light)] flex-wrap gap-3 bg-[var(--portal-card)]">
              <div className="text-xs text-[var(--portal-text-muted)] font-medium">Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} meetings</div>
              <div className="flex gap-1">
                <button className="w-8 h-8 rounded-md border border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-text)] text-sm hover:bg-[var(--portal-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter((value) => value === 1 || value === totalPages || Math.abs(value - page) <= 1)
                  .reduce((items, value, index, array) => {
                    if (index > 0 && value - array[index - 1] > 1) items.push("…");
                    items.push(value);
                    return items;
                  }, [])
                  .map((value, index) => value === "…"
                    ? <span key={`ellipsis-${index}`} className="px-1.5 text-[var(--portal-text-muted)] flex items-center">…</span>
                    : <button key={value} className={`w-8 h-8 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${value === page ? "bg-[var(--portal-purple)] text-white border-none" : "border border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-text)] hover:bg-[var(--portal-bg-elevated)]"}`} onClick={() => setPage(value)}>{value}</button>
                  )}
                <button className="w-8 h-8 rounded-md border border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-text)] text-sm hover:bg-[var(--portal-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {uploadMeeting && (
        <UploadModal
          meeting={uploadMeeting}
          onUploaded={reloadCompletedMeetings}
          onClose={handleCloseModals}
          onEdit={() => handleOpenEdit(uploadMeeting)}
        />
      )}

      {editMeeting && (
        <ManageMediaModal
          meeting={editMeeting}
          selectedIds={selectedFileIds}
          onToggleItem={handleToggleFile}
          onToggleAll={handleToggleAllFiles}
          onDeleteSelected={handleDeleteSelected}
          onClose={handleCloseModals}
          onBack={() => {
            setEditMeeting(null);
            setSelectedFileIds([]);
            setUploadMeeting(editMeeting);
          }}
        />
      )}
    </div>
  );
}
