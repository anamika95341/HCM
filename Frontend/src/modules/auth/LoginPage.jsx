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
    subtitle: "Sign in with your username or email to access the admin workspace.",
    identifierLabel: "Username or Email",
    identifierPlaceholder: "admin.user or admin@gov.in",
  },
  deo: {
    title: "DEO Portal",
    subtitle: "Sign in with your username or email. OTP verification is mandatory.",
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

export default function LoginPage({ defaultRole = "citizen", initialAdminMode = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { C } = usePortalTheme();
  const { session, login, verifyOtp, pendingChallenge, isAuthenticated } = useAuth();

  const role = useMemo(() => {
    if (location.pathname === PATHS.adminLogin || location.pathname === PATHS.adminRegister) return "admin";
    if (location.pathname === PATHS.deoLogin) return "deo";
    if (location.pathname === PATHS.ministerLogin) return "minister";
    return defaultRole;
  }, [defaultRole, location.pathname]);

  const roleCopy = ROLE_COPY[role];
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adminRegistrationResult, setAdminRegistrationResult] = useState(null);
  const [citizenMode, setCitizenMode] = useState("login");
  const [adminMode, setAdminMode] = useState(initialAdminMode);
  const [adminRegistrationToken, setAdminRegistrationToken] = useState("");
  const [verifiedAdminGate, setVerifiedAdminGate] = useState(null);
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
  const [adminRegisterForm, setAdminRegisterForm] = useState({
    username: "",
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    sex: "male",
    designation: "",
    aadhaarNumber: "",
    phoneNumber: "",
    email: "",
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
    setOtp("");
    setError("");
    setSuccess("");
    setCitizenMode("login");
    setAdminMode(role === "admin" ? initialAdminMode : "login");
    setAdminRegistrationToken("");
    setVerifiedAdminGate(null);
    setAdminRegistrationResult(null);
  }, [initialAdminMode, role]);

  async function handlePrimaryLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await login({ role, identifier, password });
      if (result.requiresOtp) {
        setSuccess("OTP sent. Complete the second step to continue.");
      } else {
        setSuccess("Authentication successful. Redirecting to the workspace.");
      }
    } catch (authError) {
      setError(toSafeUserMessage(authError, "Authentication failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerification(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await verifyOtp(otp);
      setSuccess("OTP verified. Redirecting to the workspace.");
    } catch (authError) {
      setError(toSafeUserMessage(authError, "OTP verification failed"));
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

  async function handleAdminTokenVerification(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await apiClient.post("/auth/admin/verify-registration-token", {
        registrationToken: adminRegistrationToken,
      });
      const gate = data.token || {};
      setVerifiedAdminGate(gate);
      setAdminRegisterForm((current) => ({
        ...current,
        email: typeof gate.sub === "string" ? gate.sub : current.email,
        designation: typeof gate.designation === "string" ? gate.designation : current.designation,
      }));
      setAdminMode("register");
      setSuccess("Registration token verified. Complete admin registration.");
    } catch (requestError) {
      setError(extractErrorMessage(requestError, "Unable to verify registration token"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminRegister(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!adminRegistrationToken) {
        throw new Error("Registration token is required");
      }
      if (!isTwelveDigitAadhaar(adminRegisterForm.aadhaarNumber)) {
        throw new Error("Enter a valid 12-digit Aadhaar number");
      }
      const passwordError = validatePassword(adminRegisterForm.password, adminRegisterForm.confirmPassword);
      if (passwordError) {
        throw new Error(passwordError);
      }

      const { data } = await apiClient.post("/auth/admin/register", {
        ...adminRegisterForm,
        registrationToken: adminRegistrationToken,
        age: Number(adminRegisterForm.age),
      });
      setAdminRegistrationResult(data.admin);
      setSuccess("");
    } catch (requestError) {
      setError(extractErrorMessage(requestError, "Unable to register admin"));
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

  const otpRequired = pendingChallenge?.role === role;
  const showCitizenActions = role === "citizen" && !otpRequired;
  const showAdminActions = role === "admin" && !otpRequired;

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
      <AdminRegistrationSuccessModal
        admin={adminRegistrationResult}
        onClose={() => {
          const nextIdentifier = adminRegistrationResult?.username || adminRegistrationResult?.email || "";
          setAdminRegistrationResult(null);
          setAdminMode("login");
          setIdentifier(nextIdentifier);
          navigate(PATHS.adminLogin, { replace: true });
        }}
      />
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

          {!otpRequired && (
            (role === "citizen" && citizenMode === "login") ||
            (role === "admin" && adminMode === "login") ||
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
                      navigate(PATHS.adminRegister);
                      setError("");
                      setSuccess("");
                    }}
                    style={footerLinkStyle(C)}
                  >
                    Register New Admin
                  </button>
                </div>
              )}
            </form>
          ) : !otpRequired && role === "citizen" && citizenMode === "register" ? (
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
          ) : !otpRequired && role === "citizen" && citizenMode === "verify" ? (
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
          ) : !otpRequired && role === "citizen" && citizenMode === "forgot" ? (
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
          ) : !otpRequired && role === "citizen" && citizenMode === "reset" ? (
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
          ) : !otpRequired && role === "admin" && adminMode === "verify-token" ? (
            <form onSubmit={handleAdminTokenVerification} style={{ display: "grid", gap: 18 }}>
              <Field label="Admin Registration Token" icon={<Shield size={16} color={C.t3} />}>
                <input
                  type="text"
                  value={adminRegistrationToken}
                  onChange={(event) => setAdminRegistrationToken(normalizeInputText(event.target.value, { maxLength: 4000 }))}
                  required
                  placeholder="Paste signed registration token"
                  style={fieldStyle(C)}
                />
              </Field>
              <button type="submit" disabled={loading} style={primaryButtonStyle(C)}>
                {loading ? "Verifying..." : "Verify Token"}
              </button>
              <button type="button" onClick={() => setAdminMode("login")} style={secondaryButtonStyle(C)}>
                Back to Login
              </button>
            </form>
          ) : !otpRequired && role === "admin" && adminMode === "register" ? (
            <form onSubmit={handleAdminRegister} style={{ display: "grid", gap: 14 }}>
              <Field label="Username" icon={<Mail size={16} color={C.t3} />}>
                <input value={adminRegisterForm.username} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, username: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="First Name" icon={<Mail size={16} color={C.t3} />}>
                <input value={adminRegisterForm.firstName} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, firstName: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Middle Name" icon={<Mail size={16} color={C.t3} />}>
                <input value={adminRegisterForm.middleName} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, middleName: event.target.value }))} style={fieldStyle(C)} />
              </Field>
              <Field label="Last Name" icon={<Mail size={16} color={C.t3} />}>
                <input value={adminRegisterForm.lastName} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, lastName: event.target.value }))} style={fieldStyle(C)} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Age" icon={<Mail size={16} color={C.t3} />}>
                  <input type="number" min="1" max="120" value={adminRegisterForm.age} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, age: event.target.value }))} required style={fieldStyle(C)} />
                </Field>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>Sex</span>
                  <select value={adminRegisterForm.sex} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, sex: event.target.value }))} style={fieldStyle(C, false)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
              <Field label="Designation" icon={<Mail size={16} color={C.t3} />}>
                <input value={adminRegisterForm.designation} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, designation: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Aadhaar Number" icon={<Shield size={16} color={C.t3} />}>
                <input value={adminRegisterForm.aadhaarNumber} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, aadhaarNumber: event.target.value.replace(/\D/g, "").slice(0, 12) }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Phone Number" icon={<Mail size={16} color={C.t3} />}>
                <input value={adminRegisterForm.phoneNumber} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 10) }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Email" icon={<Mail size={16} color={C.t3} />}>
                <input
                  type="email"
                  value={adminRegisterForm.email}
                  onChange={(event) => setAdminRegisterForm((current) => ({ ...current, email: normalizeInputText(event.target.value, { maxLength: 160 }) }))}
                  required
                  readOnly={Boolean(verifiedAdminGate?.sub)}
                  style={fieldStyle(C)}
                />
              </Field>
              <Field label="Password" icon={<Lock size={16} color={C.t3} />}>
                <input type="password" value={adminRegisterForm.password} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, password: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <Field label="Confirm Password" icon={<Lock size={16} color={C.t3} />}>
                <input type="password" value={adminRegisterForm.confirmPassword} onChange={(event) => setAdminRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))} required style={fieldStyle(C)} />
              </Field>
              <button type="submit" disabled={loading} style={primaryButtonStyle(C)}>
                {loading ? "Registering..." : "Create Admin Account"}
              </button>
              <button type="button" onClick={() => setAdminMode("verify-token")} style={secondaryTextButtonStyle(C)}>
                Change Token
              </button>
              <button type="button" onClick={() => setAdminMode("login")} style={secondaryButtonStyle(C)}>
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerification} style={{ display: "grid", gap: 18 }}>
              <Field label="One-Time Password" icon={<Shield size={16} color={C.t3} />}>
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  placeholder="Enter 6-digit OTP"
                  style={fieldStyle(C)}
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: C.purple,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}
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

function AdminRegistrationSuccessModal({ admin, onClose }) {
  const { C } = usePortalTheme();
  const [copied, setCopied] = useState(false);

  if (!admin) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(admin.id);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          boxShadow: "var(--portal-shadow)",
          padding: 24,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.t1 }}>Admin Registered</div>
          <div style={{ fontSize: 13, color: C.t3 }}>Use the created credentials to sign in.</div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <InfoRow label="Admin ID" value={admin.id} />
          <InfoRow label="Username" value={admin.username || "Not available"} />
          <InfoRow label="Email" value={admin.email || "Not available"} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={handleCopy} style={secondaryButtonStyle(C)}>
            {copied ? "Copied Admin ID" : "Copy Admin ID"}
          </button>
          <button type="button" onClick={onClose} style={primaryButtonStyle(C)}>
            Continue to Login
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  const { C } = usePortalTheme();

  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: C.bgElevated,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: C.t1, wordBreak: "break-all" }}>{value}</div>
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
