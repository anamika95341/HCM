import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, MapPin, Calendar, FileText, Hash, Briefcase } from "lucide-react";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { useNotifications } from "../../../shared/notifications/NotificationContext.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import { WorkspaceBadge, WorkspaceCard, WorkspaceEmptyState } from "../../../shared/components/WorkspaceUI.jsx";

function formatStatus(status) {
  return String(status || "pending")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function formatActorRole(role) {
  return String(role || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function DetailBlock({ icon, label, value, multiline = false, compact = false }) {
  const { C } = usePortalTheme();
  return (
    <div
      style={{
        padding: compact ? "0 0 14px" : "0 0 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          fontSize: 11,
          fontWeight: 700,
          color: C.t3,
          textTransform: "uppercase",
          letterSpacing: ".08em",
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: C.t1,
          fontWeight: 500,
          lineHeight: multiline ? 1.6 : 1.45,
          whiteSpace: multiline ? "normal" : undefined,
          wordBreak: "break-word",
        }}
      >
        {value || <span style={{ color: C.t3, fontStyle: "italic" }}>Not provided</span>}
      </div>
    </div>
  );
}

export default function CaseDetailsPage() {
  const { C } = usePortalTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { session } = useAuth();
  const { eventVersion } = useNotifications();
  const [caseData, setCaseData] = useState(location.state?.caseData || null);
  const [itemType, setItemType] = useState(location.state?.itemType || location.state?.caseData?.itemType || "");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isBackHovered, setIsBackHovered] = useState(false);
  const pageHeight = "calc(100vh - 73px)";

  useEffect(() => {
    let mounted = true;

    async function loadCaseDetail() {
      try {
        const { data } = await apiClient.get(`/citizen/cases/${id}`, authorizedConfig(session.accessToken));
        if (!mounted) return;
        setCaseData(data.caseData);
        setItemType(data.itemType);
        setHistory(data.history || []);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.response?.data?.error || "Unable to load case details");
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
  }, [id, session?.accessToken, eventVersion]);

  if (loading) {
    return (
      <div style={{ height: pageHeight, overflow: "hidden", padding: "16px 20px 12px" }}>
        <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto" }}>
          <WorkspaceEmptyState title="Loading complaint details..." />
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div style={{ height: pageHeight, overflow: "hidden", padding: "16px 20px 12px" }}>
        <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto" }}>
          <WorkspaceCard style={{ textAlign: "center" }}>
            <p style={{ color: C.t2, fontWeight: 600, marginBottom: 16 }}>{error || "Case details not found"}</p>
          </WorkspaceCard>
        </div>
      </div>
    );
  }

  const isMeeting = itemType === "meeting";
  const complaintTitle = caseData.title || caseData.subject;
  const complaintId = caseData.complaintId || caseData.id;
  const hasUploadedDocument = Boolean(caseData.document_file_id);
  const createdLabel = caseData.createdAt || caseData.created_at
    ? new Date(caseData.createdAt || caseData.created_at).toLocaleString("en-IN")
    : "Not provided";
  const incidentDateLabel = caseData.incidentDate
    ? new Date(caseData.incidentDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
    : "Not provided";

  return (
    <div
      style={{
        height: pageHeight,
        overflow: "hidden",
        padding: "16px 20px 12px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div className="mb-4" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", flexShrink: 0 }}>
            <div style={{ justifySelf: "start" }}>
              <button
                type="button"
                onMouseEnter={() => setIsBackHovered(true)}
                onMouseLeave={() => setIsBackHovered(false)}
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 font-medium transition-colors"
                style={{
                  border: `1px solid ${C.purple}`,
                  background: isBackHovered ? C.purple : "transparent",
                  color: isBackHovered ? "#ffffff" : C.purple,
                  fontSize: 13,
                  padding: "8px 8px",
                  borderRadius: 10,
                  whiteSpace: "nowrap",
                }}
              >
                <ChevronRight size={16} className="rotate-180" />
                {isMeeting ? "Back to Meetings" : "Back to Complaints"}
              </button>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.t1, margin: 0, textAlign: "center" }}>
              {isMeeting ? "MEETING DETAILS" : "COMPLAINT DETAILS"}
            </h2>
            <div />
          </div>

          <div className="grid lg:grid-cols-[7fr_3fr] gap-6" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
            <div style={{ minHeight: 0 }}>
              <WorkspaceCard style={{ height: "100%" }}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <DetailBlock icon={<Hash size={14} />} label="Complaint ID" value={complaintId} compact />
                  <div style={{ padding: "0 0 14px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.t3,
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                      }}
                    >
                      <Calendar size={14} />
                      Status
                    </div>
                    <WorkspaceBadge status={caseData.status}>{formatStatus(caseData.status)}</WorkspaceBadge>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <DetailBlock icon={<FileText size={14} />} label="Complaint Title" value={complaintTitle} multiline compact />
                </div>

                <div className="grid md:grid-cols-3 gap-4" style={{ marginTop: 16 }}>
                  <DetailBlock icon={<MapPin size={14} />} label="Complaint Location" value={caseData.complaintLocation || "Not provided"} compact />
                  <DetailBlock icon={<Calendar size={14} />} label="Date of Incident" value={incidentDateLabel} compact />
                  <DetailBlock icon={<Calendar size={14} />} label="Complaint Filed Date" value={createdLabel} compact />
                </div>

                <div style={{ marginTop: 16 }}>
                  <DetailBlock icon={<Briefcase size={14} />} label="Category" value={caseData.complaintType || "Not provided"} compact />
                </div>

                <div style={{ marginTop: 16 }}>
                  <DetailBlock
                    icon={<FileText size={14} />}
                    label="Complaint Description"
                    value={caseData.description || "No description available"}
                    multiline
                    compact
                  />
                </div>

                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.t3,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                    }}
                  >
                    <FileText size={14} />
                    Documents
                  </div>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      background: C.bgElevated,
                    }}
                  >
                    <div style={{ fontSize: 14, color: C.t1, fontWeight: 500, lineHeight: 1.5 }}>
                      {hasUploadedDocument ? "Document uploaded with this complaint" : "No documents uploaded"}
                    </div>
                  </div>
                </div>
              </WorkspaceCard>
            </div>

            <div style={{ minHeight: 0 }}>
              <WorkspaceCard style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.t1, marginBottom: 16, flexShrink: 0 }}>
                  Timeline
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 0, marginRight: -8 }}>
                  {history.length === 0 ? (
                    <p style={{ color: C.t3, fontSize: 13 }}>No timeline entries yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((entry, index) => (
                        <div key={`${entry.id || entry.created_at}-${index}`} className="flex gap-4" style={{ alignItems: "flex-start" }}>
                          <div className="flex flex-col items-center self-stretch" style={{ paddingTop: 2 }}>
                            <div className="w-3 h-3 rounded-full" style={{ background: C.purple, border: `2px solid ${C.card}` }} />
                            {index !== history.length - 1 ? <div className="w-0.5 flex-1 min-h-14 mt-2" style={{ background: C.purple }} /> : null}
                          </div>
                          <div className="flex-1 pb-3">
                            <div>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: C.t2, margin: 0, whiteSpace: "normal", wordBreak: "break-word" }}>{formatStatus(entry.new_status)}</p>
                                <p style={{ fontSize: 12, color: C.t3, margin: 0, paddingRight: 10, whiteSpace: "normal", wordBreak: "break-word", textAlign: "right" }}>{formatActorRole(entry.actor_role)}</p>
                              </div>
                              {entry.note ? <p style={{ fontSize: 13, color: C.t2, marginTop: 8, marginBottom: 0, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.5 }}>{entry.note}</p> : null}
                              <p style={{ fontSize: 12, color: C.t3, marginTop: 8, marginBottom: 0 }}>{new Date(entry.created_at).toLocaleString("en-IN")}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </WorkspaceCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
