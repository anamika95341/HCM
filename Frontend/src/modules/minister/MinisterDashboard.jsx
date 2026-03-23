import { useEffect, useMemo, useState } from "react";
import { CalendarLtrRegular, CheckmarkCircleRegular, ClipboardTaskRegular, StarRegular } from "@fluentui/react-icons";
import { apiClient, authorizedConfig } from "../../shared/api/client.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import {
  WorkspaceButton,
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceCardHeader,
  WorkspaceEmptyState,
  WorkspacePage,
  WorkspaceSectionHeader,
  WorkspaceStatGrid,
} from "../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { PATHS } from "../../routes/paths.js";
import { useNavigate } from "react-router-dom";

export default function MinisterDashboard() {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCalendar() {
      try {
        const { data } = await apiClient.get("/minister/calendar", authorizedConfig(session.accessToken));
        if (mounted) {
          setEvents(data.events || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load minister calendar");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (session?.accessToken) {
      loadCalendar();
    }

    return () => {
      mounted = false;
    };
  }, [session?.accessToken]);

  const summary = useMemo(() => {
    const now = Date.now();
    const vipEvents = events.filter((event) => event.is_vip);
    const upcomingEvents = events.filter((event) => new Date(event.starts_at).getTime() >= now);
    const completedEvents = events.filter((event) => new Date(event.ends_at).getTime() < now);
    return {
      total: events.length,
      vip: vipEvents.length,
      upcoming: upcomingEvents.length,
      completed: completedEvents.length,
      nextVip: vipEvents
        .filter((event) => new Date(event.starts_at).getTime() >= now)
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] || null,
      nextUpcoming: upcomingEvents.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).slice(0, 4),
    };
  }, [events]);

  return (
    <WorkspacePage>
      <WorkspaceSectionHeader
        eyebrow="Minister Workspace"
        title={`${session?.user?.firstName || "Minister"} Dashboard`}
        subtitle="Operational overview of scheduled meetings and VIP visibility from the minister backend module."
        action={<WorkspaceButton onClick={() => navigate(PATHS.minister.calendar)}>Open Calendar</WorkspaceButton>}
      />

        {loading ? (
          <WorkspaceEmptyState title="Loading calendar..." />
        ) : error ? (
          <WorkspaceCard style={{ color: C.danger }}>{error}</WorkspaceCard>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <WorkspaceStatGrid items={[
                { label: "Total Events", value: summary.total },
                { label: "Upcoming", value: summary.upcoming },
                { label: "Completed", value: summary.completed, accent: C.mint },
                { label: "VIP Meetings", value: summary.vip, accent: C.warn },
              ]} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)", gap: 20 }}>
              <WorkspaceCard>
                <WorkspaceCardHeader title="Upcoming Schedule" subtitle={`${summary.nextUpcoming.length} upcoming event(s)`} />

                {summary.nextUpcoming.length === 0 ? (
                  <div style={{ color: C.t3 }}>No upcoming events scheduled.</div>
                ) : (
                  <div style={{ display: "grid", gap: "0.85rem" }}>
                    {summary.nextUpcoming.map((event) => (
                      <div key={event.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "1rem", background: C.bgElevated }}>
                        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "1rem" }}>
                          <div>
                            <div style={{ fontSize: "1rem", fontWeight: 700, color: C.t1 }}>{event.title}</div>
                            <div style={{ fontSize: "0.88rem", color: C.t2, marginTop: "0.25rem" }}>
                              {new Date(event.starts_at).toLocaleString("en-IN")}
                            </div>
                            <div style={{ fontSize: "0.88rem", color: C.t2, marginTop: "0.25rem" }}>{event.location || "Location pending"}</div>
                          </div>
                          <WorkspaceBadge color={event.is_vip ? C.warn : C.purple}>{event.is_vip ? "VIP" : "Standard"}</WorkspaceBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </WorkspaceCard>

              <div style={{ display: "grid", gap: 20 }}>
                <WorkspaceCard>
                  <WorkspaceCardHeader title="VIP Priority" subtitle="Nearest VIP commitment" />
                  {summary.nextVip ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.t1 }}>{summary.nextVip.title}</div>
                        <WorkspaceBadge color={C.warn}>VIP</WorkspaceBadge>
                      </div>
                      <div style={{ marginTop: 10, color: C.t2, fontSize: 13 }}>
                        {new Date(summary.nextVip.starts_at).toLocaleString("en-IN")}
                      </div>
                      <div style={{ marginTop: 6, color: C.t3, fontSize: 13 }}>
                        {summary.nextVip.location || "Location pending"}
                      </div>
                      {summary.nextVip.comments ? (
                        <div style={{ marginTop: 12, color: C.t2, fontSize: 13, lineHeight: 1.6 }}>{summary.nextVip.comments}</div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ color: C.t3 }}>No VIP meetings are currently scheduled.</div>
                  )}
                </WorkspaceCard>

                <WorkspaceCard>
                  <WorkspaceCardHeader title="Calendar Access" subtitle="Use the full calendar for month, week, and day planning." />
                  <div style={{ color: C.t3, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                    The minister calendar is now separate from the dashboard and mirrors the administrative calendar structure in a read-only view.
                  </div>
                  <WorkspaceButton onClick={() => navigate(PATHS.minister.calendar)}>Go To Calendar</WorkspaceButton>
                </WorkspaceCard>
              </div>
            </div>
          </>
        )}
    </WorkspacePage>
  );
}
