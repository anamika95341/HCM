import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, Calendar, Clock, MapPin, Users, FileText,
  MessageSquare, ShieldCheck, User, Phone, Hash
} from "lucide-react";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceCardHeader,
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
  const { state } = useLocation();
  const item = state?.meetingData;

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
