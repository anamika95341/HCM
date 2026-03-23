import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceInput,
  WorkspacePage,
  WorkspaceSectionHeader,
} from "../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";

export default function DeoCalendarEvent() {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadAssignedMeetings() {
      try {
        const { data } = await apiClient.get("/deo/assigned-meetings", authorizedConfig(session.accessToken));
        if (mounted) {
          setMeetings(data.meetings || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load assigned verification requests");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken) {
      loadAssignedMeetings();
    }

    return () => {
      mounted = false;
    };
  }, [session?.accessToken]);

  async function submitVerification(meetingId, verified) {
    setSubmittingId(meetingId);
    setError("");
    try {
      await apiClient.patch(
        `/meetings/${meetingId}/verify`,
        {
          verified,
          reason: verified ? "Verified by DEO after citizen confirmation" : "Citizen details could not be verified",
          notes: verified ? "Verification completed successfully" : "Verification failed during DEO review",
        },
        authorizedConfig(session.accessToken)
      );
      setMeetings((current) => current.filter((meeting) => meeting.id !== meetingId));
    } catch (submissionError) {
      setError(submissionError?.response?.data?.error || "Unable to submit verification");
    } finally {
      setSubmittingId(null);
    }
  }

  const filteredMeetings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return meetings.filter((meeting) => {
      if (!q) return true;
      return [
        meeting.purpose,
        meeting.first_name,
        meeting.last_name,
        meeting.mobile_number,
        meeting.email,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [meetings, searchQuery]);

  return (
    <WorkspacePage width={1120}>
      <WorkspaceSectionHeader
        eyebrow="DEO Workspace"
        title="Verification Queue"
        subtitle="Review and verify citizen meeting requests assigned by admin."
      />

      <div style={{ marginBottom: 20 }}>
        <WorkspaceCard>
          <div style={{ position: "relative" }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: C.t3 }} />
            <WorkspaceInput
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by citizen, purpose, phone, or email..."
              style={{ paddingLeft: 38 }}
            />
          </div>
        </WorkspaceCard>
      </div>

        {loading ? (
          <WorkspaceEmptyState title="Loading verification queue..." />
        ) : error ? (
          <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
        ) : filteredMeetings.length === 0 ? (
          <WorkspaceEmptyState title="No assigned meeting requests pending verification." />
        ) : (
          <div className="grid gap-4">
            {filteredMeetings.map((meeting) => (
              <WorkspaceCard key={meeting.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: C.t3 }}>{meeting.request_id || meeting.id}</p>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: C.t1, marginTop: 6 }}>{meeting.title || meeting.purpose}</h2>
                    <p style={{ fontSize: 13, color: C.t2, marginTop: 6 }}>{meeting.purpose}</p>
                    <p style={{ fontSize: 13, color: C.t2, marginTop: 6 }}>{[meeting.first_name, meeting.last_name].filter(Boolean).join(" ")}</p>
                    <p style={{ fontSize: 13, color: C.t3 }}>{meeting.mobile_number || meeting.email || "No contact available"}</p>
                    {meeting.admin_comments && <p style={{ fontSize: 12, color: C.t3, marginTop: 10 }}>{meeting.admin_comments}</p>}
                  </div>
                  <WorkspaceBadge>Verification Pending</WorkspaceBadge>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <WorkspaceButton
                    type="button"
                    disabled={submittingId === meeting.id}
                    onClick={() => submitVerification(meeting.id, true)}
                    style={{ background: "#10b981", color: "#fff" }}
                  >
                    <CheckCircle2 size={16} />
                    Mark Verified
                  </WorkspaceButton>
                  <WorkspaceButton
                    type="button"
                    disabled={submittingId === meeting.id}
                    onClick={() => submitVerification(meeting.id, false)}
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    <XCircle size={16} />
                    Mark Not Verified
                  </WorkspaceButton>
                </div>
              </WorkspaceCard>
            ))}
          </div>
        )}
    </WorkspacePage>
  );
}
