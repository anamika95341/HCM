import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
} from "lucide-react";
import { apiClient } from "../../../shared/api/client.js";
import { openDownloadUrl } from "../../../shared/api/downloads.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { useNotifications } from "../../../shared/notifications/NotificationContext.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePage,
} from "../../../shared/components/WorkspaceUI.jsx";

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

function cleanTimelineNote(note) {
  if (!note) return "";
  return String(note).replace(/Sent to DEO\s+[a-f0-9-]+\s+for verification/i, "Sent to DEO for verification");
}

function valueTone(status, C) {
  const s = String(status || "").toLowerCase().replace(/[_\s-]/g, "");
  if (/^(verified|resolved|completed|scheduled|active|accepted|approved)$/.test(s)) return C.mint;
  if (/^(rejected|cancelled|notverified|locked|failed)$/.test(s)) return C.danger;
  if (/^(pending|submitted|inreview|assigned|verificationpending|deptcontactidentified|callscheduled|followup|escalatedtomeeting|escalated)$/.test(s)) return C.warn;
  return C.purple;
}

function DetailBlock({ label, value, multiline = false, compact = false, valueColor }) {
  const { C } = usePortalTheme();
  return (
    <div
      style={{
        padding: compact ? "0 0 14px" : "0 0 16px",
      }}
    >
      <div
        className="portal-citizen-label"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 8,
          color: C.t3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        className="portal-citizen-value"
        style={{
          color: valueColor || C.t1,
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

function getAttachedFiles(item) {
  if (Array.isArray(item?.files) && item.files.length > 0) {
    return item.files;
  }
  return item?.document ? [item.document] : [];
}

export default function MeetingDetail() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const { session } = useAuth();
  const { eventVersion } = useNotifications();
  const [meeting, setMeeting] = useState(state?.meetingData || null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isBackHovered, setIsBackHovered] = useState(false);
  const informationCardRef = useRef(null);
  const [timelineCardHeight, setTimelineCardHeight] = useState(null);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  useEffect(() => {
    let mounted = true;

    async function loadMeeting() {
      try {
        setLoading(true);
        setError("");
        const { data } = await apiClient.get(`/meetings/my/${id}`);
        if (mounted) {
          setMeeting(data.meeting || null);
          setHistory(data.history || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load meeting details");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.role && id) {
      loadMeeting();
    }

    return () => {
      mounted = false;
    };
  }, [id, session?.role, eventVersion]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateLayout = () => {
      setIsDesktopLayout(window.innerWidth >= 1024);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    if (!isDesktopLayout) {
      setTimelineCardHeight(null);
      return undefined;
    }

    const cardElement = informationCardRef.current;
    if (!cardElement || typeof ResizeObserver === "undefined") return undefined;

    const updateHeight = () => {
      setTimelineCardHeight(cardElement.getBoundingClientRect().height);
    };

    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(cardElement);

    return () => observer.disconnect();
  }, [isDesktopLayout, meeting, history]);

  if (loading) {
    return (
      <WorkspacePage width={1320}>
        <WorkspaceEmptyState title="Loading meeting..." />
      </WorkspacePage>
    );
  }

  if (error) {
    return (
      <WorkspacePage width={1320}>
        <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
      </WorkspacePage>
    );
  }

  if (loading) {
    return (
      <div className="portal-citizen-page" style={{ minHeight: "100%", padding: "16px 20px 12px" }}>
        <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto" }}>
          <WorkspaceEmptyState title="Loading meeting details..." />
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="portal-citizen-page" style={{ minHeight: "100%", padding: "16px 20px 12px" }}>
        <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto" }}>
          <WorkspaceCard style={{ textAlign: "center" }}>
            <p style={{ color: C.t2, fontWeight: 600, marginBottom: 16 }}>{error || "Meeting not found"}</p>
          </WorkspaceCard>
        </div>
      </div>
    );
  }

  const preferredTimeLabel = meeting.preferred_time
    ? new Date(meeting.preferred_time).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })
    : null;
  const createdAtLabel = meeting.createdAt || meeting.created_at
    ? new Date(meeting.createdAt || meeting.created_at).toLocaleDateString("en-GB")
    : "Not provided";
  const scheduledTimeLabel = meeting.scheduled_at
    ? new Date(meeting.scheduled_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })
    : "Pending";
  const attachedFiles = getAttachedFiles(meeting);
  const hasUploadedDocument = attachedFiles.length > 0;
  const statusLabel = formatStatus(meeting.status);
  const locationLabel = meeting.scheduled_location || "Pending";
  const scheduledTone = valueTone(meeting.scheduled_at ? "scheduled" : "pending", C);
  const locationTone = valueTone(meeting.scheduled_location ? "scheduled" : "pending", C);

  return (
    <div
      className="portal-citizen-page"
      style={{
        minHeight: "100%",
        overflowY: "visible",
        padding: "16px 20px 12px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
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
                Back to Meetings
              </button>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.t1, margin: 0, textAlign: "center" }}>MEETING DETAILS</h2>
            <div />
          </div>

          <div className="grid lg:grid-cols-[7fr_3fr] gap-6" style={{ flex: 1, minHeight: 0, alignItems: "start" }}>
            <div ref={informationCardRef} style={{ minHeight: 0 }}>
              <WorkspaceCard style={{ marginBottom: 0 }}>
                <div className="grid md:grid-cols-3 gap-4">
                  <DetailBlock label="Meeting ID" value={meeting.requestId || meeting.id} compact />
                  <DetailBlock label="Created At" value={createdAtLabel} compact />
                  <div style={{ padding: "0 0 14px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 8,
                        color: C.t3,
                        textTransform: "uppercase",
                      }}
                      className="portal-citizen-label"
                    >
                      Status
                    </div>
                    <WorkspaceBadge status={meeting.status}>{statusLabel}</WorkspaceBadge>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <DetailBlock
                    label="Meeting Title"
                    value={meeting.title || meeting.primaryTitle}
                    multiline
                    compact
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4" style={{ marginTop: 16 }}>
                  <DetailBlock label="Preferred Date/Time" value={preferredTimeLabel} compact />
                  <div style={{ padding: "0 0 14px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.t3,
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                      }}
                    >
                      Scheduled Time
                    </div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: `${scheduledTone}18`,
                      color: scheduledTone,
                      border: `1px solid ${scheduledTone}28`,
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      whiteSpace: "normal",
                    }}>
                      {scheduledTimeLabel}
                    </span>
                  </div>
                  <div style={{ padding: "0 0 14px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 8,
                        color: C.t3,
                        textTransform: "uppercase",
                      }}
                      className="portal-citizen-label"
                    >
                      Location
                    </div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: `${locationTone}18`,
                      color: locationTone,
                      border: `1px solid ${locationTone}28`,
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      whiteSpace: "normal",
                    }}>
                      {locationLabel}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <DetailBlock
                    label="Meeting Description"
                    value={meeting.purpose}
                    multiline
                    compact
                  />
                </div>

                <div
                  style={{ marginTop: 16 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 8,
                        color: C.t3,
                        textTransform: "uppercase",
                      }}
                      className="portal-citizen-label"
                    >
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
                    {hasUploadedDocument ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {attachedFiles.map((file) => (
                          <div
                            key={file.id || file.downloadUrl || file.name}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
                          >
                            <div>
                              <div className="portal-citizen-value" style={{ color: C.t1, fontWeight: 600 }}>{file.name}</div>
                              <div className="portal-citizen-caption" style={{ marginTop: 4, color: C.t3 }}>{file.mimeType || "Document"}</div>
                            </div>
                            <WorkspaceButton
                              type="button"
                              variant="outline"
                              onClick={() => openDownloadUrl(file.downloadUrl)}
                            >
                              Download
                            </WorkspaceButton>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="portal-citizen-value" style={{ color: C.t1, fontWeight: 500 }}>
                        No documents uploaded
                      </div>
                    )}
                  </div>
                </div>
              </WorkspaceCard>
            </div>

            <div
              style={{
                minHeight: 0,
                height: isDesktopLayout && timelineCardHeight ? timelineCardHeight : "auto",
              }}
            >
              <WorkspaceCard
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  height: "100%",
                  marginBottom: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.t1,
                    marginBottom: 16,
                    flexShrink: 0,
                  }}
                >
                  Timeline
                </div>

                <div style={{ flex: 1, minHeight: 0, paddingRight: 0, overflowY: isDesktopLayout && timelineCardHeight ? "auto" : "visible" }}>
                  {history.length === 0 ? (
                    <p className="portal-citizen-caption" style={{ color: C.t3 }}>No timeline entries yet.</p>
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
                                <p className="portal-citizen-value" style={{ fontWeight: 600, color: C.t2, margin: 0, whiteSpace: "normal", wordBreak: "break-word" }}>{formatStatus(entry.new_status)}</p>
                                <p className="portal-citizen-caption" style={{ color: C.t3, margin: 0, paddingRight: 10, whiteSpace: "normal", wordBreak: "break-word", textAlign: "right" }}>{formatActorRole(entry.actor_role)}</p>
                              </div>
                              {entry.note ? <p className="portal-citizen-value" style={{ color: C.t2, marginTop: 8, marginBottom: 0, whiteSpace: "normal", wordBreak: "break-word" }}>{cleanTimelineNote(entry.note)}</p> : null}
                              <p className="portal-citizen-caption" style={{ color: C.t3, marginTop: 8, marginBottom: 0 }}>{new Date(entry.created_at).toLocaleString("en-IN")}</p>
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
