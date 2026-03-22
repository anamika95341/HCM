import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Clock, CheckCircle2, AlertCircle, FileText, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

function statusBadgeClass(status) {
    if (status === "scheduled") return "bg-emerald-100 text-emerald-700";
    if (status === "approved") return "bg-sky-100 text-sky-700";
    if (status === "verification_needed" || status === "under_review") return "bg-amber-100 text-amber-700";
    if (status === "resolved" || status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "rejected") return "bg-rose-100 text-rose-700";
    return "bg-slate-100 text-slate-700";
}

function getCitizenFacingStatus(item) {
    if (item?.itemType === "meeting" && ["verification_needed", "approved", "under_review"].includes(item.status)) {
        return { value: "under_review", label: "Under Review" };
    }
    return { value: item?.status || "", label: item?.statusLabel || "" };
}

// MOCK DATA - Static data for display
const MOCK_DATA = {
    meetings: [
        {
            _id: "meet_001",
            requestId: "REQ-2024-001",
            purpose: "Document Verification Appointment",
            status: "scheduled",
            statusLabel: "Scheduled",
            scheduleLocation: "Room 201, North Block",
            createdAt: "2024-01-15T10:30:00Z",
            updatedAt: "2024-01-18T14:22:00Z",
            department: "Revenue Department",
            referralAdminName: "Mr. Rajesh Kumar",
            assignedAdminName: "Ms. Priya Singh",
            currentOwner: "Ms. Priya Singh",
            adminNotes: "Document verification pending citizen availability",
            relatedComplaint: { complaintId: "COMP-2024-001" },
            meetingDocket: "DOC-2024-0001",
            visitorId: "VIS-2024-001",
            itemType: "meeting",
            primaryTitle: "Document Verification Appointment",
            primaryId: "REQ-2024-001",
        },
        {
            _id: "meet_002",
            requestId: "REQ-2024-002",
            purpose: "Property Tax Assessment",
            status: "approved",
            statusLabel: "Approved",
            scheduleLocation: "Municipal Office, Room 305",
            createdAt: "2024-01-10T09:15:00Z",
            updatedAt: "2024-01-17T11:45:00Z",
            department: "Municipal Corporation",
            referralAdminName: "Mr. Anil Sharma",
            currentOwner: "Mr. Anil Sharma",
            adminNotes: "Assessment scheduled for January 25, 2024",
            relatedComplaint: { complaintId: "COMP-2024-002" },
            meetingDocket: "DOC-2024-0002",
            visitorId: "VIS-2024-002",
            itemType: "meeting",
            primaryTitle: "Property Tax Assessment",
            primaryId: "REQ-2024-002",
        },
        {
            _id: "meet_003",
            requestId: "REQ-2024-003",
            purpose: "Birth Certificate Amendment",
            status: "under_review",
            statusLabel: "Under Review",
            scheduleLocation: "Civil Registration Office",
            createdAt: "2024-01-08T13:20:00Z",
            updatedAt: "2024-01-19T09:30:00Z",
            department: "Civil Registration",
            assignedAdminName: "Ms. Neha Gupta",
            currentOwner: "Ms. Neha Gupta",
            adminNotes: "Documents are being reviewed by senior officer",
            relatedComplaint: null,
            meetingDocket: "DOC-2024-0003",
            visitorId: "VIS-2024-003",
            itemType: "meeting",
            primaryTitle: "Birth Certificate Amendment",
            primaryId: "REQ-2024-003",
        },
    ],
    complaints: [
        {
            _id: "comp_001",
            complaintId: "COMP-2024-001",
            title: "Water Supply Issues in Sector 5",
            status: "under_review",
            statusLabel: "Under Review",
            department: "Water Supply Department",
            currentOwner: "Mr. Suresh Patel",
            createdAt: "2024-01-12T08:45:00Z",
            updatedAt: "2024-01-19T15:20:00Z",
            details: "Irregular water supply causing severe inconvenience to residents",
            callOutcome: "Complaint logged and forwarded to field team",
            resolutionSummary: "Field inspection scheduled for January 22",
            resolutionDocs: [{ name: "Inspection Report - Pending" }],
            relatedMeeting: { requestId: "REQ-2024-001" },
            itemType: "complaint",
            primaryTitle: "Water Supply Issues in Sector 5",
            primaryId: "COMP-2024-001",
        },
        {
            _id: "comp_002",
            complaintId: "COMP-2024-002",
            title: "Pothole on Main Street - Health Hazard",
            status: "resolved",
            statusLabel: "Resolved",
            department: "Public Works Department",
            currentOwner: "Mr. Vikram Singh",
            createdAt: "2024-01-05T10:15:00Z",
            updatedAt: "2024-01-19T12:00:00Z",
            details: "Large pothole on Main Street causing accidents and damage to vehicles",
            callOutcome: "Maintenance team dispatched and resolved",
            resolutionSummary: "Pothole has been filled and road is now safe for traffic",
            resolutionDocs: [
                { name: "Before-After Photos" },
                { name: "Work Completion Certificate" },
            ],
            relatedMeeting: { requestId: "REQ-2024-002" },
            itemType: "complaint",
            primaryTitle: "Pothole on Main Street - Health Hazard",
            primaryId: "COMP-2024-002",
        },
        {
            _id: "comp_003",
            complaintId: "COMP-2024-003",
            title: "Street Light Outage - Safety Concern",
            status: "scheduled",
            statusLabel: "Scheduled",
            department: "Street Light Division",
            currentOwner: "Ms. Anjali Reddy",
            createdAt: "2024-01-14T16:30:00Z",
            updatedAt: "2024-01-19T14:10:00Z",
            details: "Multiple street lights are not functional at night, creating safety issues",
            callOutcome: "Repair request created, scheduled for maintenance",
            resolutionSummary: "Maintenance scheduled for January 23, 2024",
            resolutionDocs: [{ name: "Service Request #SR-2024-0103" }],
            relatedMeeting: null,
            itemType: "complaint",
            primaryTitle: "Street Light Outage - Safety Concern",
            primaryId: "COMP-2024-003",
        },
        {
            _id: "comp_004",
            complaintId: "COMP-2024-004",
            title: "Noise Pollution - Nearby Construction",
            status: "rejected",
            statusLabel: "Rejected",
            department: "Environmental Department",
            currentOwner: "Mr. Rajesh Verma",
            createdAt: "2024-01-02T11:00:00Z",
            updatedAt: "2024-01-16T10:45:00Z",
            details: "Construction activity violating noise pollution regulations",
            callOutcome: "Rejected - Construction has proper authorization",
            resolutionSummary: "Construction has valid permits for timings. Complaint not valid.",
            resolutionDocs: [{ name: "Construction Permit Verification" }],
            rejectReason: "Authorization and permits verified",
            relatedMeeting: null,
            itemType: "complaint",
            primaryTitle: "Noise Pollution - Nearby Construction",
            primaryId: "COMP-2024-004",
        },
    ],
};

// const id = "meet_003"
export default function MyCases() {
    const navigate = useNavigate();
    const [data, setData] = useState({ meetings: [], complaints: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("all");
    const [filters, setFilters] = useState({ q: "", status: "all", type: "all" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Simulate loading static data
    useEffect(() => {
        setTimeout(() => {
            setData(MOCK_DATA);
            setLoading(false);
        }, 800);
    }, []);

    useEffect(() => {
        setFilters((current) => ({
            ...current,
            status: "all",
            type: tab === "all" ? "all" : tab,
        }));
        setCurrentPage(1);
    }, [tab]);

    const items = useMemo(() => {
        const combined = [
            ...data.meetings.map((item) => ({ ...item, itemType: "meeting", primaryTitle: item.purpose, primaryId: item.requestId })),
            ...data.complaints.map((item) => ({ ...item, itemType: "complaint", primaryTitle: item.title, primaryId: item.complaintId })),
        ].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

        return combined.filter((item) => {
            const tabOk = tab === "all" || item.itemType === tab;
            const typeOk = filters.type === "all" || item.itemType === filters.type;
            const citizenStatus = getCitizenFacingStatus(item);
            const statusOk = filters.status === "all" || citizenStatus.value === filters.status;
            const q = filters.q.trim().toLowerCase();
            const searchText = [
                item.primaryTitle,
                item.primaryId,
                citizenStatus.label,
                citizenStatus.value,
                item.currentOwner,
                item.department,
                item.relatedMeeting?.requestId,
                item.relatedComplaint?.complaintId,
                item.scheduleLocation,
                item.rejectReason,
                item.resolutionSummary,
                item.visitorId,
                item.meetingDocket,
            ].filter(Boolean).join(" ").toLowerCase();
            return tabOk && typeOk && statusOk && (!q || searchText.includes(q));
        });
    }, [data.complaints, data.meetings, filters, tab]);

    // Pagination
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const statusOptions = useMemo(() => {
        return Array.from(new Set([
            ...data.meetings.map((item) => getCitizenFacingStatus({ ...item, itemType: "meeting" }).value),
            ...data.complaints.map((item) => getCitizenFacingStatus({ ...item, itemType: "complaint" }).value),
        ])).filter(Boolean).sort();
    }, [data.complaints, data.meetings]);

    const totalItems = data.meetings.length + data.complaints.length;

    const getStatusIcon = (status) => {
        if (status === "resolved" || status === "completed") return <CheckCircle2 size={16} className="text-emerald-600" />;
        if (status === "rejected") return <AlertCircle size={16} className="text-rose-600" />;
        return <Clock size={16} className="text-amber-600" />;
    };

    return (
        // Replaced min-h-screen with h-screen and overflow-hidden to prevent whole page scrolling
        <div className="portal-page h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col overflow-hidden">
            <div className="portal-page-wrap max-w-[1320px] mx-auto w-full h-full flex flex-col">

                {/* --- FIXED TOP SECTION --- */}
                <div className="flex-shrink-0 space-y-5 pb-4">
                    {/* Header */}
                    <div className="portal-hero flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                                <FileText className="text-blue-600" size={32} />
                                My Cases & Complaints
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
                                Track your complaints, meeting escalations, resolution updates, and linked references in one place.
                            </p>
                        </div>
                        <div className="portal-panel bg-white dark:bg-slate-800 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Total requests:
                            </p>
                            <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="portal-panel flex gap-2 flex-wrap p-1 w-fit">
                        {[
                            ["all", `All (${totalItems})`],
                            ["complaint", `Complaints (${data.complaints.length})`],
                            ["meeting", `Meeting Escalations (${data.meetings.length})`],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setTab(value)}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${tab === value
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="portal-panel bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <div className="grid md:grid-cols-3 gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    value={filters.q}
                                    onChange={(event) => {
                                        setFilters((current) => ({ ...current, q: event.target.value }));
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Search ID, title, status, owner..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
                                <select
                                    value={filters.status}
                                    onChange={(event) => {
                                        setFilters((current) => ({ ...current, status: event.target.value }));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                >
                                    <option value="all">All statuses</option>
                                    {statusOptions.map((status) => (
                                        <option key={status} value={status}>
                                            {status.replace(/_/g, " ").charAt(0).toUpperCase() + status.replace(/_/g, " ").slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <select
                                value={filters.type}
                                onChange={(event) => {
                                    setFilters((current) => ({ ...current, type: event.target.value }));
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                            >
                                <option value="all">All record types</option>
                                <option value="meeting">Meetings</option>
                                <option value="complaint">Complaints</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- SCROLLABLE LIST SECTION --- */}
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar rounded-xl">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-600 dark:text-slate-400">Loading your cases...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-rose-700 dark:text-rose-200">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {items.length === 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-10 text-center">
                                    <FileText size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                                    <p className="text-slate-600 dark:text-slate-400 font-semibold">No cases found</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Try adjusting your filters</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                                        <table className="w-full text-sm">
                                            {/* Added sticky top-0 to thead so headers stay visible while scrolling the list */}
                                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-700/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm rounded-t-xl">
                                                <tr>
                                                    <th className="px-4 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide rounded-tl-xl">Case ID</th>
                                                    <th className="px-4 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Subject</th>
                                                    <th className="px-4 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Department</th>
                                                    <th className="px-4 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Status</th>
                                                    <th className="px-4 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Owner</th>
                                                    <th className="px-4 py-4 text-left font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Reference</th>
                                                    <th className="px-4 py-4 text-center font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide rounded-tr-xl">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {paginatedItems.map((item) => {
                                                    const citizenStatus = getCitizenFacingStatus(item);
                                                    const isMeeting = item.itemType === "meeting";
                                                    const secondaryLine = isMeeting
                                                        ? (item.scheduleLocation || item.adminNotes || "Awaiting admin update")
                                                        : (item.callOutcome || item.resolutionSummary || "Complaint under process");
                                                    const departmentLabel = isMeeting
                                                        ? (item.referralAdminName || item.assignedAdminName || "General Admin Pool")
                                                        : (item.department || "Complaint Desk");
                                                    const referenceLabel = isMeeting
                                                        ? (item.relatedComplaint?.complaintId || item.meetingDocket || "No linked record")
                                                        : (item.relatedMeeting?.requestId || "No linked record");

                                                    return (
                                                        <tr key={`${item.itemType}-${item._id}`} className="hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors">
                                                            <td className="px-4 py-4">
                                                                <span className="font-semibold text-slate-900 dark:text-white text-sm">{item.primaryId}</span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div>
                                                                    <p className="font-semibold text-slate-900 dark:text-white">{item.primaryTitle}</p>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{secondaryLine}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300 text-sm">{departmentLabel}</td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    {getStatusIcon(citizenStatus.value)}
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(citizenStatus.value)}`}>
                                                                        {citizenStatus.label}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300 text-sm">{item.currentOwner || "Pending"}</td>
                                                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300 text-sm">{referenceLabel}</td>
                                                            <td className="px-4 py-4 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/case/${item._id}`)}
                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                                    title="View details"
                                                                >
                                                                    <Eye size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="lg:hidden space-y-3 pb-2">
                                        {paginatedItems.map((item) => {
                                            const citizenStatus = getCitizenFacingStatus(item);
                                            const isMeeting = item.itemType === "meeting";
                                            const departmentLabel = isMeeting
                                                ? (item.referralAdminName || item.assignedAdminName || "General Admin Pool")
                                                : (item.department || "Complaint Desk");
                                            const referenceLabel = isMeeting
                                                ? (item.relatedComplaint?.complaintId || item.meetingDocket || "No linked record")
                                                : (item.relatedMeeting?.requestId || "No linked record");

                                            return (
                                                <div key={`${item.itemType}-${item._id}`} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex-1">
                                                            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{item.primaryId}</p>
                                                            <h3 className="font-bold text-slate-900 dark:text-white">{item.primaryTitle}</h3>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(citizenStatus.value)}
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(citizenStatus.value)}`}>
                                                                {citizenStatus.label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                                                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                                                            <p className="uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 font-semibold">Department</p>
                                                            <p className="text-slate-700 dark:text-slate-200 font-medium">{departmentLabel}</p>
                                                        </div>
                                                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                                                            <p className="uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 font-semibold">Owner</p>
                                                            <p className="text-slate-700 dark:text-slate-200 font-medium">{item.currentOwner || "Pending"}</p>
                                                        </div>
                                                        <div className="col-span-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                                                            <p className="uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 font-semibold">Reference</p>
                                                            <p className="text-slate-700 dark:text-slate-200 font-medium text-xs">{referenceLabel}</p>
                                                        </div>
                                                    </div>

                                                    {isMeeting && (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/meetings/${item.id}`)}
                                                            className="w-full px-3 py-2 rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500 font-semibold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <Eye size={16} /> View Details
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* --- FIXED BOTTOM PAGINATION --- */}
                {!loading && !error && items.length > 0 && (
                    <div className="flex-shrink-0 pt-4 mt-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                                    <span className="font-semibold">{Math.min(currentPage * itemsPerPage, items.length)}</span> of{" "}
                                    <span className="font-semibold">{items.length}</span> requests
                                </p>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} /> Previous
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg font-semibold text-sm transition-colors ${currentPage === page
                                                    ? "bg-blue-600 text-white shadow-md"
                                                    : "border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
      `}} />
        </div>
    );
}
