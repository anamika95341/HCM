import { useEffect, useMemo, useState } from "react";
import { Clock, FileText, Search } from "lucide-react";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
} from "../../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

function statusBadgeClass(status) {
  if (status === "scheduled") return "bg-emerald-100 text-emerald-700";
  if (status === "accepted" || status === "verified") return "bg-sky-100 text-sky-700";
  if (status === "verification_pending" || status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "rejected" || status === "not_verified") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function labelForStatus(status) {
  if (["pending", "accepted", "verification_pending", "verified"].includes(status)) {
    return "Under Review";
  }
  if (status === "not_verified") {
    return "Verification Failed";
  }
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default function MeetingList() {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadMeetings() {
      try {
        const { data } = await apiClient.get("/meetings/my", authorizedConfig(session.accessToken));
        if (mounted) {
          setMeetings(data.meetings || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load meetings");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken) {
      loadMeetings();
    }

    return () => {
      mounted = false;
    };
  }, [session?.accessToken]);

  const filteredMeetings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meetings.filter((meeting) => {
      if (!q) return true;
      return [
        meeting.title,
        meeting.purpose,
        meeting.status,
        meeting.scheduled_location,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [meetings, query]);

  return (
    <WorkspacePage width={1320}>
      <WorkspaceSectionHeader
        eyebrow="Citizen Workspace"
        title="My Meetings"
        subtitle="Track meeting requests submitted through the backend workflow."
        icon={<FileText size={20} />}
      />

      <div style={{ marginBottom: 20 }}>
        <WorkspaceCard>
          <div style={{ position: "relative" }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: C.t3 }} />
            <WorkspaceInput
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, purpose, status, location..."
              style={{ paddingLeft: 38 }}
            />
          </div>
        </WorkspaceCard>
      </div>

      {loading ? (
        <WorkspaceEmptyState title="Loading meetings..." />
      ) : error ? (
        <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
      ) : filteredMeetings.length === 0 ? (
        <WorkspaceEmptyState title="No meeting requests found." />
      ) : (
        <div className="grid gap-4">
              {filteredMeetings.map((meeting) => (
                <WorkspaceCard key={meeting.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 600, color: C.t1 }}>{meeting.title}</h2>
                      <p style={{ fontSize: 13, color: C.t3, marginTop: 6 }}>{meeting.purpose}</p>
                    </div>
                    <WorkspaceBadge status={meeting.status}>{labelForStatus(meeting.status)}</WorkspaceBadge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mt-5" style={{ fontSize: 13, color: C.t2 }}>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.t3 }}>Preferred Time</div>
                      <div className="mt-1">{meeting.preferred_time ? new Date(meeting.preferred_time).toLocaleString("en-IN") : "Not provided"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.t3 }}>Scheduled Time</div>
                      <div className="mt-1">{meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString("en-IN") : "Pending"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.t3 }}>Location</div>
                      <div className="mt-1">{meeting.scheduled_location || "Pending"}</div>
                    </div>
                  </div>

                  {(meeting.rejection_reason || meeting.verification_reason || meeting.admin_comments) && (
                    <div className="mt-5 rounded-xl p-4 space-y-2" style={{ background: C.bgElevated, border: `1px solid ${C.border}`, fontSize: 13, color: C.t2 }}>
                      {meeting.rejection_reason && <div><strong>Rejection Reason:</strong> {meeting.rejection_reason}</div>}
                      {meeting.verification_reason && <div><strong>Verification Note:</strong> {meeting.verification_reason}</div>}
                      {meeting.admin_comments && <div><strong>Admin Comments:</strong> {meeting.admin_comments}</div>}
                    </div>
                  )}

                  <div className="mt-5 flex items-center gap-2" style={{ fontSize: 12, color: C.t3 }}>
                    <Clock size={14} />
                    Requested on {new Date(meeting.created_at).toLocaleString("en-IN")}
                  </div>
                </WorkspaceCard>
              ))}
        </div>
      )}
    </WorkspacePage>
  );
}
