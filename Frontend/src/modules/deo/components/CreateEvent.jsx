import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, authorizedConfig } from "../../../shared/api/client.js";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";
import { PATHS } from "../../../routes/paths.js";

function Field({ label, required, children, hint, C }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.t2, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: C.danger, marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: C.t3, marginTop: 4, marginBottom: 0 }}>{hint}</p>}
    </div>
  );
}

export default function CreateEvent() {
  const { session } = useAuth();
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ministerId: "",
    title: "",
    whoToMeet: "",
    eventDate: "",
    eventTime: "",
    description: "",
    location: "",
    locationDetail: "",
  });
  const [focused, setFocused] = useState(null);
  const [ministers, setMinisters] = useState([]);
  const [loadingMinisters, setLoadingMinisters] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const focus = (key) => () => setFocused(key);
  const blur = () => setFocused(null);

  useEffect(() => {
    let mounted = true;

    async function loadMinisters() {
      try {
        setLoadingMinisters(true);
        const { data } = await apiClient.get("/deo/ministers", authorizedConfig(session.accessToken));
        if (mounted) {
          setMinisters(data.ministers || []);
          if ((data.ministers || []).length === 1) {
            setForm((current) => ({ ...current, ministerId: current.ministerId || data.ministers[0].id }));
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.error || "Unable to load ministers");
        }
      } finally {
        if (mounted) {
          setLoadingMinisters(false);
        }
      }
    }

    if (session?.accessToken) {
      loadMinisters();
    } else {
      setLoadingMinisters(false);
    }

    return () => {
      mounted = false;
    };
  }, [session?.accessToken]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.ministerId || !form.title || !form.whoToMeet || !form.eventDate || !form.eventTime || !form.description || !form.location) {
      setError("Please complete all required fields.");
      return;
    }

    const startsAtDate = new Date(`${form.eventDate}T${form.eventTime}`);
    if (Number.isNaN(startsAtDate.getTime())) {
      setError("Invalid event date or time.");
      return;
    }
    const endsAtDate = new Date(startsAtDate.getTime() + 60 * 60 * 1000);

    try {
      setSaving(true);
      await apiClient.post(
        "/deo/calendar-events",
        {
          ministerId: form.ministerId,
          title: form.title.trim(),
          whoToMeet: form.whoToMeet.trim(),
          startsAt: startsAtDate.toISOString(),
          endsAt: endsAtDate.toISOString(),
          location: [form.location.trim(), form.locationDetail.trim()].filter(Boolean).join(", "),
          description: form.description.trim(),
        },
        authorizedConfig(session.accessToken)
      );
      navigate(PATHS.deo.manageEvent);
    } catch (submitError) {
      setError(submitError?.response?.data?.error || "Unable to create event");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = (key) => ({
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    color: C.t1,
    background: C.inp,
    border: `1px solid ${focused === key ? C.purple : C.border}`,
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow: focused === key ? `0 0 0 3px ${C.purpleDim}` : "none",
    fontFamily: "inherit",
  });

  const textareaStyle = (key) => ({
    ...inputStyle(key),
    resize: "vertical",
    minHeight: 130,
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, fontFamily: "'Inter', system-ui, sans-serif", padding: "20px 24px", boxSizing: "border-box", width: "100%" }}>
      <div style={{ width: "100%", maxWidth: "100%" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: C.t1, textAlign: "center", marginBottom: 24, marginTop: 0 }}>Create Event</h1>

        <form onSubmit={handleSubmit} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "28px 32px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, marginBottom: 4 }}>Event Details</div>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 24 }}>
            Fill in the event information, timing, location, and attendee details.
          </div>

          {error && (
            <div style={{ marginBottom: 20, fontSize: 12, color: C.danger }}>
              {error}
            </div>
          )}

          <Field label="Minister" required C={C}>
            <select
              style={inputStyle("ministerId")}
              value={form.ministerId}
              onChange={set("ministerId")}
              onFocus={focus("ministerId")}
              onBlur={blur}
              disabled={loadingMinisters || ministers.length === 0}
            >
              <option value="">{loadingMinisters ? "Loading ministers..." : "Select minister"}</option>
              {ministers.map((minister) => (
                <option key={minister.id} value={minister.id}>
                  {[minister.first_name, minister.last_name].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Event Title" required C={C}>
            <input
              style={inputStyle("title")}
              placeholder="Enter event title (e.g. Document Verification)"
              value={form.title}
              onChange={set("title")}
              onFocus={focus("title")}
              onBlur={blur}
              maxLength={200}
            />
            <div style={{ fontSize: 11, color: C.t3, textAlign: "right", marginTop: 4 }}>{form.title.length}/200</div>
          </Field>

          <Field label="Whom to Meet" required hint="Name or designation of the person you wish to meet" C={C}>
            <input
              style={inputStyle("whoToMeet")}
              placeholder="e.g. District Collector, Revenue Officer"
              value={form.whoToMeet}
              onChange={set("whoToMeet")}
              onFocus={focus("whoToMeet")}
              onBlur={blur}
              maxLength={150}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Field label="Date" required C={C}>
              <input
                type="date"
                style={inputStyle("eventDate")}
                value={form.eventDate}
                onChange={set("eventDate")}
                onFocus={focus("eventDate")}
                onBlur={blur}
              />
            </Field>
            <Field label="Time" required C={C}>
              <input
                type="time"
                style={inputStyle("eventTime")}
                value={form.eventTime}
                onChange={set("eventTime")}
                onFocus={focus("eventTime")}
                onBlur={blur}
              />
            </Field>
          </div>

          <Field label="Event Description" required C={C}>
            <textarea
              style={textareaStyle("description")}
              placeholder="Explain the purpose and agenda of this event in detail"
              value={form.description}
              onChange={set("description")}
              onFocus={focus("description")}
              onBlur={blur}
              maxLength={1000}
            />
            <div style={{ fontSize: 11, color: C.t3, textAlign: "right", marginTop: 4 }}>{form.description.length}/1000</div>
          </Field>

          <div style={{ borderTop: `1px solid ${C.borderLight}`, margin: "4px 0 22px 0" }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 18 }}>
            Scheduling Preferences
          </div>

          <Field label="Location" required hint="Office, building, or venue name" C={C}>
            <input
              style={inputStyle("location")}
              placeholder="e.g. Collectorate Office, Block B"
              value={form.location}
              onChange={set("location")}
              onFocus={focus("location")}
              onBlur={blur}
              maxLength={200}
            />
          </Field>

          <Field label="Additional Location Details" C={C}>
            <input
              style={inputStyle("locationDetail")}
              placeholder="Room no., floor, landmark, or directions"
              value={form.locationDetail}
              onChange={set("locationDetail")}
              onFocus={focus("locationDetail")}
              onBlur={blur}
              maxLength={300}
            />
          </Field>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => navigate(PATHS.deo.manageEvent)}
              style={{ padding: "10px 24px", fontSize: 14, fontWeight: 500, color: C.t2, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 8, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingMinisters}
              style={{ padding: "10px 28px", fontSize: 14, fontWeight: 600, color: "#ffffff", background: C.purple, border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              {saving ? "Submitting..." : "Submit Event Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
