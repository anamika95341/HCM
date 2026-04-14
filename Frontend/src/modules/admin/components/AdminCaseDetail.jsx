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
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateLabel(value) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  const [selectedAction, setSelectedAction] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingSuccessRedirect, setPendingSuccessRedirect] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [isBackHovered, setIsBackHovered] = useState(false);
  const complaintInfoRef = useRef(null);
  const [complaintInfoHeight, setComplaintInfoHeight] = useState(540);
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
  const isComplaintPoolDetail = source === "complaint-pool";
  const isComplaintQueueDetail = source === "complaint-queue";
  const isMyCasesDetail = source === "my-cases";
  const isResolvedCompletedDetail = source === "resolved-completed";
  const isEscalatedOrReassignedDetail = source === "escalated-reassigned";
  const useComplaintQueueLayout = isComplaintQueueDetail || isMyCasesDetail;

  useEffect(() => {
    if (focusedAction) setSelectedAction(focusedAction);
  }, [focusedAction]);

  useEffect(() => {
    if (!useComplaintQueueLayout || !complaintInfoRef.current || typeof ResizeObserver === "undefined") return undefined;
    const updateHeight = () => {
      if (!complaintInfoRef.current) return;
      setComplaintInfoHeight(Math.max(540, complaintInfoRef.current.offsetHeight));
    };
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(complaintInfoRef.current);
    return () => observer.disconnect();
  }, [history, item, useComplaintQueueLayout]);

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
    isComplaintPoolDetail || isResolvedCompletedDetail || isEscalatedOrReassignedDetail
      ? PATHS.admin.workQueue
      : source === "complaint-queue"
        ? PATHS.admin.complaintQueue
        : isMyCasesDetail
          ? PATHS.admin.cases
          : PATHS.admin.cases;
  const backLabel =
    backPath === PATHS.admin.workQueue
      ? "Back to Work Queue"
      : backPath === PATHS.admin.complaintQueue
        ? "Back to Complaint Queue"
        : "Back to My Cases";
  const attachedFiles = getAttachedFiles(item);
  const createdAtLabel = formatDateTimeLabel(item.createdAt);
  const incidentDateLabel = formatDateLabel(item.incidentDate);
  const handoffDateLabel = formatDateLabel(item.updatedAt);
  const complaintStateLabel = item.handoffType || item.status || "";
  const handoffTypeLabel = complaintStateLabel
    ? complaintStateLabel.split("_").filter(Boolean).map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(" ")
    : "None";
  const detailValueStyle = { fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" };
  const standardGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18, alignItems: "start" };
  const showAssignToMeButton = isComplaintPoolDetail;
  const showWorkflowActions = !isComplaintPoolDetail && !isEscalatedOrReassignedDetail && !isResolvedCompletedDetail;
  const complaintStatusLabel = statusLabel(item.status);

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
          {item.statusReason ? <NoticeBox tone="amber" label="Reason for Escalation" value={item.statusReason} /> : null}
        </>
      );
    }

    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, alignItems: "start" }}>
          <DetailItem label="Complaint Id" value={item.complaintId} />
          <DetailItem label="Created At" value={createdAtLabel} />
        </div>
        {renderTitleBlock(item.title)}
        <div style={standardGridStyle}>
          <DetailItem label="Category" value={item.complaintType || "Not provided"} />
          <DetailItem label="Citizen Name" value={item.citizenSnapshot?.name || "Not provided"} />
          <DetailItem label="Citizen Phone Number" value={item.citizenSnapshot?.phoneNumbers?.[0] || "Not provided"} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, alignItems: "start" }}>
          <DetailItem label="Date of Incident" value={incidentDateLabel} />
          <DetailItem label="Incident Location" value={item.complaintLocation || "Not provided"} />
        </div>
        {renderDescriptionBlock(item.description)}
      </>
    );
  }

  function renderEscalatedInfo() {
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
          <DetailItem label="Handoff Type" value={handoffTypeLabel} />
          <DetailItem label="Resolved Date" value={handoffDateLabel} />
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
        {item.statusReason ? <NoticeBox tone="amber" label="Reason for Escalation" value={item.statusReason} /> : null}
        {item.resolutionSummary ? <NoticeBox tone="green" label="Summary" value={item.resolutionSummary} /> : null}
      </>
    );
  }

  function renderMyCasesInfo() {
    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label="Complaint Id" value={item.complaintId} />
          <DetailItem label="Status" value={handoffTypeLabel} />
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

  function renderComplaintQueueInfo() {
    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label="Complaint Id" value={item.complaintId} />
          <DetailItem
            label="Status"
            value={(
              <WorkspaceBadge status={item.status} title={complaintStatusLabel}>
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
    <WorkspacePage
      width={1280}
      outerStyle={{ height: "calc(100vh - 73px)", overflow: "auto" }}
      contentStyle={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <SuccessModal open={!!successMessage} message={successMessage} onClose={handleSuccessModalClose} />
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
      <div style={{ display: "grid", gap: 16, flex: 1, minHeight: 0 }}>

        {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : null}

        <WorkspaceCard style={{ padding: 0, marginBottom: 0, border: "none", background: "transparent" }}>
          {showAssignToMeButton ? (
            <WorkspaceButton
              type="button"
              disabled={actionLoading}
              onClick={() => runAction("assign", () => apiClient.patch(`/complaints/${id}/assign-self`, {}))}
              style={{ boxShadow: "none" }}
            >
              Assign to Me
            </WorkspaceButton>
          ) : showWorkflowActions ? (
            <div className="grid md:grid-cols-[minmax(0,320px)_auto] gap-3 items-start">
              <WorkspaceSelect value={activeAction} onChange={(event) => setSelectedAction(event.target.value)}>
                <option value="">Select workflow action</option>
                {availableActions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </WorkspaceSelect>
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
                  <WorkspaceCardHeader title="Complaint Information" />
                  <div style={{ display: "grid", gap: 18 }}>
                    {renderComplaintQueueInfo()}
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
                            <p style={{ fontSize: 12, color: C.t3, whiteSpace: "nowrap", margin: 0 }}>{new Date(event.created_at).toLocaleDateString("en-IN")}</p>
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
              <WorkspaceCardHeader title="Meeting Files" subtitle="View the citizen submission files and uploaded complaint artifacts." />
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
          <WorkspaceCard style={{ marginBottom: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <WorkspaceCardHeader title="Complaint Information" />
            <div style={{ display: "grid", gap: 18, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
              {isComplaintPoolDetail
                ? renderComplaintPoolInfo()
                : isEscalatedOrReassignedDetail
                  ? renderEscalatedInfo()
                  : isResolvedCompletedDetail
                    ? renderResolvedInfo()
                    : renderMyCasesInfo()}
              {attachedFiles.length > 0 ? (
                <div>
                  <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 8px" }}>Attached Documents</p>
                  <div style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated, display: "grid", gap: 10 }}>
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id || file.downloadUrl || file.name}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ ...detailValueStyle }}>{file.name}</div>
                          <div style={{ marginTop: 2, fontSize: 12, color: C.t3 }}>{file.mimeType || "Document"}</div>
                        </div>
                        <WorkspaceButton type="button" variant="outline" onClick={() => openDownloadUrl(file.downloadUrl)}>
                          Download
                        </WorkspaceButton>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </WorkspaceCard>
        )}
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
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
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
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
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
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
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
                onClick={() => runAction("logs", () => apiClient.patch(`/complaints/${id}/log`, { logType: complaintForm.logType, summary: complaintForm.logSummary.trim() }))}
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
              <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>Cancel</WorkspaceButton>
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
      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", ...(valueStyle || {}) }}>
        {value}
      </p>
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
