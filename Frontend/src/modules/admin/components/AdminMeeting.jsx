import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function statusLabel(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default function AdminMeeting() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const { session } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [verificationForm, setVerificationForm] = useState({ deoId: "", reason: "" });
  const [decisionReason, setDecisionReason] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    ministerId: "",
    startsAt: "",
    endsAt: "",
    location: "",
    isVip: false,
    comments: "",
  });
  const [workflowDirectory, setWorkflowDirectory] = useState({ deos: [], ministers: [] });

  useEffect(() => {
    let mounted = true;

    async function loadQueue() {
      try {
        const [queueResponse, directoryResponse] = await Promise.all([
          apiClient.get("/admin/work-queue", authorizedConfig(session.accessToken)),
          apiClient.get("/admin/workflow-directory", authorizedConfig(session.accessToken)),
        ]);
        if (mounted) {
          setMeetings(queueResponse.data.meetings || []);
          setWorkflowDirectory(directoryResponse.data || { deos: [], ministers: [] });
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load admin meeting queue");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken) {
      loadQueue();
    }

    return () => {
      mounted = false;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    let mounted = true;

    async function loadMeetingDetail() {
      if (!meetingId || !session?.accessToken) {
        setSelectedMeeting(null);
        setHistory([]);
        return;
      }

      try {
        const { data } = await apiClient.get(`/meetings/${meetingId}/admin-view`, authorizedConfig(session.accessToken));
        if (mounted) {
          setSelectedMeeting(data.meeting);
          setHistory(data.history || []);
        }
      } catch (detailError) {
        if (mounted) {
          setError(detailError?.response?.data?.error || "Unable to load meeting details");
        }
      }
    }

    loadMeetingDetail();
    return () => {
      mounted = false;
    };
  }, [meetingId, session?.accessToken]);

  const filteredMeetings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meetings.filter((meeting) => {
      if (!q) return true;
      return [
        meeting.title,
        meeting.purpose,
        meeting.citizen_id,
        meeting.first_name,
        meeting.last_name,
        meeting.status,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [meetings, query]);

  if (meetingId && selectedMeeting) {
    const canAccept = selectedMeeting.status === "pending";
    const canSendVerification = ["accepted", "verified", "not_verified"].includes(selectedMeeting.status);
    const canSchedule = ["accepted", "verified", "not_verified", "scheduled"].includes(selectedMeeting.status);
    const canCompleteOrCancel = selectedMeeting.status === "scheduled";

    const runAction = async (request) => {
      setActionLoading(true);
      setActionError("");
      try {
        const { data } = await request();
        setSelectedMeeting(data.meeting);
        const detail = await apiClient.get(`/meetings/${meetingId}/admin-view`, authorizedConfig(session.accessToken));
        setSelectedMeeting(detail.data.meeting);
        setHistory(detail.data.history || []);
      } catch (error) {
        setActionError(error?.response?.data?.error || "Unable to update meeting");
      } finally {
        setActionLoading(false);
      }
    };

    return (
      <WorkspacePage width={1200}>
        <WorkspaceSectionHeader
          eyebrow="Admin Workspace"
          title={selectedMeeting.title}
          subtitle={selectedMeeting.purpose}
          action={
            <WorkspaceButton type="button" variant="ghost" onClick={() => navigate(PATHS.admin.meetings)}>
              <ChevronLeft size={16} />
              Back to Meetings
            </WorkspaceButton>
          }
        />
        <div style={{ display: "grid", gap: 24 }}>
          {actionError && <WorkspaceCard style={{ color: C.danger }}>{actionError}</WorkspaceCard>}
          <div className="grid md:grid-cols-3 gap-6">
            <InfoCard label="Status" value={statusLabel(selectedMeeting.status)} />
            <InfoCard label="Citizen" value={[selectedMeeting.first_name, selectedMeeting.last_name].filter(Boolean).join(" ")} subValue={selectedMeeting.mobile_number || selectedMeeting.email || "No contact"} />
            <InfoCard label="Preferred Time" value={selectedMeeting.preferred_time ? new Date(selectedMeeting.preferred_time).toLocaleString("en-IN") : "Not provided"} />
          </div>

          <WorkspaceCard style={{ display: "grid", gap: 18 }}>
            <WorkspaceCardHeader title="Workflow Actions" />

            {canAccept && (
              <WorkspaceButton
                type="button"
                disabled={actionLoading}
                onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/accept`, {}, authorizedConfig(session.accessToken)))}
              >
                Accept Meeting
              </WorkspaceButton>
            )}

            {(canAccept || canSendVerification || canSchedule || canCompleteOrCancel) && (
              <div className="space-y-3">
                <textarea
                  value={decisionReason}
                  onChange={(event) => setDecisionReason(event.target.value)}
                  rows={3}
                  placeholder="Reason or administrative note"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }}
                />
                <div className="flex flex-wrap gap-3">
                  {(canAccept || canSendVerification || canSchedule) && (
                    <WorkspaceButton
                      type="button"
                      variant="danger"
                      disabled={actionLoading || decisionReason.trim().length < 3}
                      onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/reject`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}
                    >
                      Reject Meeting
                    </WorkspaceButton>
                  )}
                  {canCompleteOrCancel && (
                    <>
                      <WorkspaceButton
                        type="button"
                        disabled={actionLoading || decisionReason.trim().length < 3}
                        onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/complete`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}
                        style={{ background: C.mint, color: "#fff", border: "none" }}
                      >
                        Mark Completed
                      </WorkspaceButton>
                      <WorkspaceButton
                        type="button"
                        variant="danger"
                        disabled={actionLoading || decisionReason.trim().length < 3}
                        onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/cancel`, { reason: decisionReason }, authorizedConfig(session.accessToken)))}
                      >
                        Cancel Meeting
                      </WorkspaceButton>
                    </>
                  )}
                </div>
              </div>
            )}

            {canSendVerification && (
              <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>Send for DEO Verification</h3>
                <input
                  type="hidden"
                  value={verificationForm.deoId}
                  readOnly
                />
                <WorkspaceSelect value={verificationForm.deoId} onChange={(event) => setVerificationForm((current) => ({ ...current, deoId: event.target.value }))}>
                  <option value="">Select DEO</option>
                  {workflowDirectory.deos.map((deo) => (
                    <option key={deo.id} value={deo.id}>
                      {[deo.first_name, deo.last_name].filter(Boolean).join(" ")} · {deo.designation}
                    </option>
                  ))}
                </WorkspaceSelect>
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || !verificationForm.deoId}
                  onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/assign-verification`, { deoId: verificationForm.deoId }, authorizedConfig(session.accessToken)))}
                >
                  Send to Verification
                </WorkspaceButton>
              </div>
            )}

            {canSchedule && (
              <div className="space-y-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>{selectedMeeting.status === "scheduled" ? "Reschedule Meeting" : "Schedule Meeting"}</h3>
                <div className="grid md:grid-cols-2 gap-3">
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
                <textarea value={scheduleForm.comments} onChange={(event) => setScheduleForm((current) => ({ ...current, comments: event.target.value }))} rows={3} placeholder="Comments" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.inp, color: C.t1, fontSize: 13, outline: "none" }} />
                <WorkspaceButton
                  type="button"
                  disabled={actionLoading || !scheduleForm.ministerId || !scheduleForm.startsAt || !scheduleForm.endsAt || !scheduleForm.location}
                  onClick={() => runAction(() => apiClient.patch(`/meetings/${meetingId}/schedule`, {
                    ministerId: scheduleForm.ministerId,
                    startsAt: new Date(scheduleForm.startsAt).toISOString(),
                    endsAt: new Date(scheduleForm.endsAt).toISOString(),
                    location: scheduleForm.location,
                    isVip: scheduleForm.isVip,
                    comments: scheduleForm.comments,
                  }, authorizedConfig(session.accessToken)))}
                >
                  {selectedMeeting.status === "scheduled" ? "Reschedule Meeting" : "Schedule Meeting"}
                </WorkspaceButton>
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard>
            <WorkspaceCardHeader title="Meeting Information" />
            <div className="grid md:grid-cols-2 gap-8" style={{ fontSize: 13, color: C.t2 }}>
              <DetailItem label="Request ID" value={selectedMeeting.requestId || selectedMeeting.id} />
              <DetailItem label="Citizen ID" value={selectedMeeting.citizen_id || selectedMeeting.citizen_code} />
              <DetailItem label="Admin Referral" value={selectedMeeting.admin_referral || "Not provided"} />
              <DetailItem label="Scheduled At" value={selectedMeeting.scheduled_at ? new Date(selectedMeeting.scheduled_at).toLocaleString("en-IN") : "Pending"} />
              <DetailItem label="Scheduled Location" value={selectedMeeting.scheduled_location || "Pending"} />
              <DetailItem label="VIP" value={selectedMeeting.is_vip ? "Yes" : "No"} />
              <DetailItem label="Visitor ID" value={selectedMeeting.visitorId || "Pending"} />
              <DetailItem label="Meeting Docket" value={selectedMeeting.meetingDocket || "Pending"} />
              <DetailItem label="Assigned Admin" value={selectedMeeting.assignedAdminName || "Pending"} />
              <DetailItem label="Assigned DEO" value={selectedMeeting.assignedDeoName || "Pending"} />
              <DetailItem label="Created At" value={new Date(selectedMeeting.created_at).toLocaleString("en-IN")} />
            </div>

            {(selectedMeeting.rejection_reason || selectedMeeting.verification_reason || selectedMeeting.admin_comments || selectedMeeting.completionNote || selectedMeeting.cancellationReason) && (
              <div className="mt-6 space-y-3">
                {selectedMeeting.rejection_reason && <NoticeBox tone="red" label="Rejection Reason" value={selectedMeeting.rejection_reason} />}
                {selectedMeeting.verification_reason && <NoticeBox tone="amber" label="Verification Reason" value={selectedMeeting.verification_reason} />}
                {selectedMeeting.admin_comments && <NoticeBox tone="blue" label="Admin Comments" value={selectedMeeting.admin_comments} />}
                {selectedMeeting.completionNote && <NoticeBox tone="blue" label="Completion Note" value={selectedMeeting.completionNote} />}
                {selectedMeeting.cancellationReason && <NoticeBox tone="red" label="Cancellation Reason" value={selectedMeeting.cancellationReason} />}
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard>
            <WorkspaceCardHeader title="Activity Timeline" />
            <div className="space-y-4">
              {history.map((event, index) => (
                <div key={`${event.created_at}-${index}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
                    {index !== history.length - 1 && <div className="w-0.5 h-12 mt-2" style={{ background: C.border }} />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                      <p style={{ fontWeight: 600, color: C.t1 }}>{statusLabel(event.new_status)}</p>
                      <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{event.actor_role}</p>
                      {event.note && <p style={{ fontSize: 13, color: C.t2, marginTop: 8 }}>{event.note}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </WorkspaceCard>
        </div>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage width={1280}>
      <WorkspaceSectionHeader
        eyebrow="Admin Workspace"
        title="Meeting Queue"
        subtitle="Admin-facing queue sourced from the backend meeting workflow."
      />

      <div style={{ display: "grid", gap: 24 }}>
        <WorkspaceCard>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={20} style={{ color: C.t3 }} />
            <WorkspaceInput
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, purpose, citizen, or status..."
              style={{ paddingLeft: 40 }}
            />
          </div>
        </WorkspaceCard>

        {loading ? (
          <WorkspaceEmptyState title="Loading meeting queue..." />
        ) : error ? (
          <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeetings.map((meeting) => (
              <WorkspaceCard
                key={meeting.id}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1">
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{meeting.id}</p>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginTop: 6 }}>{meeting.title}</h3>
                    <p style={{ fontSize: 13, color: C.t2, marginTop: 8 }}>{meeting.purpose}</p>
                  </div>
                  <WorkspaceBadge status={meeting.status}>{statusLabel(meeting.status)}</WorkspaceBadge>
                </div>

                <div className="space-y-2" style={{ fontSize: 13, color: C.t2 }}>
                  <div>{[meeting.first_name, meeting.last_name].filter(Boolean).join(" ")}</div>
                  <div>{meeting.mobile_number || meeting.email || "No contact"}</div>
                  <div>{meeting.preferred_time ? new Date(meeting.preferred_time).toLocaleString("en-IN") : "No preferred time"}</div>
                </div>
              </WorkspaceCard>
            ))}
          </div>
        )}
      </div>
    </WorkspacePage>
  );
}

function InfoCard({ label, value, subValue }) {
  const { C } = usePortalTheme();
  return (
    <WorkspaceCard style={{ padding: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
      <div style={{ marginTop: 8 }}><WorkspaceBadge>{value}</WorkspaceBadge></div>
      {subValue && <p style={{ fontSize: 12, color: C.t3, marginTop: 8 }}>{subValue}</p>}
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
  const toneColors = {
    red: C.danger,
    amber: C.warn,
    blue: C.purple,
  };
  const color = toneColors[tone] || C.purple;
  return (
    <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}12` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 13, color: C.t2 }}>{value}</p>
    </div>
  );
}
