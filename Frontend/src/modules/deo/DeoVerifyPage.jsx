import { useState } from "react";
import { AlertCircle, CheckCircle, Mail, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../shared/api/client.js";
import { PATHS } from "../../routes/paths.js";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { normalizeInputText, toSafeUserMessage } from "../../shared/security/text.js";

const fieldStyle = (C) => ({
  width: "100%",
  padding: "12px 14px 12px 40px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.inp,
  color: C.t1,
  fontSize: 13,
});

export default function DeoVerifyPage() {
  const navigate = useNavigate();
  const { C } = usePortalTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    usernameOrEmail: "",
    otp: "",
  });

  async function handleVerify(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await apiClient.post("/auth/deo/verify-account", form);
      setSuccess(data?.message || "DEO account verified. You can now log in.");
      setTimeout(() => {
        navigate(PATHS.deoLogin, { replace: true });
      }, 900);
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to verify DEO account"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await apiClient.post("/auth/deo/resend-verification-code", {
        usernameOrEmail: form.usernameOrEmail,
      });
      setSuccess(data?.message || "If that DEO account exists, a verification code was sent.");
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to resend verification code"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="portal-content"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: C.bg,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          boxShadow: "var(--portal-shadow)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "32px 32px 28px", background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: C.purpleDim,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Shield size={28} color={C.purple} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".18em" }}>
            Government Workspace
          </div>
          <h1 style={{ margin: "10px 0 6px", fontSize: 28, lineHeight: 1.1, color: C.t1 }}>Verify DEO</h1>
          <p style={{ margin: 0, color: C.t3, fontSize: 13, lineHeight: 1.6 }}>
            Enter the verification code sent to the DEO email address to activate the account.
          </p>
        </div>

        <div style={{ padding: 32 }}>
          {success ? (
            <MessageBox color={C.mint} bg={C.mintDim} icon={<CheckCircle size={18} />} message={success} />
          ) : null}
          {error ? (
            <MessageBox color={C.danger} bg={`${C.danger}20`} icon={<AlertCircle size={18} />} message={error} />
          ) : null}

          <form onSubmit={handleVerify} style={{ display: "grid", gap: 18 }}>
            <Field label="Username or Email" icon={<Mail size={16} color={C.t3} />}>
              <input
                type="text"
                value={form.usernameOrEmail}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  usernameOrEmail: normalizeInputText(event.target.value, { maxLength: 160, trim: false }),
                }))}
                required
                placeholder="deo.user or deo@gov.in"
                style={fieldStyle(C)}
              />
            </Field>

            <Field label="Verification Code" icon={<Shield size={16} color={C.t3} />}>
              <input
                type="text"
                value={form.otp}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                }))}
                required
                placeholder="Enter 6-digit code"
                style={fieldStyle(C)}
              />
            </Field>

            <button type="submit" disabled={loading} style={primaryButtonStyle(C)}>
              {loading ? "Verifying..." : "Verify DEO"}
            </button>

            <button
              type="button"
              disabled={loading || !form.usernameOrEmail}
              onClick={handleResendCode}
              style={secondaryTextButtonStyle(C)}
            >
              Resend Verification Code
            </button>

            <button type="button" onClick={() => navigate(PATHS.deoLogin)} style={secondaryButtonStyle(C)}>
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  const { C } = usePortalTheme();

  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>{label}</span>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          {icon}
        </div>
        {children}
      </div>
    </label>
  );
}

function MessageBox({ color, bg, icon, message }) {
  return (
    <div
      style={{
        marginBottom: 18,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${color}33`,
        background: bg,
        color,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 1 }}>{icon}</div>
      <div>{message}</div>
    </div>
  );
}

function primaryButtonStyle(C) {
  return {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: "none",
    background: C.purple,
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function secondaryButtonStyle(C) {
  return {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    background: "transparent",
    color: C.t2,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function secondaryTextButtonStyle(C) {
  return {
    background: "transparent",
    border: "none",
    color: C.purple,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  };
}
