import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, CheckCircle2, XCircle, FileText, Download } from "lucide-react";
import { apiClient } from "../../shared/api/client.js";
import { openDownloadUrl } from "../../shared/api/downloads.js";
import { WorkspaceButton, WorkspaceCard } from "../../shared/components/WorkspaceUI.jsx";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { PATHS } from "../../routes/paths.js";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${mon},${year}`;
}

function InfoField({ label, value, multiline = false }) {
  const { C } = usePortalTheme();
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.t3, marginBottom: 4 }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: C.t1,
          fontWeight: 500,
          wordBreak: "break-word",
          whiteSpace: multiline ? "normal" : undefined,
          lineHeight: multiline ? 1.6 : 1.5,
        }}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function ConfirmPopup({ action, appointment, onCancel, onConfirm, loading, C }) {
  const isVerify = action === "verify";
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 28, minWidth: 380, maxWidth: 460, width: "90%",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            position: "absolute", top: 14, right: 16,
            background: "none", border: "none", cursor: "pointer",
            color: C.t3, fontSize: 22, lineHeight: 1,
          }}
        >
          ×
        </button>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: C.t1 }}>
          Confirm {isVerify ? "Verification" : "Rejection"}
        </h2>
        <p style={{ fontSize: 13, color: C.t2, marginBottom: 24, lineHeight: 1.6 }}>
          Are you sure you want to mark appointment{" "}
          <strong>{appointment.requestId || appointment.request_id || appointment.id}</strong> as{" "}
          {isVerify ? "verified" : "rejected"}? This action cannot be undone.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <WorkspaceButton variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </WorkspaceButton>
          <WorkspaceButton
            onClick={onConfirm}
            disabled={loading}
            style={{ background: isVerify ? C.mint : C.danger, color: "#fff" }}
          >
            {loading ? "Submitting…" : isVerify ? "Mark Verified" : "Mark Rejected"}
          </WorkspaceButton>
        </div>
      </div>
    </div>
  );
}

export default function DeoAppointmentDetail() {
  const { C } = usePortalTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const [appointment, setAppointment] = useState(state?.appointment || null);
  const [files, setFiles] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isBackHovered, setIsBackHovered] = useState(false);

  const appointmentId = id || state?.appointment?.id;

  useEffect(() => {
    let mounted = true;
    if (!appointmentId) return undefined;
    (async () => {
      try {
        const { data } = await apiClient.get(`/deo/appointments/${appointmentId}`);
        if (!mounted) return;
        setAppointment(data.appointment || null);
        setFiles(Array.isArray(data.appointment?.files) ? data.appointment.files : []);
      } catch (_) {
        // keep navigation-state fallback for the basic fields
      }
    })();
    return () => { mounted = false; };
  }, [appointmentId]);

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      const verified = confirmAction === "verify";
      await apiClient.patch(`/appointments/${appointmentId}/verify`, {
        verified,
        reason: verified
          ? "Verified by DEO after citizen confirmation"
          : "Citizen details could not be verified",
        notes: verified
          ? "Verification completed successfully"
          : "Verification failed during DEO review",
      });
      setConfirmAction(null);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to submit verification");
      setConfirmAction(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (!appointment) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: C.t2, marginBottom: 20 }}>Appointment not found.</p>
        <WorkspaceButton onClick={() => navigate(PATHS.deo.calendarEvents)}>
          Back to Verification Queue
        </WorkspaceButton>
      </div>
    );
  }

  if (done) {
    return (
      <div
        style={{
          height: "calc(100vh - 73px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ fontSize: 44, marginBottom: 14, color: C.mint }}>✓</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: C.t1, marginBottom: 8 }}>
            Action completed successfully
          </p>
          <p style={{ fontSize: 13, color: C.t2, marginBottom: 28, lineHeight: 1.6 }}>
            The appointment has been removed from your queue. The admin will process it further.
          </p>
          <WorkspaceButton onClick={() => navigate(PATHS.deo.calendarEvents)}>
            Back to Verification Queue
          </WorkspaceButton>
        </div>
      </div>
    );
  }

  const appointmentIdLabel = appointment.requestId || appointment.request_id || appointment.id;
  const citizenName = appointment.citizenName
    || [appointment.first_name, appointment.last_name].filter(Boolean).join(" ")
    || "-";
  const description = appointment.description || appointment.purpose || "";

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 20 }}>
        <div style={{ justifySelf: "start" }}>
          <button
            type="button"
            onMouseEnter={() => setIsBackHovered(true)}
            onMouseLeave={() => setIsBackHovered(false)}
            onClick={() => navigate(PATHS.deo.calendarEvents)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              border: `1px solid ${C.purple}`,
              background: isBackHovered ? C.purple : "transparent",
              color: isBackHovered ? "#ffffff" : C.purple,
              fontSize: 13, padding: "8px 8px", borderRadius: 10,
              cursor: "pointer", whiteSpace: "nowrap",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.t1, textAlign: "center" }}>
          Appointment Details
        </h1>
        <div />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <WorkspaceButton
          type="button"
          onClick={() => setConfirmAction("verify")}
          style={{ background: C.mint, color: "#fff" }}
        >
          <CheckCircle2 size={16} /> Mark as Verified
        </WorkspaceButton>
        <WorkspaceButton
          type="button"
          onClick={() => setConfirmAction("reject")}
          style={{ background: C.danger, color: "#fff" }}
        >
          <XCircle size={16} /> Reject
        </WorkspaceButton>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 8,
            background: "#fef2f2", border: "1px solid #fecaca",
            color: "#b91c1c", fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <WorkspaceCard style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Appointment Information
        </h3>

        <div style={{ marginBottom: 16 }}>
          <InfoField label="Verification (Sent By Admin)" value={appointment.verificationAdmin} />
        </div>

        {/* 4-column grid — District flows under Citizen ID, Created At under Citizen Name */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 16 }}>
          <InfoField label="Appointment ID" value={appointmentIdLabel} />
          <InfoField label="Citizen ID" value={appointment.citizenCode || appointment.citizen_id} />
          <InfoField label="Citizen Name" value={citizenName} />
          <InfoField label="Phone Number" value={appointment.mobileNumber || "-"} />
          <InfoField label="State" value={appointment.state} />
          <InfoField label="District" value={appointment.district} />
          <InfoField label="Created At" value={formatDate(appointment.createdAt || appointment.created_at)} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <InfoField label="Title" value={appointment.title} multiline />
        </div>

        <InfoField label="Description" value={description} multiline />
      </WorkspaceCard>

      <WorkspaceCard>
        <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Documents
        </h3>
        {files.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: C.t2, fontWeight: 500 }}>No documents uploaded</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {files.map((file) => (
              <div
                key={file.id || file.downloadUrl || file.name}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.bgElevated }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <FileText size={16} color={C.purple} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, wordBreak: "break-word" }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{file.mimeType || "Document"}</div>
                  </div>
                </div>
                <WorkspaceButton
                  type="button"
                  variant="outline"
                  onClick={() => openDownloadUrl(file.downloadUrl)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={14} /> Download
                </WorkspaceButton>
              </div>
            ))}
          </div>
        )}
      </WorkspaceCard>

      {confirmAction && (
        <ConfirmPopup
          action={confirmAction}
          appointment={appointment}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
          loading={submitting}
          C={C}
        />
      )}
    </div>
  );
}
