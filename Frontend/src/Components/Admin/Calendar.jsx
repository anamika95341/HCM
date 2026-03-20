import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";

const VIEW_OPTIONS = ["month", "week", "day"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TYPE_STYLES = {
  "Scheduled Meeting": "bg-blue-100 text-blue-700 border-blue-200",
};

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

function EventPill({ item, compact = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left border rounded-lg px-3 py-2 transition-all hover:shadow-md ${TYPE_STYLES[item.type] || "bg-gray-100 text-gray-700 border-gray-200"} ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <div className="font-semibold truncate">{item.title}</div>
      <div className="opacity-70 mt-0.5">{formatTime(item.startsAt)}</div>
    </button>
  );
}

function Modal({ item, mode, editForm, setEditForm, onClose, onSave, onModeChange, saving }) {
  if (!item) return null;
  
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
          className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 fade-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 sm:px-8 py-6 sm:py-8 border-b border-gray-200 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${TYPE_STYLES[item.type] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                {item.type}
              </div>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 break-words">{item.title}</h3>
              <div className="text-xs sm:text-sm text-gray-600 mt-3 flex flex-wrap items-center gap-2">
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
              className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
            <button
              type="button"
              onClick={() => onModeChange("details")}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold text-sm border-b-2 transition-all duration-200 ${
                mode === "details"
                  ? "border-blue-600 text-blue-600 bg-blue-50/30"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => onModeChange("edit")}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold text-sm border-b-2 transition-all duration-200 ${
                mode === "edit"
                  ? "border-blue-600 text-blue-600 bg-blue-50/30"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Edit
            </button>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 max-h-[calc(100vh-300px)] sm:max-h-[70vh] overflow-y-auto">
            {mode === "details" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Location</p>
                    <p className="text-base sm:text-lg text-gray-900 font-medium break-words">{item.location || "Location pending"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Source</p>
                    <p className="text-base sm:text-lg text-gray-900 font-medium">{item.source}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</p>
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{item.details}</p>
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Title</label>
                  <input
                    value={editForm.title}
                    onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Meeting title"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Description</label>
                  <textarea
                    value={editForm.details}
                    onChange={(event) => setEditForm((current) => ({ ...current, details: event.target.value }))}
                    rows={5}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base"
                    placeholder="Meeting description"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Date</label>
                    <input
                      type="date"
                      value={editForm.meetingDate}
                      onChange={(event) => setEditForm((current) => ({ ...current, meetingDate: event.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Start Time</label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(event) => setEditForm((current) => ({ ...current, startTime: event.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">End Time</label>
                    <input
                      type="time"
                      value={editForm.endTime}
                      onChange={(event) => setEditForm((current) => ({ ...current, endTime: event.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Location</label>
                  <input
                    value={editForm.location}
                    onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Meeting location"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
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
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(startOfDay(new Date()));
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState("details");
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", details: "", meetingDate: "", startTime: "", endTime: "", location: "" });

  useEffect(() => {
    const timer = setTimeout(() => {
      setItems(getStaticData());
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const normalizedItems = useMemo(
    () => items.map((item) => ({ ...item, startDate: new Date(item.startsAt), endDate: new Date(item.endsAt) })),
    [items]
  );

  const monthCells = useMemo(() => {
    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const gridStart = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const dayItems = normalizedItems.filter((item) => isSameDay(item.startDate, date));
      return { date, items: dayItems };
    });
  }, [cursorDate, normalizedItems]);

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
    () => normalizedItems.filter((item) => item.startDate >= startOfDay(cursorDate) && item.startDate <= endOfDay(cursorDate)),
    [cursorDate, normalizedItems]
  );

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

  const shiftCursor = (direction) => {
    const next = new Date(cursorDate);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setDate(next.getDate() + direction);
    setCursorDate(startOfDay(next));
  };

  const saveEdit = () => {
    if (!selectedItem) return;
    setSaving(true);
    setError("");
    
    setTimeout(() => {
      const updatedItem = {
        ...selectedItem,
        title: editForm.title,
        details: editForm.details,
        startsAt: `${editForm.meetingDate}T${editForm.startTime}`,
        endsAt: `${editForm.meetingDate}T${editForm.endTime}`,
        location: editForm.location,
      };

      setItems((prevItems) => {
        return prevItems.map((item) =>
          item.id === selectedItem.id ? updatedItem : item
        );
      });

      openItem(updatedItem, "details");
      setSaving(false);
    }, 600);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => shiftCursor(-1)}
                className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="w-px h-6 bg-gray-200"></div>

              <button
                type="button"
                onClick={() => setCursorDate(startOfDay(new Date()))}
                className="px-4 py-2 text-sm font-semibold hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
              >
                Today
              </button>

              <div className="w-px h-6 bg-gray-200"></div>

              <select
                value={view}
                onChange={(e) => setView(e.target.value)}
                className="px-3 py-2 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors text-gray-700 appearance-none cursor-pointer bg-transparent"
              >
                {VIEW_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>

              <div className="w-px h-6 bg-gray-200"></div>

              <button
                type="button"
                onClick={() => shiftCursor(1)}
                className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-900">
            {view === "month"
              ? `${MONTHS[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`
              : view === "week"
              ? `Week of ${startOfWeek(cursorDate).toLocaleDateString()}`
              : cursorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Loading calendar…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
            
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {view === "month" && (
                <div>
                  <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    {DAYS.map((day) => (
                      <div key={day} className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-gray-600 text-center">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthCells.map((cell) => {
                      const inMonth = cell.date.getMonth() === cursorDate.getMonth();
                      const isToday = isSameDay(cell.date, new Date());
                      return (
                        <div
                          key={cell.date.toISOString()}
                          className={`min-h-[140px] p-3 border-r border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors ${
                            inMonth ? "bg-white" : "bg-gray-50"
                          }`}
                          onClick={() => setCursorDate(cell.date)}
                        >
                          <button
                            type="button"
                            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                              isToday
                                ? "bg-blue-600 text-white"
                                : inMonth
                                ? "text-gray-900 hover:bg-gray-100"
                                : "text-gray-400"
                            }`}
                          >
                            {cell.date.getDate()}
                          </button>
                          <div className="mt-2 space-y-1">
                            {cell.items.slice(0, 2).map((item) => (
                              <EventPill key={item.id} item={item} compact onClick={() => openItem(item)} />
                            ))}
                            {cell.items.length > 2 && (
                              <div className="text-[10px] px-2 py-1 text-blue-600 font-semibold">
                                +{cell.items.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === "week" && (
                <div>
                  <div className="grid grid-cols-7 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    {weekDays.map((day) => (
                      <div key={day.date.toISOString()} className="px-3 py-4 text-center border-r border-gray-200 last:border-r-0">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-600">{DAYS[day.date.getDay()]}</div>
                        <div
                          className={`mt-2 inline-flex w-10 h-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                            isSameDay(day.date, new Date())
                              ? "bg-blue-600 text-white"
                              : "text-gray-900 hover:bg-gray-100"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 min-h-[520px]">
                    {weekDays.map((day) => (
                      <div key={day.date.toISOString()} className="p-3 space-y-2 border-r border-gray-200 last:border-r-0">
                        {day.items.length === 0 ? (
                          <div className="text-xs text-gray-400 py-4">No meetings</div>
                        ) : (
                          day.items.map((item) => <EventPill key={item.id} item={item} onClick={() => openItem(item)} />)
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === "day" && (
                <div className="p-6 min-h-[520px]">
                  <div className="text-lg font-bold mb-6 text-gray-900">
                    {cursorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  </div>
                  <div className="space-y-3">
                    {dayItems.length === 0 ? (
                      <div className="text-gray-500 py-8 text-center">No meetings for this day.</div>
                    ) : (
                      dayItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openItem(item)}
                          className="w-full text-left rounded-xl p-4 border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${TYPE_STYLES[item.type] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                {item.type}
                              </div>
                              <div className="mt-2 font-bold text-gray-900">{item.title}</div>
                              <div className="text-xs text-gray-600 mt-1">{item.source} • {item.location || "Location pending"}</div>
                            </div>
                            <div className="text-xs text-gray-600 whitespace-nowrap">
                              {formatTime(item.startsAt)} - {formatTime(item.endsAt)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mt-3">{item.details}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-fit sticky top-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">Upcoming Meetings</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {[...normalizedItems]
                  .sort((a, b) => a.startDate - b.startDate)
                  .slice(0, 12)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCursorDate(startOfDay(item.startDate));
                        openItem(item);
                      }}
                      className="w-full text-left pb-3 border-b border-gray-200 last:border-b-0 hover:text-blue-600 transition-colors group"
                    >
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(item.startsAt).toLocaleDateString()} • {formatTime(item.startsAt)}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}