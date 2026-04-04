import { useState } from "react";
import { usePortalTheme } from "../../../shared/theme/portalTheme.jsx";

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
  const { C } = usePortalTheme();
  const [form, setForm] = useState({
    title: "",
    whoToMeet: "",
    eventDate: "",
    eventTime: "",
    description: "",
    location: "",
    locationDetail: "",
  });
  const [focused, setFocused] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const focus = (key) => () => setFocused(key);
  const blur = () => setFocused(null);

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

        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "28px 32px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, marginBottom: 4 }}>Event Details</div>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 24 }}>
            Fill in the event information, timing, location, and attendee details.
          </div>

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
              style={{ padding: "10px 24px", fontSize: 14, fontWeight: 500, color: C.t2, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 8, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              style={{ padding: "10px 28px", fontSize: 14, fontWeight: 600, color: "#ffffff", background: C.purple, border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              Submit Event Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
