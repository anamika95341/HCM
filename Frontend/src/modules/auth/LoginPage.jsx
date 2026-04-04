import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Landmark,
  Lock,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Shield,
  Sun,
  Users,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { getHomePathForRole, PATHS } from "../../routes/paths.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { apiClient } from "../../shared/api/client.js";
import { RECAPTCHA_SITE_KEY } from "../../shared/config/env.js";
import { normalizeInputText, toSafeUserMessage } from "../../shared/security/text.js";
import parliamentArt from "../../assets/citizen/parliament.svg";
import aboutInteractionArt from "../../assets/citizen/about-interaction.svg";
import aboutServicesArt from "../../assets/citizen/about-services.svg";
import aboutEngagementArt from "../../assets/citizen/about-engagement.svg";
import serviceIndiaArt from "../../assets/citizen/service-india.svg";
import serviceGovernanceArt from "../../assets/citizen/service-governance.svg";
import serviceSupportArt from "../../assets/citizen/service-support.svg";

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

const CITIZEN_SECTIONS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About Us" },
  { id: "services", label: "Services" },
  { id: "contact", label: "Contact Us" },
];

const ABOUT_CARDS = [
  {
    image: aboutInteractionArt,
    title: "Government Interaction",
    description: "Structured meeting requests connect citizens with ministers through a formal, trackable process.",
  },
  {
    image: aboutServicesArt,
    title: "Public Services",
    description: "Complaint submission and status visibility support transparent service delivery across departments.",
  },
  {
    image: aboutEngagementArt,
    title: "Citizen Engagement",
    description: "A unified portal keeps communication simple, accessible, and aligned with official workflows.",
  },
];

const SERVICE_SLIDES = [
  [
    {
      image: serviceIndiaArt,
      title: "India",
      description: "A national-facing digital entry point designed for clarity and trust.",
    },
    {
      image: serviceGovernanceArt,
      title: "Government",
      description: "Formal routing and review patterns presented through a calm, modern interface.",
    },
    {
      image: serviceSupportArt,
      title: "Citizen Services",
      description: "Meeting requests and complaints remain simple to access across devices.",
    },
  ],
  [
    {
      image: aboutInteractionArt,
      title: "Public Interface",
      description: "A professional welcome page that keeps essential actions visible without noise.",
    },
    {
      image: aboutServicesArt,
      title: "Case Support",
      description: "Service-focused content blocks communicate portal purpose before sign in.",
    },
    {
      image: aboutEngagementArt,
      title: "Digital Access",
      description: "Responsive sections support desktop, tablet, and phone layouts consistently.",
    },
  ],
];

const fieldStyle = (C, hasIcon = true, hasRightAction = false) => ({
  width: "100%",
  minHeight: 42,
  padding: hasIcon ? `10px ${hasRightAction ? "42px" : "14px"} 10px 38px` : "10px 14px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.inp,
  color: C.t1,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
});

export default function LoginPage({ defaultRole = "citizen" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { C, theme, toggleTheme } = usePortalTheme();
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
  const [activeSection, setActiveSection] = useState("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [serviceSlideIndex, setServiceSlideIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
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
  const showCitizenActions = role === "citizen";
  const showAdminActions = role === "admin";
  const isTablet = viewportWidth < 1080;
  const isMobile = viewportWidth < 768;
  const showCitizenLanding = role === "citizen" && citizenMode === "login";

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

  useEffect(() => {
    if (role !== "citizen") return undefined;

    const handleScroll = () => {
      const navOffset = 120;
      const current = CITIZEN_SECTIONS.findLast((section) => {
        const node = document.getElementById(section.id);
        return node && window.scrollY + navOffset >= node.offsetTop;
      });

      setActiveSection(current?.id || "home");
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [role]);

  useEffect(() => {
    if (role !== "citizen") return undefined;

    const timer = window.setInterval(() => {
      setServiceSlideIndex((current) => (current + 1) % SERVICE_SLIDES.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [role]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!showCitizenLanding) return;

    window.scrollTo(0, 0);
    setActiveSection("home");
  }, [showCitizenLanding]);

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

  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      const top = Math.max(section.offsetTop - 88, 0);
      window.scrollTo({ top, behavior: "smooth" });
      setActiveSection(sectionId);
      setMobileNavOpen(false);
      return;
    }

    if (sectionId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveSection(sectionId);
      setMobileNavOpen(false);
    }
  }

  function handleCitizenNav(sectionId) {
    navigate(PATHS.login, { replace: false });
    window.requestAnimationFrame(() => scrollToSection(sectionId));
  }

  function nextServiceSlide() {
    setServiceSlideIndex((current) => (current + 1) % SERVICE_SLIDES.length);
  }

  function previousServiceSlide() {
    setServiceSlideIndex((current) => (current - 1 + SERVICE_SLIDES.length) % SERVICE_SLIDES.length);
  }

  const cardStyle = {
    width: "100%",
    maxWidth: showCitizenLanding ? (isTablet ? "100%" : 470) : 460,
    height: showCitizenLanding && !isTablet ? 580 : undefined,
    minHeight: showCitizenLanding && !isTablet ? 580 : undefined,
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: `0 24px 60px ${theme === "dark" ? "rgba(0,0,0,0.26)" : "rgba(23,23,23,0.08)"}`,
    backdropFilter: "blur(12px)",
  };
  const heroPanelBackground =
    theme === "dark"
      ? `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.card} 100%)`
      : `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.cardHover} 100%)`;

  if (showCitizenLanding) {
    return (
      <div
        className="portal-content"
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.t1,
        }}
      >
        <CitizenNavbar
          C={C}
          theme={theme}
          toggleTheme={toggleTheme}
          activeSection={activeSection}
          mobileNavOpen={mobileNavOpen}
          isMobile={isMobile}
          setMobileNavOpen={setMobileNavOpen}
          onNavigate={handleCitizenNav}
        />

        <main>
          <section id="home" style={{ padding: "112px 12px 64px" }}>
            <div style={{ maxWidth: 1360, margin: "0 auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isTablet ? "1fr" : "minmax(0, 1.08fr) minmax(340px, 440px)",
                  gap: isTablet ? 20 : 16,
                  alignItems: "stretch",
                }}
              >
                {isTablet ? (
                  <div style={{ display: "flex", alignItems: "stretch", order: 1 }}>
                    <div style={{ width: "100%", maxWidth: "100%" }}>{renderAuthCard()}</div>
                  </div>
                ) : null}

                <div
                  style={{
                    borderRadius: 28,
                    border: `1px solid ${C.border}`,
                    background: heroPanelBackground,
                    padding: 28,
                    height: isTablet ? "auto" : 580,
                    minHeight: isTablet ? 320 : 580,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    overflow: "hidden",
                    position: "relative",
                    order: isTablet ? 2 : 1,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        theme === "dark"
                          ? "radial-gradient(circle at top left, rgba(168,85,247,0.12), transparent 42%), radial-gradient(circle at bottom right, rgba(52,211,153,0.08), transparent 38%)"
                          : "radial-gradient(circle at top left, rgba(124,58,237,0.08), transparent 42%), radial-gradient(circle at bottom right, rgba(5,150,105,0.06), transparent 38%)",
                      pointerEvents: "none",
                    }}
                  />

                  <div style={{ position: "relative", zIndex: 1, maxWidth: 600 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: `1px solid ${C.border}`,
                        background: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)",
                        color: C.t2,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <Shield size={14} color={C.purple} />
                      Secure government service access
                    </div>
                    <h1
                      style={{
                        marginTop: 22,
                        fontSize: "clamp(1.8rem, 4.4vw, 3.15rem)",
                        lineHeight: 1.08,
                        fontWeight: 700,
                        color: C.t1,
                        letterSpacing: "-0.04em",
                        maxWidth: 590,
                      }}
                    >
                      Citizen Login Portal for meetings, complaints, and service requests.
                    </h1>
                    <p
                      style={{
                        marginTop: 18,
                        maxWidth: 520,
                        fontSize: 15,
                        lineHeight: 1.68,
                        color: C.t2,
                      }}
                    >
                      Access official citizen services through a focused, secure, and responsive interface aligned with the rest of the HCM Project.
                    </p>
                  </div>

                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      marginTop: 28,
                      borderRadius: 24,
                      overflow: "hidden",
                      border: `1px solid ${C.border}`,
                      background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    <img
                      src={parliamentArt}
                      alt="Illustration of the Indian Parliament"
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: isMobile ? 240 : 340,
                        objectFit: "cover",
                      }}
                    />
                  </div>
                </div>

                {!isTablet ? (
                  <div style={{ display: "flex", alignItems: "stretch", order: 2 }}>
                  <div style={{ width: "100%", height: "100%" }}>{renderAuthCard()}</div>
                </div>
              ) : null}
              </div>
            </div>
          </section>

          <PortalSection id="about" C={C} title="About Us" subtitle="Citizens can request meetings with ministers and submit complaints through this portal.">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              {ABOUT_CARDS.map((card) => (
                <InfoCard key={card.title} C={C} theme={theme} {...card} />
              ))}
            </div>
          </PortalSection>

          <PortalSection
            id="services"
            C={C}
            title="Services"
            subtitle="The portal supports secure access to public workflows with a clear, responsive interface. Citizens can review service information and continue directly into sign-in without leaving the page."
          >
            <div
              style={{
                borderRadius: 24,
                border: `1px solid ${C.border}`,
                background: C.card,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 20,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.t1 }}>Citizen Services Overview</div>
                  <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: C.t2 }}>
                    Browse core service themes through an auto-advancing carousel with manual controls.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CarouselArrow C={C} direction="left" onClick={previousServiceSlide} />
                  <CarouselArrow C={C} direction="right" onClick={nextServiceSlide} />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                  gap: 18,
                }}
              >
                {SERVICE_SLIDES[serviceSlideIndex].slice(0, isMobile ? 1 : isTablet ? 2 : 3).map((item) => (
                  <InfoCard key={`${serviceSlideIndex}-${item.title}`} C={C} theme={theme} {...item} compact />
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 18,
                }}
              >
                {SERVICE_SLIDES.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Open slide ${index + 1}`}
                    onClick={() => setServiceSlideIndex(index)}
                    style={{
                      width: index === serviceSlideIndex ? 28 : 10,
                      height: 10,
                      borderRadius: 999,
                      border: "none",
                      background: index === serviceSlideIndex ? C.purple : `${C.t3}40`,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </PortalSection>

          <PortalSection id="contact" C={C} title="Contact Us" subtitle="Demo contact details for the government-based citizen portal.">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTablet ? "1fr" : "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
                gap: 20,
              }}
            >
              <div
                style={{
                  borderRadius: 24,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: C.t1 }}>Get in touch</div>
                <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.75, color: C.t2 }}>
                  Use the citizen portal for official workflows. For demo support information, refer to the contact details alongside.
                </p>
                <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
                  <ContactField C={C} icon={<Users size={18} />} label="Department" value="HCM Citizen Facilitation Desk" />
                  <ContactField C={C} icon={<Phone size={18} />} label="Phone" value="+91 11 2301 0000" />
                  <ContactField C={C} icon={<Mail size={18} />} label="Email" value="support@hcmproject.gov.in" />
                  <ContactField C={C} icon={<MapPin size={18} />} label="Address" value="Parliament House Annexe, New Delhi, India" />
                </div>
              </div>

              <div
                style={{
                  borderRadius: 24,
                  border: `1px solid ${C.border}`,
                  background: heroPanelBackground,
                  padding: 24,
                  display: "grid",
                  gap: 16,
                  alignContent: "start",
                }}
              >
                <ContactMiniCard
                  C={C}
                  icon={<Phone size={18} color={C.purple} />}
                  title="Phone Support"
                  detail="Mon to Fri, 09:00 to 18:00"
                  value="+91 11 2301 0000"
                />
                <ContactMiniCard
                  C={C}
                  icon={<Mail size={18} color={C.purple} />}
                  title="Email"
                  detail="Service and portal enquiries"
                  value="support@hcmproject.gov.in"
                />
                <ContactMiniCard
                  C={C}
                  icon={<Building2 size={18} color={C.purple} />}
                  title="Office"
                  detail="Demo address"
                  value="New Delhi, India"
                />
              </div>
            </div>
          </PortalSection>

          <footer
            style={{
              borderTop: `1px solid ${C.border}`,
              background: C.bgElevated,
              padding: "22px 20px 28px",
            }}
          >
            <div
              style={{
                maxWidth: 1360,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>HCM Project</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: C.t2 }}>
                Citizen services portal for meeting requests, complaints, and public engagement.
              </div>
            </div>
          </footer>
        </main>
      </div>
    );
  }

  return (
    <div
      className="portal-content"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--portal-space-11) var(--portal-space-8)",
        background: C.bg,
        transition: "background-color var(--portal-duration-slow, 0.3s) ease",
      }}
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.bgElevated,
          color: C.t2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 20,
        }}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      {renderAuthCard()}
    </div>
  );

  function renderAuthCard() {
    return (
      <div style={cardStyle}>
        <div style={{ padding: "28px 28px 24px", background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
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
            HCM Project
          </div>
          <h2 style={{ margin: "10px 0 6px", fontSize: 24, fontWeight: 700, lineHeight: 1.25, color: C.t1 }}>{roleCopy.title}</h2>
          <p style={{ margin: 0, color: C.t2, fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>{roleCopy.subtitle}</p>
        </div>

        <div style={{ padding: 28 }}>
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
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: C.purple,
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
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
              <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "1fr 1fr", gap: 14 }}>
                <Field label="Age" icon={<Mail size={16} color={C.t3} />}>
                  <input type="number" min="1" max="120" value={registerForm.age} onChange={(event) => setRegisterForm((current) => ({ ...current, age: event.target.value }))} required style={fieldStyle(C)} />
                </Field>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: C.t2 }}>Sex</span>
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
    );
  }
}

function CitizenNavbar({ C, theme, toggleTheme, activeSection, mobileNavOpen, isMobile, setMobileNavOpen, onNavigate }) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderBottom: `1px solid ${C.border}`,
        background: theme === "dark" ? "rgba(10,10,10,0.82)" : "rgba(245,245,245,0.9)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          minHeight: 72,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate("home")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: C.t1,
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: C.purpleDim,
              border: `1px solid ${C.border}`,
            }}
          >
            <Landmark size={18} color={C.purple} />
          </span>
          HCM Project
        </button>

        <nav
          style={{
            display: isMobile ? "none" : "flex",
            alignItems: "center",
            gap: 8,
            flex: "1 1 auto",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {CITIZEN_SECTIONS.map((section) => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onNavigate(section.id)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: `1px solid ${active ? `${C.purple}40` : "transparent"}`,
                    background: active ? C.purpleDim : "transparent",
                    color: active ? C.purple : C.t2,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              minWidth: 70,
              height: 38,
              padding: 4,
              borderRadius: 999,
              border: `1px solid ${C.border}`,
              background: C.bgElevated,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: theme === "dark" ? "flex-end" : "flex-start",
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: C.purple,
                color: "#fff",
              }}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </span>
          </button>
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileNavOpen((current) => !current)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.bgElevated,
              color: C.t2,
              cursor: "pointer",
              display: isMobile ? "inline-flex" : "none",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Menu size={16} />
          </button>
        </div>
      </div>

      <div
        className="citizen-mobile-nav"
        style={{
          display: mobileNavOpen ? "grid" : "none",
          gap: 8,
          padding: "0 12px 16px",
          maxWidth: 1360,
          margin: "0 auto",
        }}
      >
        {CITIZEN_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onNavigate(section.id)}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${activeSection === section.id ? `${C.purple}40` : C.border}`,
              background: activeSection === section.id ? C.purpleDim : C.bgElevated,
              color: activeSection === section.id ? C.purple : C.t2,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {section.label}
          </button>
        ))}
      </div>
    </header>
  );
}

function PortalSection({ id, C, title, subtitle, children }) {
  return (
    <section id={id} style={{ padding: "0 12px 64px", scrollMarginTop: 108 }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div style={{ maxWidth: 720, marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: C.t3, textTransform: "uppercase" }}>{title}</div>
          <h2 style={{ marginTop: 12, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", lineHeight: 1.12, fontWeight: 700, color: C.t1 }}>{title}</h2>
          <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.8, color: C.t2 }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoCard({ C, theme, image, title, description, compact = false }) {
  return (
    <article
      style={{
        borderRadius: 22,
        border: `1px solid ${C.border}`,
        background: C.card,
        overflow: "hidden",
        minHeight: compact ? 100 : 420,
      }}
    >
      <div
        style={{
          padding: compact ? 14 : 16,
          background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(124,58,237,0.03)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <img
          src={image}
          alt={title}
          style={{
            width: "100%",
            height: compact ? 180 : 220,
            objectFit: "cover",
            borderRadius: 16,
          }}
        />
      </div>
      <div style={{ padding: compact ? 18 : 20 }}>
        <h3 style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 700, color: C.t1 }}>{title}</h3>
        <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.75, color: C.t2 }}>{description}</p>
      </div>
    </article>
  );
}

function CarouselArrow({ C, direction, onClick }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Previous slide" : "Next slide"}
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: C.bgElevated,
        color: C.t2,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={18} />
    </button>
  );
}

function ContactField({ C, icon, label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px minmax(0, 1fr)",
        gap: 14,
        alignItems: "start",
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        background: C.bgElevated,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.purpleDim,
          color: C.purple,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
        <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.7, color: C.t1 }}>{value}</div>
      </div>
    </div>
  );
}

function ContactMiniCard({ C, icon, title, detail, value }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${C.border}`,
        background: C.card,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.purpleDim,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>{title}</div>
          <div style={{ fontSize: 12, color: C.t3 }}>{detail}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 14, color: C.t2 }}>{value}</div>
    </div>
  );
}

function Field({ label, icon, children }) {
  const { C } = usePortalTheme();

  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: C.t2 }}>{label}</span>
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
    minHeight: 40,
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: C.purple,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.5,
    cursor: "pointer",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  };
}

function secondaryButtonStyle(C) {
  return {
    width: "100%",
    minHeight: 40,
    padding: "10px 18px",
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    background: C.bgElevated,
    color: C.t2,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.5,
    cursor: "pointer",
    transition: "opacity 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
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
