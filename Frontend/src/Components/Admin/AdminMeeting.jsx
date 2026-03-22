import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Filter, Calendar, MapPin, Phone, User, Clock } from "lucide-react";

const getStaticMeetings = () => {
  return [
    {
      _id: "m1",
      requestId: "MREQ-000050",
      purpose: "Follow-up meeting for water supply issue",
      status: "scheduled",
      statusLabel: "Scheduled",
      priority: "normal",
      scheduleDate: "2026-03-25",
      scheduleTime: "10:00 AM",
      scheduleLocation: "Water Supply Department, 2nd Floor",
      visitorId: "VIS-001234",
      meetingDocket: "DOC-2026-0501",
      currentOwner: "Raj Kumar",
      citizenSnapshot: {
        name: "Raj Kumar",
        citizenId: "CTZ-HP-000001",
        phoneNumbers: ["9876543210"]
      },
      assignedAdminName: "Rakesh Singh",
      referralAdminName: "Admin Pool",
      relatedComplaint: {
        complaintId: "COMP-000201",
        title: "Water supply interruption in residential area"
      },
      adminNotes: "Meeting scheduled after successful complaint resolution. Citizen to be briefed on water supply schedule.",
      createdAt: "2026-02-20T10:30:00Z",
      updatedAt: "2026-03-15T14:20:00Z",
      masterTimeline: [
        {
          _id: "t1",
          action: "Meeting Scheduled",
          createdAt: "2026-03-15T14:20:00Z",
          sourceLabel: "System",
          createdByName: "Admin",
          notes: "Meeting scheduled for 25 March 2026 at Water Supply Department"
        },
        {
          _id: "t2",
          action: "Request Approved",
          createdAt: "2026-02-25T11:45:00Z",
          sourceLabel: "Admin",
          createdByName: "Rakesh Singh",
          notes: "Meeting request approved by department"
        },
        {
          _id: "t3",
          action: "Request Submitted",
          createdAt: "2026-02-20T10:30:00Z",
          sourceLabel: "Citizen",
          createdByName: "Raj Kumar",
          notes: "Citizen submitted meeting request"
        }
      ]
    },
    {
      _id: "m2",
      requestId: "MREQ-000051",
      purpose: "Complaint regarding road maintenance and pothole repair",
      status: "approved",
      statusLabel: "Under Review",
      priority: "high",
      scheduleDate: null,
      scheduleTime: null,
      scheduleLocation: null,
      visitorId: null,
      meetingDocket: null,
      currentOwner: "Priya Verma",
      citizenSnapshot: {
        name: "Priya Verma",
        citizenId: "CTZ-HP-000002",
        phoneNumbers: ["9876543211"]
      },
      assignedAdminName: "Divya Sharma",
      referralAdminName: "Roads Department",
      relatedComplaint: {
        complaintId: "COMP-000202",
        title: "Multiple potholes affecting road safety"
      },
      adminNotes: "Request under verification by Roads department. Pending scheduling confirmation.",
      createdAt: "2026-02-22T09:15:00Z",
      updatedAt: "2026-03-10T16:30:00Z",
      masterTimeline: [
        {
          _id: "t1",
          action: "Request Approved",
          createdAt: "2026-03-10T16:30:00Z",
          sourceLabel: "Admin",
          createdByName: "Divya Sharma",
          notes: "Request approved and sent for verification"
        },
        {
          _id: "t2",
          action: "Request Submitted",
          createdAt: "2026-02-22T09:15:00Z",
          sourceLabel: "Citizen",
          createdByName: "Priya Verma",
          notes: "Citizen submitted meeting request"
        }
      ]
    },
    {
      _id: "m3",
      requestId: "MREQ-000052",
      purpose: "VIP Meeting - Government welfare scheme discussion",
      status: "scheduled",
      statusLabel: "Scheduled",
      priority: "VIP",
      scheduleDate: "2026-03-28",
      scheduleTime: "02:00 PM",
      scheduleLocation: "Chief Minister's Office, Ground Floor",
      visitorId: "VIS-001235",
      meetingDocket: "DOC-2026-0502",
      currentOwner: "Vikram Singh",
      citizenSnapshot: {
        name: "Vikram Singh",
        citizenId: "CTZ-HP-000003",
        phoneNumbers: ["9876543212"]
      },
      assignedAdminName: "Sanjeev Kumar",
      referralAdminName: "VIP Cell",
      relatedComplaint: null,
      adminNotes: "VIP meeting scheduled with proper protocol. Security briefing completed.",
      createdAt: "2026-02-18T14:00:00Z",
      updatedAt: "2026-03-12T10:15:00Z",
      masterTimeline: [
        {
          _id: "t1",
          action: "VIP Meeting Scheduled",
          createdAt: "2026-03-12T10:15:00Z",
          sourceLabel: "System",
          createdByName: "Admin",
          notes: "VIP meeting scheduled with security protocols"
        },
        {
          _id: "t2",
          action: "Request Approved",
          createdAt: "2026-02-20T13:45:00Z",
          sourceLabel: "Admin",
          createdByName: "Sanjeev Kumar",
          notes: "VIP meeting request approved"
        }
      ]
    },
    {
      _id: "m4",
      requestId: "MREQ-000053",
      purpose: "Educational initiative feedback and community engagement",
      status: "submitted",
      statusLabel: "Pending",
      priority: "normal",
      scheduleDate: null,
      scheduleTime: null,
      scheduleLocation: null,
      visitorId: null,
      meetingDocket: null,
      currentOwner: "Anjali Patel",
      citizenSnapshot: {
        name: "Anjali Patel",
        citizenId: "CTZ-HP-000004",
        phoneNumbers: ["9876543213"]
      },
      assignedAdminName: null,
      referralAdminName: "Education Department",
      relatedComplaint: null,
      adminNotes: "Awaiting admin assignment. Request is valid and complete.",
      createdAt: "2026-03-15T11:20:00Z",
      updatedAt: "2026-03-15T11:20:00Z",
      masterTimeline: [
        {
          _id: "t1",
          action: "Request Submitted",
          createdAt: "2026-03-15T11:20:00Z",
          sourceLabel: "Citizen",
          createdByName: "Anjali Patel",
          notes: "Citizen submitted meeting request"
        }
      ]
    },
    {
      _id: "m5",
      requestId: "MREQ-000054",
      purpose: "Business license renewal discussion",
      status: "rejected",
      statusLabel: "Rejected",
      priority: "normal",
      scheduleDate: null,
      scheduleTime: null,
      scheduleLocation: null,
      visitorId: null,
      meetingDocket: null,
      currentOwner: "Rajesh Kumar",
      citizenSnapshot: {
        name: "Rajesh Kumar",
        citizenId: "CTZ-HP-000005",
        phoneNumbers: ["9876543214"]
      },
      assignedAdminName: null,
      referralAdminName: "Commerce Department",
      rejectReason: "Request does not fall under meeting jurisdiction. Citizen advised to contact Commerce Department directly.",
      adminNotes: "Request rejected due to scope mismatch.",
      createdAt: "2026-03-10T09:30:00Z",
      updatedAt: "2026-03-14T15:45:00Z",
      masterTimeline: [
        {
          _id: "t1",
          action: "Request Rejected",
          createdAt: "2026-03-14T15:45:00Z",
          sourceLabel: "Admin",
          createdByName: "Commerce Dept",
          notes: "Request rejected - out of scope"
        }
      ]
    },
    {
      _id: "m6",
      requestId: "MREQ-000055",
      purpose: "Healthcare service quality improvement meeting",
      status: "verification_needed",
      statusLabel: "Under Review",
      priority: "high",
      scheduleDate: null,
      scheduleTime: null,
      scheduleLocation: null,
      visitorId: null,
      meetingDocket: null,
      currentOwner: "Dr. Meena Singh",
      citizenSnapshot: {
        name: "Dr. Meena Singh",
        citizenId: "CTZ-HP-000006",
        phoneNumbers: ["9876543215"]
      },
      assignedAdminName: "Health Officer",
      referralAdminName: "Health Department",
      adminNotes: "Verification pending with Health Department. High priority case.",
      createdAt: "2026-03-12T13:15:00Z",
      updatedAt: "2026-03-16T10:00:00Z",
      masterTimeline: [
        {
          _id: "t1",
          action: "Verification Initiated",
          createdAt: "2026-03-16T10:00:00Z",
          sourceLabel: "System",
          createdByName: "Admin",
          notes: "Request sent for verification"
        },
        {
          _id: "t2",
          action: "Request Approved",
          createdAt: "2026-03-14T08:30:00Z",
          sourceLabel: "Admin",
          createdByName: "Health Officer",
          notes: "Request approved by Health Department"
        }
      ]
    }
  ];
};

function getStatusColor(status) {
  switch(status) {
    case "scheduled": return "bg-green-100 text-green-700 border-green-200";
    case "approved": return "bg-blue-100 text-blue-700 border-blue-200";
    case "verification_needed": return "bg-amber-100 text-amber-700 border-amber-200";
    case "submitted": return "bg-gray-100 text-gray-700 border-gray-200";
    case "rejected": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getPriorityColor(priority) {
  switch(priority) {
    case "VIP": return "bg-purple-100 text-purple-700 border-purple-200";
    case "high": return "bg-orange-100 text-orange-700 border-orange-200";
    case "normal": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function SuccessModal({ open, message, onClose }) {
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

export default function AdminMeeting() {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [allMeetings] = useState(getStaticMeetings());
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const itemsPerPage = 6;

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    return allMeetings.filter((meeting) => {
      const matchesSearch = searchQuery.trim() === "" || 
        meeting.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.citizenSnapshot?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.assignedAdminName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || meeting.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || 
        (priorityFilter === "VIP" && meeting.priority === "VIP") ||
        (priorityFilter === "high" && meeting.priority === "high") ||
        (priorityFilter === "normal" && meeting.priority === "normal");

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchQuery, statusFilter, priorityFilter, allMeetings]);

  // Pagination
  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);
  const paginatedMeetings = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredMeetings.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredMeetings, currentPage]);

  // Selected meeting details
  const selectedMeeting = meetingId 
    ? allMeetings.find((m) => m._id === meetingId) 
    : null;

  if (selectedMeeting) {
    return (
      <div className="portal-page min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
        {/* Header */}
        <div className="portal-hero bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="portal-page-wrap max-w-6xl mx-auto px-6 py-2">
            <button
              type="button"
              onClick={() => navigate("/meetings")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity mb-6"
            >
              <ChevronLeft size={24} />
              <span className="font-semibold">Back to Meetings</span>
            </button>
            <div>
              <div className="text-sm font-semibold uppercase" style={{ color: "var(--portal-text-muted)" }}>{selectedMeeting.requestId}</div>
              <h1 className="text-4xl font-bold mt-2">{selectedMeeting.purpose}</h1>
              <p className="portal-hero-subtitle mt-2">Meeting details and status information</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="portal-page-wrap max-w-6xl mx-auto px-6 py-2">
          {/* Status Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <p className="text-xs text-gray-500 font-medium uppercase">Status</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(selectedMeeting.status)}`}>
                {selectedMeeting.statusLabel}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <p className="text-xs text-gray-500 font-medium uppercase">Priority</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold border ${getPriorityColor(selectedMeeting.priority)}`}>
                {selectedMeeting.priority === "VIP" ? "VIP" : selectedMeeting.priority.charAt(0).toUpperCase() + selectedMeeting.priority.slice(1)}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <p className="text-xs text-gray-500 font-medium uppercase">Citizen</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{selectedMeeting.citizenSnapshot?.name}</p>
              <p className="text-xs text-gray-600 mt-1">{selectedMeeting.citizenSnapshot?.phoneNumbers?.[0]}</p>
            </div>
          </div>

          {/* Meeting Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Meeting Information</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-2">Admin Assigned</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedMeeting.assignedAdminName || "Not assigned"}</p>
                  <p className="text-sm text-gray-600 mt-1">Referral: {selectedMeeting.referralAdminName}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-2">Current Owner</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedMeeting.currentOwner}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-2">Visitor ID</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedMeeting.visitorId || "Pending"}</p>
                  <p className="text-sm text-gray-600 mt-1">Docket: {selectedMeeting.meetingDocket || "Pending"}</p>
                </div>
              </div>

              <div className="space-y-6">
                {selectedMeeting.scheduleDate && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase mb-2 flex items-center gap-2">
                      <Calendar size={16} /> Scheduled Date
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{selectedMeeting.scheduleDate}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedMeeting.scheduleTime}</p>
                  </div>
                )}

                {selectedMeeting.scheduleLocation && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase mb-2 flex items-center gap-2">
                      <MapPin size={16} /> Location
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{selectedMeeting.scheduleLocation}</p>
                  </div>
                )}

                {selectedMeeting.relatedComplaint && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase mb-2">Related Complaint</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedMeeting.relatedComplaint.complaintId}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedMeeting.relatedComplaint.title}</p>
                  </div>
                )}
              </div>
            </div>

            {selectedMeeting.adminNotes && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 font-medium uppercase mb-2">Admin Notes</p>
                <p className="text-sm text-gray-700">{selectedMeeting.adminNotes}</p>
              </div>
            )}

            {selectedMeeting.rejectReason && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 font-medium uppercase mb-2">Rejection Reason</p>
                <p className="text-sm text-gray-700">{selectedMeeting.rejectReason}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Activity Timeline</h2>
            
            <div className="space-y-4">
              {selectedMeeting.masterTimeline.map((event, idx) => (
                <div key={event._id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                    {idx !== selectedMeeting.masterTimeline.length - 1 && <div className="w-0.5 h-12 bg-gray-200 mt-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{event.action}</p>
                          <p className="text-xs text-gray-600 mt-1">{event.sourceLabel} · {event.createdByName}</p>
                        </div>
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(event.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      {event.notes && (
                        <p className="text-sm text-gray-700 mt-2">{event.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      <SuccessModal open={!!successMessage} message={successMessage} onClose={() => setSuccessMessage("")} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold">Meetings</h1>
          <p className="text-blue-100 mt-2">Track and manage all meeting requests</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by ID, purpose, name..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                List
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-3 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="approved">Approved</option>
              <option value="verification_needed">Verification Needed</option>
              <option value="submitted">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="all">All Priority</option>
              <option value="VIP">VIP</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>

            <div className="text-right">
              <p className="text-sm text-gray-600">
                Showing <span className="font-bold">{paginatedMeetings.length}</span> of <span className="font-bold">{filteredMeetings.length}</span> meetings
              </p>
            </div>
          </div>
        </div>

        {/* Meetings Grid */}
        {paginatedMeetings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-gray-600">No meetings found matching your filters.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedMeetings.map((meeting) => (
              <div
                key={meeting._id}
                onClick={() => navigate(`/meetings/${meeting._id}`)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer p-6"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase">{meeting.requestId}</p>
                    <h3 className="text-sm font-bold text-gray-900 mt-1 line-clamp-2">{meeting.purpose}</h3>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border whitespace-nowrap ${getStatusColor(meeting.status)}`}>
                    {meeting.statusLabel}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={16} />
                    <span>{meeting.citizenSnapshot?.name}</span>
                  </div>
                  {meeting.scheduleDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={16} />
                      <span>{meeting.scheduleDate}</span>
                    </div>
                  )}
                  {meeting.scheduleLocation && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} />
                      <span className="line-clamp-1">{meeting.scheduleLocation}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(meeting.priority)}`}>
                    {meeting.priority === "VIP" ? "VIP" : meeting.priority.charAt(0).toUpperCase() + meeting.priority.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(meeting.updatedAt || meeting.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Citizen</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedMeetings.map((meeting) => (
                    <tr key={meeting._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">{meeting.requestId}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{meeting.purpose}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{meeting.citizenSnapshot?.name}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(meeting.status)}`}>
                          {meeting.statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(meeting.priority)}`}>
                          {meeting.priority === "VIP" ? "VIP" : meeting.priority.charAt(0).toUpperCase() + meeting.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {new Date(meeting.updatedAt || meeting.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => navigate(`/meetings/${meeting._id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
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
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
