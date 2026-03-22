import { useEffect, useMemo, useState } from "react";
import { Eye, X, ChevronLeft, ChevronRight } from "lucide-react";

// Static dummy data
const getStaticData = () => {
  return {
    complaints: [
      { _id: "1", complaintId: "COMP-000101", title: "Pothole on Main Street", citizenSnapshot: { name: "Raj Kumar", citizenId: "CTZ-HP-000001", phoneNumbers: ["9876543210"] }, createdAt: "2026-02-20", status: "submitted", statusLabel: "Pooled", priority: "normal" },
      { _id: "2", complaintId: "COMP-000102", title: "Street light not working", citizenSnapshot: { name: "Priya Sharma", citizenId: "CTZ-HP-000002", phoneNumbers: ["9876543211"] }, createdAt: "2026-02-19", status: "submitted", statusLabel: "Pooled", priority: "normal" },
      { _id: "3", complaintId: "COMP-000103", title: "Water supply issue in area", citizenSnapshot: { name: "Arjun Singh", citizenId: "CTZ-HP-000003", phoneNumbers: ["9876543212"] }, createdAt: "2026-02-18", status: "submitted", statusLabel: "Pooled", priority: "VIP" },
      { _id: "4", complaintId: "COMP-000104", title: "Garbage collection delayed", citizenSnapshot: { name: "Divya Hegde", citizenId: "CTZ-HP-000004", phoneNumbers: ["9876543213"] }, createdAt: "2026-02-17", status: "assigned", statusLabel: "Assigned", priority: "normal" },
      { _id: "5", complaintId: "COMP-000105", title: "Park maintenance required", citizenSnapshot: { name: "Karthik Raman", citizenId: "CTZ-HP-000005", phoneNumbers: ["9876543214"] }, createdAt: "2026-02-16", status: "in_progress", statusLabel: "In Progress", priority: "normal" },
      { _id: "6", complaintId: "COMP-000106", title: "Noise pollution complaint", citizenSnapshot: { name: "Tania Dutta", citizenId: "CTZ-HP-000006", phoneNumbers: ["9876543215"] }, createdAt: "2026-02-15", status: "submitted", statusLabel: "Pooled", priority: "normal" },
      { _id: "7", complaintId: "COMP-000107", title: "Road damage report", citizenSnapshot: { name: "Naveen Yadav", citizenId: "CTZ-HP-000007", phoneNumbers: ["9876543216"] }, createdAt: "2026-02-14", status: "under_review", statusLabel: "Under Review", priority: "normal" },
      { _id: "8", complaintId: "COMP-000108", title: "Drainage system blocked", citizenSnapshot: { name: "Abhishek Ekka", citizenId: "CTZ-HP-000008", phoneNumbers: ["9876543217"] }, createdAt: "2026-02-13", status: "submitted", statusLabel: "Pooled", priority: "normal" },
      { _id: "9", complaintId: "COMP-000109", title: "Public facility repair", citizenSnapshot: { name: "Sanjay Patel", citizenId: "CTZ-HP-000009", phoneNumbers: ["9876543218"] }, createdAt: "2026-02-12", status: "assigned", statusLabel: "Assigned", priority: "normal" },
      { _id: "10", complaintId: "COMP-000110", title: "Traffic signal malfunction", citizenSnapshot: { name: "Meera Nair", citizenId: "CTZ-HP-000010", phoneNumbers: ["9876543219"] }, createdAt: "2026-02-11", status: "submitted", statusLabel: "Pooled", priority: "normal" },
    ],
    meetingRequests: [
      { _id: "m1", requestId: "MREQ-000033", purpose: "Citizen delegation meeting for scholarship review", citizenSnapshot: { name: "Karthik Raman", citizenId: "CTZ-HP-000017", phoneNumbers: ["9876543234"] }, createdAt: "2026-02-27", status: "submitted", statusLabel: "DEO verification", priority: "normal", isMeeting: true },
      { _id: "m2", requestId: "MREQ-000031", purpose: "Follow-up on pending scholarship applications", citizenSnapshot: { name: "Divya Hegde", citizenId: "CTZ-HP-000016", phoneNumbers: ["9876543233"] }, createdAt: "2026-02-28", status: "submitted", statusLabel: "Admin review", priority: "normal", isMeeting: true },
      { _id: "m3", requestId: "MREQ-000034", purpose: "Escalated hearing for scholarship disputes", citizenSnapshot: { name: "Karthik Raman", citizenId: "CTZ-HP-000017", phoneNumbers: ["9876543234"] }, createdAt: "2026-02-26", status: "submitted", statusLabel: "Assigned", priority: "normal", isMeeting: true },
      { _id: "m4", requestId: "MREQ-000032", purpose: "Citizen delegation meeting for grievance redressal", citizenSnapshot: { name: "Divya Hegde", citizenId: "CTZ-HP-000016", phoneNumbers: ["9876543233"] }, createdAt: "2026-02-27", status: "submitted", statusLabel: "Pending", priority: "normal", isMeeting: true },
      { _id: "m5", requestId: "MREQ-000023", purpose: "Representation on delayed bus service", citizenSnapshot: { name: "Tania Dutta", citizenId: "CTZ-HP-000012", phoneNumbers: ["9876543229"] }, createdAt: "2026-04-03", status: "submitted", statusLabel: "DEO verification", priority: "VIP", isMeeting: true },
      { _id: "m6", requestId: "MREQ-000021", purpose: "Citizen delegation for infrastructure issues", citizenSnapshot: { name: "Abhishek Ekka", citizenId: "CTZ-HP-000011", phoneNumbers: ["9876543228"] }, createdAt: "2026-05-03", status: "submitted", statusLabel: "Under review", priority: "normal", isMeeting: true },
    ],
    resolvedCases: [
      { _id: "r1", complaintId: "COMP-000001", title: "Pothole repair completed", citizenSnapshot: { name: "Old Citizen", citizenId: "CTZ-HP-000099", phoneNumbers: ["9999999999"] }, createdAt: "2026-01-20", status: "resolved", statusLabel: "Resolved", priority: "normal" },
    ],
  };
};

export default function AdminAllCases() {
  const [data] = useState(getStaticData());
  const [loading] = useState(false);
  const [tab, setTab] = useState("complaints");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const ITEMS_PER_PAGE = 8;

  const [filters, setFilters] = useState({
    q: "",
    status: "all",
  });

  // Get current tab data
  const getTabData = () => {
    if (tab === "complaints") return data.complaints;
    if (tab === "meetings") return data.meetingRequests;
    if (tab === "resolved") return data.resolvedCases;
    return [];
  };

  const baseRows = getTabData();

  const rows = useMemo(() => {
    return baseRows.filter((item) => {
      const q = filters.q.trim().toLowerCase();
      const statusOk = filters.status === "all" || item.status === filters.status;
      const textOk = !q || [item.complaintId || item.requestId, item.title || item.purpose, item.citizenSnapshot?.name, item.statusLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
      return statusOk && textOk;
    });
  }, [baseRows, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, filters]);

  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
  const paginatedRows = rows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= maxVisible; i++) pages.push(i);
        pages.push("...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...");
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1, "...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...", totalPages);
      }
    }
    return pages;
  };

  const tabCounts = {
    complaints: data.complaints.length,
    meetings: data.meetingRequests.length,
    resolved: data.resolvedCases.length,
  };

  return (
    <div className="portal-page min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      <div className="portal-page-wrap max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="portal-page-header">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Cases Management</h1>
          <p className="text-gray-600">Manage complaints and meeting requests</p>
        </div>

        {/* Tabs */}
        <div className="portal-panel flex gap-2 mb-6 bg-white rounded-lg p-1 border border-gray-200 shadow-sm w-fit">
          {[
            ["complaints", `Complaints (${tabCounts.complaints})`],
            ["meetings", `Meet the Minister (${tabCounts.meetings})`],
            ["resolved", `Resolved / Completed (${tabCounts.resolved})`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-6 py-3 font-semibold text-sm rounded-lg transition-all ${
                tab === id
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:text-blue-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter Section */}
        <div className="portal-panel bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <input
              value={filters.q}
              onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
              placeholder="Search by ID, title, citizen name..."
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="portal-panel bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="portal-panel bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 font-medium">No items found</p>
          </div>
        ) : (
          <div className="portal-panel bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-28">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-48">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-32">Citizen Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-28">Citizen ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-28">Created</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-600 w-28">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-600 w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedRows.map((item, idx) => (
                    <tr
                      key={item._id}
                      className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                        <div className="flex items-center gap-2">
                          {item.complaintId || item.requestId}
                          {item.priority === "VIP" && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">VIP</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 truncate">{item.title || item.purpose}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.citizenSnapshot?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.citizenSnapshot?.citizenId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(item.createdAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-full text-[11px] inline-block">
                          {item.statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDrawerOpen(true);
                          }}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                          title="View details"
                        >
                          <Eye size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={page === "..."}
                      onClick={() => typeof page === "number" && setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        page === "..."
                          ? "cursor-default text-gray-400"
                          : currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Drawer */}
      {isDrawerOpen && selectedItem && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-2/5 bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right-5 duration-300">
            
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Case Details</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              
              {/* Complaint/Request ID */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ID</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-blue-600">{selectedItem.complaintId || selectedItem.requestId}</p>
                  {selectedItem.priority === "VIP" && (
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">VIP</span>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Title / Purpose</p>
                <p className="text-base text-gray-900 font-medium">{selectedItem.title || selectedItem.purpose}</p>
              </div>

              {/* Citizen Info */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Citizen Name</p>
                  <p className="text-base text-gray-900">{selectedItem.citizenSnapshot?.name}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Citizen ID</p>
                  <p className="text-base text-gray-900 font-mono">{selectedItem.citizenSnapshot?.citizenId}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mobile Number</p>
                  <p className="text-base text-gray-900 font-semibold">{selectedItem.citizenSnapshot?.phoneNumbers?.[0] || "N/A"}</p>
                </div>
              </div>

              {/* Created Date & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Created</p>
                  <p className="text-base text-gray-900">{new Date(selectedItem.createdAt).toLocaleDateString("en-IN")}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
                  <span className="bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-full text-xs inline-block">
                    {selectedItem.statusLabel}
                  </span>
                </div>
              </div>

              {/* Assign Button - Only show when statusLabel is "Pooled" */}
              {selectedItem.statusLabel === "Pooled" && selectedItem.complaintId && (
                <button
                  onClick={() => {
                    alert("Case assigned to you!");
                    setIsDrawerOpen(false);
                  }}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Assign To Me
                </button>
              )}

              {/* Divider */}
              <div className="h-px bg-gray-200" />

              {/* View Full Details Button */}
              <button
                onClick={() => {
                  alert("Navigate to case details page");
                }}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                View Full Details
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
