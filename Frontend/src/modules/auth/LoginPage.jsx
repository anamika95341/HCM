import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { getHomePathForRole, PATHS } from "../../routes/paths.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { apiClient } from "../../shared/api/client.js";
import { RECAPTCHA_SITE_KEY } from "../../shared/config/env.js";
import { normalizeInputText, toSafeUserMessage } from "../../shared/security/text.js";

const ROLE_COPY = {
  citizen: {
    title: "Citizen Portal",
    subtitle: "Sign in with your Citizen ID and password to manage meeting requests.",
    identifierLabel: "Citizen ID",
    identifierPlaceholder: "CTZ-2026-00000001",
  },
  admin: {
    title: "Admin Portal",
    subtitle: "Sign in with your username or email. Newly created admins must verify their account with the emailed code first.",
    identifierLabel: "Username or Email",
    identifierPlaceholder: "admin.user or admin@gov.in",
  },
  masteradmin: {
    title: "Master Admin Portal",
    subtitle: "Sign in with your username or email to manage admin and DEO access securely.",
    identifierLabel: "Username or Email",
    identifierPlaceholder: "masteradmin.user or masteradmin@gov.in",
  },
  deo: {
    title: "DEO Portal",
    subtitle: "Sign in with your username or email. OTP is required only once for initial account verification.",
    identifierLabel: "Username or Email",
    identifierPlaceholder: "deo.user or deo@gov.in",
  },
  minister: {
    title: "Minister Portal",
    subtitle: "Sign in with your username or email to access the minister dashboard.",
    identifierLabel: "Username or Email",
    identifierPlaceholder: "minister.user or minister@gov.in",
  },
};

const fieldStyle = (C, hasIcon = true, hasRightAction = false) => ({
  width: "100%",
  padding: hasIcon ? `12px ${hasRightAction ? "42px" : "14px"} 12px 40px` : "12px 14px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.inp,
  color: C.t1,
  fontSize: 13,
});

export default function LoginPage({ defaultRole = "citizen" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { C } = usePortalTheme();
  const { session, login, isAuthenticated } = useAuth();

  const role = useMemo(() => {
    if (location.pathname === PATHS.masteradminLogin) return "masteradmin";
    if (location.pathname === PATHS.adminLogin) return "admin";
    if (location.pathname === PATHS.deoLogin) return "deo";
    if (location.pathname === PATHS.ministerLogin) return "minister";
    return defaultRole;
  }, [defaultRole, location.pathname]);

  const roleCopy = ROLE_COPY[role];
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [citizenMode, setCitizenMode] = useState("login");
  const [pendingCitizenUserId, setPendingCitizenUserId] = useState("");
  const [pendingResetCitizenId, setPendingResetCitizenId] = useState("");
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    aadhaarNumber: "",
    age: "",
    sex: "male",
    mobileNumber: "",
    pincode: "",
    city: "",
    state: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationOtp, setVerificationOtp] = useState("");
  const [forgotForm, setForgotForm] = useState({
    aadhaarNumber: "",
    email: "",
  });
  const [resetForm, setResetForm] = useState({
    citizenId: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  useEffect(() => {
    if (isAuthenticated && session?.role) {
      navigate(getHomePathForRole(session.role), { replace: true });
    }
  }, [isAuthenticated, navigate, session]);

  useEffect(() => {
    setIdentifier("");
    setPassword("");
    setError("");
    setSuccess("");
    setCitizenMode("login");
  }, [role]);

  async function handlePrimaryLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await login({ role, identifier, password });
      setSuccess("Authentication successful. Redirecting to the workspace.");
    } catch (authError) {
      setError(toSafeUserMessage(authError, "Authentication failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCitizenRegister(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const validationError = validateCitizenRegistration(registerForm);
      if (validationError) {
        throw new Error(validationError);
      }

      const { data } = await apiClient.post("/auth/citizen/register", {
        ...registerForm,
        age: Number(registerForm.age),
        preferredVerificationChannel: "email",
      });
      setPendingCitizenUserId(data.citizen.id);
      setCitizenMode("verify");
      setSuccess("Registration submitted. Enter the email OTP to activate the account.");
    } catch (requestError) {
      setError(extractErrorMessage(requestError, "Unable to register citizen account"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCitizenVerification(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await apiClient.post("/auth/citizen/verify-account", {
        userId: pendingCitizenUserId,
        otp: verificationOtp,
      });
      setPendingResetCitizenId(data.citizenId);
      setCitizenMode("login");
      setSuccess(`Account verified. Your Citizen ID is ${data.citizenId}. Use it to sign in.`);
      setIdentifier(data.citizenId);
    } catch (requestError) {
      setError(toSafeUserMessage(requestError, "Unable to verify citizen account"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCitizenForgotPassword(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!isTwelveDigitAadhaar(forgotForm.aadhaarNumber)) {
        throw new Error("Enter a valid 12-digit Aadhaar number");
      }

      const captchaToken = await getCaptchaToken();
      await apiClient.post("/auth/citizen/forgot-password", {
        ...forgotForm,
        captchaToken,
      });
      setPendingResetCitizenId(forgotForm.email ? "" : pendingResetCitizenId);
      setCitizenMode("reset");
      setSuccess("If the citizen record exists, a password reset OTP has been sent by email.");
    } catch (requestError) {
      setError(extractErrorMessage(requestError, "Unable to start password reset"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCitizenResetPassword(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const passwordError = validatePassword(resetForm.password, resetForm.confirmPassword);
      if (passwordError) {
        throw new Error(passwordError);
      }

      await apiClient.post("/auth/citizen/reset-password", resetForm);
      setCitizenMode("login");
      setSuccess("Password reset completed. You can now sign in with your Citizen ID.");
      setIdentifier(resetForm.citizenId);
      setResetForm({ citizenId: "", otp: "", password: "", confirmPassword: "" });
    } catch (requestError) {
      setError(extractErrorMessage(requestError, "Unable to reset password"));
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = {
    width: "100%",
    maxWidth: 460,
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    boxShadow: "var(--portal-shadow)",
    overflow: "hidden",
  };

  const showCitizenActions = role === "citizen";
  const showAdminActions = role === "admin";

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
      <div style={cardStyle}>
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
          <h1 style={{ margin: "10px 0 6px", fontSize: 28, lineHeight: 1.1, color: C.t1 }}>{roleCopy.title}</h1>
          <p style={{ margin: 0, color: C.t3, fontSize: 13, lineHeight: 1.6 }}>{roleCopy.subtitle}</p>
        </div>

        <div style={{ padding: 32 }}>
          {success && <MessageBox color={C.mint} bg={C.mintDim} icon={<CheckCircle size={18} />} message={success} />}
          {error && <MessageBox color={C.danger} bg={`${C.danger}20`} icon={<AlertCircle size={18} />} message={error} />}

          {(
            (role === "citizen" && citizenMode === "login") ||
            role === "admin" ||
            role === "deo" ||
            (!showCitizenActions && !showAdminActions)
          ) ? (
            <form onSubmit={handlePrimaryLogin} style={{ display: "grid", gap: 18 }}>
              <Field label={roleCopy.identifierLabel} icon={<Mail size={16} color={C.t3} />}>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(normalizeInputText(event.target.value, { maxLength: 120, trim: false }))}
                  required
                  placeholder={roleCopy.identifierPlaceholder}
                  style={fieldStyle(C)}
                />
              </Field>

              <Field label="Password" icon={<Lock size={16} color={C.t3} />}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="••••••••"
                  style={fieldStyle(C, true, true)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: C.t3,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </Field>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 6,
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: C.purple,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Authenticating..." : "Sign In"}
                {!loading && <ArrowRight size={15} />}
              </button>

              {role === "citizen" && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode("register");
                      setError("");
                      setSuccess("");
                    }}
                    style={footerLinkStyle(C)}
                  >
                    New Registration
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode("forgot");
                      setError("");
                      setSuccess("");
                    }}
                    style={footerLinkStyle(C)}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {role === "admin" && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      navigate(PATHS.adminVerify);
                      setError("");
                      setSuccess("");
                    }}
                    style={footerLinkStyle(C)}
                  >
                    Verify Admin
                  </button>
                </div>
              )}

              {role === "deo" && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      navigate(PATHS.deo.verify);
                    }}
                    style={footerLinkStyle(C)}
                  >
                    Verify DEO
                  </button>
                </div>
              )}
            </form>
          ) : role === "citizen" && citizenMode === "register" ? (
            <form onSubmit={handleCitizenRegister} style={{ display: "grid", gap: 14 }}>
              <Field label="First Name" icon={<Mail size={16} color={C.t3} />}>
                <input value={registerForm.firstName} onChange={(event) => setRegisterForm((current) => ({ ...current, firstName: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Middle Name" icon={<Mail size={16} color={C.t3} />}>
                <input value={registerForm.middleName} onChange={(event) => setRegisterForm((current) => ({ ...current, middleName: event.target.value }))} style={fieldStyle(C)} />
              </Field>
              <Field label="Last Name" icon={<Mail size={16} color={C.t3} />}>
                <input value={registerForm.lastName} onChange={(event) => setRegisterForm((current) => ({ ...current, lastName: event.target.value }))} style={fieldStyle(C)} />
              </Field>
              <Field label="Email" icon={<Mail size={16} color={C.t3} />}>
                <input type="email" value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Aadhaar Number" icon={<Shield size={16} color={C.t3} />}>
                <input value={registerForm.aadhaarNumber} onChange={(event) => setRegisterForm((current) => ({ ...current, aadhaarNumber: event.target.value.replace(/\D/g, "").slice(0, 12) }))} required style={fieldStyle(C)} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Age" icon={<Mail size={16} color={C.t3} />}>
                  <input type="number" min="1" max="120" value={registerForm.age} onChange={(event) => setRegisterForm((current) => ({ ...current, age: event.target.value }))} required style={fieldStyle(C)} />
                </Field>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>Sex</span>
                  <select value={registerForm.sex} onChange={(event) => setRegisterForm((current) => ({ ...current, sex: event.target.value }))} style={fieldStyle(C, false)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
              <Field label="Mobile Number" icon={<Mail size={16} color={C.t3} />}>
                <input value={registerForm.mobileNumber} onChange={(event) => setRegisterForm((current) => ({ ...current, mobileNumber: event.target.value.replace(/\D/g, "").slice(0, 10) }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Pincode" icon={<Mail size={16} color={C.t3} />}>
                <input value={registerForm.pincode} onChange={(event) => setRegisterForm((current) => ({ ...current, pincode: event.target.value.replace(/\D/g, "").slice(0, 6) }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="City" icon={<Mail size={16} color={C.t3} />}>
                <input value={registerForm.city} onChange={(event) => setRegisterForm((current) => ({ ...current, city: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="State" icon={<Mail size={16} color={C.t3} />}>
                <input value={registerForm.state} onChange={(event) => setRegisterForm((current) => ({ ...current, state: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Password" icon={<Lock size={16} color={C.t3} />}>
                <input type="password" value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Confirm Password" icon={<Lock size={16} color={C.t3} />}>
                <input type="password" value={registerForm.confirmPassword} onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <button type="submit" disabled={loading} style={primaryButtonStyle(C)}>
                {loading ? "Submitting..." : "Create Citizen Account"}
              </button>
              <button type="button" onClick={() => setCitizenMode("login")} style={secondaryButtonStyle(C)}>
                Back to Login
              </button>
            </form>
          ) : role === "citizen" && citizenMode === "verify" ? (
            <form onSubmit={handleCitizenVerification} style={{ display: "grid", gap: 18 }}>
              <Field label="Email OTP" icon={<Shield size={16} color={C.t3} />}>
                <input value={verificationOtp} onChange={(event) => setVerificationOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required placeholder="Enter 6-digit OTP" style={fieldStyle(C)} />
              </Field>
              <button type="submit" disabled={loading} style={primaryButtonStyle(C)}>
                {loading ? "Verifying..." : "Verify Registration"}
              </button>
              <button type="button" onClick={() => setCitizenMode("login")} style={secondaryButtonStyle(C)}>
                Back to Login
              </button>
            </form>
          ) : role === "citizen" && citizenMode === "forgot" ? (
            <form onSubmit={handleCitizenForgotPassword} style={{ display: "grid", gap: 18 }}>
              <Field label="Aadhaar Number" icon={<Shield size={16} color={C.t3} />}>
                <input value={forgotForm.aadhaarNumber} onChange={(event) => setForgotForm((current) => ({ ...current, aadhaarNumber: event.target.value.replace(/\D/g, "").slice(0, 12) }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Email" icon={<Mail size={16} color={C.t3} />}>
                <input type="email" value={forgotForm.email} onChange={(event) => setForgotForm((current) => ({ ...current, email: event.target.value }))} style={fieldStyle(C)} />
              </Field>
              <button type="submit" disabled={loading} style={primaryButtonStyle(C)}>
                {loading ? "Sending..." : "Send Reset OTP"}
              </button>
              <button type="button" onClick={() => setCitizenMode("reset")} style={secondaryTextButtonStyle(C)}>
                Already have reset OTP?
              </button>
              <button type="button" onClick={() => setCitizenMode("login")} style={secondaryButtonStyle(C)}>
                Back to Login
              </button>
            </form>
          ) : role === "citizen" && citizenMode === "reset" ? (
            <form onSubmit={handleCitizenResetPassword} style={{ display: "grid", gap: 18 }}>
              <Field label="Citizen ID" icon={<Mail size={16} color={C.t3} />}>
                <input value={resetForm.citizenId} onChange={(event) => setResetForm((current) => ({ ...current, citizenId: event.target.value }))} required placeholder={pendingResetCitizenId || "CTZ-2026-00000001"} style={fieldStyle(C)} />
              </Field>
              <Field label="Reset OTP" icon={<Shield size={16} color={C.t3} />}>
                <input value={resetForm.otp} onChange={(event) => setResetForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, "").slice(0, 6) }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="New Password" icon={<Lock size={16} color={C.t3} />}>
                <input type="password" value={resetForm.password} onChange={(event) => setResetForm((current) => ({ ...current, password: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Confirm New Password" icon={<Lock size={16} color={C.t3} />}>
                <input type="password" value={resetForm.confirmPassword} onChange={(event) => setResetForm((current) => ({ ...current, confirmPassword: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <button type="submit" disabled={loading} style={primaryButtonStyle(C)}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              <button type="button" onClick={() => setCitizenMode("login")} style={secondaryButtonStyle(C)}>
                Back to Login
              </button>
            </form>
          ) : null}
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

function footerLinkStyle(C) {
  return {
    background: "transparent",
    border: "none",
    color: C.purple,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  };
}

function extractErrorMessage(error, fallback) {
  return toSafeUserMessage(error, fallback);
}

function validateCitizenRegistration(form) {
  if (!isTwelveDigitAadhaar(form.aadhaarNumber)) {
    return "Enter a valid 12-digit Aadhaar number";
  }

  return validatePassword(form.password, form.confirmPassword);
}

function validatePassword(password, confirmPassword) {
  if (password.length < 12) {
    return "Password must be at least 12 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return "";
}

function isTwelveDigitAadhaar(aadhaarNumber) {
  return /^\d{12}$/.test(aadhaarNumber);
}

async function getCaptchaToken() {
  if (!RECAPTCHA_SITE_KEY) {
    if (import.meta.env.DEV) {
      return "local-dev-captcha";
    }
    throw new Error("Forgot password is unavailable until reCAPTCHA is configured");
  }

  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA is not available");
  }

  if (!window.grecaptcha?.execute) {
    await loadRecaptchaScript();
  }

  return window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "forgot_password" });
}

function loadRecaptchaScript() {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha?.execute) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-recaptcha="citizen-portal"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load reCAPTCHA")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptcha = "citizen-portal";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load reCAPTCHA"));
    document.head.appendChild(script);
  });
}
