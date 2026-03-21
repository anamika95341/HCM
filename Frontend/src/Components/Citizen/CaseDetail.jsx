import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, FileText, User, MapPin, Calendar, DollarSign, Users, FileCheck } from "lucide-react";

function statusBadgeClass(status) {
  if (status === "scheduled") return "bg-emerald-100 text-emerald-700 border border-emerald-300";
  if (status === "approved") return "bg-sky-100 text-sky-700 border border-sky-300";
  if (status === "verification_needed" || status === "under_review") return "bg-amber-100 text-amber-700 border border-amber-300";
  if (status === "resolved" || status === "completed") return "bg-green-100 text-green-700 border border-green-300";
  if (status === "rejected") return "bg-red-100 text-red-700 border border-red-300";
  return "bg-slate-100 text-slate-700 border border-slate-300";
}

function getStatusIcon(status) {
  if (status === "resolved" || status === "completed") return <CheckCircle2 size={24} className="text-green-600" />;
  if (status === "rejected") return <AlertCircle size={24} className="text-red-600" />;
  return <Clock size={24} className="text-amber-600" />;
}

// COMPREHENSIVE MOCK DATA FOR ALL CASES
const MOCK_CASES = {
  meet_001: {
    _id: "meet_001",
    itemType: "meeting",
    primaryId: "REQ-2024-001",
    primaryTitle: "Document Verification Appointment",
    status: "scheduled",
    statusLabel: "Scheduled",
    purpose: "Document Verification Appointment",
    description: "A comprehensive appointment for document verification and validation of submitted documents for property registration. This meeting is scheduled to verify all submitted documents including identity proof, property deeds, and financial records.",
    scheduleLocation: "Room 201, North Block, Municipal Office",
    scheduleDate: "2024-01-25T10:00:00Z",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-18T14:22:00Z",
    department: "Revenue Department",
    referralAdminName: "Mr. Rajesh Kumar",
    assignedAdminName: "Ms. Priya Singh",
    currentOwner: "Ms. Priya Singh",
    adminNotes: "Document verification pending citizen availability. Meeting scheduled after citizen confirmed availability. All required documents have been uploaded and are under preliminary review.",
    documents: ["Passport", "Aadhar Card", "Property Deed", "Bank Statement", "Property Tax Receipt"],
    relatedComplaint: { complaintId: "COMP-2024-001" },
    meetingDocket: "DOC-2024-0001",
    visitorId: "VIS-2024-001",
  },
  meet_002: {
    _id: "meet_002",
    itemType: "meeting",
    primaryId: "REQ-2024-002",
    primaryTitle: "Property Tax Assessment",
    status: "approved",
    statusLabel: "Approved",
    purpose: "Property Tax Assessment",
    description: "Professional assessment of property value and tax calculation for municipal tax purposes. This includes site inspection, dimension verification, and calculation of municipal tax liability based on current rates and regulations.",
    scheduleLocation: "Municipal Office, Room 305, Civic Center",
    scheduleDate: "2024-01-25T14:00:00Z",
    createdAt: "2024-01-10T09:15:00Z",
    updatedAt: "2024-01-17T11:45:00Z",
    department: "Municipal Corporation",
    referralAdminName: "Mr. Anil Sharma",
    assignedAdminName: "Mr. Anil Sharma",
    currentOwner: "Mr. Anil Sharma",
    adminNotes: "Assessment scheduled for January 25, 2024. Property classification completed as Residential Category A. Tax assessment report ready for review.",
    documents: ["Property Certificate", "Tax Records", "Measurement Report", "Survey Map", "Approval Letter"],
    relatedComplaint: { complaintId: "COMP-2024-002" },
    meetingDocket: "DOC-2024-0002",
    visitorId: "VIS-2024-002",
  },
  meet_003: {
    _id: "meet_003",
    itemType: "meeting",
    primaryId: "REQ-2024-003",
    primaryTitle: "Birth Certificate Amendment",
    status: "under_review",
    statusLabel: "Under Review",
    purpose: "Birth Certificate Amendment",
    description: "Amendment request for birth certificate including name correction and other personal details. The request includes corrections for spelling variations and addition of parental information that was missing in the original registration.",
    scheduleLocation: "Civil Registration Office, Building A",
    scheduleDate: null,
    createdAt: "2024-01-08T13:20:00Z",
    updatedAt: "2024-01-19T09:30:00Z",
    department: "Civil Registration",
    referralAdminName: null,
    assignedAdminName: "Ms. Neha Gupta",
    currentOwner: "Ms. Neha Gupta",
    adminNotes: "Documents are being reviewed by senior officer. Affidavit from notary accepted. Gazette notice submitted for publication. Approval expected within 5 working days.",
    documents: ["Birth Certificate", "School Certificate", "Affidavit", "Gazette Notice", "Identity Proof", "Address Proof"],
    resolutionSummary: "Amendment request under processing. All supporting documents verified.",
    resolutionDocs: [{ name: "Notary Affidavit - Approved" }, { name: "Gazette Publication - Submitted" }],
    relatedComplaint: null,
    meetingDocket: "DOC-2024-0003",
    visitorId: "VIS-2024-003",
  },
  comp_001: {
    _id: "comp_001",
    itemType: "complaint",
    primaryId: "COMP-2024-001",
    primaryTitle: "Water Supply Issues in Sector 5",
    status: "under_review",
    statusLabel: "Under Review",
    title: "Water Supply Issues in Sector 5",
    description: "The water supply in Sector 5 has been irregular for the past two weeks. Residents are facing severe inconvenience due to the interrupted water supply affecting daily routines and hygiene practices. The supply has reduced from normal 24/7 service to sporadic 2-3 hour slots per day.",
    details: "Irregular water supply causing severe inconvenience to residents",
    department: "Water Supply Department",
    currentOwner: "Mr. Suresh Patel",
    createdAt: "2024-01-12T08:45:00Z",
    updatedAt: "2024-01-19T15:20:00Z",
    priority: "High",
    location: "Sector 5, Residential Area",
    affectedPeople: 450,
    callOutcome: "Complaint logged and forwarded to field team",
    resolutionSummary: "Field inspection scheduled for January 22. Preliminary assessment shows pipeline blockage in main supply line.",
    resolutionDocs: [{ name: "Inspection Report - Pending" }, { name: "Field Survey - In Progress" }],
    relatedMeeting: { requestId: "REQ-2024-001" },
    adminNotes: "High priority complaint. Citizens lack adequate water supply for 16+ hours daily.",
  },
  comp_002: {
    _id: "comp_002",
    itemType: "complaint",
    primaryId: "COMP-2024-002",
    primaryTitle: "Pothole on Main Street - Health Hazard",
    status: "resolved",
    statusLabel: "Resolved",
    title: "Pothole on Main Street - Health Hazard",
    description: "A large pothole measuring approximately 2 meters in diameter was present on Main Street near the market area. This caused accidents, vehicle damage, and posed a safety hazard to commuters. The issue has been successfully resolved with complete road restoration.",
    details: "Large pothole on Main Street causing accidents and damage to vehicles",
    department: "Public Works Department",
    currentOwner: "Mr. Vikram Singh",
    createdAt: "2024-01-05T10:15:00Z",
    updatedAt: "2024-01-19T12:00:00Z",
    priority: "Critical",
    location: "Main Street, Market Area, Near Bus Stand",
    affectedPeople: 2000,
    callOutcome: "Maintenance team dispatched and resolved",
    resolutionSummary: "Pothole has been filled and road is now safe for traffic. Complete road patch applied with premium bitumen. Quality check completed.",
    resolutionDocs: [
      { name: "Before-After Photos" },
      { name: "Work Completion Certificate" },
      { name: "Quality Assurance Report" }
    ],
    relatedMeeting: { requestId: "REQ-2024-002" },
    adminNotes: "Critical issue resolved successfully. Road safety restored.",
  },
  comp_003: {
    _id: "comp_003",
    itemType: "complaint",
    primaryId: "COMP-2024-003",
    primaryTitle: "Street Light Outage - Safety Concern",
    status: "scheduled",
    statusLabel: "Scheduled",
    title: "Street Light Outage - Safety Concern",
    description: "Multiple street lights in the residential colony have stopped functioning, creating a safety concern for residents, especially during evening hours. The outage affects approximately 15 light poles along Colony Road creating a dark and potentially unsafe environment.",
    details: "Multiple street lights are not functional at night, creating safety issues",
    department: "Street Light Division",
    currentOwner: "Ms. Anjali Reddy",
    createdAt: "2024-01-14T16:30:00Z",
    updatedAt: "2024-01-19T14:10:00Z",
    priority: "High",
    location: "Colony Road, Residential Area, stretching 500 meters",
    affectedPeople: 800,
    callOutcome: "Repair request created, scheduled for maintenance",
    resolutionSummary: "Maintenance scheduled for January 23, 2024. Electrical engineer and team assigned.",
    resolutionDocs: [{ name: "Service Request #SR-2024-0103" }, { name: "Maintenance Schedule" }],
    relatedMeeting: null,
    adminNotes: "Safety concern acknowledged. Repair team will inspect wiring and replace faulty lights.",
  },
  comp_004: {
    _id: "comp_004",
    itemType: "complaint",
    primaryId: "COMP-2024-004",
    primaryTitle: "Noise Pollution - Nearby Construction",
    status: "rejected",
    statusLabel: "Rejected",
    title: "Noise Pollution - Nearby Construction",
    description: "Complaint was filed regarding construction activities causing noise pollution beyond permissible hours. However, upon investigation, the construction company was found to have proper authorization and permits for the specified timings.",
    details: "Construction activity violating noise pollution regulations",
    department: "Environmental Department",
    currentOwner: "Mr. Rajesh Verma",
    createdAt: "2024-01-02T11:00:00Z",
    updatedAt: "2024-01-16T10:45:00Z",
    priority: "Medium",
    location: "Construction Site, Industrial Area, Phase 2",
    affectedPeople: 300,
    callOutcome: "Rejected - Construction has proper authorization",
    resolutionSummary: "Construction has valid permits for timings. Complaint not valid. Work is within approved schedule.",
    resolutionDocs: [
      { name: "Construction Permit Verification" },
      { name: "Municipal Approval Letter" },
      { name: "Working Hours Authorization" }
    ],
    rejectReason: "Authorization and permits verified. Construction activities are within authorized time frame (7 AM to 6 PM).",
    relatedMeeting: null,
    adminNotes: "Proper documentation submitted. Construction is legal and authorized.",
  },
};

export default function CaseDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathId = location.pathname.split("/").pop();
  let caseData = location.state?.caseData || MOCK_CASES[pathId];

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center">
            <p className="text-slate-600 dark:text-slate-400 font-semibold mb-4">Case details not found</p>
            <button
              onClick={() => navigate("/cases")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Cases
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMeeting = caseData.itemType === "meeting";
  const statusColor = statusBadgeClass(caseData.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft size={18} /> Back
        </button>

        {/* Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="text-blue-600" size={32} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{caseData.itemType === "meeting" ? "Meeting Request" : "Complaint"}</p>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{caseData.primaryId}</h1>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-lg mb-3">{caseData.primaryTitle}</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusIcon(caseData.status)}
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${statusColor}`}>
                {caseData.statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Description</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{caseData.description || "No description available"}</p>
            </div>

            {/* Details Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <User size={18} className="text-blue-600" />
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Owner/Holder</p>
                </div>
                <p className="text-slate-900 dark:text-white font-medium">{caseData.currentOwner || "Pending"}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck size={18} className="text-blue-600" />
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Department</p>
                </div>
                <p className="text-slate-900 dark:text-white font-medium">{caseData.department || (caseData.referralAdminName || caseData.assignedAdminName) || "N/A"}</p>
              </div>

              {isMeeting && caseData.scheduleLocation && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={18} className="text-blue-600" />
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Location</p>
                  </div>
                  <p className="text-slate-900 dark:text-white font-medium">{caseData.scheduleLocation}</p>
                </div>
              )}

              {isMeeting && caseData.scheduleDate && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={18} className="text-blue-600" />
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Scheduled Date</p>
                  </div>
                  <p className="text-slate-900 dark:text-white font-medium">{new Date(caseData.scheduleDate).toLocaleDateString()}</p>
                </div>
              )}

              {!isMeeting && caseData.priority && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={18} className="text-blue-600" />
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Priority</p>
                  </div>
                  <p className={`font-medium ${
                    caseData.priority === "Critical" ? "text-red-600" : 
                    caseData.priority === "High" ? "text-amber-600" : 
                    "text-green-600"
                  }`}>{caseData.priority}</p>
                </div>
              )}

              {!isMeeting && caseData.affectedPeople && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={18} className="text-blue-600" />
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Affected People</p>
                  </div>
                  <p className="text-slate-900 dark:text-white font-medium">{caseData.affectedPeople.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Documents/Items */}
            {caseData.documents && caseData.documents.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Required Documents</h3>
                <div className="space-y-2">
                  {caseData.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <FileCheck size={18} className="text-blue-600" />
                      <span className="text-slate-700 dark:text-slate-300">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Info */}
            {caseData.resolutionSummary && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Resolution Status</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-3">{caseData.resolutionSummary}</p>
                {caseData.resolutionDocs && caseData.resolutionDocs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Resolution Documents:</p>
                    <ul className="space-y-2">
                      {caseData.resolutionDocs.map((doc, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <FileCheck size={16} className="text-green-600" />
                          {doc.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Timeline</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Created</p>
                  <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{new Date(caseData.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(caseData.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Last Updated</p>
                  <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{new Date(caseData.updatedAt).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(caseData.updatedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Additional Info</h3>
              <div className="space-y-3 text-sm">
                {isMeeting ? (
                  <>
                    {caseData.meetingDocket && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Docket</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{caseData.meetingDocket}</p>
                      </div>
                    )}
                    {caseData.visitorId && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Visitor ID</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{caseData.visitorId}</p>
                      </div>
                    )}
                    {caseData.relatedComplaint && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Related Complaint</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{caseData.relatedComplaint.complaintId}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {caseData.location && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Location</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{caseData.location}</p>
                      </div>
                    )}
                    {caseData.rejectReason && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Rejection Reason</p>
                        <p className="text-red-600 dark:text-red-400 font-medium mt-1">{caseData.rejectReason}</p>
                      </div>
                    )}
                    {caseData.relatedMeeting && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Related Meeting</p>
                        <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{caseData.relatedMeeting.requestId}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Admin Notes */}
            {caseData.adminNotes && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">Admin Notes</h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">{caseData.adminNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}