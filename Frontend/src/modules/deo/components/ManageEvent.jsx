// import { useState, useRef, useEffect } from "react";
// import {
//   FiEdit2, FiSearch, FiChevronDown,
//   FiPaperclip, FiDownload, FiX,
//   FiCalendar, FiImage, FiVideo, FiFile, FiUploadCloud,
// } from "react-icons/fi";
// import { apiClient } from "../../../shared/api/client.js";
// import { DEO_ACCEPT, getFileUiType, uploadPrivateFile } from "../../../shared/api/privateFiles.js";
// import { useAuth } from "../../../shared/auth/AuthContext.jsx";

// const PAGE_SIZE = 8;

// function getEventStatus(startsAt, endsAt) {
//   const now = Date.now();
//   const end = new Date(endsAt).getTime();
//   const start = new Date(startsAt).getTime();
//   if (Number.isFinite(end) && end < now) return "Completed";
//   if (Number.isFinite(start) && start >= now) return "Upcoming";
//   return "Upcoming";
// }

// function formatEventRow(event) {
//   const startsAt = new Date(event.starts_at);
//   return {
//     id: event.id,
//     title: event.title,
//     whoToMeet: event.who_to_meet || "",
//     date: Number.isNaN(startsAt.getTime()) ? "" : startsAt.toISOString().split("T")[0],
//     time: Number.isNaN(startsAt.getTime()) ? "" : startsAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
//     description: event.comments || "",
//     location: event.location || "",
//     status: getEventStatus(event.starts_at, event.ends_at),
//     files: Array.isArray(event.files)
//       ? event.files.map((file) => ({
//           id: file.id,
//           name: file.name,
//           type: file.type || getFileUiType(file.mimeType),
//           size: file.size || "",
//           mimeType: file.mimeType,
//           createdAt: file.createdAt,
//         }))
//       : [],
//   };
// }

// // ─── Components ─────────────────────────────────────────────────────────────

// function FileIcon({ type }) {
//   if (type === "photo") return <FiImage size={15} color="var(--portal-purple)" />;
//   if (type === "video") return <FiVideo size={15} className="text-sky-500" />;
//   return <FiFile size={15} className="text-amber-500" />;
// }

// function EventUploadModal({ event, onClose, onEdit, onUploaded }) {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [error, setError] = useState("");
//   const [uploading, setUploading] = useState(false);
//   const inputRef = useRef(null);

//   if (!event) return null;

//   async function handleUpload() {
//     if (!selectedFile || uploading) return;
//     try {
//       setUploading(true);
//       setError("");
//       await uploadPrivateFile({
//         file: selectedFile,
//         contextType: "event",
//         contextId: event.id,
//       });
//       await onUploaded?.();
//       onClose();
//     } catch (uploadError) {
//       setError(uploadError?.response?.data?.error || uploadError.message || "Unable to upload file");
//     } finally {
//       setUploading(false);
//     }
//   }

//   return (
//     <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
//       <div className="bg-[var(--portal-card)] rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
//         <div className="px-6 py-5 border-b border-[var(--portal-border-light)] flex items-center justify-between shrink-0">
//           <div className="text-lg font-bold text-[var(--portal-text-strong)] flex items-center gap-2">
//             <FiUploadCloud size={18} color="var(--portal-purple)" /> Upload Files
//           </div>
//           <div className="flex items-center gap-2">
//             <button
//               className="px-4 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-bg-elevated)] transition-colors"
//               onClick={onEdit}
//             >
//               Edit
//             </button>
//             <button className="flex items-center justify-center w-8 h-8 bg-[var(--portal-bg-elevated)] rounded-lg text-[var(--portal-text-muted)] hover:bg-[var(--portal-border)] transition-colors" onClick={onClose}>
//               <FiX size={16} />
//             </button>
//           </div>
//         </div>

//         <div className="p-6 overflow-y-auto flex-1">
//           <div className="space-y-5">
//             <div>
//               <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Event Title</label>
//               <input
//                 className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]"
//                 value={event.title}
//                 readOnly
//               />
//             </div>

//             <div>
//               <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Whom to Meet</label>
//               <input
//                 className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]"
//                 value={event.whoToMeet}
//                 readOnly
//               />
//             </div>

//             <div>
//               <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Upload File</label>
//               <div
//                 className="border-2 border-dashed border-[var(--portal-border)] rounded-xl p-6 text-center cursor-pointer bg-[var(--portal-bg-elevated)] hover:bg-[var(--portal-card-hover)]"
//                 onClick={() => inputRef.current?.click()}
//               >
//                 <input
//                   ref={inputRef}
//                   type="file"
//                   accept={DEO_ACCEPT}
//                   className="hidden"
//                   onChange={(e) => {
//                     setSelectedFile(e.target.files?.[0] || null);
//                     setError("");
//                   }}
//                 />
//                 <div className="flex justify-center mb-2">
//                   <FiUploadCloud size={26} color="var(--portal-purple)" />
//                 </div>
//                 <div className="text-sm font-semibold text-[var(--portal-text)] mb-1">
//                   {selectedFile?.name || "Select PDF, JPG, PNG, MP4, MPEG, or WEBM"}
//                 </div>
//                 <div className="text-xs text-[var(--portal-text-muted)]">PDF up to 5MB, images up to 20MB, video up to 100MB</div>
//               </div>
//             </div>

//             {error ? <div className="text-sm text-red-500">{error}</div> : null}
//           </div>
//         </div>

//         <div className="px-6 py-4 border-t border-[var(--portal-border-light)] flex justify-end gap-3 shrink-0 bg-[var(--portal-bg-elevated)] rounded-b-xl">
//           <button className="px-5 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-card-hover)] transition-colors" onClick={onClose}>Cancel</button>
//           <button
//             className={`px-6 py-2 text-sm font-semibold text-white border-none rounded-lg transition-opacity ${uploading || !selectedFile ? "bg-[var(--portal-purple)] opacity-50 cursor-not-allowed" : "bg-[var(--portal-purple)] hover:opacity-90"}`}
//             onClick={handleUpload}
//             disabled={uploading || !selectedFile}
//           >
//             {uploading ? "Uploading..." : "Upload"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function ManageEventMediaModal({ event, onSave, onClose, onBack }) {
//   const [activeType, setActiveType] = useState("photo");
//   const [files, setFiles] = useState(event?.files || []);
//   const [selectedIds, setSelectedIds] = useState([]);
//   const mediaTabs = [
//     { key: "photo", label: "Photos", icon: FiImage },
//     { key: "video", label: "Videos", icon: FiVideo },
//     { key: "document", label: "Documents", icon: FiFile },
//   ];
//   const visibleFiles = files.filter((file) => file.type === activeType || (activeType === "document" && file.type === "document"));
//   const allSelected = visibleFiles.length > 0 && visibleFiles.every((file) => selectedIds.includes(file.id));

//   const toggleFile = (id) => {
//     setSelectedIds((current) => (
//       current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
//     ));
//   };

//   const toggleAll = () => {
//     const ids = visibleFiles.map((file) => file.id);
//     setSelectedIds((current) => (current.length === ids.length ? [] : ids));
//   };

//   const deleteSelected = () => {
//     if (!selectedIds.length) return;
//     const nextFiles = files.filter((file) => !selectedIds.includes(file.id));
//     setFiles(nextFiles);
//     setSelectedIds([]);
//     onSave({ ...event, files: nextFiles });
//   };

//   return (
//     <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
//       <div className="bg-[var(--portal-card)] rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
//         <div className="px-6 py-5 border-b border-[var(--portal-border-light)] flex items-center justify-between shrink-0">
//           <button
//             className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-bg-elevated)] transition-colors"
//             onClick={onBack}
//           >
//             ← Back
//           </button>
//           <div className="text-lg font-bold text-[var(--portal-text-strong)] flex items-center gap-2">
//             <FiEdit2 size={18} color="var(--portal-purple)" /> Edit Media
//           </div>
//           <button className="flex items-center justify-center w-8 h-8 bg-[var(--portal-bg-elevated)] rounded-lg text-[var(--portal-text-muted)] hover:bg-[var(--portal-border)] transition-colors" onClick={onClose}>
//             <FiX size={16} />
//           </button>
//         </div>

//         <div className="p-6 overflow-y-auto flex-1">
//           <div className="space-y-5">
//             <div>
//               <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Event Title</label>
//               <input className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]" value={event.title || ""} readOnly />
//             </div>

//             <div>
//               <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Whom to Meet</label>
//               <input className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]" value={event.whoToMeet || ""} readOnly />
//             </div>

//             <div>
//               <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Media Type</label>
//               <div className="flex gap-1.5">
//                 {mediaTabs.map((tab) => {
//                   const TabIcon = tab.icon;
//                   return (
//                     <button
//                       key={tab.key}
//                       type="button"
//                       onClick={() => { setActiveType(tab.key); setSelectedIds([]); }}
//                       className={`flex-1 py-2 flex flex-col items-center gap-1 text-[11px] border rounded-xl transition-all ${
//                         activeType === tab.key
//                           ? "border-[var(--portal-purple)] bg-[var(--portal-purple-dim)] text-[var(--portal-purple)]"
//                           : "border-[var(--portal-border)] text-[var(--portal-text-muted)] hover:bg-[var(--portal-bg-elevated)]"
//                       }`}
//                     >
//                       <TabIcon size={16} color={activeType === tab.key ? "var(--portal-purple)" : "currentColor"} />
//                       {tab.label}
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>

//             {visibleFiles.length > 0 ? (
//               <div className="space-y-4">
//                 <div className="flex items-center justify-between gap-3">
//                   <button className="px-5 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-bg-elevated)] transition-colors" onClick={toggleAll}>
//                     {allSelected ? "Clear Selection" : "Select All"}
//                   </button>
//                   <button
//                     className="px-6 py-2 text-sm font-semibold text-white rounded-lg transition-opacity bg-red-500 opacity-50 cursor-not-allowed"
//                     onClick={(event) => event.preventDefault()}
//                     disabled
//                     title="Delete is not available yet for event files"
//                   >
//                     Delete
//                   </button>
//                 </div>

//                 <div className="mt-3 space-y-2">
//                   {visibleFiles.map((file) => (
//                     <div key={file.id} className="flex items-center gap-3 p-2.5 border border-[var(--portal-border)] rounded-lg bg-[var(--portal-bg-elevated)]">
//                       <input
//                         type="checkbox"
//                         checked={selectedIds.includes(file.id)}
//                         onChange={() => toggleFile(file.id)}
//                         className="w-4 h-4"
//                       />
//                       <FileIcon type={file.type} />
//                       <span className="flex-1 text-sm font-medium text-[var(--portal-text)] truncate">{file.name}</span>
//                       <span className="text-xs text-[var(--portal-text-muted)] mr-1">{file.size}</span>
//                       <span className="text-xs font-medium text-[var(--portal-text-muted)] capitalize">{file.type}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ) : (
//               <div className="py-12 px-6 text-center">
//                 <FiPaperclip size={36} className="text-[var(--portal-border)] mx-auto mb-3" />
//                 <div className="text-sm font-semibold text-[var(--portal-text)] mb-1">No files found</div>
//                 <div className="text-xs text-[var(--portal-text-muted)]">There are no uploaded files in this section.</div>
//               </div>
//             )}
//           </div>
//         </div>

//         <div className="px-6 py-4 border-t border-[var(--portal-border-light)] flex justify-end gap-3 shrink-0 bg-[var(--portal-bg-elevated)] rounded-b-xl">
//           <button className="px-5 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-card-hover)] transition-colors" onClick={onClose}>Close</button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function ManageEvent() {
//   const { session } = useAuth();
//   const [events, setEvents] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [search, setSearch] = useState("");
//   const [activeTab, setActiveTab] = useState("All");
//   const [statusFilter, setStatusFilter] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [page, setPage] = useState(1);
//   const [uploadEvent, setUploadEvent] = useState(null);
//   const [manageUploadEvent, setManageUploadEvent] = useState(null);
//   const [toast, setToast] = useState(null);

//   const [showExportMenu, setShowExportMenu] = useState(false);
//   const exportMenuRef = useRef(null);

//   useEffect(() => {
//     function handleClickOutside(event) {
//       if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
//         setShowExportMenu(false);
//       }
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   useEffect(() => {
//     let mounted = true;

//     async function loadEvents() {
//       try {
//         setLoading(true);
//         setError("");
//         const { data } = await apiClient.get("/deo/calendar-events");
//         if (mounted) {
//           setEvents((data.events || []).map(formatEventRow));
//         }
//       } catch (loadError) {
//         if (mounted) {
//           setError(loadError?.response?.data?.error || "Unable to load events");
//         }
//       } finally {
//         if (mounted) {
//           setLoading(false);
//         }
//       }
//     }

//     if (session?.role) {
//       loadEvents();
//     } else {
//       setLoading(false);
//     }

//     return () => {
//       mounted = false;
//     };
//   }, [session?.role]);

//   async function reloadEvents() {
//     const { data } = await apiClient.get("/deo/calendar-events");
//     setEvents((data.events || []).map(formatEventRow));
//   }

//   const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

//   const counts = {
//     All: events.length,
//     Upcoming: events.filter(e => e.status === "Upcoming").length,
//     Completed: events.filter(e => e.status === "Completed").length,
//     Cancelled: events.filter(e => e.status === "Cancelled").length,
//   };

//   const filtered = events.filter(e => {
//     const q = search.toLowerCase();
//     return (!search || e.title.toLowerCase().includes(q) || e.whoToMeet.toLowerCase().includes(q) || e.location.toLowerCase().includes(q))
//       && (activeTab === "All" || e.status === activeTab)
//       && (!statusFilter || e.status === statusFilter)
//       && (!dateFrom || e.date >= dateFrom)
//       && (!dateTo || e.date <= dateTo);
//   });

//   const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
//   const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
//   const hasFilters = search || statusFilter || dateFrom || dateTo;

//   const handleExport = (type) => {
//     setShowExportMenu(false);
//     const exportData = filtered.map(ev => ({
//       "Event Title": ev.title,
//       "Whom To Meet": ev.whoToMeet,
//       "Date & Time": `${ev.date} ${ev.time}`,
//       "Location": ev.location,
//     }));
//     console.log(`--- Extracted Data for ${type.toUpperCase()} ---`, exportData);
//     if (type === "excel") {
//       showToast("Exporting Excel file...");
//       const headers = Object.keys(exportData[0] || {}).join(",");
//       const rows = exportData.map(obj => Object.values(obj).map(v => `"${v}"`).join(",")).join("\n");
//       const csv = `${headers}\n${rows}`;
//       const blob = new Blob([csv], { type: "text/csv" });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url; a.download = "events_export.csv"; a.click();
//     } else if (type === "pdf") {
//       showToast("Exporting PDF file...");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[var(--portal-bg)] w-full box-border" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
//       {/* Toast */}
//       {toast && (
//         <div className={`fixed top-5 right-6 z-[9000] text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xl transition-all ${toast.type === "danger" ? "bg-red-500" : "bg-green-500"}`}>
//           {toast.msg}
//         </div>
//       )}

//       {/* Top Bar */}
//       <div className="bg-[var(--portal-card)] border-b border-[var(--portal-border)] px-7 py-3.5 flex items-center justify-between">
//         <h1 className="text-xl font-semibold text-[var(--portal-text-strong)] m-0">Manage Events</h1>
//         <div className="flex items-center gap-2.5">
//           <div className="relative" ref={exportMenuRef}>
//             <button
//               onClick={() => setShowExportMenu(!showExportMenu)}
//               className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
//             >
//               <FiDownload size={14} /> Export <FiChevronDown size={14} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
//             </button>
//             {showExportMenu && (
//               <div className="absolute right-0 mt-2 w-36 bg-[var(--portal-card)] border border-[var(--portal-border)] shadow-lg rounded-lg overflow-hidden z-50">
//                 <button onClick={() => handleExport("excel")} className="w-full text-left px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-[var(--portal-bg-elevated)] transition-colors">
//                   Export as Excel
//                 </button>
//                 <div className="h-[1px] bg-[var(--portal-border-light)] w-full" />
//                 <button onClick={() => handleExport("pdf")} className="w-full text-left px-4 py-2.5 text-sm text-[var(--portal-text)] hover:bg-[var(--portal-bg-elevated)] transition-colors">
//                   Export as PDF
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Tabs */}
//       <div className="bg-[var(--portal-card)] border-b border-[var(--portal-border)] px-7 flex overflow-x-auto overflow-y-hidden">
//         {["All", "Upcoming", "Completed", "Cancelled"].map(tab => (
//           <button
//             key={tab}
//             className={`px-6 py-3.5 text-[13px] flex items-center gap-2 transition-all whitespace-nowrap border-b-4 ${activeTab === tab ? "border-[var(--portal-purple)] font-semibold text-[var(--portal-purple)]" : "border-transparent font-medium text-[var(--portal-text-muted)] hover:text-[var(--portal-text)]"}`}
//             onClick={() => { setActiveTab(tab); setPage(1); }}
//           >
//             {tab}
//             <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[11px] font-bold px-1.5 ${activeTab === tab ? "bg-[var(--portal-purple)] text-white" : "bg-[var(--portal-bg-elevated)] text-[var(--portal-text-muted)]"}`}>
//               {counts[tab]}
//             </span>
//           </button>
//         ))}
//       </div>

//       {/* Filter Bar */}
//       <div className="px-7 pt-5 pb-3">
//         <div className="flex items-center gap-3 flex-wrap">
//           <div className="flex items-center gap-2 flex-1 min-w-[200px] px-4 py-2 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl h-11">
//             <FiSearch size={16} className="text-[var(--portal-text-muted)]" />
//             <input className="border-none bg-transparent outline-none text-sm text-[var(--portal-text-strong)] w-full" placeholder="Search events, person, location..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
//           </div>

//           <div className="relative flex items-center gap-1.5 px-3 h-11 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl min-w-[130px]">
//             <span className="text-sm text-[var(--portal-text)] pointer-events-none whitespace-nowrap flex-1">{statusFilter || "All Status"}</span>
//             <FiChevronDown size={14} className="text-[var(--portal-text-muted)]" />
//             <select className="absolute inset-0 opacity-0 cursor-pointer w-full text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
//               <option value="">All Status</option>
//               <option>Upcoming</option><option>Completed</option><option>Cancelled</option>
//             </select>
//           </div>

//           <div className="flex items-center gap-2 px-3 h-11 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl">
//             <FiCalendar size={14} className="text-[var(--portal-text-muted)]" />
//             <input type="date" className="bg-transparent border-none text-sm text-[var(--portal-text)] outline-none cursor-pointer" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
//             <span className="text-xs text-[var(--portal-text-muted)]">–</span>
//             <input type="date" className="bg-transparent border-none text-sm text-[var(--portal-text)] outline-none cursor-pointer" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
//           </div>

//           {hasFilters && (
//             <button className="flex items-center gap-1.5 px-4 h-11 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl hover:bg-[var(--portal-bg-elevated)] transition-colors" onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}>
//               <FiX size={14} /> Clear filters
//             </button>
//           )}

//           <div className="flex-1" />
//           <span className="text-xs font-medium text-[var(--portal-text-muted)] whitespace-nowrap px-2">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
//         </div>
//       </div>

//       {/* Table */}
//       <div className="px-7 pb-7">
//         <div className="bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl overflow-hidden shadow-sm">
//           <div className="overflow-x-auto">
//             <table className="w-full border-collapse text-sm text-left">
//               <thead>
//                 <tr className="bg-[var(--portal-bg-elevated)]">
//                   {["#", "Event Title", "Whom to Meet", "Date & Time", "Location", "Files", "Status", "Actions"].map((h, i) => (
//                     <th key={h} className={`px-4 py-3 text-xs font-bold tracking-wider uppercase text-[var(--portal-text-muted)] border-b border-[var(--portal-border)] whitespace-nowrap ${i === 7 ? "text-center" : ""}`}>{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {paginated.length === 0 ? (
//                   <tr>
//                     <td colSpan={8}>
//                       <div className="py-12 px-6 text-center">
//                         <FiCalendar size={36} className="text-[var(--portal-border)] mx-auto mb-3" />
//                         <div className="text-sm font-semibold text-[var(--portal-text)] mb-1">{loading ? "Loading events..." : error ? "Unable to load events" : "No events found"}</div>
//                         <div className="text-xs text-[var(--portal-text-muted)]">{loading ? "Fetching your created events" : error || "Try adjusting your filters"}</div>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : paginated.map((ev, idx) => (
//                   <tr key={ev.id} className={`border-b border-[var(--portal-border-light)] hover:bg-[var(--portal-bg-elevated)] transition-colors ${idx % 2 === 0 ? "bg-[var(--portal-card)]" : "bg-[var(--portal-bg-elevated)]"}`}>
//                     <td className="px-4 py-3.5 text-xs text-[var(--portal-text-muted)] align-middle">{(page - 1) * PAGE_SIZE + idx + 1}</td>
//                     <td className="px-4 py-3.5 align-middle"><span className="font-semibold text-[var(--portal-text-strong)]">{ev.title}</span></td>
//                     <td className="px-4 py-3.5 text-[var(--portal-text)] align-middle">{ev.whoToMeet}</td>
//                     <td className="px-4 py-3.5 align-middle">
//                       <div className="font-semibold text-sm text-[var(--portal-text-strong)]">{ev.date}</div>
//                       <div className="text-xs text-[var(--portal-text-muted)] mt-0.5">{ev.time}</div>
//                     </td>
//                     <td className="px-4 py-3.5 align-middle max-w-[160px]">
//                       <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[var(--portal-text)]">{ev.location}</div>
//                     </td>
//                     <td className="px-4 py-3.5 align-middle">
//                       <div className="flex items-center gap-1.5">
//                         <FiPaperclip size={13} color={ev.files.length ? "var(--portal-purple)" : "var(--portal-border)"} />
//                         <span className="text-xs font-semibold" style={{ color: ev.files.length ? "var(--portal-purple)" : "var(--portal-border)" }}>{ev.files.length}</span>
//                       </div>
//                     </td>
//                     <td className="px-4 py-3.5 align-middle">
//                       <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[var(--portal-purple-dim)] text-[var(--portal-purple)]">
//                         {ev.status}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3.5 align-middle text-center">
//                       <div className="flex gap-1.5 justify-center">
//                         <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--portal-purple-dim)] bg-[var(--portal-purple-dim)] text-[var(--portal-purple)] hover:opacity-80 transition-opacity" onClick={() => setUploadEvent(ev)} title="Upload">
//                           <FiUploadCloud size={13} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {totalPages > 1 && (
//             <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--portal-border-light)] flex-wrap gap-3 bg-[var(--portal-card)]">
//               <div className="text-xs text-[var(--portal-text-muted)] font-medium">Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events</div>
//               <div className="flex gap-1">
//                 <button className="w-8 h-8 rounded-md border border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-text)] text-sm hover:bg-[var(--portal-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
//                 {Array.from({ length: totalPages }, (_, i) => i + 1)
//                   .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
//                   .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
//                   .map((p, i) => p === "…"
//                     ? <span key={`e${i}`} className="px-1.5 text-[var(--portal-text-muted)] flex items-center">…</span>
//                     : <button key={p} className={`w-8 h-8 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${p === page ? "bg-[var(--portal-purple)] text-white border-none" : "border border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-text)] hover:bg-[var(--portal-bg-elevated)]"}`} onClick={() => setPage(p)}>{p}</button>
//                   )}
//                 <button className="w-8 h-8 rounded-md border border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-text)] text-sm hover:bg-[var(--portal-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Modals */}
//       {uploadEvent && <EventUploadModal event={uploadEvent} onUploaded={reloadEvents} onClose={() => setUploadEvent(null)} onEdit={() => { setManageUploadEvent(uploadEvent); setUploadEvent(null); }} />}
//       {manageUploadEvent && <ManageEventMediaModal event={manageUploadEvent} onSave={upd => { setEvents(p => p.map(e => e.id === upd.id ? upd : e)); setManageUploadEvent(upd); }} onClose={() => setManageUploadEvent(null)} onBack={() => { setUploadEvent(manageUploadEvent); setManageUploadEvent(null); }} />}
//     </div>
//   );
// }


import { useState, useRef, useEffect } from "react";
import {
  FiEdit2, FiSearch, FiChevronDown,
  FiPaperclip, FiDownload, FiX,
  FiCalendar, FiImage, FiVideo, FiFile, FiUploadCloud,
} from "react-icons/fi";
import { apiClient } from "../../../shared/api/client.js";
import { DEO_ACCEPT, getFileUiType, uploadPrivateFile } from "../../../shared/api/privateFiles.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";

const PAGE_SIZE = 8;

function getEventStatus(startsAt, endsAt) {
  const now = Date.now();
  const end = new Date(endsAt).getTime();
  const start = new Date(startsAt).getTime();
  if (Number.isFinite(end) && end < now) return "Completed";
  if (Number.isFinite(start) && start >= now) return "Upcoming";
  return "Upcoming";
}

function formatEventRow(event) {
  const startsAt = new Date(event.starts_at);
  return {
    id: event.id,
    title: event.title,
    whoToMeet: event.who_to_meet || "",
    date: Number.isNaN(startsAt.getTime()) ? "" : startsAt.toISOString().split("T")[0],
    time: Number.isNaN(startsAt.getTime()) ? "" : startsAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    description: event.comments || "",
    location: event.location || "",
    status: getEventStatus(event.starts_at, event.ends_at),
    files: Array.isArray(event.files)
      ? event.files.map((file) => ({
          id: file.id,
          name: file.name,
          type: file.type || getFileUiType(file.mimeType),
          size: file.size || "",
          mimeType: file.mimeType,
          createdAt: file.createdAt,
        }))
      : [],
  };
}

// ─── Components ─────────────────────────────────────────────────────────────

function FileIcon({ type }) {
  if (type === "photo") return <FiImage size={15} color="var(--portal-purple)" />;
  if (type === "video") return <FiVideo size={15} className="text-sky-500" />;
  return <FiFile size={15} className="text-amber-500" />;
}

function EventUploadModal({ event, onClose, onEdit, onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  if (!event) return null;

  async function handleUpload() {
    if (!selectedFile || uploading) return;
    try {
      setUploading(true);
      setError("");
      await uploadPrivateFile({
        file: selectedFile,
        contextType: "event",
        contextId: event.id,
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
      <div className="bg-[var(--portal-card)] rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
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
              <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Event Title</label>
              <input
                className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]"
                value={event.title}
                readOnly
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Whom to Meet</label>
              <input
                className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]"
                value={event.whoToMeet}
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
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] || null);
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

function ManageEventMediaModal({ event, onSave, onClose, onBack }) {
  const [activeType, setActiveType] = useState("photo");
  const [files, setFiles] = useState(event?.files || []);
  const [selectedIds, setSelectedIds] = useState([]);
  const mediaTabs = [
    { key: "photo", label: "Photos", icon: FiImage },
    { key: "video", label: "Videos", icon: FiVideo },
    { key: "document", label: "Documents", icon: FiFile },
  ];
  const visibleFiles = files.filter((file) => file.type === activeType || (activeType === "document" && file.type === "document"));
  const allSelected = visibleFiles.length > 0 && visibleFiles.every((file) => selectedIds.includes(file.id));

  const toggleFile = (id) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const toggleAll = () => {
    const ids = visibleFiles.map((file) => file.id);
    setSelectedIds((current) => (current.length === ids.length ? [] : ids));
  };

  const deleteSelected = () => {
    if (!selectedIds.length) return;
    const nextFiles = files.filter((file) => !selectedIds.includes(file.id));
    setFiles(nextFiles);
    setSelectedIds([]);
    onSave({ ...event, files: nextFiles });
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-[var(--portal-card)] rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[var(--portal-border-light)] flex items-center justify-between shrink-0">
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-bg-elevated)] transition-colors"
            onClick={onBack}
          >
            ← Back
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
            <div>
              <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Event Title</label>
              <input className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]" value={event.title || ""} readOnly />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--portal-text)] mb-1.5">Whom to Meet</label>
              <input className="w-full p-2.5 text-sm bg-[var(--portal-bg-elevated)] border border-[var(--portal-border)] rounded-lg outline-none text-[var(--portal-text-strong)]" value={event.whoToMeet || ""} readOnly />
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
                      onClick={() => { setActiveType(tab.key); setSelectedIds([]); }}
                      className={`flex-1 py-2 flex flex-col items-center gap-1 text-[11px] border rounded-xl transition-all ${
                        activeType === tab.key
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

            {visibleFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <button className="px-5 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-bg-elevated)] transition-colors" onClick={toggleAll}>
                    {allSelected ? "Clear Selection" : "Select All"}
                  </button>
                  <button
                    className="px-6 py-2 text-sm font-semibold text-white rounded-lg transition-opacity bg-red-500 opacity-50 cursor-not-allowed"
                    onClick={(event) => event.preventDefault()}
                    disabled
                    title="Delete is not available yet for event files"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {visibleFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-2.5 border border-[var(--portal-border)] rounded-lg bg-[var(--portal-bg-elevated)]">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(file.id)}
                        onChange={() => toggleFile(file.id)}
                        className="w-4 h-4"
                      />
                      <FileIcon type={file.type} />
                      <span className="flex-1 text-sm font-medium text-[var(--portal-text)] truncate">{file.name}</span>
                      <span className="text-xs text-[var(--portal-text-muted)] mr-1">{file.size}</span>
                      <span className="text-xs font-medium text-[var(--portal-text-muted)] capitalize">{file.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 px-6 text-center">
                <FiPaperclip size={36} className="text-[var(--portal-border)] mx-auto mb-3" />
                <div className="text-sm font-semibold text-[var(--portal-text)] mb-1">No files found</div>
                <div className="text-xs text-[var(--portal-text-muted)]">There are no uploaded files in this section.</div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--portal-border-light)] flex justify-end gap-3 shrink-0 bg-[var(--portal-bg-elevated)] rounded-b-xl">
          <button className="px-5 py-2 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border-2 border-[var(--portal-border)] rounded-lg hover:bg-[var(--portal-card-hover)] transition-colors" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function ManageEvent() {
  const { session } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [uploadEvent, setUploadEvent] = useState(null);
  const [manageUploadEvent, setManageUploadEvent] = useState(null);
  const [toast, setToast] = useState(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
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

    async function loadEvents() {
      try {
        setLoading(true);
        setError("");
        const { data } = await apiClient.get("/deo/calendar-events");
        if (mounted) {
          setEvents((data.events || []).map(formatEventRow));
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load events");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.role) {
      loadEvents();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [session?.role]);

  async function reloadEvents() {
    const { data } = await apiClient.get("/deo/calendar-events");
    setEvents((data.events || []).map(formatEventRow));
  }

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const counts = {
    All: events.length,
    Upcoming: events.filter(e => e.status === "Upcoming").length,
    Completed: events.filter(e => e.status === "Completed").length,
    Cancelled: events.filter(e => e.status === "Cancelled").length,
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

  const handleExport = (type) => {
    setShowExportMenu(false);
    const exportData = filtered.map(ev => ({
      "Event Title": ev.title,
      "Whom To Meet": ev.whoToMeet,
      "Date & Time": `${ev.date} ${ev.time}`,
      "Location": ev.location,
    }));
    console.log(`--- Extracted Data for ${type.toUpperCase()} ---`, exportData);
    if (type === "excel") {
      showToast("Exporting Excel file...");
      const headers = Object.keys(exportData[0] || {}).join(",");
      const rows = exportData.map(obj => Object.values(obj).map(v => `"${v}"`).join(",")).join("\n");
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "events_export.csv"; a.click();
    } else if (type === "pdf") {
      showToast("Exporting PDF file...");
    }
  };

  // Pagination page numbers with ellipsis
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  return (
    // ── CHANGED: h-screen + flex-col so the layout fills the full viewport height
    <div className="h-screen flex flex-col bg-[var(--portal-bg)] w-full box-border overflow-hidden" style={{ fontFamily: "var(--portal-font, 'Lora', Georgia, 'Times New Roman', serif)" }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-6 z-[9000] text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xl transition-all ${toast.type === "danger" ? "bg-red-500" : "bg-green-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Top Bar — shrink-0 so it never squishes */}
      <div className="shrink-0 bg-[var(--portal-card)] border-b border-[var(--portal-border)] px-7 py-3.5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--portal-text-strong)] m-0">Manage Events</h1>
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

      {/* Tabs — shrink-0 */}
      <div className="shrink-0 bg-[var(--portal-card)] border-b border-[var(--portal-border)] px-7 flex overflow-x-auto overflow-y-hidden">
        {["All", "Upcoming", "Completed", "Cancelled"].map(tab => (
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

      {/* Filter Bar — shrink-0 */}
      <div className="shrink-0 px-7 pt-5 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-4 py-2 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl h-11">
            <FiSearch size={16} className="text-[var(--portal-text-muted)]" />
            <input className="border-none bg-transparent outline-none text-sm text-[var(--portal-text-strong)] w-full" placeholder="Search events, person, location..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>

          <div className="relative flex items-center gap-1.5 px-3 h-11 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl min-w-[130px]">
            <span className="text-sm text-[var(--portal-text)] pointer-events-none whitespace-nowrap flex-1">{statusFilter || "All Status"}</span>
            <FiChevronDown size={14} className="text-[var(--portal-text-muted)]" />
            <select className="absolute inset-0 opacity-0 cursor-pointer w-full text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option>Upcoming</option><option>Completed</option><option>Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 h-11 bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl">
            <FiCalendar size={14} className="text-[var(--portal-text-muted)]" />
            <input type="date" className="bg-transparent border-none text-sm text-[var(--portal-text)] outline-none cursor-pointer" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            <span className="text-xs text-[var(--portal-text-muted)]">–</span>
            <input type="date" className="bg-transparent border-none text-sm text-[var(--portal-text)] outline-none cursor-pointer" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          </div>

          {hasFilters && (
            <button className="flex items-center gap-1.5 px-4 h-11 text-sm font-medium text-[var(--portal-text)] bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl hover:bg-[var(--portal-bg-elevated)] transition-colors" onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}>
              <FiX size={14} /> Clear filters
            </button>
          )}

          <div className="flex-1" />
          <span className="text-xs font-medium text-[var(--portal-text-muted)] whitespace-nowrap px-2">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Table — flex-1 + overflow-y-auto so it fills remaining space and scrolls */}
      <div className="flex-1 overflow-y-auto px-7 pb-2 min-h-0">
        <div className="bg-[var(--portal-card)] border border-[var(--portal-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-[var(--portal-bg-elevated)]">
                  {["#", "Event Title", "Whom to Meet", "Date & Time", "Location", "Files", "Status", "Actions"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold tracking-wider uppercase text-[var(--portal-text-muted)] border-b border-[var(--portal-border)] whitespace-nowrap ${i === 7 ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="py-12 px-6 text-center">
                        <FiCalendar size={36} className="text-[var(--portal-border)] mx-auto mb-3" />
                        <div className="text-sm font-semibold text-[var(--portal-text)] mb-1">{loading ? "Loading events..." : error ? "Unable to load events" : "No events found"}</div>
                        <div className="text-xs text-[var(--portal-text-muted)]">{loading ? "Fetching your created events" : error || "Try adjusting your filters"}</div>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((ev, idx) => (
                  <tr key={ev.id} className={`border-b border-[var(--portal-border-light)] hover:bg-[var(--portal-bg-elevated)] transition-colors ${idx % 2 === 0 ? "bg-[var(--portal-card)]" : "bg-[var(--portal-bg-elevated)]"}`}>
                    <td className="px-4 py-3.5 text-xs text-[var(--portal-text-muted)] align-middle">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3.5 align-middle"><span className="font-semibold text-[var(--portal-text-strong)]">{ev.title}</span></td>
                    <td className="px-4 py-3.5 text-[var(--portal-text)] align-middle">{ev.whoToMeet}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="font-semibold text-sm text-[var(--portal-text-strong)]">{ev.date}</div>
                      <div className="text-xs text-[var(--portal-text-muted)] mt-0.5">{ev.time}</div>
                    </td>
                    <td className="px-4 py-3.5 align-middle max-w-[160px]">
                      <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[var(--portal-text)]">{ev.location}</div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <FiPaperclip size={13} color={ev.files.length ? "var(--portal-purple)" : "var(--portal-border)"} />
                        <span className="text-xs font-semibold" style={{ color: ev.files.length ? "var(--portal-purple)" : "var(--portal-border)" }}>{ev.files.length}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[var(--portal-purple-dim)] text-[var(--portal-purple)]">
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--portal-purple-dim)] bg-[var(--portal-purple-dim)] text-[var(--portal-purple)] hover:opacity-80 transition-opacity" onClick={() => setUploadEvent(ev)} title="Upload">
                          <FiUploadCloud size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Bottom bar: same row as sidebar's Logout button ── */}
      <div className="shrink-0 bg-[var(--portal-card)] border-t border-[var(--portal-border)] px-7 py-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--portal-text-muted)]">
          {filtered.length === 0
            ? "No events"
            : `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} event${filtered.length !== 1 ? "s" : ""}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg border border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-text)] hover:bg-[var(--portal-bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ‹ Previous
          </button>
          <span className="text-xs font-medium text-[var(--portal-text-muted)] px-2 whitespace-nowrap">
            Page {page} of {totalPages || 1}
          </span>
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-[var(--portal-purple)] text-white border-none hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
          >
            Next ›
          </button>
        </div>
      </div>

      {/* Modals */}
      {uploadEvent && <EventUploadModal event={uploadEvent} onUploaded={reloadEvents} onClose={() => setUploadEvent(null)} onEdit={() => { setManageUploadEvent(uploadEvent); setUploadEvent(null); }} />}
      {manageUploadEvent && <ManageEventMediaModal event={manageUploadEvent} onSave={upd => { setEvents(p => p.map(e => e.id === upd.id ? upd : e)); setManageUploadEvent(upd); }} onClose={() => setManageUploadEvent(null)} onBack={() => { setUploadEvent(manageUploadEvent); setManageUploadEvent(null); }} />}
    </div>
  );
}
