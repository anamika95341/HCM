import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import { PATHS } from "../../../routes/paths.js";
import { apiClient } from "../../../shared/api/client.js";
import { openDownloadUrl } from "../../../shared/api/downloads.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
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

const WORKFLOW_ACTION_LABELS = {
  assign: "Assign to Me",
  reassign: "Reassign",
  logs: "Logs",
  scheduleMeeting: "Schedule Meeting",
  resolve: "Resolve",
  escalate: "Escalate",
  reopen: "Reopen",
  close: "Close",
};

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

function statusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function complaintWorkflowStatus(item, adminId) {
  if (item?.status === "resolved") return "resolved";
  if (item?.handoffType === "reassigned" && item?.handoffByAdminUserId === adminId && item?.handoffToAdminUserId !== adminId) return "reassigned";
  if (item?.handoffType === "reassigned" && item?.handoffToAdminUserId === adminId && item?.status === "assigned") return "reassigned";
  if (item?.status === "assigned") return "accepted";
  if (["in_review", "call_scheduled", "followup_in_progress"].includes(item?.status)) return "complaint_logged";
  return item?.status || "";
}

function complaintWorkflowLabel(status) {
  if (status === "accepted") return "Accepted";
  if (status === "complaint_logged") return "Complaint Logged";
  if (status === "reassigned") return "Reassigned";
  if (status === "resolved") return "Resolved";
  return statusLabel(status);
}

function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
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

export function ModalShell({ title, subtitle, children, onClose, maxWidth = 720, minHeight = 360 }) {
  const { C } = usePortalTheme();
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  return (
    <CenteredOverlay>
      <div
        style={{
          width: "100%",
          maxWidth,
          minHeight,
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
          <button
            type="button"
            onClick={onClose}
            onMouseEnter={() => setIsCloseHovered(true)}
            onMouseLeave={() => setIsCloseHovered(false)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "none",
              background: isCloseHovered ? C.danger : "transparent",
              color: isCloseHovered ? "#ffffff" : C.danger,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1,
              padding: 0,
              transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
            }}
            aria-label="Close"
          >
            ×
          </button>
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

function getAttachedFiles(item) {
  if (Array.isArray(item?.files) && item.files.length > 0) {
    return item.files;
  }
  return item?.document ? [item.document] : [];
}

export function SuccessModal({ open, message, onClose }) {
  const { C } = usePortalTheme();
  if (!open) return null;
  return (
    <CenteredOverlay>
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          minHeight: 300,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          boxShadow: C.dialogShadow,
          padding: 24,
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
          Okay
        </WorkspaceButton>
      </div>
    </CenteredOverlay>
  );
}

function formatDateTimeLabel(value) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatDateLabel(value) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
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
  const [modalAction, setModalAction] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingSuccessRedirect, setPendingSuccessRedirect] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [isBackHovered, setIsBackHovered] = useState(false);
  const complaintInfoRef = useRef(null);
  const [complaintInfoHeight, setComplaintInfoHeight] = useState(540);
  const [complaintForm, setComplaintForm] = useState({
    logType: "",
    logTypes: [],
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
  const activeAction = modalAction;
  const showAssignToMeOnly = !item?.assignedAdminUserId;
  const isComplaintPoolDetail = source === "complaint-pool";
  const isComplaintQueueDetail = source === "complaint-queue";
  const isMyCasesDetail = source === "my-cases";
  const isResolvedCompletedDetail = source === "resolved-completed" || source === "resolved-complaints";
  const isEscalatedOrReassignedDetail = source === "escalated-reassigned";
  const useComplaintQueueLayout = isComplaintQueueDetail || isMyCasesDetail || isResolvedCompletedDetail || isEscalatedOrReassignedDetail;
  const complaintPoolBackPath = `${PATHS.admin.workQueue}?tab=complaint-pool`;

  useEffect(() => {
    if (focusedAction) {
      setModalAction(focusedAction);
    }
  }, [focusedAction]);

  useEffect(() => {
    if (!complaintInfoRef.current || typeof ResizeObserver === "undefined") return undefined;
    const updateHeight = () => {
      if (!complaintInfoRef.current) return;
      setComplaintInfoHeight(Math.max(540, complaintInfoRef.current.offsetHeight));
    };
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(complaintInfoRef.current);
    return () => observer.disconnect();
  }, [history, item, useComplaintQueueLayout, isComplaintPoolDetail, isEscalatedOrReassignedDetail, isResolvedCompletedDetail]);

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      try {
        const { data } = await apiClient.get(`/complaints/${id}/admin-view`);
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

    if (session?.role) {
      loadDetail();
    }

    return () => {
      mounted = false;
    };
  }, [id, session?.role]);

  const availableActions = useMemo(
    () => {
      const actions = buildComplaintActions(item || {}, session?.user?.id);
      if (isMyCasesDetail) {
        return actions;
      }

      const incomingReassigned = item?.handoffType === "reassigned" && item?.handoffToAdminUserId === session?.user?.id;
      return incomingReassigned
        ? actions.filter(([value]) => value !== "reassign")
        : actions;
    },
    [item, session?.user?.id, isMyCasesDetail]
  );

  const liveWorkflowStatus = complaintWorkflowStatus(item, session?.user?.id);
  const committedWorkflowAction = liveWorkflowStatus === "complaint_logged" ? "logs" : "";
  const workflowSelectValue = modalAction || committedWorkflowAction;
  const workflowFeedback = liveWorkflowStatus === "complaint_logged"
    ? {
        tone: "green",
        message: "Complaint Logs filled",
      }
    : null;

  const workflowOptions = useMemo(() => {
    const committedLabel = WORKFLOW_ACTION_LABELS[committedWorkflowAction] || "";
    const remaining = availableActions.filter(([value]) => value !== committedWorkflowAction && value !== modalAction);
    if (committedWorkflowAction) {
      return [
        { value: committedWorkflowAction, label: committedLabel, disabled: true },
        ...remaining.map(([value, label]) => ({ value, label, disabled: false })),
      ];
    }
    if (modalAction && !availableActions.some(([value]) => value === modalAction)) {
      return [
        { value: modalAction, label: WORKFLOW_ACTION_LABELS[modalAction] || statusLabel(modalAction), disabled: true },
        ...remaining.map(([value, label]) => ({ value, label, disabled: false })),
      ];
    }
    return availableActions.map(([value, label]) => ({ value, label, disabled: false }));
  }, [availableActions, committedWorkflowAction, modalAction]);

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
        const detail = await apiClient.get(`/complaints/${id}/admin-view`);
        setItem(detail.data.complaint);
        setHistory(detail.data.history || []);
      }
      if (actionName === "assign") {
        if (isComplaintPoolDetail) {
          setSuccessMessage("Complaint assigned successfully.");
          setPendingSuccessRedirect(PATHS.admin.complaintQueue);
        } else {
          navigate(PATHS.admin.complaintQueue);
        }
        return;
      }
      if (actionName === "escalate") {
        navigate(complaintPoolBackPath);
        return;
      }
      if (actionName === "reassign") {
        setModalAction("");
        navigate(`${PATHS.admin.workQueue}?tab=escalated`);
        return;
      }
      if (actionName === "logs") {
        setModalAction("");
        setComplaintForm((current) => ({
          ...current,
          logTypes: [],
          logSummary: "",
        }));
        return;
      }
      if (actionName === "resolve") {
        setModalAction("");
        navigate(`${PATHS.admin.workQueue}?tab=resolved-complaints`);
        return;
      }
      setSuccessMessage(`${item?.complaintId || "Complaint"} updated successfully.`);
    } catch (actionError) {
      setError(actionError?.response?.data?.error || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  function closeActionModal() {
    setModalAction("");
  }

  function handleWorkflowActionSelect(value) {
    setModalAction(value);
  }

  function toggleLogType(logType) {
    setComplaintForm((current) => ({
      ...current,
      logTypes: current.logTypes.includes(logType)
        ? current.logTypes.filter((value) => value !== logType)
        : [...current.logTypes, logType],
    }));
  }

  function handleSuccessModalClose() {
    if (pendingSuccessRedirect) {
      const redirect = pendingSuccessRedirect;
      setPendingSuccessRedirect("");
      setSuccessMessage("");
      navigate(redirect);
      return;
    }
    setSuccessMessage("");
  }

  if (!item) {
    return (
      <WorkspacePage
        width={1280}
        outerStyle={{ height: "calc(100vh - 73px)", overflow: "auto" }}
        contentStyle={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : <WorkspaceEmptyState title="Loading case details..." />}
      </WorkspacePage>
    );
  }

  const backPath =
    isComplaintPoolDetail
      ? complaintPoolBackPath
      : isResolvedCompletedDetail
        ? `${PATHS.admin.workQueue}?tab=resolved-complaints`
        : isEscalatedOrReassignedDetail
          ? `${PATHS.admin.workQueue}?tab=escalated`
      : source === "complaint-queue"
        ? PATHS.admin.complaintQueue
        : isMyCasesDetail
          ? PATHS.admin.cases
          : PATHS.admin.cases;
  const backLabel =
    isComplaintPoolDetail
      ? "Back"
      : isComplaintQueueDetail || isEscalatedOrReassignedDetail || isResolvedCompletedDetail
        ? "Back"
        : backPath === PATHS.admin.workQueue
          ? "Back to Work Queue"
          : backPath === PATHS.admin.complaintQueue
            ? "Back"
            : "Back to My Cases";
  const attachedFiles = getAttachedFiles(item);
  const createdAtLabel = formatDateTimeLabel(item.createdAt);
  const incidentDateLabel = formatDateLabel(item.incidentDate);
  const handoffDateLabel = formatDateLabel(item.updatedAt);
  const complaintStateLabel = item.handoffType || item.status || "";
  const handoffTypeLabel = complaintStateLabel
    ? complaintStateLabel.split("_").filter(Boolean).map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(" ")
    : "None";
  const detailValueStyle = { fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" };
  const standardGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20, alignItems: "start" };
  const pairedGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, alignItems: "start" };
  const complaintPoolGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24, alignItems: "start" };
  const citizenDistrict = item.citizenSnapshot?.district || "Not provided";
  const citizenLocalMp = item.citizenSnapshot?.localMp || "Not provided";
  const currentAdminId = session?.user?.id;
  const workflowStatus = complaintWorkflowStatus(item, currentAdminId);
  const showAssignToMeButton = isComplaintPoolDetail;
  const isOutgoingReassignedComplaint = item.handoffType === "reassigned" && item.handoffByAdminUserId === currentAdminId && item.handoffToAdminUserId !== currentAdminId;
  const showWorkflowActions = !isComplaintPoolDetail && !isEscalatedOrReassignedDetail && !isResolvedCompletedDetail && item.status !== "resolved" && !isOutgoingReassignedComplaint;
  const complaintStatusLabel = complaintWorkflowLabel(workflowStatus);
  const isResolvedComplaint = item.status === "resolved";
  const isReassignedComplaint = isOutgoingReassignedComplaint;
  const complaintLogSummary = item.callOutcome || "";

  function renderTitleBlock(value) {
    return <DetailItem label="Title" value={value || "Untitled Complaint"} valueStyle={detailValueStyle} />;
  }

  function renderDescriptionBlock(value) {
    return <DetailItem label="Description" value={value || "Not provided"} valueStyle={detailValueStyle} />;
  }

  function renderComplaintPoolInfo() {
    if (item.handoffType === "escalated") {
      return (
        <>
          <div style={standardGridStyle}>
            <DetailItem label="Complaint Id" value={item.complaintId} />
            <DetailItem label="Handoff Type" value={handoffTypeLabel} />
            <DetailItem label="Escalation Date" value={handoffDateLabel} />
          </div>
          {renderTitleBlock(item.title)}
          <div style={standardGridStyle}>
            <DetailItem label="Category" value={item.complaintType || "Not provided"} />
            <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
            <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
          </div>
        <div style={standardGridStyle}>
          <DetailItem label="Created At" value={createdAtLabel} />
          <DetailItem label="Date of Incident" value={incidentDateLabel} />
          <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
        </div>
        {renderDescriptionBlock(item.description)}
        {complaintLogSummary ? <NoticeBox tone="blue" label="Complaint Log Summary" value={complaintLogSummary} /> : null}
        {item.statusReason ? <NoticeBox tone="amber" label="Reason for Escalation" value={item.statusReason} /> : null}
      </>
    );
  }

    return (
      <>
        <div className="grid md:grid-cols-3 gap-6">
          <DetailItem label="Complaint Id" value={item.complaintId} />
          <DetailItem label="Created At" value={createdAtLabel} />
          <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
          <DetailItem label="District" value={citizenDistrict} />
          <DetailItem label="MP of District" value={citizenLocalMp} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Title</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>
            {item.title || "Untitled Complaint"}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <DetailItem label="Category" value={item.complaintType || "Not provided"} />
          <DetailItem label="Date of Incident" value={incidentDateLabel} />
          <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Description</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {item.description || "Not provided"}
          </p>
        </div>
      </>
    );
  }

  function renderEscalatedInfo() {
    if (item.handoffType === "reassigned") {
      return (
        <>
          <div style={standardGridStyle}>
            <DetailItem label="Complaint Id" value={item.complaintId} />
            <DetailItem label="Reassigned Date" value={handoffDateLabel} />
            <DetailItem label="Reassigned To" value={item.assignedAdminName || item.currentOwner || "Not provided"} />
          </div>
          <div style={standardGridStyle}>
            <DetailItem label="Created At" value={createdAtLabel} />
            <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
            <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
          </div>
          <div style={standardGridStyle}>
            <DetailItem label="District" value={citizenDistrict} />
            <DetailItem label="MP of District" value={citizenLocalMp} />
            <div />
          </div>
          {renderTitleBlock(item.title)}
          <div style={standardGridStyle}>
            <DetailItem label="Category" value={item.complaintType || "Not provided"} />
            <DetailItem label="Date of Incident" value={incidentDateLabel} />
            <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
          </div>
          {renderDescriptionBlock(item.description)}
          {complaintLogSummary ? <NoticeBox tone="blue" label="Complaint Log Summary" value={complaintLogSummary} /> : null}
          {item.statusReason ? <NoticeBox tone="blue" label="Reason for Reassignation" value={item.statusReason} /> : null}
        </>
      );
    }

    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label="Complaint Id" value={item.complaintId} />
          <DetailItem label="Handoff Type" value={handoffTypeLabel} />
          <DetailItem label={item.handoffType === "reassigned" ? "Reassignation Date" : "Escalation Date"} value={handoffDateLabel} />
        </div>
        {renderTitleBlock(item.title)}
        <div style={standardGridStyle}>
          <DetailItem label="Category" value={item.complaintType || "Not provided"} />
          <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
          <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label="Created At" value={createdAtLabel} />
          <DetailItem label="Date of Incident" value={incidentDateLabel} />
          <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
        </div>
        {renderDescriptionBlock(item.description)}
        {complaintLogSummary ? <NoticeBox tone="blue" label="Complaint Log Summary" value={complaintLogSummary} /> : null}
        {item.statusReason ? (
          <NoticeBox
            tone={item.handoffType === "reassigned" ? "blue" : "amber"}
            label={item.handoffType === "reassigned" ? "Reason for Reassignation" : "Reason for Escalation"}
            value={item.statusReason}
          />
        ) : null}
      </>
    );
  }

  function renderResolvedInfo() {
    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label="Complaint Id" value={item.complaintId} />
          <DetailItem label="Resolved Date" value={handoffDateLabel} />
          <div />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label="Created At" value={createdAtLabel} />
          <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
          <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label="District" value={citizenDistrict} />
          <DetailItem label="MP of District" value={citizenLocalMp} />
          <div />
        </div>
        {renderTitleBlock(item.title)}
        <div style={standardGridStyle}>
          <DetailItem label="Category" value={item.complaintType || "Not provided"} />
          <DetailItem label="Date of Incident" value={incidentDateLabel} />
          <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
        </div>
        {renderDescriptionBlock(item.description)}
        {complaintLogSummary ? <NoticeBox tone="blue" label="Complaint Log Summary" value={complaintLogSummary} /> : null}
        {item.resolutionSummary ? <NoticeBox tone="green" label="Resolved Summary" value={item.resolutionSummary} /> : null}
      </>
    );
  }

  function renderMyCasesInfo() {
    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label="Complaint Id" value={item.complaintId} />
          <DetailItem label="Status" value={complaintStatusLabel} />
          <DetailItem label="Updated Date" value={handoffDateLabel} />
        </div>
        {renderTitleBlock(item.title)}
        <div style={standardGridStyle}>
          <DetailItem label="Category" value={item.complaintType || "Not provided"} />
          <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
          <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label="Created At" value={createdAtLabel} />
          <DetailItem label="Date of Incident" value={incidentDateLabel} />
          <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
        </div>
        {renderDescriptionBlock(item.description)}
        {complaintLogSummary ? <NoticeBox tone="blue" label="Complaint Log Summary" value={complaintLogSummary} /> : null}
        {item.statusReason ? (
          <NoticeBox
            tone={item.handoffType === "reassigned" ? "blue" : "amber"}
            label={item.handoffType === "reassigned" ? "Reason for Reassignation" : "Reason for Escalation"}
            value={item.statusReason}
          />
        ) : null}
        {item.resolutionSummary ? <NoticeBox tone="green" label="Mark As Resolved Summary" value={item.resolutionSummary} /> : null}
      </>
    );
  }

  function renderComplaintQueueInfo() {
    if (isMyCasesDetail) {
      return (
        <>
          <div style={standardGridStyle}>
            <DetailItem label="Complaint Id" value={item.complaintId} />
            <DetailItem
              label="Status"
              value={(
                <WorkspaceBadge status={item.status} title={statusLabel(item.status)}>
                  {statusLabel(item.status)}
                </WorkspaceBadge>
              )}
            />
            <DetailItem label="Updated Date" value={handoffDateLabel} />
          </div>
          {renderTitleBlock(item.title)}
          <div style={standardGridStyle}>
            <DetailItem label="Category" value={item.complaintType || "Not provided"} />
            <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
            <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
          </div>
          <div style={standardGridStyle}>
            <DetailItem label="Created At" value={createdAtLabel} />
            <DetailItem label="Date of Incident" value={incidentDateLabel} />
            <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
          </div>
          {renderDescriptionBlock(item.description)}
          {item.statusReason ? (
            <NoticeBox
              tone={item.handoffType === "reassigned" ? "blue" : "amber"}
              label={item.handoffType === "reassigned" ? "Reason for Reassignation" : "Reason for Escalation"}
              value={item.statusReason}
            />
          ) : null}
          {item.resolutionSummary ? <NoticeBox tone="green" label="Summary" value={item.resolutionSummary} /> : null}
        </>
      );
    }

    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label="Complaint Id" value={item.complaintId} />
          <DetailItem
            label="Status"
            value={(
              <WorkspaceBadge status={workflowStatus} color={workflowStatus === "reassigned" ? C.danger : workflowStatus === "complaint_logged" ? C.warn : undefined} title={complaintStatusLabel}>
                {complaintStatusLabel}
              </WorkspaceBadge>
            )}
          />
          <DetailItem label="Updated Date" value={handoffDateLabel} />
        </div>
        {renderTitleBlock(item.title)}
        <div style={standardGridStyle}>
          <DetailItem label="Category" value={item.complaintType || "Not provided"} />
          <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
          <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label="Created At" value={createdAtLabel} />
          <DetailItem label="Date of Incident" value={incidentDateLabel} />
          <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
        </div>
        {renderDescriptionBlock(item.description)}
        {complaintLogSummary ? <NoticeBox tone="blue" label="Complaint Log Summary" value={complaintLogSummary} /> : null}
        {item.statusReason ? (
          <NoticeBox
            tone={item.handoffType === "reassigned" ? "blue" : "amber"}
            label={item.handoffType === "reassigned" ? "Reason for Reassignation" : "Reason for Escalation"}
            value={item.statusReason}
          />
        ) : null}
        {item.resolutionSummary ? <NoticeBox tone="green" label="Mark As Resolved Summary" value={item.resolutionSummary} /> : null}
      </>
    );
  }

  function renderPrimaryDetailInfo() {
    if (isComplaintPoolDetail) return renderComplaintPoolInfo();
    if (isEscalatedOrReassignedDetail) return renderEscalatedInfo();
    if (isResolvedCompletedDetail) return renderResolvedInfo();
    if (useComplaintQueueLayout) return renderComplaintQueueInfo();
    return renderMyCasesInfo();
  }

  return (
    <WorkspacePage
      width={1280}
      outerStyle={{ height: "calc(100vh - 73px)", overflow: "auto" }}
      contentStyle={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <SuccessModal open={!!successMessage} message={successMessage} onClose={handleSuccessModalClose} />
      {isMyCasesDetail ? (
        <WorkspaceSectionHeader
          title={item.complaintId}
          action={
            <button
              type="button"
              onClick={() => navigate(backPath)}
              onMouseEnter={() => setIsBackHovered(true)}
              onMouseLeave={() => setIsBackHovered(false)}
              style={{
                minHeight: 38,
                padding: "0 16px",
                borderRadius: 10,
                border: `1px solid ${C.purple}`,
                background: isBackHovered ? C.purple : "transparent",
                color: isBackHovered ? "#ffffff" : C.purple,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
              }}
            >
              <ChevronLeft size={16} />
              {backLabel}
            </button>
          }
        />
      ) : isComplaintPoolDetail || isComplaintQueueDetail || isResolvedCompletedDetail || isEscalatedOrReassignedDetail ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <div style={{ justifySelf: "start" }}>
            <button
              type="button"
              onClick={() => navigate(backPath)}
              onMouseEnter={() => setIsBackHovered(true)}
              onMouseLeave={() => setIsBackHovered(false)}
              style={{
                minHeight: 38,
                padding: "0 16px",
                borderRadius: 10,
                border: `1px solid ${C.purple}`,
                background: isBackHovered ? C.purple : "transparent",
                color: isBackHovered ? "#ffffff" : C.purple,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
              }}
            >
              <ChevronLeft size={16} />
              {backLabel}
            </button>
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.t1, textAlign: "center" }}>COMPLAINT DETAILS</h2>
          <div />
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.t1 }}>{item.complaintId}</h2>
          <button
            type="button"
            onClick={() => navigate(backPath)}
            onMouseEnter={() => setIsBackHovered(true)}
            onMouseLeave={() => setIsBackHovered(false)}
            style={{
              minHeight: 38,
              padding: "0 16px",
              borderRadius: 10,
              border: `1px solid ${C.purple}`,
              background: isBackHovered ? C.purple : "transparent",
              color: isBackHovered ? "#ffffff" : C.purple,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "background var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
            }}
          >
            <ChevronLeft size={16} />
            {backLabel}
          </button>
        </div>
      )}
      <div style={{ display: "grid", gap: 16, flex: 1, minHeight: 0 }}>

        {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : null}

        <WorkspaceCard style={{ padding: 0, marginBottom: 0, border: "none", background: "transparent" }}>
          {showAssignToMeButton && !isComplaintPoolDetail ? (
            <WorkspaceButton
              type="button"
              disabled={actionLoading}
              onClick={() => runAction("assign", () => apiClient.patch(`/complaints/${id}/assign-self`, {}))}
              style={{ boxShadow: "none" }}
            >
              Assign to Me
            </WorkspaceButton>
          ) : showWorkflowActions && !isComplaintQueueDetail ? (
            <div className="grid md:grid-cols-[minmax(0,320px)_auto] gap-3 items-start">
              {isMyCasesDetail ? (
                <WorkspaceSelect value={modalAction} onChange={(event) => handleWorkflowActionSelect(event.target.value)}>
                  <option value="">Select workflow action</option>
                  {availableActions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </WorkspaceSelect>
              ) : (
                <>
                  <WorkspaceSelect value={workflowSelectValue} onChange={(event) => handleWorkflowActionSelect(event.target.value)}>
                    {!committedWorkflowAction ? <option value="">Select workflow action</option> : null}
                    {workflowOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </option>
                    ))}
                  </WorkspaceSelect>
                  <InlineActionFeedback feedback={workflowFeedback} />
                </>
              )}
            </div>
          ) : null}
        </WorkspaceCard>

        {useComplaintQueueLayout ? (
          <>
            <div
              style={{
                display: "grid",
                gap: 24,
                gridTemplateColumns: "minmax(0, 7fr) minmax(280px, 3fr)",
                alignItems: "start",
              }}
            >
              <div ref={complaintInfoRef}>
                <WorkspaceCard style={{ marginBottom: 0, minHeight: 540, display: "flex", flexDirection: "column" }}>
                  {isMyCasesDetail ? (
                    <WorkspaceCardHeader title="Complaint Information" />
                  ) : showWorkflowActions ? (
                    <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                      <WorkspaceSelect value={workflowSelectValue} onChange={(event) => handleWorkflowActionSelect(event.target.value)} style={{ maxWidth: 320 }}>
                        {!committedWorkflowAction ? <option value="">Select workflow action</option> : null}
                        {workflowOptions.map((option) => (
                          <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                          </option>
                        ))}
                      </WorkspaceSelect>
                      <InlineActionFeedback feedback={workflowFeedback} />
                    </div>
                  ) : null}
                  {isResolvedComplaint && !isMyCasesDetail ? (
                    <div style={{ paddingBottom: 16, marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          minHeight: 38,
                          padding: "0 16px",
                          borderRadius: 10,
                          background: C.mint,
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.2,
                        }}
                      >
                        <span aria-hidden="true">✓</span>
                        Resolved
                      </div>
                    </div>
                  ) : isReassignedComplaint && !isMyCasesDetail ? (
                    <div style={{ paddingBottom: 16, marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          minHeight: 38,
                          padding: "0 16px",
                          borderRadius: 10,
                          background: C.danger,
                          color: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.2,
                        }}
                      >
                        Reassigned
                      </div>
                    </div>
                  ) : null}
                  <div style={{ display: "grid", gap: 18 }}>
                    {renderPrimaryDetailInfo()}
                  </div>
                </WorkspaceCard>
              </div>

              <WorkspaceCard style={{ marginBottom: 0, height: complaintInfoHeight, minHeight: 540, display: "flex", flexDirection: "column" }}>
                <div className="flex items-center gap-2 mb-6">
                  <FileText size={22} color={C.purple} />
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>Timeline</h2>
                </div>
                <div style={{ display: "grid", gap: 18, overflowY: "auto", paddingRight: 6, flex: 1, minHeight: 0 }}>
                  {history.length === 0 ? (
                    <p style={{ fontSize: 13, color: C.t3 }}>No timeline events yet.</p>
                  ) : (
                    history.map((event, index) => (
                      <div key={`${event.created_at}-${index}`} className="flex gap-4">
                        <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
                          <div className="h-3 w-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
                          {index !== history.length - 1 ? <div className="mt-2 w-0.5 flex-1 min-h-10" style={{ background: C.purple }} /> : null}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, color: C.t1 }}>{statusLabel(event.new_status)}</p>
                              <p style={{ fontSize: 12, color: C.t3, marginTop: 4, marginBottom: 0 }}>{event.actor_role}</p>
                            </div>
                            <p style={{ fontSize: 12, color: C.t3, whiteSpace: "nowrap", margin: 0 }}>{new Date(event.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })}</p>
                          </div>
                          {event.note ? <p style={{ fontSize: 13, color: C.t2, marginTop: 8, marginBottom: 0, whiteSpace: "normal", wordBreak: "break-word" }}>{event.note}</p> : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </WorkspaceCard>
            </div>

            <WorkspaceCard style={{ marginBottom: 0 }}>
              <WorkspaceCardHeader
                title={isMyCasesDetail ? "Meeting Files" : "Complaint Files"}
                subtitle="View the citizen submission files and uploaded complaint artifacts."
              />
              {attachedFiles.length === 0 ? (
                <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>No files attached to this complaint yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {attachedFiles.map((file) => (
                    <div key={file.id || file.downloadUrl || file.name} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType || "Document"}</div>
                        </div>
                        <WorkspaceButton type="button" variant="outline" onClick={() => openDownloadUrl(file.downloadUrl)}>
                          Download
                        </WorkspaceButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </WorkspaceCard>
          </>
        ) : (
          <>
                <WorkspaceCard
                  style={
                    isComplaintPoolDetail
                      ? { marginBottom: 0, height: "auto", display: "flex", flexDirection: "column", paddingTop: 14 }
                      : { marginBottom: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingTop: 24 }
                  }
                >
              {isComplaintPoolDetail ? (
                <div style={{ padding: "0 0 14px 0", marginLeft: 2, borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
                  <WorkspaceButton
                    type="button"
                    disabled={actionLoading}
                    onClick={() => runAction("assign", () => apiClient.patch(`/complaints/${id}/assign-self`, {}))}
                    style={{ boxShadow: "none" }}
                  >
                    Assign to Me
                  </WorkspaceButton>
                </div>
              ) : (
                <WorkspaceCardHeader title="Complaint Information" />
              )}
              {isResolvedComplaint ? (
                <div style={{ paddingBottom: 16, marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      minHeight: 38,
                      padding: "0 16px",
                      borderRadius: 10,
                      background: C.mint,
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    <span aria-hidden="true">✓</span>
                    Resolved
                  </div>
                </div>
              ) : isReassignedComplaint ? (
                <div style={{ paddingBottom: 16, marginBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      minHeight: 38,
                      padding: "0 16px",
                      borderRadius: 10,
                      background: C.danger,
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    Reassigned
                  </div>
                </div>
              ) : null}
              <div
                style={
                  isComplaintPoolDetail
                    ? { display: "grid", gap: 18, paddingRight: 2 }
                    : { display: "grid", gap: 18, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }
                }
              >
                {renderPrimaryDetailInfo()}
              </div>
            </WorkspaceCard>

            <WorkspaceCard style={{ marginBottom: 0 }}>
              <WorkspaceCardHeader title="Complaint Files" subtitle="View the citizen submission files and uploaded complaint artifacts." />
              {attachedFiles.length === 0 ? (
                <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>No files attached to this complaint yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {attachedFiles.map((file) => (
                    <div key={file.id || file.downloadUrl || file.name} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType || "Document"}</div>
                        </div>
                        <WorkspaceButton type="button" variant="outline" onClick={() => openDownloadUrl(file.downloadUrl)}>
                          Download
                        </WorkspaceButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </WorkspaceCard>
          </>
        )}
      </div>

      {activeAction === "reassign" ? (
        <ModalShell
          title="Reassign Complaint"
          subtitle={isMyCasesDetail ? "Select the admin who should receive this complaint and write the reassignment reason." : "Select the admin who should receive this complaint. Reassignment reason is optional."}
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
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton> : null}
              <WorkspaceButton
                type="button"
                disabled={isMyCasesDetail ? actionLoading || !complaintForm.reassignTo || !!reassignReasonError || reassignTrimmed.length < 4 : actionLoading || !complaintForm.reassignTo || !!reassignReasonError}
                onClick={() => runAction("reassign", () => apiClient.patch(`/complaints/${id}/reassign`, { adminId: complaintForm.reassignTo, reason: reassignTrimmed }))}
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
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton> : null}
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !!escalationReasonError || escalationTrimmed.length < 4}
                onClick={() => runAction("escalate", () => apiClient.patch(`/complaints/${id}/escalate`, { reason: escalationTrimmed }))}
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
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton> : null}
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !!resolutionError || resolutionTrimmed.length < 10}
                onClick={() => runAction("resolve", () => apiClient.patch(`/complaints/${id}/resolve`, { resolutionSummary: resolutionTrimmed, resolutionDocs: [] }))}
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
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton> : null}
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !scheduledIso || !!scheduleError}
                onClick={() => runAction("scheduleMeeting", () => apiClient.patch(`/complaints/${id}/schedule-call`, { callScheduledAt: scheduledIso }))}
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
              {isMyCasesDetail ? (
                <WorkspaceSelect value={complaintForm.logType} onChange={(event) => setComplaintForm((current) => ({ ...current, logType: event.target.value }))}>
                  <option value="">Select log type</option>
                  <option value="phone_call">Phone Call</option>
                  <option value="mail">Mail</option>
                  <option value="letter_summary">Letter Summary</option>
                </WorkspaceSelect>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                  {[
                    ["phone_call", "Phone Call"],
                    ["letter_summary", "Letter"],
                    ["mail", "Mail"],
                    ["meeting", "Meeting"],
                  ].map(([value, label]) => {
                    const checked = complaintForm.logTypes.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleLogType(value)}
                        style={{
                          minHeight: 42,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: `1px solid ${checked ? C.purple : C.border}`,
                          background: checked ? `${C.purple}12` : C.inp,
                          color: checked ? C.purple : C.t2,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
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
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton> : null}
              <WorkspaceButton
                type="button"
                disabled={isMyCasesDetail ? actionLoading || !complaintForm.logType : actionLoading || complaintForm.logTypes.length === 0}
                onClick={() => runAction("logs", () => apiClient.patch(`/complaints/${id}/log`, isMyCasesDetail ? { logType: complaintForm.logType, summary: complaintForm.logSummary.trim() } : { logTypes: complaintForm.logTypes, summary: complaintForm.logSummary.trim() }))}
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
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton> : null}
              <WorkspaceButton type="button" disabled={actionLoading || complaintForm.reopenReason.trim().length < 3} onClick={() => runAction("reopen", () => apiClient.patch(`/complaints/${id}/reopen`, { reason: complaintForm.reopenReason.trim() }))}>
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
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton> : null}
              <WorkspaceButton type="button" disabled={actionLoading || complaintForm.closeNote.trim().length < 3} onClick={() => runAction("close", () => apiClient.patch(`/complaints/${id}/close`, { note: complaintForm.closeNote.trim() }))}>
                Confirm Close
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </WorkspacePage>
  );
}

function DetailItem({ label, value, valueStyle }) {
  const { C } = usePortalTheme();
  return (
    <div>
      <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", ...(valueStyle || {}) }}>
        {value}
      </p>
    </div>
  );
}

function InlineActionFeedback({ feedback }) {
  const { C } = usePortalTheme();
  if (!feedback) return null;
  const color = feedback.tone === "green" ? C.mint : feedback.tone === "amber" ? C.warn : C.t2;
  return (
    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color }}>
      {feedback.message}
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
      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t2, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{value}</p>
    </div>
  );
}
