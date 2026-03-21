import { useState, useMemo } from "react";
import { Calendar, Clock, FileText, ImageIcon, CheckCircle2, Plus, X, ChevronLeft, ChevronRight, Search } from "lucide-react";

const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm";
const textAreaClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm";

// Static DEO Calendar Data
const getStaticDeoData = () => {
  return {
    events: [
      {
        _id: "evt1",
        title: "Cabinet Meeting - Infrastructure Discussion",
        eventType: "VIP Meeting",
        details: "Monthly cabinet meeting discussing state infrastructure development and road projects",
        scheduleAt: "2026-03-25T10:00:00",
        endAt: "2026-03-25T11:30:00",
        department: "PWD",
        mediaFolder: "/media/cabinet-2026",
        videoLink: "https://recordings.gov.in/cabinet-mar-2026",
        participationRole: "Chair",
        portfolio: "Both",
        attendanceStatus: "pending",
        classification: "Governance",
        productivityScore: 95,
        photos: [
          { name: "Photo 1", data: "blob:photo1" },
          { name: "Photo 2", data: "blob:photo2" }
        ],
        documents: [
          { name: "Agenda", data: "blob:agenda.pdf" }
        ]
      },
      {
        _id: "evt2",
        title: "District Development Conference - Educational Excellence",
        eventType: "Scheduled Meeting",
        details: "Conference on educational initiatives and improvement in district schools",
        scheduleAt: "2026-03-28T14:30:00",
        endAt: "2026-03-28T16:00:00",
        department: "Education",
        mediaFolder: "/media/district-edu-2026",
        videoLink: "https://recordings.gov.in/district-education",
        participationRole: "Speaker",
        portfolio: "Neither",
        attendanceStatus: "attended",
        classification: "Community Engagement",
        productivityScore: 78,
        photos: [
          { name: "Opening Ceremony", data: "blob:opening" }
        ],
        documents: []
      },
      {
        _id: "evt3",
        title: "Healthcare Sector Stakeholders Meet",
        eventType: "VIP Meeting",
        details: "Discussion with healthcare providers on improving public health services",
        scheduleAt: "2026-04-01T11:00:00",
        endAt: "2026-04-01T12:30:00",
        department: "Health",
        mediaFolder: "/media/health-2026",
        videoLink: "https://recordings.gov.in/health-stakeholders",
        participationRole: "Attendee",
        portfolio: "Neither",
        attendanceStatus: "pending",
        classification: "Policy Discussion",
        productivityScore: 65,
        photos: [
          { name: "Photo 1", data: "blob:health1" },
          { name: "Photo 2", data: "blob:health2" },
          { name: "Photo 3", data: "blob:health3" }
        ],
        documents: [
          { name: "Health Report", data: "blob:health-report.pdf" },
          { name: "Action Plan", data: "blob:action-plan.pdf" }
        ]
      },
      {
        _id: "evt4",
        title: "Cultural Heritage Preservation Initiative",
        eventType: "Invited Event",
        details: "Launching new cultural heritage conservation project across the state",
        scheduleAt: "2026-04-05T15:00:00",
        endAt: "2026-04-05T17:00:00",
        department: "Culture",
        mediaFolder: "/media/culture-2026",
        videoLink: "https://recordings.gov.in/culture-heritage",
        participationRole: "Chair",
        portfolio: "Culture",
        attendanceStatus: "pending",
        classification: "Cultural Event",
        productivityScore: 82,
        photos: [
          { name: "Heritage Site 1", data: "blob:heritage1" }
        ],
        documents: []
      },
      {
        _id: "evt5",
        title: "Tourism Promotion Campaign Launch",
        eventType: "Scheduled Meeting",
        details: "Nationwide tourism promotion campaign focusing on heritage tourism",
        scheduleAt: "2026-04-10T09:30:00",
        endAt: "2026-04-10T11:00:00",
        department: "Tourism",
        mediaFolder: "/media/tourism-2026",
        videoLink: "https://recordings.gov.in/tourism-campaign",
        participationRole: "Speaker",
        portfolio: "Tourism",
        attendanceStatus: "pending",
        classification: "Tourism",
        productivityScore: 71,
        photos: [
          { name: "Tourist Destination 1", data: "blob:tourism1" },
          { name: "Tourist Destination 2", data: "blob:tourism2" }
        ],
        documents: [
          { name: "Campaign Plan", data: "blob:campaign.pdf" }
        ]
      },
      {
        _id: "evt6",
        title: "Annual Budget Review Meeting",
        eventType: "VIP Meeting",
        details: "Review of annual budget allocation and financial planning for next fiscal year",
        scheduleAt: "2026-04-15T10:00:00",
        endAt: "2026-04-15T12:00:00",
        department: "Finance",
        mediaFolder: "/media/budget-2026",
        videoLink: "https://recordings.gov.in/budget-review",
        participationRole: "Chair",
        portfolio: "Both",
        attendanceStatus: "attended",
        classification: "Governance",
        productivityScore: 92,
        photos: [],
        documents: [
          { name: "Budget Summary", data: "blob:budget-summary.pdf" },
          { name: "Financial Reports", data: "blob:reports.pdf" }
        ]
      }
    ]
  };
};

function SuccessModal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-600 text-white text-3xl">
          ✓
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Success!</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default function DeoCalendarEvent() {
  const [staticData] = useState(getStaticDeoData());
  const [events, setEvents] = useState(staticData.events);
  const [error, setError] = useState("");
  const [eventSuccess, setEventSuccess] = useState({ open: false, title: "", message: "" });
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [form, setForm] = useState({
    title: "",
    details: "",
    eventType: "Invited Event",
    scheduleAt: "",
    endAt: "",
    mediaFolder: "",
    videoLink: "",
    department: "",
    participationRole: "Attendee",
    portfolio: "Neither",
  });
  const [photos, setPhotos] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Get unique departments
  const departments = ["all", ...new Set(staticData.events.map(e => e.department))];

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchSearch = searchQuery.trim() === "" || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.classification.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = filterStatus === "all" || event.attendanceStatus === filterStatus;
      const matchType = filterType === "all" || event.eventType === filterType;
      const matchDept = filterDept === "all" || event.department === filterDept;
      
      return matchSearch && matchStatus && matchType && matchDept;
    }).sort((a, b) => new Date(b.scheduleAt) - new Date(a.scheduleAt));
  }, [events, searchQuery, filterStatus, filterType, filterDept]);

  // Pagination logic
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const createEvent = (event) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Event title is required");
      return;
    }
    if (!form.scheduleAt) {
      setError("Schedule date and time is required");
      return;
    }

    try {
      const newEvent = {
        _id: `evt${Date.now()}`,
        ...form,
        attendanceStatus: "pending",
        classification: "New Event",
        productivityScore: 0,
        photos: photos.map((file, idx) => ({
          name: file.name,
          data: `blob:photo-${idx}`
        })),
        documents: documents.map((file, idx) => ({
          name: file.name,
          data: `blob:doc-${idx}`
        }))
      };

      setEvents((current) => [newEvent, ...current]);
      setEventSuccess({
        open: true,
        title: "Event Created",
        message: `${form.title} has been created and sent to the minister calendar.`,
      });

      setForm({
        title: "",
        details: "",
        eventType: "Invited Event",
        scheduleAt: "",
        endAt: "",
        mediaFolder: "",
        videoLink: "",
        department: "",
        participationRole: "Attendee",
        portfolio: "Neither",
      });
      setPhotos([]);
      setDocuments([]);
      setShowForm(false);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || "Failed to create event");
    }
  };

  const markAttended = (id) => {
    setEvents((current) =>
      current.map((event) =>
        event._id === id ? { ...event, attendanceStatus: "attended" } : event
      )
    );
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case "VIP Meeting":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Scheduled Meeting":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Invited Event":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const pendingCount = events.filter(e => e.attendanceStatus === "pending").length;
  const attendedCount = events.filter(e => e.attendanceStatus === "attended").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      <SuccessModal
        open={eventSuccess.open}
        title={eventSuccess.title}
        message={eventSuccess.message}
        onClose={() => setEventSuccess({ open: false, title: "", message: "" })}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold">DEO Calendar & Engagement</h1>
          <p className="text-blue-100 mt-2 max-w-2xl">
            Create and manage government events, meetings, and cultural initiatives. Track attendance and productivity metrics.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium uppercase">Total Events</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{events.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock size={24} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium uppercase">Pending Attendance</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium uppercase">Attended</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{attendedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Event Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors mb-8 cursor-pointer"
          >
            <Plus size={20} />
            Create New Event
          </button>
        )}

        {/* Create Event Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Register New Event</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Create an event entry that will be added to the DEO calendar and propagated to the minister calendar.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-200 mb-6">
                {error}
              </div>
            )}

            <form onSubmit={createEvent} className="space-y-6">
              {/* Row 1 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Cabinet Meeting"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                  <select
                    value={form.eventType}
                    onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                    className={inputClass}
                  >
                    <option>Invited Event</option>
                    <option>Scheduled Meeting</option>
                    <option>VIP Meeting</option>
                  </select>
                </div>
              </div>

              {/* Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Details</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="Describe the event..."
                  rows={4}
                  className={textAreaClass}
                />
              </div>

              {/* Row 2 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Start *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduleAt}
                    onChange={(e) => setForm({ ...form, scheduleAt: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schedule End</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g., PWD, Education"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Media Folder Reference</label>
                  <input
                    value={form.mediaFolder}
                    onChange={(e) => setForm({ ...form, mediaFolder: e.target.value })}
                    placeholder="/media/event-2026"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Video Link</label>
                  <input
                    value={form.videoLink}
                    onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
                    placeholder="https://recordings.gov.in/..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participation Role</label>
                  <select
                    value={form.participationRole}
                    onChange={(e) => setForm({ ...form, participationRole: e.target.value })}
                    className={inputClass}
                  >
                    <option>Chair</option>
                    <option>Speaker</option>
                    <option>Attendee</option>
                  </select>
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio</label>
                  <select
                    value={form.portfolio}
                    onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                    className={inputClass}
                  >
                    <option>Culture</option>
                    <option>Tourism</option>
                    <option>Both</option>
                    <option>Neither</option>
                  </select>
                </div>
              </div>

              {/* File Uploads */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photos</label>
                  <input
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  {photos.length > 0 && (
                    <p className="text-xs text-green-600 mt-2 font-medium">{photos.length} file(s) selected</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  {documents.length > 0 && (
                    <p className="text-xs text-green-600 mt-2 font-medium">{documents.length} file(s) selected</p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Events List */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">All Events</h2>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search events by title, department, or classification..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="attended">Attended</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => handleFilterChange(setFilterType, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="VIP Meeting">VIP Meeting</option>
                  <option value="Scheduled Meeting">Scheduled Meeting</option>
                  <option value="Invited Event">Invited Event</option>
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Department</label>
                <select
                  value={filterDept}
                  onChange={(e) => handleFilterChange(setFilterDept, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept === "all" ? "All Departments" : dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                    setFilterType("all");
                    setFilterDept("all");
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Results Info */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to{" "}
                <span className="font-semibold text-gray-900">{Math.min(startIndex + itemsPerPage, filteredEvents.length)}</span> of{" "}
                <span className="font-semibold text-gray-900">{filteredEvents.length}</span> events
              </span>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-gray-600">No events found. Try adjusting your filters or create a new event!</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 mb-6">
                {paginatedEvents.map((event) => (
                  <div key={event._id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Top row with type and status */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getEventTypeColor(event.eventType)}`}>
                            {event.eventType}
                          </span>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                              event.attendanceStatus === "attended"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-yellow-100 text-yellow-700 border-yellow-200"
                            }`}
                          >
                            {event.attendanceStatus === "attended" ? "✓ Attended" : "⏳ Pending"}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-gray-900 mb-3">{event.title}</h3>

                        {/* Details Grid */}
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-blue-600" />
                            <span>{new Date(event.scheduleAt).toLocaleDateString("en-IN")} {new Date(event.scheduleAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-600" />
                            <span>{event.department || "No department"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ImageIcon size={16} className="text-green-600" />
                            <span>{event.photos.length} photos · {event.documents.length} documents</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">Score: {event.productivityScore}</span>
                          </div>
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">Role: {event.participationRole}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">Portfolio: {event.portfolio}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">{event.classification}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {event.attendanceStatus !== "attended" && (
                        <button
                          onClick={() => markAttended(event._id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Mark Attended
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-semibold transition-colors cursor-pointer ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}