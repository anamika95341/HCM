import { useState, useRef, useEffect } from "react";
import {
  FiEdit2, FiTrash2, FiSearch, FiChevronDown,
  FiPaperclip, FiDownload, FiX, FiFilter,
  FiCalendar, FiImage, FiVideo, FiFile, FiUploadCloud,
} from "react-icons/fi";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_EVENTS = Array.from({ length: 18 }, (_, i) => ({
  id: i + 1,
  title: ["Document Verification", "Land Record Review", "Budget Allocation Meeting",
    "Public Grievance Hearing", "Infrastructure Inspection", "Revenue Assessment"][i % 6],
  whoToMeet: ["District Collector", "Revenue Officer", "Finance Secretary",
    "Block Development Officer", "PWD Engineer", "Tehsildar"][i % 6],
  date: new Date(2025, 3 + Math.floor(i / 3), (i % 28) + 1).toISOString().split("T")[0],
  time: ["09:00", "10:30", "11:00", "14:00", "15:30", "16:00"][i % 6],
  description: "Discussion regarding official matters and pending review of relevant documents.",
  location: ["Collectorate Office, Block A", "Revenue Bhawan", "Secretariat", "Block Office", "PWD Office", "Tehsil Bhawan"][i % 6],
  locationDetail: "Room 201, Second Floor",
  status: ["Upcoming", "Completed", "Cancelled", "Upcoming", "Upcoming", "Completed"][i % 6],
  files: i % 3 === 0 ? [
    { id: 1, name: "agenda.pdf", type: "document", size: "245 KB" },
    { id: 2, name: "photo1.jpg", type: "photo", size: "1.2 MB" },
  ] : [],
}));

// Sabhi status ko purple color scheme par set kar diya gaya hai aur dot remove kar diya hai
const STATUS_CLASSES = {
  Upcoming: { bg: "bg-[#6c4de6]/10", text: "text-[#6c4de6]" },
  Completed: { bg: "bg-[#6c4de6]/10", text: "text-[#6c4de6]" },
  Cancelled: { bg: "bg-[#6c4de6]/10", text: "text-[#6c4de6]" },
};

const PAGE_SIZE = 8;
const PURPLE_COLOR = "#6c4de6";

// ─── Components ─────────────────────────────────────────────────────────────

function FileIcon({ type }) {
  if (type === "photo") return <FiImage size={15} color={PURPLE_COLOR} />;
  if (type === "video") return <FiVideo size={15} className="text-sky-500" />;
  return <FiFile size={15} className="text-amber-500" />;
}

function FileDeleteModal({ file, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/45 z-[1100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="text-base font-bold text-red-600 flex items-center gap-2"><FiTrash2 size={15} /> Remove File</div>
          <button className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200" onClick={onCancel}><FiX size={14} /></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4">Remove <strong>{file?.name}</strong>?</p>
          <div className="mb-4">
            <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Reason <span className="text-red-500">*</span></label>
            <textarea className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 resize-y min-h-[80px]" placeholder="Why are you removing this file?" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50" onClick={onCancel}>Cancel</button>
            <button className={`px-6 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg transition-opacity ${reason.trim() ? "hover:bg-red-600 cursor-pointer" : "opacity-50 cursor-not-allowed"}`} onClick={() => reason.trim() && onConfirm()}>Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ event, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="text-base font-bold text-red-600 flex items-center gap-2"><FiTrash2 size={15} /> Delete Event</div>
          <button className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200" onClick={onCancel}><FiX size={14} /></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4">Delete <strong>"{event?.title}"</strong>? This will also remove it from the <strong>Minister's portal</strong>.</p>
          <div className="mb-4">
            <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Reason for Deletion <span className="text-red-500">*</span></label>
            <textarea className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 resize-y min-h-[80px]" placeholder="Provide a reason..." value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50" onClick={onCancel}>Cancel</button>
            <button className={`px-6 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg transition-opacity ${reason.trim() ? "hover:bg-red-600 cursor-pointer" : "opacity-50 cursor-not-allowed"}`} onClick={() => reason.trim() && onConfirm()}>Delete Event</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ event, onSave, onClose }) {
  const [form, setForm] = useState({ ...event });
  const [files, setFiles] = useState(event?.files || []);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const addFiles = raw => {
    const arr = Array.from(raw).map((f, i) => ({ id: Date.now() + i, name: f.name, size: f.size > 1048576 ? (f.size / 1048576).toFixed(1) + " MB" : Math.round(f.size / 1024) + " KB", type: f.type.startsWith("image") ? "photo" : f.type.startsWith("video") ? "video" : "document" }));
    setFiles(p => [...p, ...arr]);
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiEdit2 size={18} color={PURPLE_COLOR} /> Edit Event
          </div>
          <button className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors" onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Event Title <span className="text-red-500">*</span></label>
              <input className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 transition-all" value={form.title || ""} onChange={set("title")} placeholder="Enter event title" />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Whom to Meet <span className="text-red-500">*</span></label>
              <input className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 transition-all" value={form.whoToMeet || ""} onChange={set("whoToMeet")} placeholder="e.g. District Collector" />
              <p className="text-[11px] text-gray-400 mt-1">Name or designation</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Date <span className="text-red-500">*</span></label>
                <input type="date" className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 transition-all" value={form.date || ""} onChange={set("date")} />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Time <span className="text-red-500">*</span></label>
                <input type="time" className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 transition-all" value={form.time || ""} onChange={set("time")} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Status</label>
              <select className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 transition-all" value={form.status} onChange={set("status")}>
                <option>Upcoming</option><option>Completed</option><option>Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Event Description <span className="text-red-500">*</span></label>
              <textarea className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 transition-all resize-y min-h-[90px]" value={form.description || ""} onChange={set("description")} placeholder="Describe purpose and agenda" maxLength={1000} />
              <div className="text-[11px] text-gray-400 text-right mt-1">{(form.description || "").length}/1000</div>
            </div>

            <hr className="border-gray-100 my-2" />
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Location</div>

            <div>
              <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Location <span className="text-red-500">*</span></label>
              <input className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 transition-all" value={form.location || ""} onChange={set("location")} placeholder="e.g. Collectorate Office" />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Additional Details</label>
              <input className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#6c4de6] focus:ring-2 focus:ring-[#6c4de6]/20 transition-all" value={form.locationDetail || ""} onChange={set("locationDetail")} placeholder="Room no., floor, landmark" />
            </div>

            <hr className="border-gray-100 my-2" />
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Event Files</div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${drag ? "border-[#6c4de6] bg-[#6c4de6]/5" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={e => addFiles(e.target.files)} />
              <div className="flex justify-center mb-2"><FiUploadCloud size={26} className={drag ? "text-[#6c4de6]" : "text-gray-400"} /></div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Click or drag & drop</div>
              <div className="text-xs text-gray-400">Photos, Videos, Documents (PDF, DOC, XLS)</div>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg bg-gray-50">
                    <FileIcon type={f.type} />
                    <span className="flex-1 text-sm font-medium text-gray-700 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 mr-1">{f.size}</span>
                    <button className="flex items-center justify-center w-7 h-7 rounded border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors" onClick={() => setFileToDelete(f)}><FiTrash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50 rounded-b-xl">
          <button className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" onClick={onClose}>Cancel</button>
          <button className="px-6 py-2 text-sm font-semibold text-white bg-[#6c4de6] hover:bg-[#5b3fd4] border-none rounded-lg transition-colors" onClick={() => onSave({ ...form, files })}>Save Changes</button>
        </div>
      </div>

      {fileToDelete && <FileDeleteModal file={fileToDelete} onConfirm={() => { setFiles(p => p.filter(f => f.id !== fileToDelete.id)); setFileToDelete(null); }} onCancel={() => setFileToDelete(null)} />}
    </div>
  );
}

export default function ManageEvent() {
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editEvent, setEditEvent] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [toast, setToast] = useState(null);

  // State for Dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Close Dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const counts = {
    All: events.length,
    Upcoming: events.filter(e => e.status === "Upcoming").length,
    Completed: events.filter(e => e.status === "Completed").length,
    Cancelled: events.filter(e => e.status === "Cancelled").length
  };

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    return (!search || e.title.toLowerCase().includes(q) || e.whoToMeet.toLowerCase().includes(q) || e.location.toLowerCase().includes(q))
      && (activeTab === "All" || e.status === activeTab)
      && (!statusFilter || e.status === statusFilter)
      && (!dateFrom || e.date >= dateFrom)
      && (!dateTo || e.date <= dateTo);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || statusFilter || dateFrom || dateTo;

  // EXPORT FUNCTIONALITY
  const handleExport = (type) => {
    setShowExportMenu(false);

    const exportData = filtered.map(ev => ({
      "Event Title": ev.title,
      "Whom To Meet": ev.whoToMeet,
      "Date & Time": `${ev.date} ${ev.time}`,
      "Location": ev.location
    }));

    console.log(`--- Extracted Data for ${type.toUpperCase()} ---`, exportData);

    if (type === 'excel') {
      showToast("Exporting Excel file...");
      const headers = Object.keys(exportData[0] || {}).join(",");
      const rows = exportData.map(obj => Object.values(obj).map(v => `"${v}"`).join(",")).join("\n");
      const csv = `${headers}\n${rows}`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'events_export.csv';
      a.click();
    } else if (type === 'pdf') {
      showToast("Exporting PDF file...");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans w-full box-border">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-6 z-[9000] text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xl transition-all ${toast.type === "danger" ? "bg-red-500" : "bg-green-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-7 py-3.5 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900 m-0">Manage Events</h1>
        <div className="flex items-center gap-2.5">
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              <FiDownload size={14} /> Export <FiChevronDown size={14} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden z-50">
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Export as Excel
                </button>
                <div className="h-[1px] bg-gray-100 w-full" />
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-7 flex overflow-x-auto overflow-y-hidden">
        {["All", "Upcoming", "Completed", "Cancelled"].map(tab => (
          <button
            key={tab}
            className={`px-6 py-3.5 text-sm flex items-center gap-2 transition-all whitespace-nowrap border-b-4 ${activeTab === tab ? "border-[#6c4de6] font-bold text-[#6c4de6]" : "border-transparent font-medium text-gray-500 hover:text-gray-700"}`}
            onClick={() => { setActiveTab(tab); setPage(1); }}
          >
            {tab}
            <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[11px] font-bold px-1.5 ${activeTab === tab ? "bg-[#6c4de6] text-white" : "bg-gray-100 text-gray-500"}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar (Yahan Outer Div wrapper styling hata kar separate divs banaye hain) */}
      <div className="px-7 pt-5 pb-3">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search Single Div */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-4 py-2 bg-white border border-gray-200 rounded-xl h-11">
            <FiSearch size={16} className="text-gray-400" />
            <input className="border-none bg-transparent outline-none text-sm text-gray-900 w-full" placeholder="Search events, person, location..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>

          {/* Other Filters (Ab inko bhi clean separate box look diya hai consistent rehne ke liye) */}
          <div className="relative flex items-center gap-1.5 px-3 h-11 bg-white border border-gray-200 rounded-xl min-w-[130px]">
            <span className="text-sm text-gray-700 pointer-events-none whitespace-nowrap flex-1">{statusFilter || "All Status"}</span>
            <FiChevronDown size={14} className="text-gray-400" />
            <select className="absolute inset-0 opacity-0 cursor-pointer w-full text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option>Upcoming</option><option>Completed</option><option>Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 h-11 bg-white border border-gray-200 rounded-xl">
            <FiCalendar size={14} className="text-gray-400" />
            <input type="date" className="bg-transparent border-none text-sm text-gray-700 outline-none cursor-pointer" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            <span className="text-xs text-gray-400">–</span>
            <input type="date" className="bg-transparent border-none text-sm text-gray-700 outline-none cursor-pointer" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          </div>

          {hasFilters && (
            <button className="flex items-center gap-1.5 px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors" onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}>
              <FiX size={14} /> Clear filters
            </button>
          )}

          <div className="flex-1" />
          <span className="text-xs font-medium text-gray-400 whitespace-nowrap px-2">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="px-7 pb-7">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-gray-50">
                  {["#", "Event Title", "Whom to Meet", "Date & Time", "Location", "Files", "Status", "Actions"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold tracking-wider uppercase text-gray-400 border-b border-gray-200 whitespace-nowrap ${i === 7 ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="py-12 px-6 text-center">
                        <FiCalendar size={36} className="text-gray-300 mx-auto mb-3" />
                        <div className="text-sm font-semibold text-gray-700 mb-1">No events found</div>
                        <div className="text-xs text-gray-400">Try adjusting your filters</div>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((ev, idx) => (
                  <tr key={ev.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}`}>
                    <td className="px-4 py-3.5 text-xs text-gray-400 align-middle">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3.5 align-middle"><span className="font-semibold text-gray-900">{ev.title}</span></td>
                    <td className="px-4 py-3.5 text-gray-700 align-middle">{ev.whoToMeet}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="font-semibold text-sm text-gray-800">{ev.date}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{ev.time}</div>
                    </td>
                    <td className="px-4 py-3.5 align-middle max-w-[160px]">
                      <div className="whitespace-nowrap overflow-hidden text-ellipsis text-gray-700">{ev.location}</div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <FiPaperclip size={13} className={ev.files.length ? "text-[#6c4de6]" : "text-gray-300"} />
                        <span className={`text-xs font-semibold ${ev.files.length ? "text-[#6c4de6]" : "text-gray-300"}`}>{ev.files.length}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      {/* Status ka Dot hata diya aur classes update kar di */}
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${STATUS_CLASSES[ev.status]?.bg || "bg-gray-100"} ${STATUS_CLASSES[ev.status]?.text || "text-gray-700"}`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#6c4de6]/30 bg-[#6c4de6]/10 text-[#6c4de6] hover:bg-[#6c4de6]/20 transition-colors" onClick={() => setEditEvent(ev)} title="Edit">
                          <FiEdit2 size={13} />
                        </button>
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" onClick={() => setDeleteEvent(ev)} title="Delete">
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 flex-wrap gap-3 bg-white">
              <div className="text-xs text-gray-500 font-medium">Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events</div>
              <div className="flex gap-1">
                <button className="w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
                  .map((p, i) => p === "…" ? <span key={`e${i}`} className="px-1.5 text-gray-400 flex items-center">…</span> : <button key={p} className={`w-8 h-8 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${p === page ? "bg-[#6c4de6] text-white border-none" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`} onClick={() => setPage(p)}>{p}</button>)}
                <button className="w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editEvent && <EditModal event={editEvent} onSave={upd => { setEvents(p => p.map(e => e.id === upd.id ? upd : e)); setEditEvent(null); showToast("Event updated successfully."); }} onClose={() => setEditEvent(null)} />}
      {deleteEvent && <DeleteModal event={deleteEvent} onConfirm={() => { setEvents(p => p.filter(e => e.id !== deleteEvent.id)); setDeleteEvent(null); showToast("Event deleted from DEO & Minister portal.", "danger"); }} onCancel={() => setDeleteEvent(null)} />}
    </div>
  );
}
