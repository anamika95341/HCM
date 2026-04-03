import { useState } from "react";

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f4f6",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "20px 24px",
    boxSizing: "border-box",
    width: "100%",
  },
  container: {
    width: "100%",
    maxWidth: "100%",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    textAlign: "center",
    marginBottom: 24,
    marginTop: 0,
  },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "28px 32px",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 22,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
    marginLeft: 3,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    color: "#111827",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    color: "#111827",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: 130,
    fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  charCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 4,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  divider: {
    borderTop: "1px solid #f0f0f0",
    margin: "4px 0 22px 0",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 18,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  btnCancel: {
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    background: "#ffffff",
    border: "1.5px solid #d1d5db",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnSubmit: {
    padding: "10px 28px",
    fontSize: 14,
    fontWeight: 600,
    color: "#ffffff",
    background: "#6c4de6",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};

function Field({ label, required, children, hint }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 5, marginBottom: 0 }}>{hint}</p>}
    </div>
  );
}

export default function CreateEvent() {
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

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const inputStyle = (key) => ({
    ...styles.input,
    borderColor: focused === key ? "#6c4de6" : "#e5e7eb",
    boxShadow: focused === key ? "0 0 0 3px rgba(108,77,230,0.1)" : "none",
  });

  const textareaStyle = (key) => ({
    ...styles.textarea,
    borderColor: focused === key ? "#6c4de6" : "#e5e7eb",
    boxShadow: focused === key ? "0 0 0 3px rgba(108,77,230,0.1)" : "none",
  });

  const focus = (key) => () => setFocused(key);
  const blur = () => setFocused(null);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Page Title */}
        <h1 style={styles.pageTitle}>Create Event</h1>

        {/* Single Combined Card */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Event Details</div>
          <div style={styles.cardSubtitle}>
            Fill in the event information, timing, location, and attendee details.
          </div>

          {/* Event Title */}
          <Field label="Event Title" required>
            <input
              style={inputStyle("title")}
              placeholder="Enter event title (e.g. Document Verification)"
              value={form.title}
              onChange={set("title")}
              onFocus={focus("title")}
              onBlur={blur}
              maxLength={200}
            />
            <div style={styles.charCount}>{form.title.length}/200</div>
          </Field>

          {/* Who to Meet */}
          <Field label="Whom to Meet" required hint="Name or designation of the person you wish to meet">
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

          {/* Date & Time Row */}
          <div style={styles.row}>
            <Field label="Date" required>
              <input
                type="date"
                style={inputStyle("eventDate")}
                value={form.eventDate}
                onChange={set("eventDate")}
                onFocus={focus("eventDate")}
                onBlur={blur}
              />
            </Field>
            <Field label="Time" required>
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

          {/* Description */}
          <Field label="Event Description" required>
            <textarea
              style={textareaStyle("description")}
              placeholder="Explain the purpose and agenda of this event in detail"
              value={form.description}
              onChange={set("description")}
              onFocus={focus("description")}
              onBlur={blur}
              maxLength={1000}
            />
            <div style={styles.charCount}>{form.description.length}/1000</div>
          </Field>

          {/* Divider before Scheduling Preferences */}
          <div style={styles.divider} />
          <div style={styles.sectionLabel}>Scheduling Preferences</div>

          {/* Location */}
          <Field label="Location" required hint="Office, building, or venue name">
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

          {/* Location Detail */}
          <Field label="Additional Location Details">
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

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button style={styles.btnCancel}>Cancel</button>
            <button style={styles.btnSubmit}>Submit Event Request</button>
          </div>
        </div>
      </div>
    </div>
  );
}
