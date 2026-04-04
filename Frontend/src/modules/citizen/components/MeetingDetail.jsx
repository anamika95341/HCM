import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight, Calendar, Clock, MapPin, Users, FileText,
  MessageSquare, ShieldCheck, User, Phone, Hash, UploadCloud, Image as ImageIcon
} from "lucide-react";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { CITIZEN_ACCEPT, uploadPrivateFile } from "../../../shared/api/privateFiles.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspacePage,
} from "../../../shared/components/WorkspaceUI.jsx";

function meetingStatus(item) {
  const status = item.status || "pending";
  if (["pending", "accepted", "verification_pending", "verified"].includes(status)) {
    return { value: status, label: "Under Review" };
  }
  if (status === "not_verified") {
    return { value: status, label: "Verification Failed" };
  }
  const label = String(status)
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
  return { value: status, label };
}

function InfoRow({ label, value, icon }) {
  const { C } = usePortalTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>
        {value || <span style={{ color: C.t3, fontStyle: "italic" }}>Not provided</span>}
      </div>
    </div>
  );
}

export default function MeetingDetail() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const { session } = useAuth();
  const [item, setItem] = useState(state?.meetingData || null);
  const [loading, setLoading] = useState(!state?.meetingData);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function loadMeeting() {
      try {
        setLoading(true);
        setError("");
        const { data } = await apiClient.get(`/meetings/my/${id}`, authorizedConfig(session?.accessToken));
        if (mounted) {
          setItem(data.meeting || null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load meeting");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken && id) {
      loadMeeting();
    }

    return () => {
      mounted = false;
    };
  }, [id, session?.accessToken]);

  async function handleUpload() {
    if (!selectedFile || uploading || !session?.accessToken || !item?.id) {
      return;
    }

    try {
      setUploading(true);
      setUploadError("");
      setUploadSuccess("");
      await uploadPrivateFile({
        accessToken: session.accessToken,
        file: selectedFile,
        contextType: "meeting",
        contextId: item.id,
        role: "citizen",
      });
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setUploadSuccess("File uploaded successfully. It is now visible to admin.");
    } catch (submitError) {
      setUploadError(submitError?.response?.data?.error || submitError.message || "Unable to upload file");
    } finally {
      setUploading(false);
    }
  }

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

  if (!item) {
    return (
      <WorkspacePage width={1320}>
        <div style={{ textAlign: "center", padding: 60, color: C.t3 }}>
          Meeting not found. Please go back and try again.
        </div>
      </WorkspacePage>
    );
  }

  const statusObj = meetingStatus(item);
  const preferredTimeLabel = item.preferred_time
    ? new Date(item.preferred_time).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })
    : null;
  const scheduledTimeLabel = item.scheduled_at
    ? new Date(item.scheduled_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })
    : null;
  const createdAtLabel = item.created_at
    ? new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })
    : null;

  let attendees = [];
  try {
    if (typeof item.additional_attendees === "string") {
      attendees = JSON.parse(item.additional_attendees);
    } else if (Array.isArray(item.additional_attendees)) {
      attendees = item.additional_attendees;
    }
  } catch {
    attendees = [];
  }

  return (
    <WorkspacePage width={1320}>
      {/* HEADER */}
      <div
        className="mb-4"
        style={{
          position: "sticky", top: 0, zIndex: 40,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ width: 160, flexShrink: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 font-medium transition-colors"
            style={{ color: C.purple, whiteSpace: "nowrap" }}
          >
            <ChevronRight size={20} className="rotate-180" />
            Back to Meetings
          </button>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: C.t1 }}>Meeting Details</h2>
        <div style={{ width: 160, flexShrink: 0 }}></div>
      </div>

      {/* TITLE + STATUS */}
      <WorkspaceCard style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}> 
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.t1, marginBottom: 6 }}>
            {item.primaryTitle || item.title}
          </h1>
          {item.purpose && (
            <p style={{
              fontSize: 14,
              color: C.t2,
              lineHeight: 1.6,
              overflowWrap: "break-word",   // ← add
              wordBreak: "break-word",      // ← add
              // maxWidth: 700  ← remove this, let the container control width
            }}>
              {item.purpose}
            </p>
          )}
        </div>
      </WorkspaceCard>

      {/* SCHEDULING INFO */}
      <WorkspaceCard style={{ marginBottom: 16 }}>
        <WorkspaceCardHeader title="Scheduling" />
        <div className="grid md:grid-cols-3 gap-6" style={{ marginTop: 16 }}>
          <InfoRow icon={<Calendar size={12} />} label="Preferred Time" value={preferredTimeLabel} />
          <InfoRow icon={<Clock size={12} />} label="Scheduled Time" value={scheduledTimeLabel} />
          <InfoRow icon={<MapPin size={12} />} label="Location" value={item.scheduled_location} />
        </div>
      </WorkspaceCard>

      {/* ADMIN / REFERRAL INFO */}
      {(item.admin_referral || item.requestId || item.id) && (
        <WorkspaceCard style={{ marginBottom: 16 }}>
          <WorkspaceCardHeader title="Reference" />
          <div className="grid md:grid-cols-2 gap-6" style={{ marginTop: 16 }}>
            {(item.requestId || item.id) && (
              <InfoRow icon={<Hash size={12} />} label="Request ID" value={item.requestId || item.id} />
            )}
            {item.admin_referral && (
              <InfoRow icon={<User size={12} />} label="Admin Desk" value={item.admin_referral} />
            )}
          </div>
        </WorkspaceCard>
      )}

      {/* ADMIN NOTES */}
      {(item.verification_note || item.admin_comments) && (
        <WorkspaceCard style={{ marginBottom: 16 }}>
          <WorkspaceCardHeader title="Admin Notes" />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {item.verification_note && (
              <div style={{ padding: 16, borderRadius: 10, background: C.bgElevated, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  <ShieldCheck size={14} />
                  Verification Note
                </div>
                <p style={{ fontSize: 14, color: C.t1, lineHeight: 1.6 }}>{item.verification_note}</p>
              </div>
            )}
            {item.admin_comments && (
              <div style={{ padding: 16, borderRadius: 10, background: C.bgElevated, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                  <MessageSquare size={14} />
                  Admin Comments
                </div>
                <p style={{ fontSize: 14, color: C.t1, lineHeight: 1.6, wordBreak: "break-word" }}>{item.admin_comments}</p>
              </div>
            )}
          </div>
        </WorkspaceCard>
      )}

      {/* ATTENDEES */}
      {attendees.length > 0 && (
        <WorkspaceCard style={{ marginBottom: 16 }}>
          <WorkspaceCardHeader
            title="Additional Attendees"
            subtitle={`${attendees.length} companion(s) accompanying this meeting`}
          />
          <div className="grid md:grid-cols-2 gap-3" style={{ marginTop: 16 }}>
            {attendees.map((person, idx) => (
              <div
                key={idx}
                style={{ padding: 14, borderRadius: 10, background: C.bgElevated, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={16} style={{ color: C.purple }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: C.t1, fontSize: 14 }}>{person.attendeeName || person.name}</div>
                  {(person.attendeePhone || person.phone) && (
                    <div style={{ fontSize: 12, color: C.t3, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Phone size={11} /> {person.attendeePhone || person.phone}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </WorkspaceCard>
      )}

      <WorkspaceCard style={{ marginBottom: 16 }}>
        <WorkspaceCardHeader
          title="Upload Supporting Files"
          subtitle="Upload PDFs or images for this meeting. These files are visible only to admin."
        />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              width: "100%",
              border: `1px dashed ${C.border}`,
              borderRadius: 12,
              padding: 18,
              background: C.bgElevated,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: "pointer",
              color: C.t2,
              fontWeight: 600,
            }}
          >
            <UploadCloud size={18} />
            <span>{selectedFile?.name || "Select PDF, JPG, or PNG"}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={CITIZEN_ACCEPT}
            style={{ display: "none" }}
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] || null);
              setUploadError("");
              setUploadSuccess("");
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.t3 }}>
            <ImageIcon size={14} />
            PDF and image files up to 5MB are allowed. Video upload is not available for citizens.
          </div>
          {uploadError ? <div style={{ fontSize: 13, color: C.danger }}>{uploadError}</div> : null}
          {uploadSuccess ? <div style={{ fontSize: 13, color: C.success }}>{uploadSuccess}</div> : null}
          <div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "10px 16px",
                background: C.purple,
                color: "#fff",
                fontWeight: 700,
                opacity: !selectedFile || uploading ? 0.55 : 1,
                cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </div>
      </WorkspaceCard>

      {/* FOOTER - REQUESTED ON */}
      {createdAtLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.t3, paddingBottom: 24 }}>
          <Clock size={13} />
          Requested on {createdAtLabel}
        </div>
      )}
    </WorkspacePage>
  );
}
