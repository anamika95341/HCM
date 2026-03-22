import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePortalTheme } from "../theme/portalTheme";

const fieldStyle = (C, hasIcon = true, hasRightAction = false) => ({
    width: "100%",
    padding: hasIcon ? `12px ${hasRightAction ? "42px" : "14px"} 12px 40px` : "12px 14px",
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    background: C.inp,
    color: C.t1,
    fontSize: 13,
});

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const navigate = useNavigate();
    const { C } = usePortalTheme();

    useEffect(() => {
        if (success && !loading) {
            const timer = setTimeout(() => {
                setRedirecting(true);
                setTimeout(() => {
                    navigate("/newcase");
                }, 1000);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [success, loading, navigate]);

    const handleLogin = (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        setTimeout(() => {
            if (email && password) {
                setSuccess("Authentication successful. Redirecting to the workspace.");
                setLoading(false);
            } else {
                setError("Please fill in all mandatory fields.");
                setLoading(false);
            }
        }, 1200);
    };

    const handleForgotPassword = (event) => {
        event.preventDefault();
        setResetLoading(true);
        setError("");

        setTimeout(() => {
            setResetSuccess(true);
            setResetEmail("");
            setResetLoading(false);

            setTimeout(() => {
                setResetSuccess(false);
                setIsForgotPassword(false);
            }, 3500);
        }, 1200);
    };

    const cardStyle = {
        width: "100%",
        maxWidth: 460,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        boxShadow: "var(--portal-shadow)",
        overflow: "hidden",
    };

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
            {redirecting && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)" }}
                >
                    <div style={{ ...cardStyle, maxWidth: 360, padding: 32, textAlign: "center" }}>
                        <div
                            style={{
                                width: 68,
                                height: 68,
                                borderRadius: 16,
                                background: C.purpleDim,
                                color: C.purple,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 18px",
                            }}
                        >
                            <Shield size={34} />
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.t1 }}>Securing session</div>
                        <div style={{ fontSize: 12, color: C.t3, marginTop: 6 }}>Routing to the dashboard workspace.</div>
                    </div>
                </div>
            )}

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
                    <h1 style={{ margin: "10px 0 6px", fontSize: 28, lineHeight: 1.1, color: C.t1 }}>Ministry of Culture</h1>
                    <p style={{ margin: 0, color: C.t3, fontSize: 13, lineHeight: 1.6 }}>
                        Sign in to the unified portal with the same visual workspace used across settings, cases, meetings, and dashboards.
                    </p>
                </div>

                {!isForgotPassword ? (
                    <div style={{ padding: 32 }}>
                        {success && (
                            <MessageBox color={C.mint} bg={C.mintDim} icon={<CheckCircle size={18} />} message={success} />
                        )}
                        {error && (
                            <MessageBox color={C.danger} bg={`${C.danger}20`} icon={<AlertCircle size={18} />} message={error} />
                        )}

                        <form onSubmit={handleLogin} style={{ display: "grid", gap: 18 }}>
                            <Field label="Official Email ID" icon={<Mail size={16} color={C.t3} />}>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                    placeholder="officer@gov.in"
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

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.t2 }}>
                                    <input type="checkbox" style={{ accentColor: C.purple }} />
                                    Remember me
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(true)}
                                    style={{ background: "transparent", border: "none", color: C.purple, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                                >
                                    Forgot password?
                                </button>
                            </div>

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
                        </form>
                    </div>
                ) : (
                    <div style={{ padding: 32 }}>
                        {resetSuccess ? (
                            <MessageBox
                                color={C.mint}
                                bg={C.mintDim}
                                icon={<CheckCircle size={18} />}
                                message="Reset instructions have been sent to your official email."
                            />
                        ) : (
                            <>
                                <div style={{ marginBottom: 18 }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: C.t1 }}>Reset password</div>
                                    <p style={{ margin: "6px 0 0", fontSize: 13, color: C.t3, lineHeight: 1.6 }}>
                                        Enter your official email ID to receive password reset instructions.
                                    </p>
                                </div>

                                <form onSubmit={handleForgotPassword} style={{ display: "grid", gap: 18 }}>
                                    <Field label="Official Email ID" icon={<Mail size={16} color={C.t3} />}>
                                        <input
                                            type="email"
                                            value={resetEmail}
                                            onChange={(event) => setResetEmail(event.target.value)}
                                            required
                                            placeholder="officer@gov.in"
                                            style={fieldStyle(C)}
                                        />
                                    </Field>

                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            borderRadius: 10,
                                            border: "none",
                                            background: C.purple,
                                            color: "#fff",
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: resetLoading ? "wait" : "pointer",
                                        }}
                                    >
                                        {resetLoading ? "Sending..." : "Send Reset Link"}
                                    </button>
                                </form>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setIsForgotPassword(false);
                                setResetSuccess(false);
                            }}
                            style={{
                                marginTop: 18,
                                background: "transparent",
                                border: `1px solid ${C.border}`,
                                color: C.t2,
                                padding: "10px 14px",
                                borderRadius: 10,
                                cursor: "pointer",
                                width: "100%",
                                fontWeight: 600,
                            }}
                        >
                            Back to sign in
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

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

export default Login;
