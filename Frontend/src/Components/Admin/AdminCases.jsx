import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, X, ChevronLeft, ChevronRight } from "lucide-react";

// Static dummy data for admin-assigned cases
const getStaticData = () => {
  return {
    complaints: [
      {
        _id: "1",
        complaintId: "COMP-000201",
        title: "Water supply interruption in residential area",
        citizenSnapshot: { name: "Raj Kumar", citizenId: "CTZ-HP-000001", phoneNumbers: ["9876543210"] },
        createdAt: "2026-02-20",
        status: "assigned",
        statusLabel: "Assigned to You",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Water Supply",
        currentOwner: "Raj Kumar",
      },
      {
        _id: "2",
        complaintId: "COMP-000202",
        title: "Street light malfunction in sector 5",
        citizenSnapshot: { name: "Priya Sharma", citizenId: "CTZ-HP-000002", phoneNumbers: ["9876543211"] },
        createdAt: "2026-02-19",
        status: "in_progress",
        statusLabel: "In Progress",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Public Works",
        currentOwner: "Priya Sharma",
      },
      {
        _id: "3",
        complaintId: "COMP-000203",
        title: "Garbage disposal issue",
        citizenSnapshot: { name: "Arjun Singh", citizenId: "CTZ-HP-000003", phoneNumbers: ["9876543212"] },
        createdAt: "2026-02-18",
        status: "assigned",
        statusLabel: "Assigned to You",
        priority: "VIP",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Sanitation",
        currentOwner: "Arjun Singh",
      },
      {
        _id: "4",
        complaintId: "COMP-000204",
        title: "Pothole repair needed on Main Road",
        citizenSnapshot: { name: "Divya Hegde", citizenId: "CTZ-HP-000004", phoneNumbers: ["9876543213"] },
        createdAt: "2026-02-17",
        status: "resolved",
        statusLabel: "Resolved",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Roads",
        currentOwner: "Divya Hegde",
      },
      {
        _id: "5",
        complaintId: "COMP-000205",
        title: "Park maintenance required",
        citizenSnapshot: { name: "Karthik Raman", citizenId: "CTZ-HP-000005", phoneNumbers: ["9876543214"] },
        createdAt: "2026-02-16",
        status: "in_progress",
        statusLabel: "In Progress",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Parks & Gardens",
        currentOwner: "Karthik Raman",
      },
      {
        _id: "6",
        complaintId: "COMP-000206",
        title: "Noise pollution from construction site",
        citizenSnapshot: { name: "Tania Dutta", citizenId: "CTZ-HP-000006", phoneNumbers: ["9876543215"] },
        createdAt: "2026-02-15",
        status: "assigned",
        statusLabel: "Assigned to You",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Environment",
        currentOwner: "Tania Dutta",
      },
      {
        _id: "7",
        complaintId: "COMP-000207",
        title: "Road damage report",
        citizenSnapshot: { name: "Naveen Yadav", citizenId: "CTZ-HP-000007", phoneNumbers: ["9876543216"] },
        createdAt: "2026-02-14",
        status: "in_progress",
        statusLabel: "In Progress",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Roads",
        currentOwner: "Naveen Yadav",
      },
      {
        _id: "8",
        complaintId: "COMP-000208",
        title: "Drainage system blockage",
        citizenSnapshot: { name: "Abhishek Ekka", citizenId: "CTZ-HP-000008", phoneNumbers: ["9876543217"] },
        createdAt: "2026-02-13",
        status: "assigned",
        statusLabel: "Assigned to You",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Infrastructure",
        currentOwner: "Abhishek Ekka",
      },
      {
        _id: "9",
        complaintId: "COMP-000209",
        title: "Public facility repair needed",
        citizenSnapshot: { name: "Sanjay Patel", citizenId: "CTZ-HP-000009", phoneNumbers: ["9876543218"] },
        createdAt: "2026-02-12",
        status: "resolved",
        statusLabel: "Resolved",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Public Works",
        currentOwner: "Sanjay Patel",
      },
      {
        _id: "10",
        complaintId: "COMP-000210",
        title: "Traffic signal malfunction",
        citizenSnapshot: { name: "Meera Nair", citizenId: "CTZ-HP-000010", phoneNumbers: ["9876543219"] },
        createdAt: "2026-02-11",
        status: "assigned",
        statusLabel: "Assigned to You",
        priority: "normal",
        assignedAdminUserId: "admin-001",
        assignedAdminName: "You",
        department: "Traffic",
        currentOwner: "Meera Nair",
      },
    ],
  };
};

export default function AdminCases() {
  const navigate = useNavigate();
  const [data] = useState(getStaticData());
  const [loading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const ITEMS_PER_PAGE = 8;

  const [filters, setFilters] = useState({
    q: "",
    status: "all",
  });

  const complaints = data.complaints;

  const rows = useMemo(() => {
    return complaints.filter((item) => {
      const q = filters.q.trim().toLowerCase();
      const statusOk = filters.status === "all" || item.status === filters.status;
      const textOk = !q || [item.complaintId, item.title, item.citizenSnapshot?.name, item.statusLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
      return statusOk && textOk;
    });
  }, [complaints, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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

  const statusOptions = useMemo(() => {
    return Array.from(new Set(complaints.map((item) => item.status))).sort();
  }, [complaints]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Assigned Complaints</h1>
          <p className="text-gray-600">Manage and track complaints assigned to you</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
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
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 font-medium">No complaints found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-28">Complaint No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-48">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-32">Citizen Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-28">Citizen ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-32">Pool/Assigned</th>
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
                          {item.complaintId}
                          {item.priority === "VIP" && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">VIP</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 truncate">{item.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{item.citizenSnapshot?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.citizenSnapshot?.citizenId}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">
                        ✓ {item.assignedAdminName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(item.createdAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-semibold px-3 py-1.5 rounded-full text-[11px] inline-block ${
                          item.status === "assigned" ? "bg-blue-100 text-blue-700" :
                          item.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                          item.status === "resolved" ? "bg-green-100 text-green-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
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
              <h2 className="text-2xl font-bold text-gray-900">Complaint Details</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              
              {/* Complaint ID */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Complaint ID</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-blue-600">{selectedItem.complaintId}</p>
                  {selectedItem.priority === "VIP" && (
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">VIP</span>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Title</p>
                <p className="text-base text-gray-900 font-medium">{selectedItem.title}</p>
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

              {/* Department & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Department</p>
                  <p className="text-base text-gray-900">{selectedItem.department}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Priority</p>
                  <p className="text-base text-gray-900 font-medium">{selectedItem.priority === "VIP" ? "VIP" : "Normal"}</p>
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
                  <span className={`font-semibold px-3 py-1.5 rounded-full text-xs inline-block ${
                    selectedItem.status === "assigned" ? "bg-blue-100 text-blue-700" :
                    selectedItem.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                    selectedItem.status === "resolved" ? "bg-green-100 text-green-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {selectedItem.statusLabel}
                  </span>
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned To</p>
                <p className="text-base text-gray-900">✓ {selectedItem.assignedAdminName}</p>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-200" />

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    navigate(`/admincasedetail`, { state: { complaint: selectedItem } });
                  }}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  View Full Details
                </button>

                {selectedItem.status === "assigned" && (
                  <button
                    onClick={() => {
                      alert("Status updated to In Progress");
                    }}
                    className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Mark as In Progress
                  </button>
                )}

                {selectedItem.status === "in_progress" && (
                  <button
                    onClick={() => {
                      alert("Status updated to Resolved");
                    }}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Mark as Resolved
                  </button>
                )}

                {selectedItem.status === "resolved" && (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-gray-400 text-white font-semibold rounded-lg cursor-not-allowed"
                  >
                    Case Closed
                  </button>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}