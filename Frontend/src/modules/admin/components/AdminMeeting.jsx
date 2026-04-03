import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Eye, Search } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PATHS } from "../../../routes/paths.js";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
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
  WorkspaceStatGrid,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function statusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function WorkspaceTextArea(props) {
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

function SuccessModal({ open, message, onClose }) {
  const { C } = usePortalTheme();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md p-8 text-center"
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.dialogShadow }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white"
          style={{ background: C.mint }}
        >
          ✓
        </div>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: C.t1 }}>Success</h3>
        <p className="mt-2 text-sm" style={{ color: C.t3 }}>{message}</p>
        <WorkspaceButton type="button" onClick={onClose} style={{ width: "100%", marginTop: 24 }}>
          Continue
        </WorkspaceButton>
      </div>
    </div>
  );
}

function RejectModal({ open, reason, onReasonChange, onClose, onConfirm, loading }) {
  const { C } = usePortalTheme();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg"
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.dialogShadow, padding: 24 }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: C.t1 }}>Reject Meeting</div>
        <p style={{ marginTop: 8, fontSize: 13, color: C.t3 }}>Provide a reason for rejection before confirming.</p>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
            Reason for rejection
          </div>
          <WorkspaceTextArea
            rows={5}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Enter the rejection reason"
          />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <WorkspaceButton type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </WorkspaceButton>
          <WorkspaceButton
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={loading || reason.trim().length < 5}
          >
            Confirm Reject
          </WorkspaceButton>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, subValue }) {
  const { C } = usePortalTheme();
  return (
    <WorkspaceCard style={{ padding: 18, marginBottom: 0 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
      <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{value}</div>
      {subValue ? <p style={{ fontSize: 12, color: C.t3, marginTop: 8 }}>{subValue}</p> : null}
    </WorkspaceCard>
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
  const color = { red: C.danger, amber: C.warn, blue: C.purple }[tone] || C.purple;
  return (
    <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}12` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 13, color: C.t2 }}>{value}</p>
    </div>
  );
}

export default function AdminMeeting() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const adminId = session?.user?.id;
  const source = searchParams.get("source") || "";

  const [meetings, setMeetings] = useState([]);
  const [workflowDirectory, setWorkflowDirectory] = useState({ deos: [], ministers: [] });
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [history, setHistory] = useState([]);
  const [meetingFiles, setMeetingFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [query, setQuery] = useState("");
  const [verificationForm, setVerificationForm] = useState({ deoId: "" });
  const [scheduleForm, setScheduleForm] = useState({
    ministerId: "",
    startsAt: "",
    endsAt: "",
    location: "",
    isVip: false,
    comments: "",
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actionNote, setActionNote] = useState("");

  async function loadMeetingPool() {
    const [queueResponse, directoryResponse] = await Promise.all([
      apiClient.get("/admin/work-queue", authorizedConfig(session.accessToken)),
      apiClient.get("/admin/workflow-directory", authorizedConfig(session.accessToken)),
    ]);
    setMeetings(Array.isArray(queueResponse.data?.meetings) ? queueResponse.data.meetings : []);
    setWorkflowDirectory(directoryResponse.data || { deos: [], ministers: [] });
  }

  async function loadMeetingDetail(id) {
    setDetailLoading(true);
    try {
      const [detailResult, filesResult] = await Promise.allSettled([
        apiClient.get(`/meetings/${id}/admin-view`, authorizedConfig(session.accessToken)),
        apiClient.get(`/meetings/${id}/files`, authorizedConfig(session.accessToken)),
      ]);
      if (detailResult.status === "rejected") {
        throw detailResult.reason;
      }
      const { data } = detailResult.value;
      setSelectedMeeting(data.meeting || null);
      setHistory(data.history || []);
      setMeetingFiles(filesResult.status === "fulfilled" ? (filesResult.value.data?.files || []) : []);
      setScheduleForm({
        ministerId: data.meeting?.ministerId || "",
        startsAt: data.meeting?.scheduled_at ? new Date(data.meeting.scheduled_at).toISOString().slice(0, 16) : "",
        endsAt: data.meeting?.scheduled_end_at ? new Date(data.meeting.scheduled_end_at).toISOString().slice(0, 16) : "",
        location: data.meeting?.scheduled_location || "",
        isVip: Boolean(data.meeting?.is_vip),
        comments: data.meeting?.admin_comments || "",
      });
      setVerificationForm({ deoId: data.meeting?.assignedDeoId || "" });
    } catch (detailError) {
      setError(detailError?.response?.data?.error || "Unable to load meeting details");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!session?.accessToken) return;
      try {
        setLoading(true);
        setError("");
        await loadMeetingPool();
        if (!active) return;
        if (meetingId) {
          await loadMeetingDetail(meetingId);
        } else {
          setSelectedMeeting(null);
          setHistory([]);
          setMeetingFiles([]);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError?.response?.data?.error || "Unable to load meeting pool");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [meetingId, session?.accessToken]);

  const personalMeetingQueue = useMemo(
    () => meetings.filter(
      (meeting) => meeting.assignedAdminUserId === adminId && !["completed", "cancelled", "rejected"].includes(meeting.status)
    ),
    [adminId, meetings]
  );

  const filteredMeetingQueue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personalMeetingQueue.filter((meeting) => {
      if (!q) return true;
      return [
        meeting.requestId,
        meeting.title,
        meeting.purpose,
        meeting.first_name,
        meeting.last_name,
        meeting.mobile_number,
        meeting.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [personalMeetingQueue, query]);

  const queueStats = useMemo(() => {
    const accepted = meetings.filter((meeting) => meeting.status === "accepted").length;
    const scheduled = meetings.filter((meeting) => meeting.status === "scheduled").length;
    return [
      { label: "My Meeting Queue", value: personalMeetingQueue.length },
      { label: "Accepted", value: accepted },
      { label: "Scheduled", value: scheduled },
    ];
  }, [meetings, personalMeetingQueue.length]);

  async function refreshAll(id = meetingId) {
    await loadMeetingPool();
    if (id) {
      await loadMeetingDetail(id);
    }
  }

  async function runAction(request, options = {}) {
    setActionLoading(true);
    setActionError("");
    try {
      await request();
      if (options.successMessage) {
        setSuccessMessage(options.successMessage);
      }
      if (options.navigateToPool) {
        await loadMeetingPool();
        navigate(source === "work-queue" ? PATHS.admin.workQueue : PATHS.admin.meetings);
        return true;
      }
      await refreshAll();
      return true;
    } catch (actionErrorValue) {
      setActionError(actionErrorValue?.response?.data?.error || "Unable to update meeting");
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function uploadMeetingPhoto() {
    if (!uploadFile) return;
    setUploadingFile(true);
    setActionError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      await apiClient.post(`/meetings/${meetingId}/photos`, formData, authorizedConfig(session.accessToken));
      await loadMeetingDetail(meetingId);
      setUploadFile(null);
    } catch (uploadError) {
      setActionError(uploadError?.response?.data?.error || "Unable to upload meeting photo");
    } finally {
      setUploadingFile(false);
    }
  }

  if (meetingId) {
    if (loading || detailLoading || !selectedMeeting) {
      return (
        <WorkspacePage width={1200}>
          {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : <WorkspaceEmptyState title="Loading meeting details..." />}
        </WorkspacePage>
      );
    }

    const isAssignedToCurrentAdmin = selectedMeeting.assignedAdminUserId === adminId;
    const isUnassignedPoolMeeting = selectedMeeting.status === "pending" && !selectedMeeting.assignedAdminUserId;
    const canAccept = isAssignedToCurrentAdmin && ["pending", "not_verified"].includes(selectedMeeting.status);
    const canReject = isAssignedToCurrentAdmin && ["pending", "accepted", "verification_pending", "verified", "not_verified"].includes(selectedMeeting.status);
    const canSendVerification = isAssignedToCurrentAdmin && ["accepted", "not_verified"].includes(selectedMeeting.status);
    const canSchedule = isAssignedToCurrentAdmin && ["accepted", "verified", "scheduled"].includes(selectedMeeting.status);
    const canCompleteOrCancel = isAssignedToCurrentAdmin && selectedMeeting.status === "scheduled";
    const canUploadPhotos = isAssignedToCurrentAdmin && ["scheduled", "completed"].includes(selectedMeeting.status);

    const backPath = source === "my-cases"
      ? PATHS.admin.cases
      : source === "complaint-queue"
        ? PATHS.admin.complaints
        : source === "meeting-queue"
          ? PATHS.admin.meetings
          : isUnassignedPoolMeeting || source === "work-queue"
            ? PATHS.admin.workQueue
            : PATHS.admin.meetings;
    return (
      <WorkspacePage width={1200}>
        <SuccessModal open={!!successMessage} message={successMessage} onClose={() => setSuccessMessage("")} />
        <RejectModal
          open={rejectModalOpen}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onClose={() => {
            setRejectModalOpen(false);
            setRejectReason("");
          }}
          onConfirm={async () => {
            const ok = await runAction(
              () => apiClient.patch(`/meetings/${meetingId}/reject`, { reason: rejectReason }, authorizedConfig(session.accessToken)),
              { successMessage: "Meeting rejected successfully." }
            );
            if (ok) {
              setRejectModalOpen(false);
              setRejectReason("");
            }
          }}
          loading={actionLoading}
        />

        <WorkspaceSectionHeader
          eyebrow="Admin Workspace"
          title={selectedMeeting.title || "Meeting Details"}
          subtitle={selectedMeeting.purpose}
          action={
            <WorkspaceButton
              type="button"
              variant="ghost"
              onClick={() => navigate(backPath)}
            >
              <ChevronLeft size={16} />
              {backPath === PATHS.admin.complaints
                ? "Back to Complaint Queue"
                : backPath === PATHS.admin.cases
                  ? "Back to My Cases"
                  : backPath === PATHS.admin.workQueue
                    ? "Back to Work Queue"
                    : "Back to Meeting Queue"}
            </WorkspaceButton>
          }
        />

        <div style={{ display: "grid", gap: 24 }}>
          {error ? <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard> : null}
          {actionError ? <WorkspaceCard style={{ color: C.danger }}>{actionError}</WorkspaceCard> : null}

          <div className="grid gap-6 md:grid-cols-3">
            <InfoCard label="Status" value={statusLabel(selectedMeeting.status)} />
            <InfoCard
              label="Citizen"
              value={[selectedMeeting.first_name, selectedMeeting.last_name].filter(Boolean).join(" ") || "Unknown Citizen"}
              subValue={selectedMeeting.mobile_number || selectedMeeting.email || "No contact"}
            />
            <InfoCard
              label="Preferred Time"
              value={selectedMeeting.preferred_time ? new Date(selectedMeeting.preferred_time).toLocaleString("en-IN") : "Not provided"}
            />
          </div>

          <WorkspaceCard style={{ display: "grid", gap: 18 }}>
            <WorkspaceCardHeader
              title={isUnassignedPoolMeeting ? "Meeting Assignment" : "Meeting Queue Actions"}
              subtitle={
                isUnassignedPoolMeeting
                  ? "Review the submitted request and assign it to yourself before processing."
                  : isAssignedToCurrentAdmin
                    ? "Continue the meeting workflow from your assigned queue."
                    : "This meeting is assigned to another admin. Details remain read-only here."
              }
            />

            {isUnassignedPoolMeeting ? (
              <WorkspaceButton
                type="button"
                disabled={actionLoading}
                onClick={() => runAction(
                  () => apiClient.patch(`/meetings/${meetingId}/assign-self`, {}, authorizedConfig(session.accessToken)),
                  {
                    successMessage: "Meeting successfully assigned to you.",
                    navigateToPool: true,
                  }
                )}
              >
                Assign to Me
              </WorkspaceButton>
            ) : null}

            {canAccept || canReject ? (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {canAccept ? (
                  <WorkspaceButton
                    type="button"
                    disabled={actionLoading}
                    onClick={() => runAction(
                      () => apiClient.patch(`/meetings/${meetingId}/accept`, {}, authorizedConfig(session.accessToken)),
                      { successMessage: "Meeting accepted successfully." }
                    )}
                  >
                    Accept
                  </WorkspaceButton>
                ) : null}
                {canReject ? (
                  <WorkspaceButton type="button" variant="danger" disabled={actionLoading} onClick={() => setRejectModalOpen(true)}>
                    Reject
                  </WorkspaceButton>
                ) : null}
              </div>
            ) : null}

            {canSendVerification ? (
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  paddingTop: 20,
                  borderTop: `1px solid ${C.border}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>Send for DEO Verification</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>Assign a verified DEO to review the accepted meeting.</div>
                </div>
                <WorkspaceSelect value={verificationForm.deoId} onChange={(event) => setVerificationForm({ deoId: event.target.value })}>
                  <option value="">Select DEO</option>
                  {workflowDirectory.deos.map((deo) => (
                    <option key={deo.id} value={deo.id}>
                      {[deo.first_name, deo.last_name].filter(Boolean).join(" ")}{deo.designation ? ` · ${deo.designation}` : ""}
                    </option>
                  ))}
                </WorkspaceSelect>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || !verificationForm.deoId}
                  onClick={() => runAction(
                    () => apiClient.patch(`/meetings/${meetingId}/assign-verification`, { deoId: verificationForm.deoId }, authorizedConfig(session.accessToken)),
                    { successMessage: "Meeting sent for verification successfully." }
                  )}
                >
                  Send to Verification
                </WorkspaceButton>
              </div>
            ) : null}

            {canSchedule ? (
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  paddingTop: 20,
                  borderTop: `1px solid ${C.border}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{selectedMeeting.status === "scheduled" ? "Reschedule Meeting" : "Schedule Meeting"}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>Scheduled meetings are pushed into the minister calendar automatically.</div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <WorkspaceSelect value={scheduleForm.ministerId} onChange={(event) => setScheduleForm((current) => ({ ...current, ministerId: event.target.value }))}>
                    <option value="">Select Minister</option>
                    {workflowDirectory.ministers.map((minister) => (
                      <option key={minister.id} value={minister.id}>
                        {[minister.first_name, minister.last_name].filter(Boolean).join(" ")}
                      </option>
                    ))}
                  </WorkspaceSelect>
                  <WorkspaceInput value={scheduleForm.location} onChange={(event) => setScheduleForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
                  <WorkspaceInput type="datetime-local" value={scheduleForm.startsAt} onChange={(event) => setScheduleForm((current) => ({ ...current, startsAt: event.target.value }))} />
                  <WorkspaceInput type="datetime-local" value={scheduleForm.endsAt} onChange={(event) => setScheduleForm((current) => ({ ...current, endsAt: event.target.value }))} />
                </div>
                <label className="flex items-center gap-2" style={{ fontSize: 13, color: C.t2 }}>
                  <input type="checkbox" checked={scheduleForm.isVip} onChange={(event) => setScheduleForm((current) => ({ ...current, isVip: event.target.checked }))} />
                  Mark as VIP meeting
                </label>
                <WorkspaceTextArea rows={3} value={scheduleForm.comments} onChange={(event) => setScheduleForm((current) => ({ ...current, comments: event.target.value }))} placeholder="Comments" />
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || !scheduleForm.ministerId || !scheduleForm.startsAt || !scheduleForm.endsAt || !scheduleForm.location.trim()}
                  onClick={() => runAction(
                    () => apiClient.patch(`/meetings/${meetingId}/schedule`, {
                      ministerId: scheduleForm.ministerId,
                      startsAt: new Date(scheduleForm.startsAt).toISOString(),
                      endsAt: new Date(scheduleForm.endsAt).toISOString(),
                      location: scheduleForm.location.trim(),
                      isVip: scheduleForm.isVip,
                      comments: scheduleForm.comments,
                    }, authorizedConfig(session.accessToken)),
                    { successMessage: "Meeting scheduled successfully." }
                  )}
                >
                  {selectedMeeting.status === "scheduled" ? "Reschedule Meeting" : "Schedule Meeting"}
                </WorkspaceButton>
              </div>
            ) : null}

            {canCompleteOrCancel ? (
              <div style={{ display: "grid", gap: 14, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                <WorkspaceTextArea
                  rows={3}
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  placeholder="Add a completion or cancellation note"
                />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || actionNote.trim().length < 3}
                  style={{ background: C.mint, color: "#ffffff", border: "none" }}
                  onClick={() => runAction(
                    () => apiClient.patch(`/meetings/${meetingId}/complete`, { reason: actionNote.trim() }, authorizedConfig(session.accessToken)),
                    { successMessage: "Meeting marked as completed." }
                  )}
                >
                  Mark Completed
                </WorkspaceButton>
                <WorkspaceButton
                  type="button"
                  variant="danger"
                  disabled={actionLoading || actionNote.trim().length < 3}
                  onClick={() => runAction(
                    () => apiClient.patch(`/meetings/${meetingId}/cancel`, { reason: actionNote.trim() }, authorizedConfig(session.accessToken)),
                    { successMessage: "Meeting cancelled successfully." }
                  )}
                >
                  Cancel Meeting
                </WorkspaceButton>
                </div>
              </div>
            ) : null}
          </WorkspaceCard>

          <WorkspaceCard style={{ display: "grid", gap: 16 }}>
            <WorkspaceCardHeader
              title="Meeting Files"
              subtitle={canUploadPhotos ? "Meeting photos uploaded here are visible from the minister calendar." : "View the citizen submission files and uploaded meeting artifacts."}
            />
            {canUploadPhotos ? (
              <div className="flex flex-wrap items-center gap-3">
                <input type="file" accept="image/png,image/jpeg" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
                <WorkspaceButton type="button" disabled={!uploadFile || uploadingFile} onClick={uploadMeetingPhoto}>
                  {uploadingFile ? "Uploading..." : "Upload Photo"}
                </WorkspaceButton>
              </div>
            ) : null}
            {meetingFiles.length === 0 ? (
              <div style={{ fontSize: 13, color: C.t3 }}>No files attached to this meeting yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {meetingFiles.map((file) => (
                  <div key={file.id} style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgElevated }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{file.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: C.t3 }}>{file.mimeType}</div>
                  </div>
                ))}
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard>
            <WorkspaceCardHeader title="Meeting Information" />
            <div className="grid gap-8 md:grid-cols-2" style={{ fontSize: 13, color: C.t2 }}>
              <DetailItem label="Request ID" value={selectedMeeting.requestId || selectedMeeting.id} />
              <DetailItem label="Citizen ID" value={selectedMeeting.citizen_code || selectedMeeting.citizen_id || "Pending"} />
              <DetailItem label="Admin Referral" value={selectedMeeting.admin_referral || "Not provided"} />
              <DetailItem label="Assigned Admin" value={selectedMeeting.assignedAdminName || "Pending"} />
              <DetailItem label="Assigned DEO" value={selectedMeeting.assignedDeoName || "Pending"} />
              <DetailItem label="Scheduled At" value={selectedMeeting.scheduled_at ? new Date(selectedMeeting.scheduled_at).toLocaleString("en-IN") : "Pending"} />
              <DetailItem label="Scheduled Location" value={selectedMeeting.scheduled_location || "Pending"} />
              <DetailItem label="VIP" value={selectedMeeting.is_vip ? "Yes" : "No"} />
              <DetailItem label="Visitor ID" value={selectedMeeting.visitorId || "Pending"} />
              <DetailItem label="Meeting Docket" value={selectedMeeting.meetingDocket || "Pending"} />
              <DetailItem label="Created At" value={selectedMeeting.created_at ? new Date(selectedMeeting.created_at).toLocaleString("en-IN") : "Pending"} />
            </div>

            {(selectedMeeting.rejection_reason || selectedMeeting.verification_reason || selectedMeeting.admin_comments || selectedMeeting.completionNote || selectedMeeting.cancellationReason) ? (
              <div className="mt-6 space-y-3">
                {selectedMeeting.rejection_reason ? <NoticeBox tone="red" label="Rejection Reason" value={selectedMeeting.rejection_reason} /> : null}
                {selectedMeeting.verification_reason ? <NoticeBox tone="amber" label="Verification Reason" value={selectedMeeting.verification_reason} /> : null}
                {selectedMeeting.admin_comments ? <NoticeBox tone="blue" label="Admin Comments" value={selectedMeeting.admin_comments} /> : null}
                {selectedMeeting.completionNote ? <NoticeBox tone="blue" label="Completion Note" value={selectedMeeting.completionNote} /> : null}
                {selectedMeeting.cancellationReason ? <NoticeBox tone="red" label="Cancellation Reason" value={selectedMeeting.cancellationReason} /> : null}
              </div>
            ) : null}
          </WorkspaceCard>

          <WorkspaceCard>
            <WorkspaceCardHeader title="Activity Timeline" subtitle="Chronological movement of this meeting through the workflow." />
            <div className="space-y-4">
              {history.length === 0 ? (
                <div style={{ fontSize: 13, color: C.t3 }}>No activity recorded yet.</div>
              ) : (
                history.map((event, index) => (
                  <div key={`${event.created_at}-${index}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
                      {index !== history.length - 1 ? <div className="mt-2 h-12 w-0.5" style={{ background: C.border }} /> : null}
                    </div>
                    <div className="flex-1 pb-4">
                      <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                        <p style={{ fontWeight: 600, color: C.t1 }}>{statusLabel(event.new_status)}</p>
                        <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{event.actor_role}</p>
                        {event.note ? <p style={{ fontSize: 13, color: C.t2, marginTop: 8 }}>{event.note}</p> : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </WorkspaceCard>
        </div>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage width={1280}>
      <div style={{ maxWidth: "1150px", margin: "0 auto", width: "100%" }}>
        <WorkspaceSectionHeader
          eyebrow="Admin Workspace"
          title="Meeting Queue"
          subtitle="Meetings assigned to you appear here for accept, reject, and scheduling actions."
        />

        <div style={{ display: "grid", gap: 24 }}>
          <WorkspaceStatGrid items={queueStats} />

          <WorkspaceCard>
            <WorkspaceCardHeader
              title="Meeting Queue Search"
              subtitle="Search the meetings currently assigned to you."
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: C.t3 }} />
              <WorkspaceInput
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by request ID, title, citizen, or contact..."
                style={{ paddingLeft: 40 }}
              />
            </div>
          </WorkspaceCard>

          {loading ? (
            <WorkspaceEmptyState title="Loading meeting queue..." />
          ) : error ? (
            <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
          ) : filteredMeetingQueue.length === 0 ? (
            <WorkspaceEmptyState title="No assigned meetings found" subtitle="Meetings you assign to yourself from the Meeting Pool will appear here." />
          ) : (
            <WorkspaceCard style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.8fr 1.2fr 1.4fr 1.4fr auto 72px",
                  gap: 16,
                  padding: "12px 20px",
                  background: C.bgElevated,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {["Request ID", "Meeting Title", "Citizen", "Contact", "Preferred Slot", "Status", "Action"].map((column) => (
                  <div
                    key={column}
                    style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", textAlign: column === "Status" || column === "Action" ? "center" : "left" }}
                  >
                    {column}
                  </div>
                ))}
              </div>

              {filteredMeetingQueue.map((meeting, index) => (
                <div
                  key={meeting.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1.8fr 1.2fr 1.4fr 1.4fr auto 72px",
                    gap: 16,
                    padding: "14px 20px",
                    alignItems: "center",
                    background: index % 2 === 0 ? C.card : C.bgElevated,
                    borderBottom: `1px solid ${C.borderLight}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>{meeting.requestId || meeting.id}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {meeting.title || meeting.purpose || "Untitled Meeting"}
                    </div>
                    <div style={{ fontSize: 12, color: C.t3, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {meeting.purpose}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    {[meeting.first_name, meeting.last_name].filter(Boolean).join(" ") || "Unknown Citizen"}
                  </div>
                  <div style={{ fontSize: 13, color: C.t2 }}>{meeting.mobile_number || meeting.email || "No contact"}</div>
                  <div style={{ fontSize: 13, color: C.t2 }}>
                    {meeting.preferred_time ? new Date(meeting.preferred_time).toLocaleString("en-IN") : "Not provided"}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <WorkspaceBadge status={meeting.status}>{statusLabel(meeting.status)}</WorkspaceBadge>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => navigate(`${PATHS.admin.meetings}/${meeting.id}?source=meeting-queue`)}
                      title="View details"
                      style={{
                        color: C.purple,
                        background: `${C.purple}10`,
                        border: `1px solid ${C.purple}22`,
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </WorkspaceCard>
          )}
        </div>
      </div>
    </WorkspacePage>
  );
}
