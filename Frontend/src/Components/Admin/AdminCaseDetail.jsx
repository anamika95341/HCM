import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { ChevronLeft, FileText, Phone, Users, Clock, AlertCircle } from "lucide-react";
import { downloadCaseSummaryPdf } from "../../utils/caseSummary";

const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm";
const textAreaClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm";

// Static Case Data
const getStaticCaseData = () => {
    return {
        complaint: {
            _id: "1",
            complaintId: "COMP-000201",
            title: "Water supply interruption in residential area",
            citizenSnapshot: {
                name: "Raj Kumar",
                citizenId: "CTZ-HP-000001",
                phoneNumbers: ["9876543210"]
            },
            createdAt: "2026-02-20",
            status: "assigned",
            statusLabel: "Assigned to You",
            statusReason: "Case assigned for resolution",
            priority: "normal",
            assignedAdminUserId: "admin-001",
            assignedAdminName: "You",
            department: "Water Supply",
            currentOwner: "Raj Kumar",
            officerName: "Rakesh Singh",
            officerContact: "Chief Engineer · 9876543220",
            manualContact: "",
            callScheduledAt: "",
            callOutcome: "",
            resolutionSummary: "",
            reopenedCount: 0,
            relatedComplaint: null,
            relatedMeeting: {
                id: "m1",
                requestId: "MREQ-000050",
                purpose: "Follow-up meeting for water supply issue"
            },
            relatedNotifications: [
                { _id: "n1", type: "ASSIGNED", message: "Case has been assigned to you" },
                { _id: "n2", type: "UPDATE", message: "New contact added for water department" }
            ],
            masterTimeline: [
                {
                    _id: "t1",
                    action: "Case Assigned",
                    createdAt: "2026-02-20T10:30:00Z",
                    sourceLabel: "System",
                    createdByName: "Admin",
                    notes: "Case assigned to admin-001 for resolution"
                },
                {
                    _id: "t2",
                    action: "Department Flow Updated",
                    createdAt: "2026-02-19T14:15:00Z",
                    sourceLabel: "System",
                    createdByName: "Admin",
                    notes: "Routed to Water Supply Department"
                },
                {
                    _id: "t3",
                    action: "Case Created",
                    createdAt: "2026-02-18T09:45:00Z",
                    sourceLabel: "Citizen",
                    createdByName: "Raj Kumar",
                    notes: "New complaint submitted"
                }
            ]
        },
        contacts: [
            {
                _id: "c1",
                department: "Water Supply",
                officerName: "Rakesh Singh",
                designation: "Chief Engineer",
                phone: "9876543220"
            },
            {
                _id: "c2",
                department: "Water Supply",
                officerName: "Priya Verma",
                designation: "Deputy Engineer",
                phone: "9876543221"
            },
            {
                _id: "c3",
                department: "Roads",
                officerName: "Arjun Patel",
                designation: "Road Engineer",
                phone: "9876543222"
            }
        ],
        admins: [
            {
                id: "admin-002",
                name: "Sanjeev Kumar",
                department: "Water Supply"
            },
            {
                id: "admin-003",
                name: "Divya Sharma",
                department: "Roads"
            },
            {
                id: "admin-004",
                name: "Vikram Singh",
                department: "Sanitation"
            }
        ]
    };
};

function buildComplaintActions(item) {
    const actions = [];
    if (!item.assignedAdminUserId) actions.push(["assign", "Assign to Me"]);
    if (item.assignedAdminUserId && item.assignedAdminUserId === "admin-001") {
        actions.push(["reassign", "Reassign"]);
        if (!["resolved", "completed", "escalated_to_admin_meeting"].includes(item.status)) {
            actions.push(
                ["department", "Department Flow"],
                ["scheduleCall", "Schedule Call"],
                ["logCall", "Log Call"],
                ["resolve", "Resolve"],
                ["escalate", "Escalate"]
            );
        }
    }
    if (["resolved", "completed", "escalated_to_admin_meeting"].includes(item.status)) {
        actions.push(["reopen", "Reopen"]);
    }
    if (item.status === "resolved") {
        actions.push(["close", "Close"]);
    }
    return actions;
}

function Timeline({ items = [] }) {
    if (!items.length) {
        return <p className="text-sm text-gray-500">No timeline events yet.</p>;
    }
    return (
        <div className="space-y-4">
            {items.map((log, idx) => (
                <div key={`${log.sourceLabel}-${log._id}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                        {idx !== items.length - 1 && <div className="w-0.5 h-12 bg-gray-200 mt-2" />}
                    </div>
                    <div className="flex-1 pb-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-gray-900">{log.action}</p>
                                    <p className="text-xs text-gray-600 mt-1">{log.sourceLabel} · {log.createdByName}</p>
                                </div>
                                <p className="text-xs text-gray-500 whitespace-nowrap">
                                    {new Date(log.createdAt).toLocaleDateString("en-IN")}
                                </p>
                            </div>
                            {log.notes && (
                                <p className="text-sm text-gray-700 mt-2">{log.notes}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function buildSuccessMessage(action, item) {
    const caseId = item?.complaintId;
    const messages = {
        assign: `${caseId} was assigned to you.`,
        reassign: `${caseId} was reassigned successfully.`,
        department: `${caseId} department flow was updated.`,
        scheduleCall: `${caseId} follow-up call was scheduled.`,
        logCall: `${caseId} call outcome was logged.`,
        resolve: `${caseId} was resolved.`,
        escalate: `${caseId} was escalated to a linked meeting.`,
        close: `${caseId} was closed.`,
        reopen: `${caseId} was reopened.`,
    };
    return messages[action] || `${caseId} was updated successfully.`;
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

export default function AdminCaseDetail() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [caseData] = useState(getStaticCaseData());
    const [item, setItem] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [selectedAction, setSelectedAction] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [resolutionFiles, setResolutionFiles] = useState([]);

    const [complaintForm, setComplaintForm] = useState({
        department: "",
        officerName: "",
        officerContact: "",
        manualContact: "",
        callScheduledAt: "",
        callOutcome: "",
        escalationPurpose: "",
        resolutionSummary: "",
        reassignTo: "",
        reassignReason: "",
        reopenReason: "",
    });

    const focusedAction = searchParams.get("action") || "";
    const activeAction = focusedAction || selectedAction;

    useEffect(() => {
        if (focusedAction) setSelectedAction(focusedAction);
    }, [focusedAction]);

    useEffect(() => {
        if (location.state?.complaint) {
            const complaint = location.state.complaint;
            setItem(complaint);
            setContacts(caseData.contacts);
            setAdmins(caseData.admins);
            setComplaintForm((current) => ({
                ...current,
                department: complaint.department || "",
                officerName: complaint.officerName || "",
                officerContact: complaint.officerContact || "",
            }));
        } else {
            setItem(caseData.complaint);
            setContacts(caseData.contacts);
            setAdmins(caseData.admins);
            setComplaintForm((current) => ({
                ...current,
                department: caseData.complaint.department || "",
                officerName: caseData.complaint.officerName || "",
                officerContact: caseData.complaint.officerContact || "",
            }));
        }
    }, [caseData, location.state]);

    const matchingContacts = useMemo(
        () => contacts.filter((contact) => !complaintForm.department || contact.department === complaintForm.department),
        [contacts, complaintForm.department]
    );

    const availableActions = useMemo(
        () => buildComplaintActions(item || {}),
        [item]
    );

    async function runAction(actionName) {
        setActionLoading(true);
        setTimeout(() => {
            setSuccessMessage(buildSuccessMessage(actionName, item));
            setSelectedAction("");
            setActionLoading(false);
        }, 800);
    }

    if (!item) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 flex items-center justify-center">
                <p className="text-gray-600 font-medium">Loading case details...</p>
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case "assigned": return "bg-blue-100 text-blue-700 border-blue-200";
            case "in_progress": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "resolved": return "bg-green-100 text-green-700 border-green-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div className="portal-page min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
            <SuccessModal open={!!successMessage} message={successMessage} onClose={() => setSuccessMessage("")} />

            {/* Header */}
            <div className="portal-hero bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="portal-page-wrap max-w-6xl mx-auto px-6 py-2">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <ChevronLeft size={24} />
                            <span className="font-semibold">Back</span>
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                downloadCaseSummaryPdf({
                                    filename: `${item.complaintId}-summary.pdf`,
                                    title: `${item.complaintId} Summary`,

                                    rows: [
                                        ["Case ID", item.complaintId],
                                        ["Citizen", item.citizenSnapshot?.name],
                                        ["Phone", item.citizenSnapshot?.phoneNumbers?.[0]],
                                        ["Status", item.statusLabel],
                                        ["Current owner", item.currentOwner],
                                        ["Meeting type", item.priority === "VIP" ? "VIP" : "Normal"],
                                        ["Schedule", item.callScheduledAt || "-"],
                                        ["Location", item.department || "-"],
                                        ["Execution status", item.statusLabel],
                                    ],

                                    timeline: item.masterTimeline || [],
                                })
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            <FileText size={18} />
                            <span>Download PDF</span>
                        </button>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold">{item.complaintId}</h1>
                            {item.priority === "VIP" && (
                                <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">VIP</span>
                            )}
                        </div>
                        <p className="portal-hero-subtitle text-lg">{item.title}</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="portal-page-wrap max-w-6xl mx-auto px-6 py-2">
                {/* Citizen & Status Info */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Users size={24} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 font-medium uppercase">Citizen</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">{item.citizenSnapshot?.name}</p>
                                <p className="text-xs text-gray-600 mt-2">{item.citizenSnapshot?.citizenId}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Phone size={24} className="text-green-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 font-medium uppercase">Contact</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">{item.citizenSnapshot?.phoneNumbers?.[0]}</p>
                                <p className="text-xs text-gray-600 mt-2">Mobile</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-start gap-3">
                            <div className={`p-3 rounded-lg ${getStatusColor(item.status).split(" ")[0]} bg-opacity-20`}>
                                <AlertCircle size={24} className={`${getStatusColor(item.status).split(" ")[1]}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 font-medium uppercase">Status</p>
                                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(item.status)}`}>
                                    {item.statusLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workflow Actions */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Workflow Actions</h2>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <select
                            value={activeAction}
                            onChange={(event) => {
                                const value = event.target.value;
                                setSelectedAction(value);
                                if (!value) {
                                    navigate(`/cases/complaint/${id}`);
                                    return;
                                }
                                if (value === "assign") {
                                    runAction("assign");
                                    return;
                                }
                                navigate(`/cases/complaint/${id}?action=${value}`);
                            }}
                            className={inputClass}
                        >
                            <option value="">Select workflow action</option>
                            {availableActions.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        {activeAction && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedAction("");
                                    navigate(`/cases/complaint/${id}`);
                                }}
                                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Clear Action
                            </button>
                        )}
                    </div>

                    {!activeAction && (
                        <p className="text-gray-600">Choose the next valid action for this case.</p>
                    )}

                    {/* Action Forms */}
                    {activeAction === "department" && (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <select
                                    value={complaintForm.department}
                                    onChange={(event) =>
                                        setComplaintForm((current) => ({
                                            ...current,
                                            department: event.target.value,
                                            officerName: "",
                                            officerContact: ""
                                        }))
                                    }
                                    className={inputClass}
                                >
                                    <option value="">Select department</option>
                                    {Array.from(new Set(contacts.map((contact) => contact.department))).map((department) => (
                                        <option key={department} value={department}>{department}</option>
                                    ))}
                                </select>
                                <select
                                    value={complaintForm.officerName}
                                    onChange={(event) => {
                                        const selected = matchingContacts.find((contact) => contact.officerName === event.target.value);
                                        setComplaintForm((current) => ({
                                            ...current,
                                            officerName: event.target.value,
                                            officerContact: selected ? `${selected.designation} · ${selected.phone}` : ""
                                        }));
                                    }}
                                    className={inputClass}
                                >
                                    <option value="">Select officer</option>
                                    {matchingContacts.map((contact) => (
                                        <option key={contact._id} value={contact.officerName}>{contact.officerName} · {contact.designation}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => runAction("department")}
                                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? "Saving..." : "Save Department Flow"}
                            </button>
                        </div>
                    )}

                    {activeAction === "scheduleCall" && (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                            <input
                                value={complaintForm.callScheduledAt}
                                onChange={(event) => setComplaintForm((current) => ({ ...current, callScheduledAt: event.target.value }))}
                                type="datetime-local"
                                className={inputClass}
                            />
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => runAction("scheduleCall")}
                                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? "Scheduling..." : "Schedule Call"}
                            </button>
                        </div>
                    )}

                    {activeAction === "logCall" && (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                            <textarea
                                value={complaintForm.callOutcome}
                                onChange={(event) => setComplaintForm((current) => ({ ...current, callOutcome: event.target.value }))}
                                rows={4}
                                placeholder="Log call outcome..."
                                className={textAreaClass}
                            />
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => runAction("logCall")}
                                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? "Logging..." : "Log Outcome"}
                            </button>
                        </div>
                    )}

                    {activeAction === "resolve" && (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                            <textarea
                                value={complaintForm.resolutionSummary}
                                onChange={(event) => setComplaintForm((current) => ({ ...current, resolutionSummary: event.target.value }))}
                                rows={4}
                                placeholder="Resolution summary..."
                                className={textAreaClass}
                            />
                            <input
                                type="file"
                                multiple
                                onChange={(event) => setResolutionFiles(Array.from(event.target.files || []))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => runAction("resolve")}
                                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? "Resolving..." : "Resolve Complaint"}
                            </button>
                        </div>
                    )}

                    {activeAction === "escalate" && (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                            <textarea
                                value={complaintForm.escalationPurpose}
                                onChange={(event) => setComplaintForm((current) => ({ ...current, escalationPurpose: event.target.value }))}
                                rows={4}
                                placeholder="Escalation purpose..."
                                className={textAreaClass}
                            />
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => runAction("escalate")}
                                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? "Escalating..." : "Create Linked Meeting"}
                            </button>
                        </div>
                    )}

                    {activeAction === "close" && (
                        <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => runAction("close")}
                            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {actionLoading ? "Closing..." : "Close Complaint"}
                        </button>
                    )}

                    {activeAction === "reassign" && (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                            <select
                                value={complaintForm.reassignTo}
                                onChange={(event) => setComplaintForm((current) => ({ ...current, reassignTo: event.target.value }))}
                                className={inputClass}
                            >
                                <option value="">Select admin</option>
                                {admins
                                    .filter((admin) => String(admin.id) !== String(item.assignedAdminUserId || ""))
                                    .map((admin) => (
                                        <option key={admin.id} value={admin.id}>{admin.name} · {admin.department}</option>
                                    ))}
                            </select>
                            <textarea
                                value={complaintForm.reassignReason}
                                onChange={(event) => setComplaintForm((current) => ({ ...current, reassignReason: event.target.value }))}
                                rows={3}
                                placeholder="Why is this being reassigned?"
                                className={textAreaClass}
                            />
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => runAction("reassign")}
                                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? "Reassigning..." : "Reassign Complaint"}
                            </button>
                        </div>
                    )}

                    {activeAction === "reopen" && (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                            <textarea
                                value={complaintForm.reopenReason}
                                onChange={(event) => setComplaintForm((current) => ({ ...current, reopenReason: event.target.value }))}
                                rows={3}
                                placeholder="Why should this complaint be reopened?"
                                className={textAreaClass}
                            />
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => runAction("reopen")}
                                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? "Reopening..." : "Reopen Complaint"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Case Details Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Case Information</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Complaint ID</p>
                                <p className="text-lg font-semibold text-gray-900 mt-1">{item.complaintId}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Department</p>
                                <p className="text-lg font-semibold text-gray-900 mt-1">{item.department}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Officer</p>
                                <p className="text-lg font-semibold text-gray-900 mt-1">{item.officerName || "Not assigned"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Reopened Count</p>
                                <p className="text-lg font-semibold text-gray-900 mt-1">{item.reopenedCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Related Records</h3>
                        {item.relatedMeeting ? (
                            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <Clock size={20} className="text-blue-600 mt-1" />
                                <div>
                                    <p className="font-semibold text-blue-900">{item.relatedMeeting.requestId}</p>
                                    <p className="text-sm text-blue-700">{item.relatedMeeting.purpose}</p>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/cases/meeting/${item.relatedMeeting.id}`)}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold mt-2"
                                    >
                                        Open meeting →
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-600">No linked records</p>
                        )}
                    </div>
                </div>

                {/* Notifications */}
                {item.relatedNotifications?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Notifications</h3>
                        <div className="space-y-2">
                            {item.relatedNotifications.map((note) => (
                                <div key={note._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">{note.type}</p>
                                        <p className="text-sm text-gray-600">{note.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Activity Timeline</h3>
                    <Timeline items={item.masterTimeline || []} />
                </div>
            </div>
        </div>
    );
}
