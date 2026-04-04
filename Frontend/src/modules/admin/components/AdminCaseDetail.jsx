import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import { PATHS } from "../../../routes/paths.js";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceSelect,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function buildComplaintActions(item, userId) {
  const actions = [];
  const canReassign = ["assigned", "in_review", "call_scheduled", "followup_in_progress"].includes(item.status);
  const canLog = ["assigned", "in_review", "call_scheduled", "followup_in_progress"].includes(item.status);
  const canScheduleMeeting = ["assigned", "in_review", "call_scheduled", "followup_in_progress"].includes(item.status);
  const canResolve = ["assigned", "in_review", "call_scheduled", "followup_in_progress"].includes(item.status);
  const canEscalate = ["assigned", "in_review", "call_scheduled", "followup_in_progress"].includes(item.status);

  if (!item.assignedAdminUserId) actions.push(["assign", "Assign to Me"]);
  if (item.assignedAdminUserId === userId) {
    if (canReassign) actions.push(["reassign", "Reassign"]);
    if (canLog) actions.push(["logs", "Logs"]);
    if (canScheduleMeeting) actions.push(["scheduleMeeting", "Schedule Meeting"]);
    if (canResolve) actions.push(["resolve", "Resolve"]);
    if (canEscalate) actions.push(["escalate", "Escalate"]);
  }
  if (["resolved", "completed", "escalated_to_meeting"].includes(item.status)) actions.push(["reopen", "Reopen"]);
  if (item.status === "resolved") actions.push(["close", "Close"]);
  return actions;
}

function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function formatHistoryStatus(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function buildFutureIso(date, time) {
  if (!date || !time) return "";
  const localDate = new Date(`${date}T${time}`);
  if (Number.isNaN(localDate.getTime())) return "";
  return localDate.toISOString();
}

export function CenteredOverlay({ children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        left: "var(--portal-modal-offset-left, 0px)",
        width: "calc(100vw - var(--portal-modal-offset-left, 0px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(6px)",
        zIndex: 120,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

export function ModalShell({ title, subtitle, children, onClose }) {
  const { C } = usePortalTheme();
  return (
    <CenteredOverlay>
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          minHeight: 360,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          boxShadow: C.dialogShadow,
          padding: 28,
          display: "grid",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>{title}</div>
            {subtitle ? <p style={{ marginTop: 8, fontSize: 13, color: C.t3 }}>{subtitle}</p> : null}
          </div>
          <WorkspaceButton type="button" variant="ghost" onClick={onClose}>
            Close
          </WorkspaceButton>
        </div>
        {children}
      </div>
    </CenteredOverlay>
  );
}

export function ErrorText({ children }) {
  const { C } = usePortalTheme();
  if (!children) return null;
  return <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>{children}</div>;
}

function Timeline({ items = [] }) {
  const { C } = usePortalTheme();
  if (!items.length) return <p style={{ fontSize: 13, color: C.t3 }}>No timeline events yet.</p>;
  return (
    <div className="space-y-4">
      {items.map((log, index) => (
        <div key={`${log.id || log.created_at}-${index}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
            {index !== items.length - 1 ? <div className="w-0.5 h-12 mt-2" style={{ background: C.border }} /> : null}
          </div>
          <div className="flex-1 pb-4">
            <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={{ fontWeight: 600, color: C.t1 }}>{formatHistoryStatus(log.new_status)}</p>
                  <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{log.actor_role}</p>
                </div>
                <p style={{ fontSize: 12, color: C.t3, whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleDateString("en-IN")}</p>
              </div>
              {log.note ? <p style={{ fontSize: 13, color: C.t2, marginTop: 8 }}>{log.note}</p> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SuccessModal({ open, message, onClose }) {
  const { C } = usePortalTheme();
  if (!open) return null;
  return (
    <CenteredOverlay>
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          minHeight: 360,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          boxShadow: C.dialogShadow,
          padding: 28,
          display: "grid",
          alignContent: "center",
          justifyItems: "center",
          textAlign: "center",
        }}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white text-3xl" style={{ background: C.mint }}>✓</div>
        <h3 style={{ fontSize: 28, fontWeight: 700, color: C.t1 }}>Success</h3>
        <p style={{ marginTop: 8, fontSize: 14, color: C.t3, maxWidth: 420 }}>{message}</p>
        <WorkspaceButton type="button" onClick={onClose} style={{ width: 220, marginTop: 24, justifySelf: "center" }}>
          Continue
        </WorkspaceButton>
      </div>
    </CenteredOverlay>
  );
}

export function WorkspaceTextArea(props) {
  const { C } = usePortalTheme();
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.inp,
        color: C.t1,
        fontSize: 13,
        outline: "none",
        resize: "vertical",
        ...(props.style || {}),
      }}
    />
  );
}

export default function AdminCaseDetail() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const source = searchParams.get("source") || "";
  const [item, setItem] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedAction, setSelectedAction] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [complaintForm, setComplaintForm] = useState({
    logType: "",
    logSummary: "",
    scheduleDate: "",
    scheduleTime: "",
    escalationReason: "",
    resolutionSummary: "",
    reassignTo: "",
    reassignReason: "",
    reopenReason: "",
    closeNote: "",
  });

  const focusedAction = searchParams.get("action") || "";
  const activeAction = focusedAction || selectedAction;
  const showAssignToMeOnly = !item?.assignedAdminUserId;

  useEffect(() => {
    if (focusedAction) setSelectedAction(focusedAction);
  }, [focusedAction]);

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      try {
        const { data } = await apiClient.get(`/complaints/${id}/admin-view`, authorizedConfig(session.accessToken));
        if (!mounted) return;
        const callScheduledAt = data.complaint.callScheduledAt ? new Date(data.complaint.callScheduledAt) : null;
        setItem(data.complaint);
        setAdmins(data.admins || []);
        setHistory(data.history || []);
        setComplaintForm((current) => ({
          ...current,
          scheduleDate: callScheduledAt && !Number.isNaN(callScheduledAt.getTime()) ? new Date(callScheduledAt.getTime() - callScheduledAt.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "",
          scheduleTime: callScheduledAt && !Number.isNaN(callScheduledAt.getTime()) ? new Date(callScheduledAt.getTime() - callScheduledAt.getTimezoneOffset() * 60000).toISOString().slice(11, 16) : "",
          resolutionSummary: data.complaint.resolutionSummary || "",
        }));
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

  const availableActions = useMemo(
    () => buildComplaintActions(item || {}, session?.user?.id),
    [item, session?.user?.id]
  );

  const matchingAdminOptions = useMemo(
    () => admins.filter((admin) => admin.id !== session?.user?.id),
    [admins, session?.user?.id]
  );

  const escalationTrimmed = complaintForm.escalationReason.trim();
  const escalationReasonError =
    complaintForm.escalationReason.length > 500
      ? "Maximum 500 characters allowed"
      : complaintForm.escalationReason.length > 0 && escalationTrimmed.length < 4
        ? "Write a valid reason."
        : "";

  const reassignTrimmed = complaintForm.reassignReason.trim();
  const reassignReasonError =
    complaintForm.reassignReason.length > 500
      ? "Maximum 500 characters allowed"
      : complaintForm.reassignReason.length > 0 && reassignTrimmed.length < 4
        ? "Write a valid reason."
        : "";

  const resolutionWordCount = countWords(complaintForm.resolutionSummary);
  const resolutionTrimmed = complaintForm.resolutionSummary.trim();
  const resolutionError =
    resolutionWordCount > 1000
      ? "Maximum 1000 words allowed"
      : complaintForm.resolutionSummary.length > 0 && resolutionTrimmed.length < 10
        ? "Write a valid summary."
        : "";

  const scheduledIso = buildFutureIso(complaintForm.scheduleDate, complaintForm.scheduleTime);
  const scheduleError =
    complaintForm.scheduleDate || complaintForm.scheduleTime
      ? !scheduledIso || new Date(scheduledIso).getTime() <= Date.now()
        ? "Select a future date and time."
        : ""
      : "";

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
      if (actionName === "assign") {
        navigate(PATHS.admin.complaintQueue);
        return;
      }
      if (actionName === "escalate" || actionName === "reassign") {
        navigate(PATHS.admin.workQueue);
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

  function closeActionModal() {
    setSelectedAction("");
  }

  if (!item) {
    return (
      <WorkspacePage width={1200}>
        {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : <WorkspaceEmptyState title="Loading case details..." />}
      </WorkspacePage>
    );
  }

  const backPath =
    source === "work-queue"
      ? PATHS.admin.workQueue
      : source === "complaint-queue"
        ? PATHS.admin.complaintQueue
        : PATHS.admin.cases;
  const backLabel =
    backPath === PATHS.admin.workQueue
      ? "Back to Work Queue"
      : backPath === PATHS.admin.complaintQueue
        ? "Back to Complaint Queue"
        : "Back to My Cases";

  return (
    <WorkspacePage width={1200}>
      <SuccessModal open={!!successMessage} message={successMessage} onClose={() => setSuccessMessage("")} />
      <WorkspaceSectionHeader
        title={item.complaintId}
        subtitle={item.title}
        action={<WorkspaceButton type="button" variant="ghost" onClick={() => navigate(backPath)}><ChevronLeft size={16} />{backLabel}</WorkspaceButton>}
      />

      <div style={{ display: "grid", gap: 24 }}>
        {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : null}

        <WorkspaceCard>
          {showAssignToMeOnly ? (
            <WorkspaceButton type="button" disabled={actionLoading} onClick={() => runAction("assign", () => apiClient.patch(`/complaints/${id}/assign-self`, {}, authorizedConfig(session.accessToken)))}>
              Assign to Me
            </WorkspaceButton>
          ) : (
            <div className="grid md:grid-cols-[minmax(0,320px)_auto] gap-3 items-start">
              <WorkspaceSelect value={activeAction} onChange={(event) => setSelectedAction(event.target.value)}>
                <option value="">Select workflow action</option>
                {availableActions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </WorkspaceSelect>
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
              <DetailItem label="Current Owner" value={item.currentOwner || "Admin Pool"} />
              <DetailItem label="Scheduled Meeting" value={item.callScheduledAt ? new Date(item.callScheduledAt).toLocaleString("en-IN") : "Not scheduled"} />
              <DetailItem label="Handoff Type" value={item.handoffType ? formatHistoryStatus(item.handoffType) : "None"} />
              <DetailItem label="Reopened Count" value={String(item.reopenedCount || 0)} />
            </div>
            <div className="mt-6">
              <p style={{ fontSize: 10, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Description</p>
              <p style={{ fontSize: 13, color: C.t2 }}>{item.description}</p>
            </div>
            {(item.statusReason || item.callOutcome || item.resolutionSummary) ? (
              <div className="mt-6 space-y-3">
                {item.statusReason ? <NoticeBox tone="amber" label="Status Reason" value={item.statusReason} /> : null}
                {item.callOutcome ? <NoticeBox tone="blue" label="Latest Log" value={item.callOutcome} /> : null}
                {item.resolutionSummary ? <NoticeBox tone="green" label="Resolution Summary" value={item.resolutionSummary} /> : null}
              </div>
            ) : null}
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

      {activeAction === "reassign" ? (
        <ModalShell
          title="Reassign Complaint"
          subtitle="Select the admin who should receive this complaint and write the reassignment reason."
          onClose={closeActionModal}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Assign To Admin
              </div>
              <WorkspaceSelect value={complaintForm.reassignTo} onChange={(event) => setComplaintForm((current) => ({ ...current, reassignTo: event.target.value }))}>
                <option value="">Select admin</option>
                {matchingAdminOptions.map((admin) => <option key={admin.id} value={admin.id}>{admin.name} · {admin.department}</option>)}
              </WorkspaceSelect>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Reason
              </div>
              <WorkspaceTextArea
                rows={6}
                value={complaintForm.reassignReason}
                onChange={(event) => setComplaintForm((current) => ({ ...current, reassignReason: event.target.value }))}
                placeholder="Write the reason for reassignment"
              />
              <ErrorText>{reassignReasonError}</ErrorText>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !complaintForm.reassignTo || !!reassignReasonError || reassignTrimmed.length < 4}
                onClick={() => runAction("reassign", () => apiClient.patch(`/complaints/${id}/reassign`, { adminId: complaintForm.reassignTo, reason: reassignTrimmed }, authorizedConfig(session.accessToken)))}
              >
                Confirm Reassign
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "escalate" ? (
        <ModalShell
          title="Escalate Complaint"
          subtitle="Write the reason for escalation. This complaint will move back to the complaint pool and appear in Escalated / Reassigned Requests."
          onClose={closeActionModal}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Reason For Escalation
              </div>
              <WorkspaceTextArea
                rows={6}
                value={complaintForm.escalationReason}
                onChange={(event) => setComplaintForm((current) => ({ ...current, escalationReason: event.target.value }))}
                placeholder="Write reasons for escalation"
              />
              <ErrorText>{escalationReasonError}</ErrorText>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !!escalationReasonError || escalationTrimmed.length < 4}
                onClick={() => runAction("escalate", () => apiClient.patch(`/complaints/${id}/escalate`, { reason: escalationTrimmed }, authorizedConfig(session.accessToken)))}
              >
                Confirm Escalate
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "resolve" ? (
        <ModalShell
          title="Resolve Complaint"
          subtitle="Write the resolved summary before confirming. The citizen complaint view will show the case as resolved."
          onClose={closeActionModal}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Resolved Summary
              </div>
              <WorkspaceTextArea
                rows={8}
                value={complaintForm.resolutionSummary}
                onChange={(event) => setComplaintForm((current) => ({ ...current, resolutionSummary: event.target.value }))}
                placeholder="Write the resolved summary"
              />
              <div style={{ marginTop: 8, fontSize: 12, color: C.t3 }}>{resolutionWordCount} / 1000 words</div>
              <ErrorText>{resolutionError}</ErrorText>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !!resolutionError || resolutionTrimmed.length < 10}
                onClick={() => runAction("resolve", () => apiClient.patch(`/complaints/${id}/resolve`, { resolutionSummary: resolutionTrimmed, resolutionDocs: [] }, authorizedConfig(session.accessToken)))}
              >
                Confirm Resolve
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "scheduleMeeting" ? (
        <ModalShell
          title="Schedule Meeting"
          subtitle="Choose a future date and time. The existing admin calendar logic stays unchanged."
          onClose={closeActionModal}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Date And Time
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <WorkspaceInput type="date" min={new Date().toISOString().slice(0, 10)} value={complaintForm.scheduleDate} onChange={(event) => setComplaintForm((current) => ({ ...current, scheduleDate: event.target.value }))} />
                <WorkspaceInput type="time" value={complaintForm.scheduleTime} onChange={(event) => setComplaintForm((current) => ({ ...current, scheduleTime: event.target.value }))} />
              </div>
              <ErrorText>{scheduleError}</ErrorText>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !scheduledIso || !!scheduleError}
                onClick={() => runAction("scheduleMeeting", () => apiClient.patch(`/complaints/${id}/schedule-call`, { callScheduledAt: scheduledIso }, authorizedConfig(session.accessToken)))}
              >
                Confirm Schedule
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "logs" ? (
        <ModalShell
          title="Complaint Logs"
          subtitle="Select the log type and optionally write the summary before confirming."
          onClose={closeActionModal}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Log Type
              </div>
              <WorkspaceSelect value={complaintForm.logType} onChange={(event) => setComplaintForm((current) => ({ ...current, logType: event.target.value }))}>
                <option value="">Select log type</option>
                <option value="phone_call">Phone Call</option>
                <option value="mail">Mail</option>
                <option value="letter_summary">Letter Summary</option>
              </WorkspaceSelect>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                Summary
              </div>
              <WorkspaceTextArea
                rows={6}
                value={complaintForm.logSummary}
                onChange={(event) => setComplaintForm((current) => ({ ...current, logSummary: event.target.value }))}
                placeholder="Write summary if needed"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !complaintForm.logType}
                onClick={() => runAction("logs", () => apiClient.patch(`/complaints/${id}/log`, { logType: complaintForm.logType, summary: complaintForm.logSummary.trim() }, authorizedConfig(session.accessToken)))}
              >
                Confirm Log
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "reopen" ? (
        <ModalShell title="Reopen Complaint" subtitle="Write the reason before reopening this complaint." onClose={closeActionModal}>
          <div style={{ display: "grid", gap: 16 }}>
            <WorkspaceTextArea value={complaintForm.reopenReason} onChange={(event) => setComplaintForm((current) => ({ ...current, reopenReason: event.target.value }))} rows={6} placeholder="Reason to reopen" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
              <WorkspaceButton type="button" disabled={actionLoading || complaintForm.reopenReason.trim().length < 3} onClick={() => runAction("reopen", () => apiClient.patch(`/complaints/${id}/reopen`, { reason: complaintForm.reopenReason.trim() }, authorizedConfig(session.accessToken)))}>
                Confirm Reopen
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "close" ? (
        <ModalShell title="Close Complaint" subtitle="Write the closure note before confirming." onClose={closeActionModal}>
          <div style={{ display: "grid", gap: 16 }}>
            <WorkspaceTextArea value={complaintForm.closeNote} onChange={(event) => setComplaintForm((current) => ({ ...current, closeNote: event.target.value }))} rows={6} placeholder="Closure note" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
              <WorkspaceButton type="button" disabled={actionLoading || complaintForm.closeNote.trim().length < 3} onClick={() => runAction("close", () => apiClient.patch(`/complaints/${id}/close`, { note: complaintForm.closeNote.trim() }, authorizedConfig(session.accessToken)))}>
                Confirm Close
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}
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
