import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, FileText, User, MapPin, Calendar, Users, FileCheck } from "lucide-react";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { PATHS } from "../../../routes/paths.js";
import { WorkspaceBadge, WorkspaceButton, WorkspaceCard, WorkspaceCardHeader, WorkspaceEmptyState, WorkspacePage, WorkspaceSectionHeader } from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function statusBadgeClass(status) {
  if (status === "scheduled") return "bg-emerald-100 text-emerald-700 border border-emerald-300";
  if (["accepted", "verified", "resolved", "completed"].includes(status)) return "bg-sky-100 text-sky-700 border border-sky-300";
  if (["verification_pending", "pending", "assigned", "in_review", "department_contact_identified", "call_scheduled", "followup_in_progress", "escalated_to_meeting"].includes(status)) return "bg-amber-100 text-amber-700 border border-amber-300";
  if (["rejected", "cancelled", "not_verified"].includes(status)) return "bg-red-100 text-red-700 border border-red-300";
  return "bg-slate-100 text-slate-700 border border-slate-300";
}

function getStatusIcon(status) {
  if (["resolved", "completed"].includes(status)) return <CheckCircle2 size={24} className="text-green-600" />;
  if (["rejected", "cancelled", "not_verified"].includes(status)) return <AlertCircle size={24} className="text-red-600" />;
  return <Clock size={24} className="text-amber-600" />;
}

function citizenFacingStatus(caseData, itemType) {
  if (itemType === "meeting" && ["verification_pending", "accepted", "verified", "not_verified", "pending"].includes(caseData?.status)) {
    return "Under Review";
  }
  if (itemType === "complaint" && ["assigned", "department_contact_identified", "call_scheduled", "followup_in_progress", "escalated_to_meeting"].includes(caseData?.status)) {
    return "Under Review";
  }
  return String(caseData?.status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default function CaseDetailsPage() {
  const { C } = usePortalTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { session } = useAuth();
  const [caseData, setCaseData] = useState(location.state?.caseData || null);
  const [itemType, setItemType] = useState(location.state?.itemType || location.state?.caseData?.itemType || "");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCaseDetail() {
      try {
        const { data } = await apiClient.get(`/citizen/cases/${id}`, authorizedConfig(session.accessToken));
        if (mounted) {
          setCaseData(data.caseData);
          setItemType(data.itemType);
          setHistory(data.history || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load case details");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken) {
      loadCaseDetail();
    }

    return () => {
      mounted = false;
    };
  }, [id, session?.accessToken]);

  if (loading) {
    return <WorkspacePage width={1200}><WorkspaceEmptyState title="Loading case details..." /></WorkspacePage>;
  }

  if (error || !caseData) {
    return (
      <WorkspacePage width={1200}>
        <WorkspaceCard style={{ textAlign: "center" }}>
          <p style={{ color: C.t2, fontWeight: 600, marginBottom: 16 }}>{error || "Case details not found"}</p>
          <WorkspaceButton onClick={() => navigate(PATHS.citizen.cases)}>Back to Cases</WorkspaceButton>
        </WorkspaceCard>
      </WorkspacePage>
    );
  }

  const isMeeting = itemType === "meeting";
  const statusColor = statusBadgeClass(caseData.status);

  return (
    <WorkspacePage width={1200}>
      <WorkspaceSectionHeader
        eyebrow="Citizen Workspace"
        title={isMeeting ? caseData.requestId : caseData.complaintId}
        subtitle={isMeeting ? caseData.title || caseData.purpose : caseData.title}
        action={<WorkspaceButton variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back</WorkspaceButton>}
        icon={<FileText size={20} />}
      />

      <div style={{ marginBottom: 24 }}>
        <WorkspaceBadge>{citizenFacingStatus(caseData, itemType)}</WorkspaceBadge>
      </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <WorkspaceCard>
              <WorkspaceCardHeader title="Description" />
              <p style={{ color: C.t2, lineHeight: 1.7 }}>{caseData.description || caseData.purpose || "No description available"}</p>
            </WorkspaceCard>

            <div className="grid sm:grid-cols-2 gap-4">
              <InfoBox icon={<User size={18} color={C.purple} />} label="Owner/Holder" value={caseData.currentOwner || caseData.assignedAdminName || "Pending"} />
              <InfoBox icon={<FileCheck size={18} color={C.purple} />} label="Department" value={isMeeting ? (caseData.admin_referral || caseData.assignedAdminName || "Admin Pool") : (caseData.department || "Complaint Desk")} />
              {isMeeting && <InfoBox icon={<MapPin size={18} color={C.purple} />} label="Location" value={caseData.scheduled_location || "Pending"} />}
              {isMeeting && <InfoBox icon={<Calendar size={18} color={C.purple} />} label="Scheduled Date" value={caseData.scheduled_at ? new Date(caseData.scheduled_at).toLocaleString("en-IN") : "Pending"} />}
              {!isMeeting && <InfoBox icon={<MapPin size={18} color={C.purple} />} label="Complaint Location" value={caseData.complaintLocation || "Not provided"} />}
              {!isMeeting && <InfoBox icon={<Users size={18} color={C.purple} />} label="Complaint Type" value={caseData.complaintType || "Not provided"} />}
            </div>

            <WorkspaceCard>
              <WorkspaceCardHeader title="Workflow Notes" />
              <div className="space-y-3" style={{ color: C.t2 }}>
                {isMeeting && caseData.admin_comments && <p><strong>Admin Comments:</strong> {caseData.admin_comments}</p>}
                {isMeeting && caseData.verification_reason && <p><strong>Verification Note:</strong> {caseData.verification_reason}</p>}
                {isMeeting && caseData.rejection_reason && <p><strong>Rejection Reason:</strong> {caseData.rejection_reason}</p>}
                {!isMeeting && caseData.statusReason && <p><strong>Status Reason:</strong> {caseData.statusReason}</p>}
                {!isMeeting && caseData.callOutcome && <p><strong>Call Outcome:</strong> {caseData.callOutcome}</p>}
                {!isMeeting && caseData.resolutionSummary && <p><strong>Resolution Summary:</strong> {caseData.resolutionSummary}</p>}
                {!isMeeting && !caseData.statusReason && !caseData.callOutcome && !caseData.resolutionSummary && <p>No workflow notes available yet.</p>}
                {isMeeting && !caseData.admin_comments && !caseData.verification_reason && !caseData.rejection_reason && <p>No workflow notes available yet.</p>}
              </div>
            </WorkspaceCard>

            <WorkspaceCard>
              <WorkspaceCardHeader title="Timeline" />
              <div className="space-y-4">
                {history.length === 0 ? (
                  <p style={{ color: C.t3, fontSize: 13 }}>No timeline entries yet.</p>
                ) : history.map((entry, index) => (
                  <div key={`${entry.id || entry.created_at}-${index}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
                      {index !== history.length - 1 && <div className="w-0.5 h-12 mt-2" style={{ background: C.border }} />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                        <p style={{ fontWeight: 600, color: C.t1 }}>
                          {String(entry.new_status || "").split("_").filter(Boolean).map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(" ")}
                        </p>
                        <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{entry.actor_role}</p>
                        {entry.note && <p style={{ fontSize: 13, color: C.t2, marginTop: 8 }}>{entry.note}</p>}
                        <p style={{ fontSize: 12, color: C.t3, marginTop: 8 }}>{new Date(entry.created_at).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </WorkspaceCard>
          </div>

          <div className="space-y-6">
            <WorkspaceCard>
              <WorkspaceCardHeader title="Case Summary" />
              <div className="space-y-4">
                <SummaryRow label="Created" value={new Date(caseData.createdAt || caseData.created_at).toLocaleString("en-IN")} />
                {isMeeting && <SummaryRow label="Preferred Time" value={caseData.preferred_time ? new Date(caseData.preferred_time).toLocaleString("en-IN") : "Not provided"} />}
                {isMeeting && <SummaryRow label="Visitor ID" value={caseData.visitorId || "Pending"} />}
                {isMeeting && <SummaryRow label="Meeting Docket" value={caseData.meetingDocket || "Pending"} />}
                {!isMeeting && <SummaryRow label="Officer" value={caseData.officerName || "Pending"} />}
                {!isMeeting && <SummaryRow label="Officer Contact" value={caseData.officerContact || caseData.manualContact || "Pending"} />}
                {!isMeeting && <SummaryRow label="Linked Meeting" value={caseData.relatedMeeting?.requestId || "No linked meeting"} />}
                {isMeeting && <SummaryRow label="Linked Complaint" value={caseData.relatedComplaint?.complaintId || "No linked complaint"} />}
              </div>
            </WorkspaceCard>
          </div>
        </div>
    </WorkspacePage>
  );
}

function InfoBox({ icon, label, value }) {
  const { C } = usePortalTheme();
  return (
    <WorkspaceCard style={{ padding: 16 }}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, fontWeight: 700 }}>{label}</p>
      </div>
      <p style={{ color: C.t1, fontWeight: 500 }}>{value}</p>
    </WorkspaceCard>
  );
}

function SummaryRow({ label, value }) {
  const { C } = usePortalTheme();
  return (
    <div>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.t3, fontWeight: 700 }}>{label}</p>
      <p style={{ color: C.t1, fontWeight: 500, marginTop: 4 }}>{value}</p>
    </div>
  );
}
