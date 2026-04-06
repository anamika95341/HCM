// import { useEffect, useMemo, useState } from "react";
// import {
//   ChevronLeft,
//   ChevronRight,
//   Clock,
//   FileText,
//   Film,
//   Image as ImageIcon,
//   MapPin,
//   Users,
//   X,
//   Calendar, 
//   Star, 
//   TrendingUp, 
// } from "lucide-react";
// import { apiClient, authorizedConfig } from "../../shared/api/client.js";
// import { useAuth } from "../../shared/auth/AuthContext.jsx";
// import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
// import {
//   WorkspaceBadge,
//   WorkspaceCard,
//   WorkspaceCardHeader,
//   WorkspaceEmptyState,
//   WorkspacePage,
//   WorkspaceSectionHeader,
//   WorkspaceTabs,
// } from "../../shared/components/WorkspaceUI.jsx";

// // ── Constants ────────────────────────────────────────────────────────────────

// const VIEW_OPTIONS = ["month", "week", "day"];
// const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// const MONTHS = [
//   "January", "February", "March", "April", "May", "June",
//   "July", "August", "September", "October", "November", "December",
// ];

// // ── Utility functions ────────────────────────────────────────────────────────

// function startOfDay(date) {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   return d;
// }

// function startOfWeek(date) {
//   const d = startOfDay(date);
//   d.setDate(d.getDate() - d.getDay());
//   return d;
// }

// function addDays(date, amount) {
//   const d = new Date(date);
//   d.setDate(d.getDate() + amount);
//   return d;
// }

// function isSameDay(a, b) {
//   return startOfDay(a).getTime() === startOfDay(b).getTime();
// }

// function formatTime(dateString) {
//   return new Date(dateString).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
// }

// function formatDuration(item) {
//   const ms = new Date(item.endsAt) - new Date(item.startsAt);
//   const mins = Math.round(ms / 60000);
//   if (mins >= 60) {
//     const h = Math.floor(mins / 60);
//     const m = mins % 60;
//     return m ? `${h}h ${m}m` : `${h}h`;
//   }
//   return `${mins}m`;
// }

// function formatFileSize(size = 0) {
//   if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
//   if (size >= 1024) return `${Math.round(size / 1024)} KB`;
//   return `${size} B`;
// }

// function getItemKind(item) {
//   return item.kind === "event" ? "event" : "meeting";
// }

// function getItemSummary(items) {
//   const meetings = items.filter((item) => getItemKind(item) === "meeting").length;
//   const events = items.filter((item) => getItemKind(item) === "event").length;
//   const parts = [];
//   if (meetings) parts.push(`${meetings} meeting${meetings !== 1 ? "s" : ""}`);
//   if (events) parts.push(`${events} event${events !== 1 ? "s" : ""}`);
//   return parts.join(" ");
// }

// function getItemTypeLabel(item) {
//   if (getItemKind(item) === "event") {
//     return item.isVip ? "VIP Event" : "Scheduled Event";
//   }
//   return item.isVip ? "VIP Meeting" : "Scheduled Meeting";
// }

// // Mock files — UI scaffolding only, no backend integration
// const MOCK_FILES = {
//   photos: [
//     { id: "ph1", name: "Venue setup.jpg", size: 2.4 * 1024 * 1024 },
//     { id: "ph2", name: "Attendees group photo.jpg", size: 1.8 * 1024 * 1024 },
//     { id: "ph3", name: "Agenda board.jpg", size: 3.1 * 1024 * 1024 },
//     { id: "ph4", name: "Signing ceremony.jpg", size: 2.9 * 1024 * 1024 },
//   ],
//   videos: [
//     { id: "vi1", name: "Opening remarks.mp4", size: 45 * 1024 * 1024, duration: "12:34" },
//     { id: "vi2", name: "Discussion highlights.mp4", size: 82 * 1024 * 1024, duration: "28:15" },
//   ],
//   documents: [
//     { id: "do1", name: "Meeting Agenda.pdf", size: 450 * 1024 },
//     { id: "do2", name: "Presentation Slides.pptx", size: 8.2 * 1024 * 1024 },
//     { id: "do3", name: "Minutes of Meeting.docx", size: 230 * 1024 },
//     { id: "do4", name: "Action Items.xlsx", size: 120 * 1024 },
//   ],
// };

// // ── EventPill ────────────────────────────────────────────────────────────────

// function EventPill({ item, compact = false, onClick }) {
//   const { C } = usePortalTheme();
//   const tone = item.isVip ? C.warn : C.purple;
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       className={`w-full text-left rounded-lg px-3 py-2 transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] ${compact ? "text-[10px]" : "text-xs"}`}
//       style={{ border: `1px solid ${tone}33`, background: `${tone}12`, color: tone }}
//     >
//       <div className="font-semibold truncate">{item.title}</div>
//       <div className="opacity-70 mt-0.5">{formatTime(item.startsAt)}</div>
//     </button>
//   );
// }

// // ── FilesSection (UI only — no API calls, no upload logic) ───────────────────

// const FILE_TABS = [
//   { id: "photos", label: "Photos", icon: ImageIcon },
//   { id: "videos", label: "Videos", icon: Film },
//   { id: "documents", label: "Documents", icon: FileText },
// ];

// function FilePlaceholderIcon({ type, tone }) {
//   const Icon = type === "photos" ? ImageIcon : type === "videos" ? Film : FileText;
//   return (
//     <div
//       style={{
//         width: "100%",
//         aspectRatio: "4 / 3",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "center",
//         background: `${tone}10`,
//         borderRadius: 8,
//         gap: 6,
//         color: tone,
//         opacity: 0.7,
//       }}
//     >
//       <Icon size={22} />
//     </div>
//   );
// }

// function FilesSection({ C, tone }) {
//   const [activeTab, setActiveTab] = useState("photos");
//   const files = MOCK_FILES[activeTab] || [];

//   return (
//     <div>
//       {/* Tab bar */}
//       <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
//         {FILE_TABS.map(({ id, label }) => {
//           const active = activeTab === id;
//           const count = MOCK_FILES[id].length;
//           return (
//             <button
//               key={id}
//               type="button"
//               onClick={() => setActiveTab(id)}
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 6,
//                 padding: "6px 12px",
//                 borderRadius: 8,
//                 border: active ? `1px solid ${tone}40` : `1px solid transparent`,
//                 background: active ? `${tone}12` : "transparent",
//                 color: active ? tone : C.t3,
//                 fontSize: 12,
//                 fontWeight: 600,
//                 cursor: "pointer",
//                 transition: "all 0.15s ease",
//               }}
//             >
//               {id === "photos" ? <ImageIcon size={13} /> : id === "videos" ? <Film size={13} /> : <FileText size={13} />}
//               {label}
//               <span
//                 style={{
//                   fontSize: 10,
//                   fontWeight: 700,
//                   padding: "1px 6px",
//                   borderRadius: 99,
//                   background: active ? `${tone}20` : `${C.t3}15`,
//                   color: active ? tone : C.t3,
//                 }}
//               >
//                 {count}
//               </span>
//             </button>
//           );
//         })}
//       </div>

//       {/* File grid */}
//       {files.length === 0 ? (
//         <div style={{ color: C.t3, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
//           No {activeTab} attached to this meeting.
//         </div>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
//             gap: 12,
//           }}
//         >
//           {files.map((file) => (
//             <div
//               key={file.id}
//               style={{
//                 border: `1px solid ${C.border}`,
//                 borderRadius: 10,
//                 padding: 10,
//                 background: C.bgElevated,
//                 cursor: "default",
//                 transition: "border-color 0.15s ease",
//               }}
//               onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${tone}40`)}
//               onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
//             >
//               <FilePlaceholderIcon type={activeTab} tone={tone} />
//               <div
//                 style={{
//                   marginTop: 8,
//                   fontSize: 11,
//                   fontWeight: 600,
//                   color: C.t1,
//                   lineHeight: 1.4,
//                   wordBreak: "break-word",
//                   overflow: "hidden",
//                   display: "-webkit-box",
//                   WebkitLineClamp: 2,
//                   WebkitBoxOrient: "vertical",
//                 }}
//               >
//                 {file.name}
//               </div>
//               <div style={{ marginTop: 4, fontSize: 10, color: C.t3 }}>
//                 {file.duration ? `Video · ${file.duration}` : formatFileSize(file.size)}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       <div
//         style={{
//           marginTop: 14,
//           padding: "8px 12px",
//           borderRadius: 8,
//           background: `${C.t3}10`,
//           fontSize: 11,
//           color: C.t3,
//           fontStyle: "italic",
//         }}
//       >
//         File preview — backend integration pending.
//       </div>
//     </div>
//   );
// }

// // ── DayMeetingsModal ─────────────────────────────────────────────────────────

// function DayMeetingsModal({ date, items, onClose, onSelectMeeting }) {
//   const { C } = usePortalTheme();

//   if (!date) return null;

//   return (
//     <>
//       <div
//         className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
//         onClick={onClose}
//       />
//       <div className="fixed inset-0 z-50 flex sm:items-center justify-center overflow-y-auto">
//         <div
//           className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 fade-in duration-300"
//           style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.dialogShadow }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div
//             className="px-6 sm:px-8 py-6 border-b flex items-start justify-between gap-4"
//             style={{ background: C.bgElevated, borderColor: C.border }}
//           >
//             <div className="min-w-0">
//               <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em" }}>
//                 Schedule
//               </div>
//               <h3 className="mt-3 text-2xl font-bold break-words" style={{ color: C.t1 }}>
//                 {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
//               </h3>
//               <div className="mt-2 text-sm" style={{ color: C.t2 }}>
//                 {getItemSummary(items) || "No schedule"}
//               </div>
//             </div>
//             <button
//               type="button"
//               onClick={onClose}
//               className="p-2 rounded-lg transition-colors flex-shrink-0"
//               style={{ color: C.t2, background: "transparent" }}
//               aria-label="Close"
//             >
//               <X size={20} />
//             </button>
//           </div>

//           <div className="p-6 sm:p-8 max-h-[320px] overflow-y-auto">
//             {items.length === 0 ? (
//               <div style={{ fontSize: 13, color: C.t3, textAlign: "center", padding: "24px 0" }}>
//                 No schedule for this date.
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {items.map((item) => {
//                   const tone = item.isVip ? C.warn : C.purple;
//                   return (
//                     <button
//                       key={item.id}
//                       type="button"
//                       onClick={() => onSelectMeeting(item)}
//                       className="w-full text-left rounded-xl p-4 transition-all"
//                       style={{ border: `1px solid ${C.border}`, background: C.bgElevated }}
//                     >
//                       <div className="flex items-start justify-between gap-4">
//                         <div className="min-w-0">
//                           <div
//                             className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border"
//                             style={{ borderColor: `${tone}33`, background: `${tone}12`, color: tone }}
//                           >
//                             {getItemTypeLabel(item)}
//                           </div>
//                           <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: C.t1 }} className="break-words">
//                             {item.title}
//                           </div>
//                           <div style={{ fontSize: 12, color: C.t2, marginTop: 6 }}>
//                             {item.location || "Location pending"}
//                           </div>
//                         </div>
//                         <div style={{ fontSize: 12, color: C.t2, whiteSpace: "nowrap", fontWeight: 600 }}>
//                           {formatTime(item.startsAt)} - {formatTime(item.endsAt)}
//                         </div>
//                       </div>
//                     </button>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ── MeetingDetailModal ────────────────────────────────────────────────────────

// function MeetingDetailModal({ meeting, onClose }) {
//   const { C } = usePortalTheme();
//   if (!meeting) return null;
//   const tone = meeting.isVip ? C.warn : C.purple;

//   return (
//     <>
//       <div
//         className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
//         onClick={onClose}
//       />
//       <div className="fixed inset-0 z-[70] flex sm:items-center justify-center overflow-y-auto">
//         <div
//           className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 fade-in duration-300"
//           style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.dialogShadow }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* Header */}
//           <div
//             className="px-6 sm:px-8 py-6 sm:py-8 border-b flex items-start justify-between gap-4"
//             style={{ background: C.bgElevated, borderColor: C.border }}
//           >
//             <button
//               type="button"
//               onClick={onClose}
//               className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex-shrink-0 mt-1"
//               style={{ color: C.t2, background: C.bgElevated, border: `1px solid ${C.border}` }}
//               aria-label="Back"
//             >
//               ← Back
//             </button>
//             <div className="flex-1 min-w-0">
//               <div
//                 className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border"
//                 style={{ borderColor: `${tone}33`, background: `${tone}12`, color: tone }}
//               >
//                 {getItemTypeLabel(meeting)}
//               </div>
//               <h3 className="mt-4 text-2xl sm:text-3xl font-bold break-words" style={{ color: C.t1 }}>
//                 {meeting.title}
//               </h3>
//               <div className="text-xs sm:text-sm mt-3 flex flex-wrap items-center gap-2" style={{ color: C.t2 }}>
//                 <span>{new Date(meeting.startsAt).toLocaleDateString()}</span>
//                 <span>•</span>
//                 <span className="font-medium">{formatTime(meeting.startsAt)}</span>
//                 <span>-</span>
//                 <span className="font-medium">{formatTime(meeting.endsAt)}</span>
//                 <span>•</span>
//                 <span style={{ color: C.t3 }}>{formatDuration(meeting)}</span>
//               </div>
//             </div>
//             <button
//               type="button"
//               onClick={onClose}
//               className="p-2 rounded-lg transition-colors flex-shrink-0"
//               style={{ color: C.t2, background: "transparent" }}
//               aria-label="Close"
//             >
//               <X size={20} />
//             </button>
//           </div>

//           {/* Scrollable content */}
//           <div className="p-6 sm:p-8 max-h-[calc(100vh-300px)] sm:max-h-[70vh] overflow-y-auto">
//             <div className="space-y-8 animate-in fade-in duration-200">
//               {/* Info grid */}
//               <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
//                 <div>
//                   <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
//                     Location
//                   </p>
//                   <p style={{ fontSize: 15, color: C.t1, fontWeight: 600 }} className="break-words">
//                     {meeting.location || "Location pending"}
//                   </p>
//                 </div>
//                 <div>
//                   <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
//                     Source
//                   </p>
//                   <p style={{ fontSize: 15, color: C.t1, fontWeight: 600 }}>
//                     {meeting.source}
//                   </p>
//                 </div>
//               </div>

//               {/* Participants */}
//               {Array.isArray(meeting.participants) && meeting.participants.length > 0 && (
//                 <div>
//                   <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
//                     <Users size={11} /> Participants
//                   </p>
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
//                     {meeting.participants.map((p) => (
//                       <span
//                         key={p}
//                         style={{
//                           fontSize: 12,
//                           padding: "4px 12px",
//                           borderRadius: 99,
//                           background: `${tone}10`,
//                           color: tone,
//                           border: `1px solid ${tone}25`,
//                           fontWeight: 500,
//                         }}
//                       >
//                         {p}
//                       </span>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Description */}
//               <div>
//                 <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
//                   Description
//                 </p>
//                 <p style={{ color: C.t2, lineHeight: 1.75, fontSize: 14 }}>
//                   {meeting.details || "No description available."}
//                 </p>
//               </div>

//               {/* Divider */}
//               <div style={{ height: 1, background: C.border }} />

//               {/* Files section — UI only */}
//               <div>
//                 <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16 }}>
//                   Files
//                 </p>
//                 <FilesSection C={C} tone={tone} />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ── Main MinisterCalendar component ──────────────────────────────────────────

// export default function MinisterCalendar() {
//   const { C } = usePortalTheme();
//   const { session } = useAuth();

//   // Data
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // Calendar navigation
//   const [view, setView] = useState("month");
//   const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));

//   // Modal state
//   const [selectedDate, setSelectedDate] = useState(null);   // controls DayMeetingsModal
//   const [selectedMeeting, setSelectedMeeting] = useState(null); // controls MeetingDetailModal

//   useEffect(() => {
//     let mounted = true;

//     async function loadCalendar() {
//       try {
//         const { data } = await apiClient.get("/minister/calendar", authorizedConfig(session.accessToken));
//         const mapped = (data.events || []).map((event) => ({
//           id: event.id,
//           sourceId: event.meeting_id || event.id,
//           title: event.title,
//           details: event.comments || "",
//           startsAt: event.starts_at,
//           endsAt: event.ends_at,
//           location: event.location,
//           source: event.meeting_id ? (event.is_vip ? "Minister Priority" : "Minister Calendar") : "DEO Event",
//           participants: event.participants || [],
//           kind: event.meeting_id ? "meeting" : "event",
//           isVip: Boolean(event.is_vip),
//           whoToMeet: event.who_to_meet || "",
//         }));
//         if (mounted) {
//           setItems(mapped);
//           setError("");
//         }
//       } catch (loadError) {
//         if (mounted) {
//           setItems([]);
//           setError(loadError?.response?.data?.error || "Unable to load calendar");
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     }

//     if (session?.accessToken) {
//       loadCalendar();
//     } else {
//       setLoading(false);
//     }

//     return () => { mounted = false; };
//   }, [session?.accessToken]);

//   // ── Derived state ──────────────────────────────────────────────────────────

//   const filteredItems = useMemo(() => {
//     if (view === "day") {
//       return items.filter((item) => isSameDay(item.startsAt, cursorDate));
//     }
//     if (view === "week") {
//       const weekStart = startOfWeek(cursorDate);
//       const weekEnd = addDays(weekStart, 7);
//       return items.filter(
//         (item) => new Date(item.startsAt) >= weekStart && new Date(item.startsAt) < weekEnd
//       );
//     }
//     const monthStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
//     const monthEnd = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1);
//     return items.filter(
//       (item) => new Date(item.startsAt) >= monthStart && new Date(item.startsAt) < monthEnd
//     );
//   }, [items, view, cursorDate]);

//   const weekDays = useMemo(() => {
//     const start = startOfWeek(cursorDate);
//     return Array.from({ length: 7 }, (_, i) => addDays(start, i));
//   }, [cursorDate]);

//   // Updated monthGrid Logic: Generates exactly the number of weeks needed (no redundant bottom rows)
//   const monthGrid = useMemo(() => {
//     const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
//     const start = addDays(first, -first.getDay());
    
//     const grid = [];
//     let current = start;
    
//     // Add days until we finish the current month
//     while (current.getMonth() === cursorDate.getMonth() || current <= first) {
//       grid.push(current);
//       current = addDays(current, 1);
//     }
    
//     // Keep adding days to complete the last week (until we hit Sunday again)
//     while (current.getDay() !== 0) {
//       grid.push(current);
//       current = addDays(current, 1);
//     }
    
//     return grid;
//   }, [cursorDate]);

//   const meetingsForDate = useMemo(() => {
//     if (!selectedDate) return [];
//     return items
//       .filter((item) => isSameDay(item.startsAt, selectedDate))
//       .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
//   }, [items, selectedDate]);

//   const dayItems = useMemo(
//     () => filteredItems.slice().sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
//     [filteredItems]
//   );

//   const nextTwoMeetings = useMemo(() => {
//     const now = new Date();
//     return items
//       .filter((item) => new Date(item.startsAt) >= now)
//       .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
//       .slice(0, 2);
//   }, [items]);

//   // ── Handlers ───────────────────────────────────────────────────────────────

//   function shiftCursor(direction) {
//     const delta = direction === "next" ? 1 : -1;
//     if (view === "day") { setCursorDate((c) => addDays(c, delta)); return; }
//     if (view === "week") { setCursorDate((c) => addDays(c, 7 * delta)); return; }
//     setCursorDate((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
//   }

//   function viewLabel() {
//     if (view === "day") {
//       return cursorDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
//     }
//     if (view === "week") {
//       const start = startOfWeek(cursorDate);
//       const end = addDays(start, 6);
//       return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
//     }
//     return `${MONTHS[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
//   }

//   function handleDateSelect(day) {
//     setSelectedDate(day);
//     setSelectedMeeting(null);
//   }

//   function handleEventPillClick(day, meeting) {
//     setSelectedDate(day);
//     setSelectedMeeting(meeting);
//   }

//   function handleSelectMeeting(meeting) {
//     setSelectedMeeting(meeting);
//   }

//   function handleCloseMeetingDetail() {
//     setSelectedMeeting(null);
//   }

//   function handleCloseDayModal() {
//     setSelectedDate(null);
//     setSelectedMeeting(null);
//   }

//   // Calculate dynamic height based on the exact number of weeks needed (monthGrid.length / 7)
//   const rowsCount = monthGrid.length / 7;

//   // ── Render ─────────────────────────────────────────────────────────────────

//   return (
//     <WorkspacePage width={1320}>

//       {loading ? (
//         <WorkspaceEmptyState title="Loading calendar…" />
//       ) : error ? (
//         <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
//       ) : (
//         <div>
//           {/* Main Grid: Calendar & Right Panel */}
//           <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6" style={{ alignItems: "start" }}>
            
//             {/* Left: Calendar Card */}
//             <WorkspaceCard style={{ marginBottom: 0 }}>
//               <WorkspaceCardHeader
//                 title={viewLabel()}
//                 subtitle={`${filteredItems.length} event${filteredItems.length !== 1 ? "s" : ""} in view`}
//                 action={
//                   <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//                     {/* View Dropdown */}
//                     <select
//                       value={view}
//                       onChange={(e) => {
//                         setView(e.target.value);
//                         handleCloseDayModal();
//                       }}
//                       style={{
//                         padding: "6px 12px",
//                         borderRadius: 8,
//                         border: `1px solid ${C.border}`,
//                         background: C.bgElevated,
//                         color: C.t1,
//                         fontSize: 13,
//                         fontWeight: 600,
//                         cursor: "pointer",
//                         outline: "none"
//                       }}
//                     >
//                       {VIEW_OPTIONS.map((o) => (
//                         <option key={o} value={o}>
//                           {o.charAt(0).toUpperCase() + o.slice(1)}
//                         </option>
//                       ))}
//                     </select>

//                     <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
//                       <button
//                         type="button"
//                         onClick={() => shiftCursor("prev")}
//                         aria-label="Previous"
//                         style={{
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                           padding: "6px 10px",
//                           borderRadius: 8,
//                           border: `1px solid ${C.border}`,
//                           background: C.bgElevated,
//                           color: C.t1,
//                           cursor: "pointer"
//                         }}
//                       >
//                         <ChevronLeft size={18} color={C.t1} strokeWidth={2.5} />
//                       </button>
//                       <button
//                         type="button"
//                         onClick={() => setCursorDate(startOfDay(new Date()))}
//                         style={{
//                           padding: "6px 16px",
//                           borderRadius: 8,
//                           border: `1px solid ${C.border}`,
//                           background: C.bgElevated,
//                           color: C.t1,
//                           fontSize: 13,
//                           fontWeight: 600,
//                           cursor: "pointer"
//                         }}
//                       >
//                         Today
//                       </button>
//                       <button
//                         type="button"
//                         onClick={() => shiftCursor("next")}
//                         aria-label="Next"
//                         style={{
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                           padding: "6px 10px",
//                           borderRadius: 8,
//                           border: `1px solid ${C.border}`,
//                           background: C.bgElevated,
//                           color: C.t1,
//                           cursor: "pointer"
//                         }}
//                       >
//                         <ChevronRight size={18} color={C.t1} strokeWidth={2.5} />
//                       </button>
//                     </div>
//                   </div>
//                 }
//               />

//               {/* ── Month View ── */}
//               {view === "month" && (
//                 <div>
//                   <div
//                     style={{
//                       display: "grid",
//                       gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
//                       gap: 8,
//                       marginBottom: 8,
//                     }}
//                   >
//                     {DAYS.map((day) => (
//                       <div
//                         key={day}
//                         style={{
//                           fontSize: 11,
//                           fontWeight: 700,
//                           color: C.t3,
//                           textTransform: "uppercase",
//                           letterSpacing: ".08em",
//                           textAlign: "center",
//                         }}
//                       >
//                         {day}
//                       </div>
//                     ))}
//                   </div>

//                   <div
//                     style={{
//                       display: "grid",
//                       gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
//                       gap: 8,
//                     }}
//                   >
//                     {monthGrid.map((day) => {
//                       const inMonth = day.getMonth() === cursorDate.getMonth();
//                       const isToday = isSameDay(day, new Date());
//                       const isSelected = selectedDate && isSameDay(day, selectedDate);
//                       const eventsForDay = items.filter((item) => isSameDay(item.startsAt, day));
//                       const daySummary = getItemSummary(eventsForDay);

//                       return (
//                         <div
//                           key={day.toISOString()}
//                           onClick={() => handleDateSelect(day)}
//                           style={{
//                             height: `calc((100vh - 280px) / ${rowsCount})`,
//                             minHeight: 70,
//                             borderRadius: 12,
//                             border: `1px solid ${isSelected ? C.purple + "60" : isToday ? C.purple + "40" : C.border}`,
//                             background: isSelected
//                               ? `${C.purple}08`
//                               : inMonth
//                               ? C.bgElevated
//                               : C.bg,
//                             padding: 10,
//                             display: "grid",
//                             gap: 6,
//                             alignContent: "start",
//                             cursor: "pointer",
//                             transition: "border-color 0.15s ease, background 0.15s ease",
//                           }}
//                           onMouseEnter={(e) => {
//                             if (!isSelected)
//                               e.currentTarget.style.borderColor = `${C.purple}40`;
//                           }}
//                           onMouseLeave={(e) => {
//                             if (!isSelected)
//                               e.currentTarget.style.borderColor = isToday
//                                 ? `${C.purple}40`
//                                 : C.border;
//                           }}
//                         >
//                           <div
//                             style={{
//                               display: "flex",
//                               alignItems: "center",
//                               justifyContent: "center",
//                               width: 24,
//                               height: 24,
//                               borderRadius: 99,
//                               fontSize: 12,
//                               fontWeight: 700,
//                               background: isToday ? C.purple : "transparent",
//                               color: isToday ? "#fff" : inMonth ? C.t1 : C.t3,
//                             }}
//                           >
//                             {day.getDate()}
//                           </div>
//                           {eventsForDay.length > 0 && (
//                             <div
//                               style={{
//                                 fontSize: 11,
//                                 fontWeight: 600,
//                                 color: C.purple,
//                                 background: `${C.purple}12`,
//                                 border: `1px solid ${C.purple}30`,
//                                 borderRadius: 8,
//                                 padding: "4px 8px",
//                                 textAlign: "center",
//                               }}
//                             >
//                               {daySummary}
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               )}

//               {/* ── Week View ── */}
//               {view === "week" && (
//                 <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
//                   {weekDays.map((day) => {
//                     const eventsForDay = items.filter((item) => isSameDay(item.startsAt, day));
//                     const daySummary = getItemSummary(eventsForDay);
//                     const isToday = isSameDay(day, new Date());
//                     const isSelected = selectedDate && isSameDay(day, selectedDate);
//                     return (
//                       <div
//                         key={day.toISOString()}
//                         style={{
//                           border: `1px solid ${isSelected ? C.purple + "60" : isToday ? C.purple + "40" : C.border}`,
//                           borderRadius: 12,
//                           background: isSelected ? `${C.purple}08` : C.bgElevated,
//                           padding: 10,
//                           minHeight: 120,
//                           cursor: "pointer",
//                           transition: "border-color 0.15s ease, background 0.15s ease",
//                         }}
//                         onClick={() => handleDateSelect(day)}
//                         onMouseEnter={(e) => {
//                           if (!isSelected)
//                             e.currentTarget.style.borderColor = `${C.purple}40`;
//                         }}
//                         onMouseLeave={(e) => {
//                           if (!isSelected)
//                             e.currentTarget.style.borderColor = isToday
//                               ? `${C.purple}40`
//                               : C.border;
//                         }}
//                       >
//                         <div style={{ marginBottom: 10 }}>
//                           <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
//                             {DAYS[day.getDay()]}
//                           </div>
//                           <div
//                             style={{
//                               display: "inline-flex",
//                               alignItems: "center",
//                               justifyContent: "center",
//                               width: 26,
//                               height: 26,
//                               borderRadius: 99,
//                               fontSize: 14,
//                               fontWeight: 700,
//                               marginTop: 4,
//                               background: isToday ? C.purple : "transparent",
//                               color: isToday ? "#fff" : C.t1,
//                             }}
//                           >
//                             {day.getDate()}
//                           </div>
//                         </div>
//                         <div style={{ display: "grid", gap: 6 }}>
//                           {eventsForDay.length > 0 ? (
//                             <div
//                               style={{
//                                 fontSize: 12,
//                                 fontWeight: 600,
//                                 color: C.purple,
//                                 background: `${C.purple}12`,
//                                 border: `1px solid ${C.purple}30`,
//                                 borderRadius: 8,
//                                 padding: "6px 10px",
//                                 textAlign: "center",
//                               }}
//                             >
//                               {daySummary}
//                             </div>
//                           ) : (
//                             <div style={{ fontSize: 11, color: C.t3 }}>No events</div>
//                           )}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}

//               {/* ── Day View ── */}
//               {view === "day" && (
//                 <div style={{ display: "grid", gap: 10 }}>
//                   {dayItems.length ? (
//                     dayItems.map((item) => {
//                       const tone = item.isVip ? C.warn : C.purple;
//                       return (
//                         <button
//                           key={item.id}
//                           type="button"
//                           onClick={() => handleEventPillClick(cursorDate, item)}
//                           style={{
//                             border: `1px solid ${C.border}`,
//                             borderRadius: 12,
//                             background: C.bgElevated,
//                             padding: 16,
//                             textAlign: "left",
//                             cursor: "pointer",
//                             transition: "border-color 0.15s ease, background 0.15s ease",
//                           }}
//                           onMouseEnter={(e) => {
//                             e.currentTarget.style.borderColor = `${tone}50`;
//                             e.currentTarget.style.background = `${tone}06`;
//                           }}
//                           onMouseLeave={(e) => {
//                             e.currentTarget.style.borderColor = C.border;
//                             e.currentTarget.style.background = C.bgElevated;
//                           }}
//                         >
//                           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
//                             <div style={{ minWidth: 0, flex: 1 }}>
//                               <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 4 }}>
//                                 {item.title}
//                               </div>
//                               <div style={{ fontSize: 12, color: C.t2, marginBottom: 4 }}>
//                                 {formatTime(item.startsAt)} – {formatTime(item.endsAt)} · {formatDuration(item)}
//                               </div>
//                               <div style={{ fontSize: 12, color: C.t3 }}>
//                                 {item.location || "Location pending"}
//                               </div>
//                             </div>
//                             <WorkspaceBadge color={tone}>
//                               {getItemKind(item) === "event" ? "Event" : item.isVip ? "VIP" : "Standard"}
//                             </WorkspaceBadge>
//                           </div>
//                         </button>
//                       );
//                     })
//                   ) : (
//                     <WorkspaceEmptyState title="No events scheduled for this day" />
//                   )}
//                 </div>
//               )}
//             </WorkspaceCard>

//             {/* Right Panel: Upcoming Meetings */}
//             <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 24, height: "fit-content" }}>
              
//               {/* Upcoming Meetings */}
//               <WorkspaceCard style={{ padding: 24, marginBottom: 0 }}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
//                   <div>
//                     <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Upcoming</div>
//                     <h3 className="text-lg font-bold" style={{ color: C.t1 }}>Next Schedule</h3>
//                   </div>
//                   <div style={{ background: `${C.purple}15`, padding: 8, borderRadius: '50%', color: C.purple }}>
//                     <Calendar size={18} />
//                   </div>
//                 </div>

//                 {nextTwoMeetings.length === 0 ? (
//                   <div style={{ fontSize: 13, color: C.t3 }}>No upcoming meetings or events scheduled.</div>
//                 ) : (
//                   <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//                     {nextTwoMeetings.map((item) => {
//                       const tone = item.isVip ? C.warn : C.purple;
//                       return (
//                         <button
//                           key={item.id}
//                           type="button"
//                           onClick={() => { setSelectedDate(startOfDay(new Date(item.startsAt))); setSelectedMeeting(item); }}
//                           style={{
//                             display: "flex",
//                             alignItems: "stretch",
//                             gap: 12,
//                             padding: "16px",
//                             border: `1px solid ${C.border}`,
//                             borderRadius: 12,
//                             background: C.bgElevated,
//                             textAlign: "left",
//                             cursor: "pointer",
//                             position: "relative",
//                             overflow: "hidden"
//                           }}
//                         >
//                           {/* Colored left bar like in the image */}
//                           <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, background: tone, borderRadius: "0 4px 4px 0" }} />
                          
//                           <div style={{ minWidth: 0, flex: 1, paddingLeft: 6 }}>
//                             <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{item.title}</div>
//                             <div 
//                               style={{ 
//                                 display: "inline-flex", 
//                                 alignItems: "center", 
//                                 gap: 8,
//                                 fontSize: 12, 
//                                 fontWeight: 600,
//                                 color: tone,
//                                 background: `${tone}10`,
//                                 padding: "4px 10px",
//                                 borderRadius: 6
//                               }}
//                             >
//                               {new Date(item.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
//                               <span style={{ color: C.t3, fontWeight: 400 }}>{formatTime(item.startsAt)}</span>
//                             </div>
//                           </div>
//                         </button>
//                       );
//                     })}
//                   </div>
//                 )}
//               </WorkspaceCard>

//             </div>
//           </div>
//         </div>
//       )}

//       {/* Day meetings modal — shows when a date is selected */}
//       {selectedDate && !selectedMeeting && (
//         <DayMeetingsModal
//           date={selectedDate}
//           items={meetingsForDate}
//           onClose={handleCloseDayModal}
//           onSelectMeeting={handleSelectMeeting}
//         />
//       )}

//       {/* Meeting detail modal — opens on top when a meeting is selected */}
//       {selectedMeeting && (
//         <MeetingDetailModal
//           meeting={selectedMeeting}
//           onClose={handleCloseMeetingDetail}
//         />
//       )}
//     </WorkspacePage>
//   );
// }


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

// ── File Tabs Constant ───────────────────────────────────────────────────────

const FILE_TABS = [
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Film },
  { id: "documents", label: "Documents", icon: FileText },
];

// ── MeetingDetailModal ────────────────────────────────────────────────────────

function MeetingDetailModal({ meeting, onClose }) {
  const { C } = usePortalTheme();
  const [activeFileTab, setActiveFileTab] = useState("photos");
  
  if (!meeting) return null;
  const tone = meeting.isVip ? C.warn : C.purple;
  const files = MOCK_FILES[activeFileTab] || [];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[70] flex sm:items-center justify-center overflow-y-auto p-4">
        <div
          className="w-full max-w-3xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 fade-in duration-300 my-auto"
          style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: C.dialogShadow }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with colored accent */}
          <div style={{ position: "relative" }}>
            {/* Top accent bar */}
            <div style={{ height: 4, background: tone }} />
            
            <div
              className="px-6 sm:px-8 py-6"
              style={{ background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  {/* Badge row */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 99,
                        background: `${tone}12`,
                        border: `1px solid ${tone}30`,
                        color: tone,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                      }}
                    >
                      {meeting.isVip && <Star size={11} fill={tone} />}
                      {getItemTypeLabel(meeting)}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 24, fontWeight: 700, color: C.t1, marginBottom: 12, lineHeight: 1.3, wordWrap: "break-word", overflowWrap: "break-word" }}>
                    {meeting.title}
                  </h3>

                  {/* Date/Time info row */}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ padding: 6, borderRadius: 8, background: `${tone}10`, flexShrink: 0 }}>
                        <Calendar size={14} color={tone} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>
                        {new Date(meeting.startsAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ padding: 6, borderRadius: 8, background: `${tone}10`, flexShrink: 0 }}>
                        <Clock size={14} color={tone} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>
                        {formatTime(meeting.startsAt)} – {formatTime(meeting.endsAt)}
                      </span>
                      <span style={{ fontSize: 12, color: C.t3, fontWeight: 500 }}>
                        ({formatDuration(meeting)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.card,
                    color: C.t2,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="p-6 sm:p-8 max-h-[calc(100vh-320px)] overflow-y-auto" style={{ background: C.card }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              
              {/* Info Cards Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {/* Location Card */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    background: C.bgElevated,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <MapPin size={14} color={C.t3} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Location
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: C.t1, fontWeight: 600, lineHeight: 1.5, margin: 0, wordWrap: "break-word", overflowWrap: "break-word" }}>
                    {meeting.location || "Location pending"}
                  </p>
                </div>

                {/* Source Card */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    background: C.bgElevated,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <TrendingUp size={14} color={C.t3} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Source
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: C.t1, fontWeight: 600, margin: 0, wordWrap: "break-word", overflowWrap: "break-word" }}>
                    {meeting.source}
                  </p>
                </div>
              </div>

              {/* Participants */}
              {Array.isArray(meeting.participants) && meeting.participants.length > 0 && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    background: C.bgElevated,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <Users size={14} color={C.t3} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Participants
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: `${tone}15`,
                        color: tone,
                      }}
                    >
                      {meeting.participants.length}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {meeting.participants.map((p) => (
                      <span
                        key={p}
                        style={{
                          fontSize: 13,
                          padding: "6px 14px",
                          borderRadius: 99,
                          background: `${tone}08`,
                          color: C.t1,
                          border: `1px solid ${tone}20`,
                          fontWeight: 500,
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          maxWidth: "100%",
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: C.bgElevated,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FileText size={14} color={C.t3} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                    Description
                  </span>
                </div>
                <p style={{ color: C.t2, lineHeight: 1.8, fontSize: 14, margin: 0, wordWrap: "break-word", overflowWrap: "break-word" }}>
                  {meeting.details || "No description available."}
                </p>
              </div>

              {/* ══════════════════════════════════════════════════════════════
                  FILES SECTION - Separate Card
                 ══════════════════════════════════════════════════════════════ */}
              <div
                style={{
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: C.bgElevated,
                  overflow: "hidden",
                }}
              >
                {/* Files Header */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 10, background: `${tone}12` }}>
                      <FileText size={16} color={tone} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: C.t1, margin: 0 }}>
                        Attached Files
                      </h4>
                      <p style={{ fontSize: 12, color: C.t3, margin: 0, marginTop: 2 }}>
                        {MOCK_FILES.photos.length + MOCK_FILES.videos.length + MOCK_FILES.documents.length} files attached
                      </p>
                    </div>
                  </div>
                </div>

                {/* Files Tab Bar */}
                <div
                  style={{
                    display: "flex",
                    gap: 0,
                    padding: "0 16px",
                    borderBottom: `1px solid ${C.border}`,
                    background: C.card,
                  }}
                >
                  {FILE_TABS.map(({ id, label, icon: Icon }) => {
                    const active = activeFileTab === id;
                    const count = MOCK_FILES[id].length;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveFileTab(id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "14px 16px",
                          background: "transparent",
                          border: "none",
                          borderBottom: active ? `2px solid ${tone}` : "2px solid transparent",
                          color: active ? tone : C.t3,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          marginBottom: -1,
                        }}
                      >
                        <Icon size={14} />
                        {label}
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 99,
                            background: active ? `${tone}15` : `${C.t3}12`,
                            color: active ? tone : C.t3,
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Files Grid */}
                <div style={{ padding: 16 }}>
                  {files.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px 16px",
                        color: C.t3,
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        {activeFileTab === "photos" ? <ImageIcon size={32} /> : activeFileTab === "videos" ? <Film size={32} /> : <FileText size={32} />}
                      </div>
                      <p style={{ fontSize: 13, margin: 0 }}>No {activeFileTab} attached</p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {files.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: 12,
                            background: C.card,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = `${tone}40`;
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          {/* File Preview Placeholder */}
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "4 / 3",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              background: `${tone}08`,
                              borderRadius: 8,
                              color: tone,
                            }}
                          >
                            {activeFileTab === "photos" ? (
                              <ImageIcon size={24} />
                            ) : activeFileTab === "videos" ? (
                              <Film size={24} />
                            ) : (
                              <FileText size={24} />
                            )}
                          </div>
                          {/* File Info */}
                          <div style={{ marginTop: 10 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.t1,
                                lineHeight: 1.4,
                                overflow: "hidden",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                              }}
                            >
                              {file.name}
                            </div>
                            <div style={{ marginTop: 4, fontSize: 11, color: C.t3 }}>
                              {file.duration ? `${file.duration}` : formatFileSize(file.size)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Backend pending notice */}
                  <div
                    style={{
                      marginTop: 16,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: `${C.warn}08`,
                      border: `1px solid ${C.warn}20`,
                      fontSize: 12,
                      color: C.warn,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Clock size={14} />
                    File upload & preview — backend integration pending
                  </div>
                </div>
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Calendar navigation
  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));

  // Modal state
  const [selectedMeeting, setSelectedMeeting] = useState(null); // controls MeetingDetailModal

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

  function handleSelectMeeting(meeting) {
    setSelectedMeeting(meeting);
  }

  function handleCloseMeetingDetail() {
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
                      onChange={(e) => setView(e.target.value)}
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
                      const eventsForDay = items.filter((item) => isSameDay(item.startsAt, day));
                      const daySummary = getItemSummary(eventsForDay);
                      const hasEvents = eventsForDay.length > 0;

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => {
                            if (hasEvents) {
                              handleSelectMeeting(eventsForDay[0]);
                            }
                          }}
                          style={{
                            height: `calc((100vh - 280px) / ${rowsCount})`,
                            minHeight: 70,
                            borderRadius: 12,
                            border: `1px solid ${isToday ? C.purple + "40" : C.border}`,
                            background: inMonth ? C.bgElevated : C.bg,
                            padding: 10,
                            display: "grid",
                            gap: 6,
                            alignContent: "start",
                            cursor: hasEvents ? "pointer" : "default",
                            transition: "border-color 0.15s ease, background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (hasEvents) {
                              e.currentTarget.style.borderColor = `${C.purple}40`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isToday ? `${C.purple}40` : C.border;
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
                              {daySummary}
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
                    const hasEvents = eventsForDay.length > 0;
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => {
                          if (hasEvents) {
                            handleSelectMeeting(eventsForDay[0]);
                          }
                        }}
                        style={{
                          border: `1px solid ${isToday ? C.purple + "40" : C.border}`,
                          borderRadius: 12,
                          background: C.bgElevated,
                          padding: 10,
                          minHeight: 120,
                          cursor: hasEvents ? "pointer" : "default",
                          transition: "border-color 0.15s ease, background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (hasEvents) {
                            e.currentTarget.style.borderColor = `${C.purple}40`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = isToday ? `${C.purple}40` : C.border;
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
                          onClick={() => handleSelectMeeting(item)}
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
                              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 4, wordWrap: "break-word", overflowWrap: "break-word" }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: 12, color: C.t2, marginBottom: 4 }}>
                                {formatTime(item.startsAt)} – {formatTime(item.endsAt)} · {formatDuration(item)}
                              </div>
                              <div style={{ fontSize: 12, color: C.t3, wordWrap: "break-word", overflowWrap: "break-word" }}>
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
            </WorkspaceCard>

            {/* Right Panel: Upcoming Meetings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 24, height: "fit-content" }}>
              
              {/* Upcoming Meetings */}
              <WorkspaceCard style={{ padding: 24, marginBottom: 0 }}>
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
                          onClick={() => handleSelectMeeting(item)}
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

      {/* Meeting detail modal — opens when a meeting is selected */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={handleCloseMeetingDetail}
        />
      )}
    </WorkspacePage>
  );
}