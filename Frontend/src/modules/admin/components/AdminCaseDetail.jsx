import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
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

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const WORKFLOW_ACTION_LABELS = {
  assign: "Assign to Me",
  logs: "Logs",
  scheduleAppointment: "Schedule Appointment",
  resolve: "Resolve",
  reopen: "Reopen",
  close: "Close",
};

function buildGrievanceActions(item, userId) {
  const actions = [];
  const canLog = ["assigned", "in_review", "call_scheduled", "followup_in_progress"].includes(item.status);
  const canScheduleAppointment = ["assigned", "in_review", "call_scheduled", "followup_in_progress"].includes(item.status);
  const canResolve = ["assigned", "in_review", "call_scheduled", "followup_in_progress"].includes(item.status);

  if (!item.assignedAdminUserId) actions.push(["assign", "Assign to Me"]);
  if (item.assignedAdminUserId === userId) {
    if (canLog) actions.push(["logs", "Logs"]);
    if (canScheduleAppointment) actions.push(["scheduleAppointment", "Schedule Appointment"]);
    if (canResolve) actions.push(["resolve", "Resolve"]);
  }
  if (["resolved", "completed"].includes(item.status)) actions.push(["reopen", "Reopen"]);
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

function grievanceWorkflowStatus(item) {
  if (item?.status === "resolved") return "resolved";
  if (item?.status === "assigned") return "accepted";
  if (["in_review", "call_scheduled", "followup_in_progress"].includes(item?.status)) return "grievance_logged";
  return item?.status || "";
}

function grievanceWorkflowLabel(status) {
  if (status === "accepted") return "Accepted";
  if (status === "grievance_logged") return "Grievance Logged";
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
  const { t } = useTranslation();
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
        <h3 style={{ fontSize: 28, fontWeight: 700, color: C.t1 }}>{t("admin.grievanceDetail.success")}</h3>
        <p style={{ marginTop: 8, fontSize: 14, color: C.t3, maxWidth: 420 }}>{message}</p>
        <WorkspaceButton type="button" onClick={onClose} style={{ width: 220, marginTop: 24, justifySelf: "center" }}>
          {t("admin.grievanceDetail.okay")}
        </WorkspaceButton>
      </div>
    </CenteredOverlay>
  );
}

function formatDateTimeLabel(value) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
  const day = String(parsed.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[parsed.getMonth()];
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day} ${mon},${year}`;
}

function formatDateLabel(value) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
  const day = String(parsed.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[parsed.getMonth()];
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day} ${mon},${year}`;
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
  const { t } = useTranslation();
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
  const grievanceInfoRef = useRef(null);
  const [grievanceInfoHeight, setGrievanceInfoHeight] = useState(540);
  const [grievanceForm, setGrievanceForm] = useState({
    logType: "",
    logTypes: [],
    logSummary: "",
    scheduleDate: "",
    scheduleTime: "",
    resolutionSummary: "",
    reopenReason: "",
    closeNote: "",
  });
  const focusedAction = searchParams.get("action") || "";
  const activeAction = modalAction;
  const showAssignToMeOnly = !item?.assignedAdminUserId;
  const isGrievancePoolDetail = source === "grievance-pool";
  const isGrievanceQueueDetail = source === "grievance-queue";
  const isMyCasesDetail = source === "my-cases";
  const isResolvedCompletedDetail = source === "resolved-completed" || source === "resolved-grievances";
  const useGrievanceQueueLayout = isGrievanceQueueDetail || isMyCasesDetail || isResolvedCompletedDetail;
  const grievancePoolBackPath = `${PATHS.admin.workQueue}?tab=grievance-pool`;

  useEffect(() => {
    if (focusedAction) {
      setModalAction(focusedAction);
    }
  }, [focusedAction]);

  useEffect(() => {
    if (!grievanceInfoRef.current || typeof ResizeObserver === "undefined") return undefined;
    const updateHeight = () => {
      if (!grievanceInfoRef.current) return;
      setGrievanceInfoHeight(Math.max(540, grievanceInfoRef.current.offsetHeight));
    };
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(grievanceInfoRef.current);
    return () => observer.disconnect();
  }, [history, item, useGrievanceQueueLayout, isGrievancePoolDetail, isResolvedCompletedDetail]);

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      try {
        const { data } = await apiClient.get(`/grievances/${id}/admin-view`);
        if (!mounted) return;
        const callScheduledAt = data.grievance.callScheduledAt ? new Date(data.grievance.callScheduledAt) : null;
        setItem(data.grievance);
        setAdmins(data.admins || []);
        setHistory(data.history || []);
        setGrievanceForm((current) => ({
          ...current,
          scheduleDate: callScheduledAt && !Number.isNaN(callScheduledAt.getTime()) ? new Date(callScheduledAt.getTime() - callScheduledAt.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "",
          scheduleTime: callScheduledAt && !Number.isNaN(callScheduledAt.getTime()) ? new Date(callScheduledAt.getTime() - callScheduledAt.getTimezoneOffset() * 60000).toISOString().slice(11, 16) : "",
          resolutionSummary: data.grievance.resolutionSummary || "",
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
      const actions = buildGrievanceActions(item || {}, session?.user?.id);
      if (isMyCasesDetail) {
        return actions;
      }

      return actions;
    },
    [item, session?.user?.id, isMyCasesDetail]
  );

  const liveWorkflowStatus = grievanceWorkflowStatus(item);
  const committedWorkflowAction = liveWorkflowStatus === "grievance_logged" ? "logs" : "";
  const workflowSelectValue = modalAction || committedWorkflowAction;
  const workflowFeedback = liveWorkflowStatus === "grievance_logged"
    ? {
        tone: "green",
        message: t("admin.grievanceDetail.grievanceFeedback"),
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

  const resolutionWordCount = countWords(grievanceForm.resolutionSummary);
  const resolutionTrimmed = grievanceForm.resolutionSummary.trim();
  const resolutionError =
    resolutionWordCount > 1000
      ? t("admin.grievanceDetail.maxWordsError")
      : grievanceForm.resolutionSummary.length > 0 && resolutionTrimmed.length < 10
        ? t("admin.grievanceDetail.minSummaryError")
        : "";

  const scheduledIso = buildFutureIso(grievanceForm.scheduleDate, grievanceForm.scheduleTime);
  const scheduleError =
    grievanceForm.scheduleDate || grievanceForm.scheduleTime
      ? !scheduledIso || new Date(scheduledIso).getTime() <= Date.now()
        ? t("admin.grievanceDetail.scheduleDateError")
        : ""
      : "";

  async function runAction(actionName, request) {
    setActionLoading(true);
    setError("");
    try {
      const { data } = await request();
      if (data.grievance) {
        setItem(data.grievance);
      }
      if (data.history) {
        setHistory(data.history);
      } else {
        const detail = await apiClient.get(`/grievances/${id}/admin-view`);
        setItem(detail.data.grievance);
        setHistory(detail.data.history || []);
      }
      if (actionName === "assign") {
        if (isGrievancePoolDetail) {
          setSuccessMessage(t("admin.grievanceDetail.grievanceAssigned"));
          setPendingSuccessRedirect(PATHS.admin.grievanceQueue);
        } else {
          navigate(PATHS.admin.grievanceQueue);
        }
        return;
      }
      if (actionName === "logs") {
        setModalAction("");
        setGrievanceForm((current) => ({
          ...current,
          logTypes: [],
          logSummary: "",
        }));
        return;
      }
      if (actionName === "resolve") {
        setModalAction("");
        navigate(`${PATHS.admin.workQueue}?tab=resolved-grievances`);
        return;
      }
      setSuccessMessage(`${item?.grievanceId || "Grievance"} updated successfully.`);
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
    setGrievanceForm((current) => ({
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
        {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : <WorkspaceEmptyState title={t("admin.grievanceDetail.loading")} />}
      </WorkspacePage>
    );
  }

  const backPath =
    isGrievancePoolDetail
      ? grievancePoolBackPath
      : isResolvedCompletedDetail
        ? `${PATHS.admin.workQueue}?tab=resolved-grievances`
      : source === "grievance-queue"
        ? PATHS.admin.grievanceQueue
        : isMyCasesDetail
          ? PATHS.admin.cases
          : PATHS.admin.cases;
  const backLabel =
    isGrievancePoolDetail
      ? t("common.back")
      : isGrievanceQueueDetail || isResolvedCompletedDetail
        ? t("common.back")
        : backPath === PATHS.admin.workQueue
          ? t("admin.grievanceDetail.backToWorkQueue")
          : backPath === PATHS.admin.grievanceQueue
            ? t("common.back")
            : t("admin.grievanceDetail.backToMyCases");
  const attachedFiles = getAttachedFiles(item);
  const createdAtLabel = formatDateTimeLabel(item.createdAt);
  const incidentDateLabel = formatDateLabel(item.incidentDate);
  const handoffDateLabel = formatDateLabel(item.updatedAt);
  const detailValueStyle = { fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" };
  const standardGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20, alignItems: "start" };
  const pairedGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, alignItems: "start" };
  const grievancePoolGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24, alignItems: "start" };
  const citizenDistrict = item.citizenSnapshot?.district || "Not provided";
  const citizenLocalMp = item.citizenSnapshot?.localMp || "Not provided";
  const isChiefMinister = session?.user?.adminType === "chief_minister";
  const workflowStatus = grievanceWorkflowStatus(item);
  const showAssignToMeButton = isGrievancePoolDetail;
  const showWorkflowActions = !isGrievancePoolDetail && !isResolvedCompletedDetail && item.status !== "resolved";
  const grievanceStatusLabel = grievanceWorkflowLabel(workflowStatus);
  const isResolvedGrievance = item.status === "resolved";
  const grievanceLogSummary = item.callOutcome || "";

  function renderTitleBlock(value) {
    return <DetailItem label={t("admin.grievanceDetail.titleLabel")} value={value || t("admin.grievanceDetail.untitledGrievance")} valueStyle={detailValueStyle} />;
  }

  function renderDescriptionBlock(value) {
    return <DetailItem label={t("admin.grievanceDetail.descriptionLabel")} value={value || t("admin.grievanceDetail.notProvided")} valueStyle={detailValueStyle} />;
  }

  function renderGrievancePoolInfo() {

    return (
      <>
        <div className="grid md:grid-cols-3 gap-6">
          <DetailItem label={t("admin.grievanceDetail.grievanceId")} value={item.grievanceId} />
          <DetailItem label={t("admin.caseDetail.createdAt")} value={createdAtLabel} />
          <DetailItem label={t("admin.grievanceDetail.citizenName")} value={item.citizenSnapshot?.name || t("admin.grievanceDetail.notProvided")} />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <DetailItem label={t("admin.grievanceDetail.citizenPhone")} value={item.citizenSnapshot?.phoneNumbers?.[0] || t("admin.grievanceDetail.notProvided")} />
          <DetailItem label={t("admin.workQueue.colDistrict")} value={citizenDistrict} />
          <DetailItem label={t("admin.grievanceDetail.mpOfDistrict")} value={citizenLocalMp} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{t("admin.grievanceDetail.titleLabel")}</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word" }}>
            {item.title || t("admin.grievanceDetail.untitledGrievance")}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <DetailItem label={t("admin.grievanceDetail.category")} value={item.grievanceType || t("admin.grievanceDetail.notProvided")} />
          <DetailItem label={t("admin.grievanceDetail.dateOfIncident")} value={incidentDateLabel} />
          <DetailItem label={t("admin.grievanceDetail.incidentLocation")} value={item.grievanceLocation || t("admin.grievanceDetail.notProvided")} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{t("admin.grievanceDetail.descriptionLabel")}</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {item.description || t("admin.grievanceDetail.notProvided")}
          </p>
        </div>
      </>
    );
  }

  function renderResolvedInfo() {
    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.grievanceDetail.grievanceId")} value={item.grievanceId} />
          <DetailItem label={t("admin.grievanceDetail.resolvedDate")} value={handoffDateLabel} />
          <div />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.caseDetail.createdAt")} value={createdAtLabel} />
          <DetailItem label={t("admin.grievanceDetail.citizenName")} value={item.citizenSnapshot?.name || t("admin.grievanceDetail.notProvided")} />
          <DetailItem label={t("admin.grievanceDetail.citizenPhone")} value={item.citizenSnapshot?.phoneNumbers?.[0] || t("admin.grievanceDetail.notProvided")} />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.workQueue.colDistrict")} value={citizenDistrict} />
          <DetailItem label={t("admin.grievanceDetail.mpOfDistrict")} value={citizenLocalMp} />
          <div />
        </div>
        {renderTitleBlock(item.title)}
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.grievanceDetail.category")} value={item.grievanceType || t("admin.grievanceDetail.notProvided")} />
          <DetailItem label={t("admin.grievanceDetail.dateOfIncident")} value={incidentDateLabel} />
          <DetailItem label={t("admin.grievanceDetail.incidentLocation")} value={item.grievanceLocation || t("admin.grievanceDetail.notProvided")} />
        </div>
        {renderDescriptionBlock(item.description)}
        {grievanceLogSummary ? <NoticeBox tone="blue" label={t("admin.grievanceDetail.grievanceLogSummaryLabel")} value={grievanceLogSummary} /> : null}
        {item.resolutionSummary ? <NoticeBox tone="green" label={t("admin.grievanceDetail.resolvedSummaryNotice")} value={item.resolutionSummary} /> : null}
      </>
    );
  }

  function renderMyCasesInfo() {
    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.grievanceDetail.grievanceId")} value={item.grievanceId} />
          <DetailItem label={t("admin.caseDetail.status")} value={grievanceStatusLabel} />
          <DetailItem label={t("admin.grievanceDetail.updatedDate")} value={handoffDateLabel} />
        </div>
        {renderTitleBlock(item.title)}
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.grievanceDetail.category")} value={item.grievanceType || t("admin.grievanceDetail.notProvided")} />
          <DetailItem label={t("admin.grievanceDetail.citizenName")} value={item.citizenSnapshot?.name || t("admin.grievanceDetail.notProvided")} />
          <DetailItem label={t("admin.grievanceDetail.citizenPhone")} value={item.citizenSnapshot?.phoneNumbers?.[0] || t("admin.grievanceDetail.notProvided")} />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.caseDetail.createdAt")} value={createdAtLabel} />
          <DetailItem label={t("admin.grievanceDetail.dateOfIncident")} value={incidentDateLabel} />
          <DetailItem label={t("admin.grievanceDetail.incidentLocation")} value={item.grievanceLocation || t("admin.grievanceDetail.notProvided")} />
        </div>
        {renderDescriptionBlock(item.description)}
        {grievanceLogSummary ? <NoticeBox tone="blue" label={t("admin.grievanceDetail.grievanceLogSummaryLabel")} value={grievanceLogSummary} /> : null}
        {item.statusReason ? <NoticeBox tone="amber" label={t("admin.grievanceDetail.statusReason")} value={item.statusReason} /> : null}
        {item.resolutionSummary ? <NoticeBox tone="green" label={t("admin.grievanceDetail.markAsResolvedSummary")} value={item.resolutionSummary} /> : null}
      </>
    );
  }

  function renderGrievanceQueueInfo() {
    if (isMyCasesDetail) {
      return (
        <>
          <div style={standardGridStyle}>
            <DetailItem label={t("admin.grievanceDetail.grievanceId")} value={item.grievanceId} />
            <DetailItem
              label={t("admin.caseDetail.status")}
              value={(
                <WorkspaceBadge status={item.status} title={statusLabel(item.status)}>
                  {statusLabel(item.status)}
                </WorkspaceBadge>
              )}
            />
            <DetailItem label={t("admin.grievanceDetail.updatedDate")} value={handoffDateLabel} />
          </div>
          {renderTitleBlock(item.title)}
          <div style={standardGridStyle}>
            <DetailItem label={t("admin.grievanceDetail.category")} value={item.grievanceType || t("admin.grievanceDetail.notProvided")} />
            <DetailItem label={t("admin.grievanceDetail.citizenName")} value={item.citizenSnapshot?.name || t("admin.grievanceDetail.notProvided")} />
            <DetailItem label={t("admin.grievanceDetail.citizenPhone")} value={item.citizenSnapshot?.phoneNumbers?.[0] || t("admin.grievanceDetail.notProvided")} />
          </div>
          <div style={standardGridStyle}>
            <DetailItem label={t("admin.caseDetail.createdAt")} value={createdAtLabel} />
            <DetailItem label={t("admin.grievanceDetail.dateOfIncident")} value={incidentDateLabel} />
            <DetailItem label={t("admin.grievanceDetail.incidentLocation")} value={item.grievanceLocation || t("admin.grievanceDetail.notProvided")} />
          </div>
          {renderDescriptionBlock(item.description)}
          {item.statusReason ? <NoticeBox tone="amber" label={t("admin.grievanceDetail.statusReason")} value={item.statusReason} /> : null}
          {item.resolutionSummary ? <NoticeBox tone="green" label={t("admin.grievanceDetail.summaryNotice")} value={item.resolutionSummary} /> : null}
        </>
      );
    }

    return (
      <>
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.grievanceDetail.grievanceId")} value={item.grievanceId} />
          <DetailItem
            label={t("admin.caseDetail.status")}
            value={(
              <WorkspaceBadge status={workflowStatus} color={workflowStatus === "grievance_logged" ? C.warn : undefined} title={grievanceStatusLabel}>
                {grievanceStatusLabel}
              </WorkspaceBadge>
            )}
          />
          <DetailItem label={t("admin.grievanceDetail.updatedDate")} value={handoffDateLabel} />
        </div>
        {renderTitleBlock(item.title)}
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.grievanceDetail.citizenName")} value={item.citizenSnapshot?.name || t("admin.grievanceDetail.notProvided")} />
          <DetailItem label={t("admin.workQueue.colState")} value={item.state || item.citizenSnapshot?.state || t("admin.grievanceDetail.notProvided")} />
          <DetailItem label={t("admin.workQueue.colDistrict")} value={item.district || item.citizenSnapshot?.district || t("admin.grievanceDetail.notProvided")} />
        </div>
        <div style={standardGridStyle}>
          <DetailItem label={t("admin.caseDetail.createdAt")} value={createdAtLabel} />
          <DetailItem label={t("admin.grievanceDetail.dateLabel")} value={incidentDateLabel} />
          <DetailItem
            label={t("admin.grievanceDetail.deoOffice")}
            value={item.deoOffice || t("admin.grievanceDetail.notProvided")}
            valueStyle={item.deoOffice ? { color: "#16a34a", fontWeight: 600 } : undefined}
          />
        </div>
        {renderDescriptionBlock(item.description)}
        {grievanceLogSummary ? <NoticeBox tone="blue" label={t("admin.grievanceDetail.grievanceLogSummaryLabel")} value={grievanceLogSummary} /> : null}
        {item.statusReason ? <NoticeBox tone="amber" label={t("admin.grievanceDetail.statusReason")} value={item.statusReason} /> : null}
        {item.resolutionSummary ? <NoticeBox tone="green" label={t("admin.grievanceDetail.markAsResolvedSummary")} value={item.resolutionSummary} /> : null}
      </>
    );
  }

  function renderPrimaryDetailInfo() {
    if (isGrievancePoolDetail) return renderGrievancePoolInfo();
    if (isResolvedCompletedDetail) return renderResolvedInfo();
    if (useGrievanceQueueLayout) return renderGrievanceQueueInfo();
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
          title={item.grievanceId}
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
      ) : isGrievancePoolDetail || isGrievanceQueueDetail || isResolvedCompletedDetail ? (
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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.t1, textAlign: "center" }}>{t("admin.grievanceDetail.grievanceDetailsTitle")}</h2>
          <div />
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.t1 }}>{item.grievanceId}</h2>
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

        {isGrievanceQueueDetail && isChiefMinister && !item.letterheadReady && (
          <WorkspaceCard style={{ borderColor: C.purple, background: "transparent" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.t2, fontWeight: 500 }}>
              {t("admin.grievanceDetail.awaitingDeo")}
            </p>
          </WorkspaceCard>
        )}
        {isGrievanceQueueDetail && isChiefMinister && item.letterheadReady && (
          <p style={{ margin: 0, marginBottom: -20, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
            {item.createdByDeo
              ? t("admin.grievanceDetail.deoCreatedLetterhead")
              : t("admin.grievanceDetail.deoVerifiedLetterhead")}
          </p>
        )}

        <WorkspaceCard style={{ padding: 0, marginBottom: 0, border: "none", background: "transparent" }}>
          {showWorkflowActions && !isGrievanceQueueDetail && !isMyCasesDetail ? (
            <div className="grid md:grid-cols-[minmax(0,320px)_auto] gap-3 items-start">
              <>
                <WorkspaceSelect value={workflowSelectValue} onChange={(event) => handleWorkflowActionSelect(event.target.value)}>
                  {!committedWorkflowAction ? <option value="">{t("admin.grievanceDetail.selectWorkflowAction")}</option> : null}
                  {workflowOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
                <InlineActionFeedback feedback={workflowFeedback} />
              </>
            </div>
          ) : null}
        </WorkspaceCard>

        {useGrievanceQueueLayout ? (
          <>
            <div
              style={{
                display: "grid",
                gap: 24,
                gridTemplateColumns: "minmax(0, 7fr) minmax(280px, 3fr)",
                alignItems: "start",
              }}
            >
              <div ref={grievanceInfoRef}>
                <WorkspaceCard style={{ marginBottom: 0, minHeight: 540, display: "flex", flexDirection: "column" }}>
                  {isMyCasesDetail ? (
                    <WorkspaceCardHeader title={t("admin.grievanceDetail.grievanceInformation")} />
                  ) : showWorkflowActions && (!isGrievanceQueueDetail || (isChiefMinister && item.letterheadReady)) ? (
                    <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                      <WorkspaceSelect value={workflowSelectValue} onChange={(event) => handleWorkflowActionSelect(event.target.value)} style={{ maxWidth: 320 }}>
                        {!committedWorkflowAction ? <option value="">{t("admin.grievanceDetail.selectWorkflowAction")}</option> : null}
                        {workflowOptions.map((option) => (
                          <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                          </option>
                        ))}
                      </WorkspaceSelect>
                      <InlineActionFeedback feedback={workflowFeedback} />
                    </div>
                  ) : null}
                  {isResolvedGrievance && !isMyCasesDetail ? (
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
                        {t("admin.grievanceDetail.resolved")}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ display: "grid", gap: 18 }}>
                    {renderPrimaryDetailInfo()}
                  </div>
                </WorkspaceCard>
              </div>

              <WorkspaceCard style={{ marginBottom: 0, height: grievanceInfoHeight, minHeight: 540, display: "flex", flexDirection: "column" }}>
                <div className="flex items-center gap-2 mb-6">
                  <FileText size={22} color={C.purple} />
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>{t("admin.grievanceDetail.timeline")}</h2>
                </div>
                <div style={{ display: "grid", gap: 18, overflowY: "auto", paddingRight: 6, flex: 1, minHeight: 0 }}>
                  {history.length === 0 ? (
                    <p style={{ fontSize: 13, color: C.t3 }}>{t("admin.grievanceDetail.noTimeline")}</p>
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
                            <p style={{ fontSize: 12, color: C.t3, whiteSpace: "nowrap", margin: 0 }}>{(() => { const _d = new Date(event.created_at); return `${String(_d.getDate()).padStart(2,"0")} ${MONTH_NAMES[_d.getMonth()]},${String(_d.getFullYear()).slice(-2)}`; })()}</p>
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
                title={isMyCasesDetail ? t("admin.grievanceDetail.appointmentFiles") : t("admin.grievanceDetail.grievanceFiles")}
                subtitle={t("admin.grievanceDetail.filesSubtitle")}
              />
              {attachedFiles.filter((f) => f.fileCategory !== "letterhead").length === 0 ? (
                <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>{t("admin.grievanceDetail.noFiles")}</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {attachedFiles.filter((f) => f.fileCategory !== "letterhead").map((file) => (
                    <div key={file.id || file.downloadUrl || file.name} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType || "Document"}</div>
                        </div>
                        <WorkspaceButton type="button" variant="outline" onClick={() => openDownloadUrl(file.downloadUrl)}>
                          {t("common.download")}
                        </WorkspaceButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </WorkspaceCard>

            {isGrievanceQueueDetail && isChiefMinister ? (() => {
              const letterheadFiles = attachedFiles.filter((f) => f.fileCategory === "letterhead");
              if (letterheadFiles.length === 0 && item.letterheadFile) letterheadFiles.push(item.letterheadFile);
              return (
                <WorkspaceCard style={{ marginBottom: 0 }}>
                  <WorkspaceCardHeader title={t("admin.grievanceDetail.letterHead")} subtitle={t("admin.grievanceDetail.letterHeadSubtitle")} />
                  {letterheadFiles.length === 0 ? (
                    <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>{t("admin.grievanceDetail.noLetterhead")}</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {letterheadFiles.map((file) => (
                        <div key={file.id || file.downloadUrl || file.name} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                              <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType || t("admin.grievanceQueue.document")}</div>
                            </div>
                            <WorkspaceButton type="button" variant="outline" onClick={() => openDownloadUrl(file.downloadUrl)}>
                              {t("common.download")}
                            </WorkspaceButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </WorkspaceCard>
              );
            })() : null}
          </>
        ) : (
          <>
                <WorkspaceCard
                  style={
                    isGrievancePoolDetail
                      ? { marginBottom: 0, height: "auto", display: "flex", flexDirection: "column", paddingTop: 14 }
                      : { marginBottom: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingTop: 24 }
                  }
                >
              {isGrievancePoolDetail ? (
                <div style={{ padding: "0 0 14px 0", marginLeft: 2, borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
                  <WorkspaceButton
                    type="button"
                    disabled={actionLoading}
                    onClick={() => runAction("assign", () => apiClient.patch(`/grievances/${id}/assign-self`, {}))}
                    style={{ boxShadow: "none" }}
                  >
                    {t("admin.grievanceDetail.assignToMe")}
                  </WorkspaceButton>
                </div>
              ) : (
                <WorkspaceCardHeader title={t("admin.grievanceDetail.grievanceInformation")} />
              )}
              {isResolvedGrievance ? (
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
                    {t("admin.grievanceDetail.resolved")}
                  </div>
                </div>
              ) : null}
              <div
                style={
                  isGrievancePoolDetail
                    ? { display: "grid", gap: 18, paddingRight: 2 }
                    : { display: "grid", gap: 18, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }
                }
              >
                {renderPrimaryDetailInfo()}
              </div>
            </WorkspaceCard>

            <WorkspaceCard style={{ marginBottom: 0 }}>
              <WorkspaceCardHeader title={t("admin.grievanceDetail.grievanceFiles")} subtitle={t("admin.grievanceDetail.filesSubtitle")} />
              {attachedFiles.length === 0 ? (
                <div style={{ fontSize: 13, color: C.t3, padding: "2px 0" }}>{t("admin.grievanceDetail.noFiles")}</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {attachedFiles.map((file) => (
                    <div key={file.id || file.downloadUrl || file.name} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType || t("admin.grievanceQueue.document")}</div>
                        </div>
                        <WorkspaceButton type="button" variant="outline" onClick={() => openDownloadUrl(file.downloadUrl)}>
                          {t("common.download")}
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

      {activeAction === "resolve" ? (
        <ModalShell
          title={t("admin.grievanceDetail.resolveModal")}
          subtitle={t("admin.grievanceDetail.resolveModalSub")}
          onClose={closeActionModal}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                {t("admin.grievanceDetail.resolvedSummaryLabel")}
              </div>
              <WorkspaceTextArea
                rows={8}
                value={grievanceForm.resolutionSummary}
                onChange={(event) => setGrievanceForm((current) => ({ ...current, resolutionSummary: event.target.value }))}
                placeholder={t("admin.grievanceDetail.resolvedSummaryPlaceholder")}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: C.t3 }}>{t("admin.grievanceDetail.wordCountLabel", { count: resolutionWordCount })}</div>
              <ErrorText>{resolutionError}</ErrorText>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>{t("common.cancel")}</WorkspaceButton> : null}
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !!resolutionError || resolutionTrimmed.length < 10}
                onClick={() => runAction("resolve", () => apiClient.patch(`/grievances/${id}/resolve`, { resolutionSummary: resolutionTrimmed, resolutionDocs: [] }))}
              >
                {t("admin.grievanceDetail.confirmResolve")}
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "scheduleAppointment" ? (
        <ModalShell
          title={t("admin.grievanceDetail.scheduleModal")}
          subtitle={t("admin.grievanceDetail.scheduleModalSub")}
          onClose={closeActionModal}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                {t("admin.grievanceDetail.dateAndTime")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <WorkspaceInput type="date" min={new Date().toISOString().slice(0, 10)} value={grievanceForm.scheduleDate} onChange={(event) => setGrievanceForm((current) => ({ ...current, scheduleDate: event.target.value }))} />
                <WorkspaceInput type="time" value={grievanceForm.scheduleTime} onChange={(event) => setGrievanceForm((current) => ({ ...current, scheduleTime: event.target.value }))} />
              </div>
              <ErrorText>{scheduleError}</ErrorText>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>{t("common.cancel")}</WorkspaceButton> : null}
              <WorkspaceButton
                type="button"
                disabled={actionLoading || !scheduledIso || !!scheduleError}
                onClick={() => runAction("scheduleAppointment", () => apiClient.patch(`/grievances/${id}/schedule-call`, { callScheduledAt: scheduledIso }))}
              >
                {t("admin.grievanceDetail.confirmSchedule")}
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "logs" ? (
        <ModalShell
          title={t("admin.grievanceDetail.logsModal")}
          subtitle={t("admin.grievanceDetail.logsModalSub")}
          onClose={closeActionModal}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                {t("admin.grievanceDetail.logType")}
              </div>
              {isMyCasesDetail ? (
                <WorkspaceSelect value={grievanceForm.logType} onChange={(event) => setGrievanceForm((current) => ({ ...current, logType: event.target.value }))}>
                  <option value="">{t("admin.grievanceDetail.selectLogType")}</option>
                  <option value="phone_call">{t("admin.grievanceDetail.phoneCall")}</option>
                  <option value="mail">{t("admin.grievanceDetail.mail")}</option>
                  <option value="letter_summary">{t("admin.grievanceDetail.letterSummary")}</option>
                </WorkspaceSelect>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                  {[
                    ["phone_call", t("admin.grievanceDetail.phoneCall")],
                    ["letter_summary", t("admin.grievanceDetail.letter")],
                    ["mail", t("admin.grievanceDetail.mail")],
                    ["appointment", t("admin.grievanceDetail.logAppointment")],
                  ].map(([value, label]) => {
                    const checked = grievanceForm.logTypes.includes(value);
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
                {t("admin.grievanceDetail.summaryLabel")}
              </div>
              <WorkspaceTextArea
                rows={6}
                value={grievanceForm.logSummary}
                onChange={(event) => setGrievanceForm((current) => ({ ...current, logSummary: event.target.value }))}
                placeholder={t("admin.grievanceDetail.summaryPlaceholder")}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>{t("common.cancel")}</WorkspaceButton> : null}
              <WorkspaceButton
                type="button"
                disabled={isMyCasesDetail ? actionLoading || !grievanceForm.logType : actionLoading || grievanceForm.logTypes.length === 0}
                onClick={() => runAction("logs", () => apiClient.patch(`/grievances/${id}/log`, isMyCasesDetail ? { logType: grievanceForm.logType, summary: grievanceForm.logSummary.trim() } : { logTypes: grievanceForm.logTypes, summary: grievanceForm.logSummary.trim() }))}
              >
                {t("admin.grievanceDetail.confirmLog")}
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "reopen" ? (
        <ModalShell title={t("admin.grievanceDetail.reopenModal")} subtitle={t("admin.grievanceDetail.reopenModalSub")} onClose={closeActionModal}>
          <div style={{ display: "grid", gap: 16 }}>
            <WorkspaceTextArea value={grievanceForm.reopenReason} onChange={(event) => setGrievanceForm((current) => ({ ...current, reopenReason: event.target.value }))} rows={6} placeholder={t("admin.grievanceDetail.reopenPlaceholder")} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>{t("common.cancel")}</WorkspaceButton> : null}
              <WorkspaceButton type="button" disabled={actionLoading || grievanceForm.reopenReason.trim().length < 3} onClick={() => runAction("reopen", () => apiClient.patch(`/grievances/${id}/reopen`, { reason: grievanceForm.reopenReason.trim() }))}>
                {t("admin.grievanceDetail.confirmReopen")}
              </WorkspaceButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeAction === "close" ? (
        <ModalShell title={t("admin.grievanceDetail.closeModal")} subtitle={t("admin.grievanceDetail.closeModalSub")} onClose={closeActionModal}>
          <div style={{ display: "grid", gap: 16 }}>
            <WorkspaceTextArea value={grievanceForm.closeNote} onChange={(event) => setGrievanceForm((current) => ({ ...current, closeNote: event.target.value }))} rows={6} placeholder={t("admin.grievanceDetail.closePlaceholder")} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              {isMyCasesDetail ? <WorkspaceButton type="button" variant="ghost" onClick={closeActionModal} disabled={actionLoading}>{t("common.cancel")}</WorkspaceButton> : null}
              <WorkspaceButton type="button" disabled={actionLoading || grievanceForm.closeNote.trim().length < 3} onClick={() => runAction("close", () => apiClient.patch(`/grievances/${id}/close`, { note: grievanceForm.closeNote.trim() }))}>
                {t("admin.grievanceDetail.confirmClose")}
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
