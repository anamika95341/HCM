import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function buildComplaintActions(item, userId) {
  const actions = [];
  if (!item.assignedAdminUserId) actions.push(["assign", "Assign to Me"]);
  if (item.assignedAdminUserId === userId) {
    actions.push(["reassign", "Reassign"]);
    if (!["resolved", "completed", "escalated_to_meeting"].includes(item.status)) {
      actions.push(["department", "Department Flow"], ["scheduleCall", "Schedule Call"], ["logCall", "Log Call"], ["resolve", "Resolve"], ["escalate", "Escalate"]);
    }
  }
  if (["resolved", "completed", "escalated_to_meeting"].includes(item.status)) actions.push(["reopen", "Reopen"]);
  if (item.status === "resolved") actions.push(["close", "Close"]);
  return actions;
}

function Timeline({ items = [] }) {
  const { C } = usePortalTheme();
  if (!items.length) return <p style={{ fontSize: 13, color: C.t3 }}>No timeline events yet.</p>;
  return (
    <div className="space-y-4">
      {items.map((log, idx) => (
        <div key={`${log.id || log.created_at}-${idx}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
            {idx !== items.length - 1 && <div className="w-0.5 h-12 mt-2" style={{ background: C.border }} />}
          </div>
          <div className="flex-1 pb-4">
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={{ fontWeight: 600, color: C.t1 }}>{String(log.new_status || "").split("_").filter(Boolean).map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(" ")}</p>
                  <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{log.actor_role}</p>
                </div>
                <p style={{ fontSize: 12, color: C.t3, whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              {log.note && <p style={{ fontSize: 13, color: C.t2, marginTop: 8 }}>{log.note}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SuccessModal({ open, message, onClose }) {
  const { C } = usePortalTheme();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white text-3xl" style={{ background: C.mint }}>✓</div>
        <h3 className="text-2xl font-bold text-gray-900">Success!</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <WorkspaceButton type="button" onClick={onClose} style={{ width: "100%", marginTop: 24 }}>Continue</WorkspaceButton>
      </div>
    </div>
  );
}

export default function AdminCaseDetail() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [item, setItem] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedAction, setSelectedAction] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
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
    closeNote: "",
  });

  const focusedAction = searchParams.get("action") || "";
  const activeAction = focusedAction || selectedAction;

  useEffect(() => {
    if (focusedAction) setSelectedAction(focusedAction);
  }, [focusedAction]);

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      try {
        const { data } = await apiClient.get(`/complaints/${id}/admin-view`, authorizedConfig(session.accessToken));
        if (mounted) {
          setItem(data.complaint);
          setContacts(data.contacts || []);
          setAdmins(data.admins || []);
          setHistory(data.history || []);
          setComplaintForm((current) => ({
            ...current,
            department: data.complaint.department || "",
            officerName: data.complaint.officerName || "",
            officerContact: data.complaint.officerContact || "",
            manualContact: data.complaint.manualContact || "",
            callScheduledAt: data.complaint.callScheduledAt ? new Date(data.complaint.callScheduledAt).toISOString().slice(0, 16) : "",
            callOutcome: data.complaint.callOutcome || "",
            resolutionSummary: data.complaint.resolutionSummary || "",
          }));
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load case details");
        }
      }
    }

    if (session?.accessToken) {
      loadDetail();
    }

    return () => {
      mounted = false;
    };
  }, [id, session?.accessToken]);

  const matchingContacts = useMemo(
    () => contacts.filter((contact) => !complaintForm.department || contact.department === complaintForm.department),
    [contacts, complaintForm.department]
  );

  const availableActions = useMemo(
    () => buildComplaintActions(item || {}, session?.user?.id),
    [item, session?.user?.id]
  );

  async function runAction(actionName, request) {
    setActionLoading(true);
    setError("");
    try {
      const { data } = await request();
      if (data.complaint) {
        setItem(data.complaint);
      }
      if (data.history) {
        setHistory(data.history);
      } else {
        const detail = await apiClient.get(`/complaints/${id}/admin-view`, authorizedConfig(session.accessToken));
        setItem(detail.data.complaint);
        setHistory(detail.data.history || []);
      }
      if (data.meeting) {
        navigate(`/admin/meetings/${data.meeting.id}`);
        return;
      }
      setSuccessMessage(`${item?.complaintId || "Complaint"} updated successfully.`);
      setSelectedAction("");
    } catch (actionError) {
      setError(actionError?.response?.data?.error || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (!item) {
    return (
      <WorkspacePage width={1200}><WorkspaceCard>{error || "Loading case details..."}</WorkspaceCard></WorkspacePage>
    );
  }

  const matchingAdminOptions = admins.filter((admin) => admin.id !== session?.user?.id);

  return (
    <WorkspacePage width={1200}>
      <SuccessModal open={!!successMessage} message={successMessage} onClose={() => setSuccessMessage("")} />
      <WorkspaceSectionHeader
        eyebrow="Admin Workspace"
        title={item.complaintId}
        subtitle={item.title}
        action={<WorkspaceButton type="button" variant="ghost" onClick={() => navigate(-1)}><ChevronLeft size={16} />Back</WorkspaceButton>}
      />

      <div style={{ display: "grid", gap: 24 }}>
        {error && <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>}

        <WorkspaceCard>
          <WorkspaceCardHeader title="Workflow Actions" />
          <div className="grid md:grid-cols-[minmax(0,320px)_auto] gap-3 items-start mb-4">
            <WorkspaceSelect value={activeAction} onChange={(event) => setSelectedAction(event.target.value)}>
              <option value="">Select workflow action</option>
              {availableActions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </WorkspaceSelect>
          </div>

          {activeAction === "assign" && (
            <WorkspaceButton type="button" disabled={actionLoading} onClick={() => runAction("assign", () => apiClient.patch(`/complaints/${id}/assign-self`, {}, authorizedConfig(session.accessToken)))}>
              Assign to Me
            </WorkspaceButton>
          )}

          {activeAction === "reassign" && (
            <div className="space-y-3">
              <WorkspaceSelect value={complaintForm.reassignTo} onChange={(event) => setComplaintForm((current) => ({ ...current, reassignTo: event.target.value }))}>
                <option value="">Select admin</option>
                {matchingAdminOptions.map((admin) => <option key={admin.id} value={admin.id}>{admin.name} · {admin.department}</option>)}
              </WorkspaceSelect>
              <textarea value={complaintForm.reassignReason} onChange={(event) => setComplaintForm((current) => ({ ...current, reassignReason: event.target.value }))} rows={3} placeholder="Reason for reassignment" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
              <WorkspaceButton type="button" disabled={actionLoading || !complaintForm.reassignTo || !complaintForm.reassignReason} onClick={() => runAction("reassign", () => apiClient.patch(`/complaints/${id}/reassign`, { adminId: complaintForm.reassignTo, reason: complaintForm.reassignReason }, authorizedConfig(session.accessToken)))}>
                Reassign Complaint
              </WorkspaceButton>
            </div>
          )}

          {activeAction === "department" && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <WorkspaceInput value={complaintForm.department} onChange={(event) => setComplaintForm((current) => ({ ...current, department: event.target.value }))} placeholder="Department" />
                <WorkspaceSelect value={complaintForm.officerName} onChange={(event) => {
                  const selected = matchingContacts.find((contact) => contact.officerName === event.target.value);
                  setComplaintForm((current) => ({ ...current, officerName: event.target.value, officerContact: selected ? `${selected.designation} · ${selected.phone}` : current.officerContact }));
                }}>
                  <option value="">Select officer</option>
                  {matchingContacts.map((contact, index) => <option key={`${contact.officerName}-${index}`} value={contact.officerName}>{contact.officerName} · {contact.designation}</option>)}
                </WorkspaceSelect>
                <WorkspaceInput value={complaintForm.officerContact} onChange={(event) => setComplaintForm((current) => ({ ...current, officerContact: event.target.value }))} placeholder="Officer contact" />
                <WorkspaceInput value={complaintForm.manualContact} onChange={(event) => setComplaintForm((current) => ({ ...current, manualContact: event.target.value }))} placeholder="Manual contact entry" />
              </div>
              <WorkspaceButton type="button" disabled={actionLoading || !complaintForm.department} onClick={() => runAction("department", () => apiClient.patch(`/complaints/${id}/department`, {
                department: complaintForm.department,
                officerName: complaintForm.officerName,
                officerContact: complaintForm.officerContact,
                manualContact: complaintForm.manualContact,
              }, authorizedConfig(session.accessToken)))}>
                Save Department Flow
              </WorkspaceButton>
            </div>
          )}

          {activeAction === "scheduleCall" && (
            <div className="space-y-3">
              <WorkspaceInput type="datetime-local" value={complaintForm.callScheduledAt} onChange={(event) => setComplaintForm((current) => ({ ...current, callScheduledAt: event.target.value }))} />
              <WorkspaceButton type="button" disabled={actionLoading || !complaintForm.callScheduledAt} onClick={() => runAction("scheduleCall", () => apiClient.patch(`/complaints/${id}/schedule-call`, { callScheduledAt: new Date(complaintForm.callScheduledAt).toISOString() }, authorizedConfig(session.accessToken)))}>
                Schedule Call
              </WorkspaceButton>
            </div>
          )}

          {activeAction === "logCall" && (
            <div className="space-y-3">
              <textarea value={complaintForm.callOutcome} onChange={(event) => setComplaintForm((current) => ({ ...current, callOutcome: event.target.value }))} rows={3} placeholder="Log call outcome" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
              <WorkspaceButton type="button" disabled={actionLoading || !complaintForm.callOutcome} onClick={() => runAction("logCall", () => apiClient.patch(`/complaints/${id}/log-call`, { callOutcome: complaintForm.callOutcome }, authorizedConfig(session.accessToken)))}>
                Log Outcome
              </WorkspaceButton>
            </div>
          )}

          {activeAction === "resolve" && (
            <div className="space-y-3">
              <textarea value={complaintForm.resolutionSummary} onChange={(event) => setComplaintForm((current) => ({ ...current, resolutionSummary: event.target.value }))} rows={3} placeholder="Resolution summary" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
              <WorkspaceButton type="button" disabled={actionLoading || !complaintForm.resolutionSummary} onClick={() => runAction("resolve", () => apiClient.patch(`/complaints/${id}/resolve`, { resolutionSummary: complaintForm.resolutionSummary, resolutionDocs: [] }, authorizedConfig(session.accessToken)))}>
                Resolve Complaint
              </WorkspaceButton>
            </div>
          )}

          {activeAction === "escalate" && (
            <div className="space-y-3">
              <textarea value={complaintForm.escalationPurpose} onChange={(event) => setComplaintForm((current) => ({ ...current, escalationPurpose: event.target.value }))} rows={3} placeholder="Escalation purpose" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
              <WorkspaceButton type="button" disabled={actionLoading || !complaintForm.escalationPurpose} onClick={() => runAction("escalate", () => apiClient.patch(`/complaints/${id}/escalate`, { purpose: complaintForm.escalationPurpose }, authorizedConfig(session.accessToken)))}>
                Create Linked Meeting
              </WorkspaceButton>
            </div>
          )}

          {activeAction === "reopen" && (
            <div className="space-y-3">
              <textarea value={complaintForm.reopenReason} onChange={(event) => setComplaintForm((current) => ({ ...current, reopenReason: event.target.value }))} rows={3} placeholder="Reason to reopen" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
              <WorkspaceButton type="button" disabled={actionLoading || !complaintForm.reopenReason} onClick={() => runAction("reopen", () => apiClient.patch(`/complaints/${id}/reopen`, { reason: complaintForm.reopenReason }, authorizedConfig(session.accessToken)))}>
                Reopen Complaint
              </WorkspaceButton>
            </div>
          )}

          {activeAction === "close" && (
            <div className="space-y-3">
              <textarea value={complaintForm.closeNote} onChange={(event) => setComplaintForm((current) => ({ ...current, closeNote: event.target.value }))} rows={3} placeholder="Closure note" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
              <WorkspaceButton type="button" disabled={actionLoading || !complaintForm.closeNote} onClick={() => runAction("close", () => apiClient.patch(`/complaints/${id}/close`, { note: complaintForm.closeNote }, authorizedConfig(session.accessToken)))}>
                Close Complaint
              </WorkspaceButton>
            </div>
          )}
        </WorkspaceCard>

        <div className="grid md:grid-cols-2 gap-6">
          <WorkspaceCard>
            <WorkspaceCardHeader title="Complaint Information" />
            <div className="grid md:grid-cols-2 gap-6" style={{ fontSize: 13, color: C.t2 }}>
              <DetailItem label="Citizen" value={item.citizenSnapshot?.name} />
              <DetailItem label="Citizen ID" value={item.citizenSnapshot?.citizenId} />
              <DetailItem label="Phone" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
              <DetailItem label="Status" value={item.statusLabel} />
              <DetailItem label="Department" value={item.department || "Pending"} />
              <DetailItem label="Current Owner" value={item.currentOwner || "Admin Pool"} />
              <DetailItem label="Linked Meeting" value={item.relatedMeeting?.requestId || "None"} />
              <DetailItem label="Reopened Count" value={String(item.reopenedCount || 0)} />
            </div>
            <div className="mt-6">
              <p className="text-xs text-gray-500 font-medium uppercase mb-2">Description</p>
              <p className="text-sm text-gray-700">{item.description}</p>
            </div>
            {(item.statusReason || item.callOutcome || item.resolutionSummary) && (
              <div className="mt-6 space-y-3">
                {item.statusReason && <NoticeBox tone="amber" label="Status Reason" value={item.statusReason} />}
                {item.callOutcome && <NoticeBox tone="blue" label="Call Outcome" value={item.callOutcome} />}
                {item.resolutionSummary && <NoticeBox tone="green" label="Resolution Summary" value={item.resolutionSummary} />}
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard>
            <div className="flex items-center gap-2 mb-6">
              <FileText size={22} color={C.purple} />
              <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>Activity Timeline</h2>
            </div>
            <Timeline items={history} />
          </WorkspaceCard>
        </div>
      </div>
    </WorkspacePage>
  );
}

function DetailItem({ label, value }) {
  const { C } = usePortalTheme();
  return (
    <div>
      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>{value}</p>
    </div>
  );
}

function NoticeBox({ tone, label, value }) {
  const { C } = usePortalTheme();
  const toneColors = {
    amber: C.warn,
    blue: C.purple,
    green: C.mint,
  };
  const color = toneColors[tone] || C.purple;
  return (
    <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}12` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 13, color: C.t2 }}>{value}</p>
    </div>
  );
}
