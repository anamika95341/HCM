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
  X,
  Users,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePortalTheme } from "../../shared/theme/portalTheme.jsx";
import { getHomePathForRole, PATHS } from "../../routes/paths.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { apiClient } from "../../shared/api/client.js";
import { RECAPTCHA_SITE_KEY } from "../../shared/config/env.js";
import { normalizeInputText, toSafeUserMessage } from "../../shared/security/text.js";
import citizenMeetingArt from "../../assets/citizen/ChatGPT Image Apr 16, 2026, 11_27_23 PM.png";
import citizenComplaintArt from "../../assets/citizen/ChatGPT Image Apr 16, 2026, 11_29_03 PM.png";
import serviceNorthArt from "../../assets/citizen/north.png";
import serviceEastArt from "../../assets/citizen/east.png";
import serviceSouthArt from "../../assets/citizen/south.png";
import serviceWestArt from "../../assets/citizen/west.png";
import serviceFeatureArtOne from "../../assets/citizen/ChatGPT Image May 1, 2026, 01_29_42 AM.png";
import serviceFeatureArtTwo from "../../assets/citizen/ChatGPT Image May 1, 2026, 01_32_54 AM.png";
import serviceFeatureArtThree from "../../assets/citizen/ChatGPT Image May 1, 2026, 01_44_38 AM.png";
import serviceFeatureArtFour from "../../assets/citizen/ChatGPT Image May 1, 2026, 01_48_30 AM.png";
import serviceFeatureArtFive from "../../assets/citizen/ChatGPT Image May 1, 2026, 01_53_02 AM.png";
import serviceFeatureArtSix from "../../assets/citizen/ChatGPT Image May 1, 2026, 01_56_01 AM.png";
import servicesSectionArt from "../../assets/citizen/Services.png";

const ROLE_COPY = {
  citizen: {
    title: "Citizen Portal",
    subtitle: "",
    identifierLabel: "Citizen ID",
    identifierPlaceholder: "CTZ-2026-00000001",
  },
  admin: {
    title: "Admin Portal",
    subtitle: "",
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
    subtitle: "",
    identifierLabel: "Username or Email",
    identifierPlaceholder: "deo.user or deo@gov.in",
  },
  minister: {
    title: "Minister Portal",
    subtitle: "",
    identifierLabel: "Username or Email",
    identifierPlaceholder: "minister.user or minister@gov.in",
  },
};

const CITIZEN_SECTIONS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About Us" },
  { id: "services", label: "Services" },
  { id: "media", label: "Media" },
  { id: "contact", label: "Contact Us" },
];

const CITIZEN_LOGIN_ID_MAX_LENGTH = 20;
const CITIZEN_LOGIN_PASSWORD_MAX_LENGTH = 25;
const OPERATOR_LOGIN_IDENTIFIER_MAX_LENGTH = 40;
const OPERATOR_LOGIN_PASSWORD_MAX_LENGTH = 25;
const CITIZEN_NAME_MAX_LENGTH = 20;
const CITIZEN_REGISTER_PASSWORD_MAX_LENGTH = 25;
const CITIZEN_HERO_PURPLE = "#2E235F";
const NATIONAL_EMBLEM_SRC = "https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg";

const ABOUT_FEATURES = [
  {
    image: citizenMeetingArt,
    title: "Meeting Requests",
    description: "As a citizen, people can request meetings with ministers by logging in to the portal and submitting a formal meeting request with the required details. The platform is designed to make the process simple, transparent, and easy to follow from start to finish. After a request is submitted, citizens can monitor its progress through the portal and stay informed about whether it is under review, approved, rescheduled, or closed. This helps users avoid repeated follow-up visits and gives them a single place to check official updates. The meeting workflow also improves communication by keeping request information organized, visible, and aligned with the government process used for public interaction and scheduling.",
  },
  {
    image: citizenComplaintArt,
    title: "Complaints",
    description: "Citizens can use the complaint service to raise issues, submit supporting details, and report concerns through a structured digital process inside the portal. The system helps ensure that complaints are recorded properly and moved through the appropriate workflow for review and action. Once a complaint is created, citizens can log in at any time to track status updates, understand whether the matter is pending, in progress, resolved, or requires further clarification, and remain informed without depending on offline follow-up. This improves visibility and accountability while giving people a reliable channel to communicate service-related problems. The complaint workflow supports better coordination, faster response handling, and clearer updates for citizens throughout the process.",
  },
];

const SERVICE_IMAGES = [
  {
    image: serviceNorthArt,
    title: "North Tourism",
  },
  {
    image: serviceFeatureArtOne,
    title: "Gajendra Singh Shekhawat",
  },
  {
    image: serviceSouthArt,
    title: "South Tourism",
  },
  {
    image: serviceFeatureArtTwo,
    title: "Gajendra Singh Shekhawat",
  },
  {
    image: serviceEastArt,
    title: "East Tourism",
  },
  {
    image: serviceFeatureArtThree,
    title: "Gajendra Singh Shekhawat",
  },
  {
    image: serviceWestArt,
    title: "West Tourism",
  },
  {
    image: serviceFeatureArtFour,
    title: "Gajendra Singh Shekhawat",
  },
  {
    image: serviceNorthArt,
    title: "North Tourism",
  },
  {
    image: serviceFeatureArtFive,
    title: "Gajendra Singh Shekhawat",
  },
  {
    image: serviceSouthArt,
    title: "South Tourism",
  },
  {
    image: serviceFeatureArtSix,
    title: "Gajendra Singh Shekhawat",
  },
];

const fieldStyle = (C, hasIcon = true, hasRightAction = false, invalid = false, compact = false) => ({
  width: "100%",
  minHeight: compact ? 34 : 42,
  padding: hasIcon ? `${compact ? "6px" : "10px"} ${hasRightAction ? "42px" : "14px"} ${compact ? "6px" : "10px"} 38px` : `${compact ? "6px 14px" : "10px 14px"}`,
  borderRadius: 10,
  border: `1px solid ${invalid ? C.danger : C.border}`,
  background: C.inp,
  color: C.t1,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
  outline: "none",
  boxShadow: invalid ? `0 0 0 3px ${C.danger}14` : "none",
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
  const [citizenLoginErrors, setCitizenLoginErrors] = useState({
    identifier: "",
    password: "",
  });
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
    sex: "",
    mobileNumber: "",
    pincode: "",
    city: "",
    state: "",
    mpDistrict: "",
    password: "",
    confirmPassword: "",
  });
  const [registerErrors, setRegisterErrors] = useState({});
  const [registerTouched, setRegisterTouched] = useState({});
  const [registerSubmitted, setRegisterSubmitted] = useState(false);
  const [registerSubmitError, setRegisterSubmitError] = useState("");
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
  const showOperatorPortal = role === "admin" || role === "deo" || role === "minister";
  const isTablet = viewportWidth < 1080;
  const isMobile = viewportWidth < 768;
  const showCitizenLanding = role === "citizen" && citizenMode === "login";
  const citizenLightLoginAccent = showCitizenLanding && theme === "light" ? CITIZEN_HERO_PURPLE : C.purple;
  const showCitizenHeaderAccent = role === "citizen" && (citizenMode === "login" || citizenMode === "register") && theme === "light";
  const showCitizenHeaderEmblem = role === "citizen" && (citizenMode === "login" || citizenMode === "register");
  const registerModeTitle = role === "citizen" && citizenMode === "register" ? "Citizen Registration" : roleCopy.title;

  useEffect(() => {
    if (isAuthenticated && session?.role) {
      navigate(getHomePathForRole(session.role), { replace: true });
    }
  }, [isAuthenticated, navigate, session]);

  useEffect(() => {
    setIdentifier("");
    setPassword("");
    setCitizenLoginErrors({ identifier: "", password: "" });
    setRegisterErrors({});
    setRegisterTouched({});
    setRegisterSubmitted(false);
    setRegisterSubmitError("");
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
      setServiceSlideIndex((current) => (current + 1) % SERVICE_IMAGES.length);
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
    const nextCitizenLoginErrors = getCitizenLoginErrors(identifier, password);
    setCitizenLoginErrors(nextCitizenLoginErrors);

    if (role === "citizen" && (nextCitizenLoginErrors.identifier || nextCitizenLoginErrors.password)) {
      return;
    }

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
    setRegisterSubmitted(true);
    const nextRegisterErrors = validateCitizenRegistration(registerForm);
    const hasRequiredFieldError = Object.values(nextRegisterErrors).some((message) => message === REQUIRED_FIELD_MESSAGE);
    const hasOtherValidationError = Object.values(nextRegisterErrors).some(Boolean);
    setRegisterErrors(nextRegisterErrors);
    setError("");
    setSuccess("");

    if (hasRequiredFieldError) {
      setRegisterSubmitError("Please fill asterisk marked fields.");
      return;
    }

    if (nextRegisterErrors.confirmPassword === PASSWORD_MISMATCH_MESSAGE) {
      setRegisterSubmitError(PASSWORD_MISMATCH_MESSAGE);
      return;
    }

    if (hasOtherValidationError) {
      setRegisterSubmitError("Please correct the highlighted fields.");
      return;
    }

    setRegisterSubmitError("");
    setLoading(true);

    try {

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

  function handleIdentifierChange(event) {
    const nextIdentifier = normalizeInputText(event.target.value, {
      maxLength: role === "citizen" ? CITIZEN_LOGIN_ID_MAX_LENGTH : OPERATOR_LOGIN_IDENTIFIER_MAX_LENGTH,
      trim: false,
    });
    setIdentifier(nextIdentifier);

    setCitizenLoginErrors((current) => ({
      ...current,
      identifier: role === "citizen" ? getCitizenIdLengthError(nextIdentifier) : getOperatorIdentifierLengthError(nextIdentifier),
    }));
  }

  function handlePasswordChange(event) {
    const nextPassword = role === "citizen"
      ? event.target.value.slice(0, CITIZEN_LOGIN_PASSWORD_MAX_LENGTH)
      : event.target.value.slice(0, OPERATOR_LOGIN_PASSWORD_MAX_LENGTH);
    setPassword(nextPassword);

    setCitizenLoginErrors((current) => ({
      ...current,
      password: role === "citizen" ? getCitizenPasswordLengthError(nextPassword) : getOperatorPasswordLengthError(nextPassword),
    }));
  }

  function handleRegisterFieldChange(field, rawValue) {
    let nextValue = rawValue;

    if (field === "firstName" || field === "middleName" || field === "lastName") {
      nextValue = rawValue.slice(0, CITIZEN_NAME_MAX_LENGTH);
    } else if (field === "password" || field === "confirmPassword") {
      nextValue = rawValue.slice(0, CITIZEN_REGISTER_PASSWORD_MAX_LENGTH);
    } else if (field === "aadhaarNumber") {
      nextValue = rawValue.replace(/\D/g, "").slice(0, 12);
    } else if (field === "mobileNumber") {
      nextValue = rawValue.replace(/\D/g, "").slice(0, 10);
    } else if (field === "pincode") {
      nextValue = rawValue.replace(/\D/g, "").slice(0, 6);
    } else if (field === "age") {
      nextValue = rawValue.replace(/[^\d]/g, "").slice(0, 3);
    }

    const nextForm = { ...registerForm, [field]: nextValue };
    if (field === "state") {
      nextForm.mpDistrict = lookupCitizenMp(nextValue);
    }
    setRegisterForm(nextForm);
    setRegisterErrors(validateCitizenRegistration(nextForm));
    setRegisterTouched((current) => ({ ...current, [field]: true }));

    if (registerSubmitError) {
      setRegisterSubmitError("");
    }
  }

  function resetCitizenRegistrationState() {
    setRegisterForm({
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      aadhaarNumber: "",
      age: "",
      sex: "",
      mobileNumber: "",
      pincode: "",
      city: "",
      state: "",
      mpDistrict: "",
      password: "",
      confirmPassword: "",
    });
    setRegisterErrors({});
    setRegisterTouched({});
    setRegisterSubmitted(false);
    setRegisterSubmitError("");
  }

  function handleCitizenNav(sectionId) {
    navigate(PATHS.login, { replace: false });
    window.requestAnimationFrame(() => scrollToSection(sectionId));
  }

  function nextServiceSlide() {
    setServiceSlideIndex((current) => (current + 1) % SERVICE_IMAGES.length);
  }

  function previousServiceSlide() {
    setServiceSlideIndex((current) => (current - 1 + SERVICE_IMAGES.length) % SERVICE_IMAGES.length);
  }

  const isCitizenRegistration = role === "citizen" && citizenMode === "register";
  const getRegisterFieldError = (field) => ((registerSubmitted || registerTouched[field]) ? registerErrors[field] || "" : "");
  const shouldHighlightRegisterField = (field) => {
    const errorMessage = getRegisterFieldError(field);
    return Boolean(errorMessage) && errorMessage !== REQUIRED_FIELD_MESSAGE;
  };
  const cardStyle = {
    width: "100%",
    maxWidth: showCitizenLanding ? (isTablet ? "100%" : 390) : isCitizenRegistration ? (isTablet ? "100%" : "60vw") : 460,
    minHeight: showCitizenLanding ? (isTablet ? 370 : 600) : showOperatorPortal ? 580 : "auto",
    height: showOperatorPortal ? 580 : isCitizenRegistration ? "90vh" : "auto",
    background: showCitizenLanding && theme === "light" ? "#E6D6F8" : C.card,
    border: `1px solid ${showCitizenLanding && theme === "light" ? "#D1BAE8" : C.border}`,
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: showCitizenLanding ? 14 : 0,
    boxShadow: `0 24px 60px ${theme === "dark" ? "rgba(0,0,0,0.26)" : "rgba(23,23,23,0.08)"}`,
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
          fontFamily: "var(--portal-citizen-font, 'Lora', Georgia, 'Times New Roman', serif)",
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
          <section id="home" style={{ padding: "80px 12px 32px" }}>
            <div style={{ maxWidth: 1320, margin: "0 auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isTablet ? "1fr" : "minmax(0, 1.9fr) minmax(320px, 390px)",
                  gap: isTablet ? 20 : 20,
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
                    borderRadius: 24,
                    border: "none",
                    background: heroPanelBackground,
                    overflow: "hidden",
                    position: "relative",
                    order: isTablet ? 2 : 1,
                    minHeight: isTablet ? 370 : 600,
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                    <img
                      src="/minister-bg.jpg"
                      alt="Incredible India - Gajendra Singh Shekhawat"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: isMobile ? "contain" : "cover",
                        objectPosition: isMobile ? "center center" : "left 62%",
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

          <PortalSection
            id="about"
            C={C}
            title="About Us"
            titleColor={theme === "light" ? CITIZEN_HERO_PURPLE : undefined}
          >
            <div style={{ display: "grid", gap: 18 }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.85, color: C.t2 }}>
                The Ministry of Tourism, is the nodal agency for the formulation of national policies and programs and for the co-ordination of activities of various Central Government Agencies, State Governments/UTs and the Private Sector for the development and promotion of tourism in the country. The Ministry is headed by the Union Minister for Tourism and Ministers of State.
              </p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.85, color: C.t2 }}>
                The administrative head of the Ministry is the Secretary (Tourism). The office of the Director General of Tourism provides executive directions for the implementation of various policies and programs. Directorate General of Tourism has a field formation of 20 offices within the country and one sub-ordinate office/project i.e. Indian Institute of Skiing and Mountaineering (IISM)/ Gulmarg Winter Sports Project. The field offices in India are responsible for providing information service to tourists and to monitor the progress of field projects. The activities of IISM/GWSP have now been revived and various Ski and other courses are being conducted in the J&K valley.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTablet ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 22,
                marginTop: 28,
              }}
            >
              {ABOUT_FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  style={{
                    borderRadius: 22,
                    height: "100%",
                    overflow: "hidden",
                    display: "grid",
                    gridTemplateRows: `${isMobile ? 220 : 260}px 1fr`,
                  }}
                >
                  <img
                    src={feature.image}
                    alt={feature.title}
                    style={{
                      display: "block",
                      width: "100%",
                      height: isMobile ? 220 : 260,
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      padding: 20,
                      background: theme === "light" ? "#E6D6F8" : C.bgElevated,
                      height: "100%",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.25, fontWeight: 700, color: C.t1 }}>{feature.title}</h3>
                    <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.8, color: C.t2 }}>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </PortalSection>

          <PortalSection
            id="services"
            C={C}
            title="Services"
            titleColor={theme === "light" ? CITIZEN_HERO_PURPLE : undefined}
          >
            <div
              style={{
                display: "grid",
                gap: 20,
              }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.3, fontWeight: 700, color: C.t1 }}>Meeting Requests</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.9, color: C.t2 }}>
                  The meeting request service is designed to help citizens connect with ministers through an organized and official digital process. Instead of depending only on manual communication, repeated follow-up, or physical visits to different offices, citizens can log in to the portal and raise a meeting request directly from a structured interface. The workflow guides users to submit the necessary information in a clear format so that the request can be reviewed properly by the concerned authority. This makes the process more systematic and reduces confusion for citizens who want to approach the ministry for genuine matters that require discussion, representation, or clarification.
                </p>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.9, color: C.t2 }}>
                  Once a meeting request is submitted, the portal helps citizens track the request from one stage to the next. Users can return to the portal and review whether the request is under review, accepted, rescheduled, pending additional action, or closed. This tracking ability is important because it gives citizens visibility into the progress of their request without requiring them to repeatedly contact offices for updates. The portal therefore acts not only as a submission platform, but also as a communication channel that supports accountability, clarity, and confidence throughout the request lifecycle.
                </p>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.3, fontWeight: 700, color: C.t1 }}>Submit Complaints</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.9, color: C.t2 }}>
                  The complaint service gives citizens a formal way to raise concerns, report issues, and submit grievances through the same portal. This service is useful for people who need to bring service-related matters, local issues, administrative concerns, or public-facing problems to the attention of the responsible system. Citizens can enter complaint details in the portal, provide supporting information, and use a structured workflow that makes the complaint easier to record, review, and route appropriately. Compared with fragmented or offline processes, this approach creates a single place where complaints can be managed more consistently and transparently.
                </p>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.9, color: C.t2 }}>
                  After a complaint is submitted, the citizen can monitor its progress through the portal in the same way as a meeting request. This means the user can see whether the complaint is pending, in progress, resolved, or needs more clarification. The ability to track complaint status online improves trust in the process because citizens are not left uncertain about what happened after submission. Together, the meeting request and complaint services make this website a practical citizen interface for official communication. The portal improves access, saves time, supports better follow-up, and provides a more transparent experience for people who want to engage with the government through clear digital workflows.
                </p>
              </div>
              <img
                src={servicesSectionArt}
                alt="Citizen services"
                style={{
                  display: "block",
                  width: "94%",
                  height: "auto",
                  margin: "0 auto",
                  borderRadius: 16,
                }}
              />
            </div>
          </PortalSection>

          <PortalSection
            id="media"
            C={C}
            title="Media"
            titleColor={theme === "light" ? CITIZEN_HERO_PURPLE : undefined}
          >
            {(() => {
              const visibleServices = Array.from({ length: isMobile ? 1 : 3 }, (_, index) => SERVICE_IMAGES[(serviceSlideIndex + index) % SERVICE_IMAGES.length]);

              return (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "68px minmax(0, 1fr) 68px",
                      alignItems: "center",
                      gap: 22,
                    }}
                  >
                    {!isMobile ? <CarouselArrow C={C} direction="left" onClick={previousServiceSlide} /> : null}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                        gap: 22,
                      }}
                    >
                      {visibleServices.map((item, index) => (
                        <article
                          key={`${serviceSlideIndex}-${index}-${item.title}`}
                          style={{
                            width: "100%",
                            height: isMobile ? 220 : isTablet ? 260 : 390,
                            borderRadius: 18,
                            overflow: "hidden",
                            background: C.bgElevated,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            style={{
                              display: "block",
                              width: "100%",
                              height: "100%",
                              objectFit: isTablet ? "contain" : "cover",
                            }}
                          />
                        </article>
                      ))}
                    </div>
                    {!isMobile ? <CarouselArrow C={C} direction="right" onClick={nextServiceSlide} /> : null}
                  </div>

                  {isMobile ? (
                    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 18 }}>
                      <CarouselArrow C={C} direction="left" onClick={previousServiceSlide} />
                      <CarouselArrow C={C} direction="right" onClick={nextServiceSlide} />
                    </div>
                  ) : null}

                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18 }}>
                    {SERVICE_IMAGES.map((_, index) => (
                      <span
                        key={index}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: index === serviceSlideIndex ? C.purple : C.border,
                        }}
                      />
                    ))}
                  </div>

                  <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 15, lineHeight: 1.8, color: C.t2 }}>
                    Explore tourism highlights and ministerial outreach through this rotating media gallery.
                  </p>
                </>
              );
            })()}
          </PortalSection>

          <PortalSection
            id="contact"
            C={C}
            title="Contact Us"
            titleColor={theme === "light" ? CITIZEN_HERO_PURPLE : undefined}
          >
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
                <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
                  <ContactField C={C} theme={theme} icon={<Users size={18} />} label="Department" value="Ministry of Tourism" />
                  <ContactField C={C} theme={theme} icon={<Building2 size={18} />} label="Office" value="1st Floor, Transport Bhawan" />
                  <ContactField C={C} theme={theme} icon={<MapPin size={18} />} label="Address" value="1, Parliament Street, New Delhi - 110001" />
                  <ContactField C={C} theme={theme} icon={<Phone size={18} />} label="Directory" value="See the Ministry telephone directory on the official Contact Us page." />
                </div>
              </div>

              <div
                style={{
                  borderRadius: 24,
                  border: `1px solid ${C.border}`,
                  background: heroPanelBackground,
                  padding: 0,
                  display: "grid",
                  gap: 0,
                  alignContent: "start",
                }}
              >
                <div
                  style={{
                    borderRadius: "24px 24px 0 0",
                    overflow: "hidden",
                    borderBottom: `1px solid ${C.border}`,
                    background: C.card,
                  }}
                >
                  <iframe
                    title="Ministry of Tourism Location Map"
                    src="https://maps.google.com/maps?q=Transport%20Bhawan%201%20Parliament%20Street%20New%20Delhi%20110001&z=15&output=embed"
                    style={{
                      display: "block",
                      width: "100%",
                      height: isTablet ? 280 : 360,
                      border: 0,
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div style={{ padding: "16px 24px 24px" }}>
                  <ContactMiniCard
                    C={C}
                    theme={theme}
                    icon={<MapPin size={18} color={theme === "light" ? CITIZEN_HERO_PURPLE : C.purple} />}
                    title="Location"
                    detail="Official ministry office"
                    value="Transport Bhawan, 1 Parliament Street, New Delhi - 110001"
                  />
                </div>
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
        fontFamily: "var(--portal-citizen-font, 'Lora', Georgia, 'Times New Roman', serif)",
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
          transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (theme === "light") {
            e.currentTarget.style.background = CITIZEN_HERO_PURPLE;
            e.currentTarget.style.color = "#FFFFFF";
            e.currentTarget.style.borderColor = CITIZEN_HERO_PURPLE;
          }
        }}
        onMouseLeave={(e) => {
          if (theme === "light") {
            e.currentTarget.style.background = C.bgElevated;
            e.currentTarget.style.color = C.t2;
            e.currentTarget.style.borderColor = C.border;
          }
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
        <div
          style={{
            padding: role === "citizen" && citizenMode === "register" ? "10px 18px" : showCitizenLanding ? "24px 24px 18px" : "28px 28px 24px",
            background: role === "citizen" && citizenMode === "register" ? (theme === "dark" ? C.purple : CITIZEN_HERO_PURPLE) : showCitizenHeaderAccent ? citizenLightLoginAccent : C.bgElevated,
            borderBottom: `1px solid ${role === "citizen" && citizenMode === "register" ? (theme === "dark" ? C.purple : CITIZEN_HERO_PURPLE) : showCitizenHeaderAccent ? citizenLightLoginAccent : C.border}`,
          }}
        >
          {role === "citizen" && citizenMode === "register" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 10,
                color: "#FFFFFF",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifySelf: "start" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={NATIONAL_EMBLEM_SRC}
                    alt="National Emblem"
                    style={{ height: 22, width: "auto", filter: "brightness(0) invert(1)" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "#FFFFFF",
                    whiteSpace: "nowrap",
                    fontSize: isMobile ? 8 : 9,
                  }}
                >
                  HCM Project
                </div>
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: "#FFFFFF",
                  textAlign: "center",
                  justifySelf: "center",
                  whiteSpace: "nowrap",
                  fontSize: isMobile ? 15 : 19,
                }}
              >
                Citizen Registration
              </h2>
              <div />
            </div>
          ) : null}
          {!(role === "citizen" && citizenMode === "register") ? (
            <>
              {showCitizenHeaderEmblem || showOperatorPortal ? (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: showCitizenHeaderAccent ? "rgba(255,255,255,0.12)" : showOperatorPortal ? C.bgElevated : C.purpleDim,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: showCitizenLanding ? 14 : showOperatorPortal ? 10 : 18,
                  }}
                >
                  {showCitizenHeaderAccent ? (
                    <img
                      src={NATIONAL_EMBLEM_SRC}
                      alt="National Emblem"
                      style={{ height: 32, width: "auto", filter: "brightness(0) invert(1)" }}
                    />
                  ) : (
                    showCitizenHeaderEmblem || showOperatorPortal ? (
                      <img
                        src={NATIONAL_EMBLEM_SRC}
                        alt="National Emblem"
                        style={{ height: 32, width: "auto", filter: theme === "dark" ? "brightness(0) invert(1)" : "brightness(0)" }}
                      />
                    ) : (
                      <Shield size={28} color={C.purple} />
                    )
                  )}
                </div>
              ) : null}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 26,
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: showCitizenHeaderAccent ? "rgba(255,255,255,0.78)" : C.t3,
                  textTransform: "uppercase",
                  letterSpacing: ".18em",
                }}
              >
                HCM Project
              </div>
              <h2 style={{ margin: "8px 0 2px", fontSize: 24, fontWeight: 700, lineHeight: 1.25, color: showCitizenHeaderAccent ? "#FFFFFF" : C.t1 }}>{registerModeTitle}</h2>
            </>
          ) : null}
          {!(role === "citizen" && citizenMode === "register") && roleCopy.subtitle ? (
            <p style={{ margin: 0, color: showCitizenHeaderAccent ? "rgba(255,255,255,0.82)" : C.t2, fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>
              {roleCopy.subtitle}
            </p>
          ) : null}
        </div>

        <div style={{ padding: showCitizenLanding ? "20px 24px 14px" : role === "citizen" && citizenMode === "register" ? "12px 18px 14px" : 28, display: "grid", alignContent: showCitizenLanding ? "start" : "stretch", rowGap: showCitizenLanding ? 10 : 0, background: role === "citizen" && citizenMode === "register" ? (theme === "light" ? "#E6D6F8" : C.card) : "transparent" }}>
          <div style={{ minHeight: showCitizenLanding ? 64 : showOperatorPortal ? 72 : 0 }}>
            {success && <MessageBox color={C.mint} bg={C.mintDim} icon={<CheckCircle size={18} />} message={success} />}
            {error && <MessageBox color={C.danger} bg={`${C.danger}20`} icon={<AlertCircle size={18} />} message={error} onClose={() => setError("")} />}
          </div>

          {(
            (role === "citizen" && citizenMode === "login") ||
            role === "admin" ||
            role === "deo" ||
            (!showCitizenActions && !showAdminActions)
          ) ? (
            <form onSubmit={handlePrimaryLogin} style={{ display: "grid", gap: 12 }}>
              <Field label={roleCopy.identifierLabel} icon={<Mail size={16} color={C.t3} />} error={citizenLoginErrors.identifier}>
                <input
                  type="text"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  maxLength={role === "citizen" ? CITIZEN_LOGIN_ID_MAX_LENGTH : OPERATOR_LOGIN_IDENTIFIER_MAX_LENGTH}
                  required
                  placeholder={roleCopy.identifierPlaceholder}
                  style={fieldStyle(C)}
                />
              </Field>

              <Field label="Password" icon={<Lock size={16} color={C.t3} />} error={citizenLoginErrors.password}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  maxLength={role === "citizen" ? CITIZEN_LOGIN_PASSWORD_MAX_LENGTH : OPERATOR_LOGIN_PASSWORD_MAX_LENGTH}
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
                  marginTop: 0,
                  width: "100%",
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: citizenLightLoginAccent,
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
                    marginTop: 26,
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
                      resetCitizenRegistrationState();
                      setCitizenMode("register");
                      setError("");
                      setSuccess("");
                    }}
                    style={footerLinkStyle(C, citizenLightLoginAccent)}
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
                    style={footerLinkStyle(C, citizenLightLoginAccent)}
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
            <form onSubmit={handleCitizenRegister} noValidate style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <Field label="First Name" icon={null} required error={getRegisterFieldError("firstName")} compact>
                  <input maxLength={CITIZEN_NAME_MAX_LENGTH} value={registerForm.firstName} onChange={(event) => handleRegisterFieldChange("firstName", event.target.value)} placeholder="First name" style={fieldStyle(C, false, false, shouldHighlightRegisterField("firstName"), true)} />
                </Field>
                <Field label="Middle Name" icon={null} error={getRegisterFieldError("middleName")} compact>
                  <input maxLength={CITIZEN_NAME_MAX_LENGTH} value={registerForm.middleName} onChange={(event) => handleRegisterFieldChange("middleName", event.target.value)} placeholder="Middle name" style={fieldStyle(C, false, false, shouldHighlightRegisterField("middleName"), true)} />
                </Field>
                <Field label="Last Name" icon={null} required error={getRegisterFieldError("lastName")} compact>
                  <input maxLength={CITIZEN_NAME_MAX_LENGTH} value={registerForm.lastName} onChange={(event) => handleRegisterFieldChange("lastName", event.target.value)} placeholder="Last name" style={fieldStyle(C, false, false, shouldHighlightRegisterField("lastName"), true)} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <Field label="Sex" icon={<Users size={16} color={C.t3} />} required error={getRegisterFieldError("sex")} compact>
                  <select value={registerForm.sex} onChange={(event) => handleRegisterFieldChange("sex", event.target.value)} style={fieldStyle(C, true, false, shouldHighlightRegisterField("sex"), true)}>
                    <option value="">Select sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Age" icon={null} required error={getRegisterFieldError("age")} compact>
                  <input value={registerForm.age} onChange={(event) => handleRegisterFieldChange("age", event.target.value)} inputMode="numeric" placeholder="Age" style={fieldStyle(C, false, false, shouldHighlightRegisterField("age"), true)} />
                </Field>
                <Field label="Email" icon={<Mail size={16} color={C.t3} />} required error={getRegisterFieldError("email")} compact>
                  <input type="email" value={registerForm.email} onChange={(event) => handleRegisterFieldChange("email", event.target.value)} placeholder="Email address" style={fieldStyle(C, true, false, shouldHighlightRegisterField("email"), true)} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <Field label="Aadhaar Number" icon={<Shield size={16} color={C.t3} />} required error={getRegisterFieldError("aadhaarNumber")} compact>
                  <input value={registerForm.aadhaarNumber} onChange={(event) => handleRegisterFieldChange("aadhaarNumber", event.target.value)} placeholder="12-digit Aadhaar number" style={fieldStyle(C, true, false, shouldHighlightRegisterField("aadhaarNumber"), true)} />
                </Field>
                <Field label="Mobile Number" icon={<Phone size={16} color={C.t3} />} required error={getRegisterFieldError("mobileNumber")} compact>
                  <input value={registerForm.mobileNumber} onChange={(event) => handleRegisterFieldChange("mobileNumber", event.target.value)} placeholder="Mobile number" style={fieldStyle(C, true, false, shouldHighlightRegisterField("mobileNumber"), true)} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                <Field label="Pincode" icon={<MapPin size={16} color={C.t3} />} required error={getRegisterFieldError("pincode")} compact>
                  <input value={registerForm.pincode} onChange={(event) => handleRegisterFieldChange("pincode", event.target.value)} placeholder="Pincode" style={fieldStyle(C, true, false, shouldHighlightRegisterField("pincode"), true)} />
                </Field>
                <Field label="City" icon={<Building2 size={16} color={C.t3} />} required error={getRegisterFieldError("city")} compact>
                  <input value={registerForm.city} onChange={(event) => handleRegisterFieldChange("city", event.target.value)} placeholder="City" style={fieldStyle(C, true, false, shouldHighlightRegisterField("city"), true)} />
                </Field>
                <Field label="State" icon={<Landmark size={16} color={C.t3} />} required error={getRegisterFieldError("state")} compact>
                  <input value={registerForm.state} onChange={(event) => handleRegisterFieldChange("state", event.target.value)} placeholder="State" style={fieldStyle(C, true, false, shouldHighlightRegisterField("state"), true)} />
                </Field>
                <Field label="MP of District" icon={<Landmark size={16} color={C.t3} />} compact>
                  <input value={registerForm.mpDistrict} readOnly placeholder="MP of District" style={fieldStyle(C, true, false, false, true)} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <Field label="Password" icon={<Lock size={16} color={C.t3} />} required error={getRegisterFieldError("password")} compact>
                  <input type="password" maxLength={CITIZEN_REGISTER_PASSWORD_MAX_LENGTH} value={registerForm.password} onChange={(event) => handleRegisterFieldChange("password", event.target.value)} placeholder="Password" style={fieldStyle(C, true, false, shouldHighlightRegisterField("password"), true)} />
                </Field>
                <Field label="Confirm Password" icon={<Lock size={16} color={C.t3} />} required error={getRegisterFieldError("confirmPassword")} compact>
                  <input type="password" maxLength={CITIZEN_REGISTER_PASSWORD_MAX_LENGTH} value={registerForm.confirmPassword} onChange={(event) => handleRegisterFieldChange("confirmPassword", event.target.value)} placeholder="Confirm password" style={fieldStyle(C, true, false, shouldHighlightRegisterField("confirmPassword"), true)} />
                </Field>
              </div>

              {registerSubmitError ? <MessageBox color={C.danger} bg={`${C.danger}20`} icon={<AlertCircle size={18} />} message={registerSubmitError} /> : null}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={outlineCitizenActionButtonStyle(C)}
                  onMouseEnter={(e) => applyCitizenActionHoverState(e.currentTarget, true, theme === "dark" ? C.purple : CITIZEN_HERO_PURPLE)}
                  onMouseLeave={(e) => applyCitizenActionHoverState(e.currentTarget, false, theme === "dark" ? C.purple : CITIZEN_HERO_PURPLE)}
                >
                  {loading ? "Submitting..." : "Create Citizen Account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetCitizenRegistrationState();
                    setCitizenMode("login");
                  }}
                  style={outlineCitizenActionButtonStyle(C)}
                  onMouseEnter={(e) => applyCitizenActionHoverState(e.currentTarget, true, theme === "dark" ? C.purple : CITIZEN_HERO_PURPLE)}
                  onMouseLeave={(e) => applyCitizenActionHoverState(e.currentTarget, false, theme === "dark" ? C.purple : CITIZEN_HERO_PURPLE)}
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : role === "citizen" && citizenMode === "verify" ? (
            <form onSubmit={handleCitizenVerification} style={{ display: "grid", gap: 18 }}>
              <Field label="Email OTP" icon={<Shield size={16} color={C.t3} />}>
                <input value={verificationOtp} onChange={(event) => setVerificationOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required placeholder="Enter 6-digit OTP" style={fieldStyle(C)} />
              </Field>
              <button type="submit" disabled={loading} style={primaryButtonStyle(C)}>
                {loading ? "Verifying..." : "Verify Registration"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetCitizenRegistrationState();
                  setCitizenMode("login");
                }}
                style={secondaryButtonStyle(C)}
              >
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
  const [hoveredSection, setHoveredSection] = useState(null);
  const activeNavAccent = CITIZEN_HERO_PURPLE;
  const navActiveBackground = theme === "dark" ? C.purple : activeNavAccent;
  const navActiveText = "#FFFFFF";
  const navHoverShadow = theme === "dark"
    ? `0 12px 24px ${C.purple}40, inset 0 1px 0 rgba(255,255,255,0.12), 0 0 16px ${C.purple}55`
    : "none";
  const lightNavGlow = `0 0 16px ${activeNavAccent}55`;
  const navActiveGlow = theme === "dark" ? `0 0 16px ${C.purple}88` : "none";

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
          width: "100%",
          minHeight: 55,
          padding: "0 32px",
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
          <img 
            src={NATIONAL_EMBLEM_SRC} 
            alt="National Emblem" 
            style={{ height: 38, width: 'auto', filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)' }} 
          />
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
              const isHovered = hoveredSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onNavigate(section.id)}
                  onMouseEnter={() => setHoveredSection(section.id)}
                  onMouseLeave={() => setHoveredSection(null)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "1px solid transparent",
                    background: theme === "dark" ? (isHovered ? navActiveBackground : "transparent") : active ? activeNavAccent : "transparent",
                    color: theme === "dark" ? (active ? C.purple : isHovered ? navActiveText : C.t2) : active ? navActiveText : C.t2,
                    textShadow: active && theme === "dark" ? navActiveGlow : "none",
                    boxShadow: theme === "light" ? (active ? lightNavGlow : "none") : isHovered ? navHoverShadow : "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
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
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: C.t2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.background = theme === "light" ? CITIZEN_HERO_PURPLE : C.purple; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.t2; e.currentTarget.style.background = "transparent"; }}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
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
              border: `1px solid ${theme === "dark" ? C.border : "transparent"}`,
              background: theme === "dark" ? C.bgElevated : activeSection === section.id ? activeNavAccent : C.bgElevated,
              color: theme === "dark" ? (activeSection === section.id ? C.purple : C.t2) : activeSection === section.id ? navActiveText : C.t2,
              textShadow: activeSection === section.id && theme === "dark" ? navActiveGlow : "none",
              boxShadow: theme === "light" && activeSection === section.id ? lightNavGlow : "none",
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

function PortalSection({ id, C, title, subtitle, children, titleColor }) {
  return (
    <section id={id} style={{ padding: "0 12px 64px", scrollMarginTop: 108 }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div style={{ maxWidth: 720, marginBottom: 28 }}>
          <h2 style={{ marginTop: 12, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", lineHeight: 1.12, fontWeight: 700, color: titleColor || C.t1 }}>{title}</h2>
          {subtitle ? <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.8, color: C.t2 }}>{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoCard({ C, theme, image, icon: Icon, title, description, compact = false }) {
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
      {image ? (
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
      ) : null}
      <div style={{ padding: compact ? 18 : 20 }}>
        {!image && Icon ? (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(124,58,237,0.08)",
              border: `1px solid ${C.border}`,
              marginBottom: 14,
            }}
          >
            <Icon size={20} color={C.purple} />
          </div>
        ) : null}
        <h3 style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 700, color: C.t1 }}>{title}</h3>
        <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.75, color: C.t2 }}>{description}</p>
      </div>
    </article>
  );
}

function CarouselArrow({ C, direction, onClick }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Previous slide" : "Next slide"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        border: `1px solid ${hovered || C.name === "dark" ? `${C.purple}88` : C.border}`,
        background: hovered
          ? `linear-gradient(180deg, ${C.purple} 0%, ${CITIZEN_HERO_PURPLE} 100%)`
          : C.name === "dark"
            ? C.purple
            : C.bgElevated,
        color: hovered || C.name === "dark" ? "#FFFFFF" : C.t2,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transform: pressed ? "translateY(1px) scale(0.98)" : hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 14px 30px ${C.purple}55, inset 0 1px 0 rgba(255,255,255,0.3), 0 0 18px ${C.purple}66`
          : C.name === "dark"
            ? `0 12px 26px ${C.purple}35, inset 0 1px 0 rgba(255,255,255,0.18)`
            : `0 8px 18px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08)`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
      }}
    >
      <Icon size={18} />
    </button>
  );
}

function ContactField({ C, theme, icon, label, value }) {
  const accentColor = theme === "light" ? CITIZEN_HERO_PURPLE : C.purple;
  const accentBackground = theme === "light" ? "rgba(46, 35, 95, 0.08)" : C.purpleDim;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px minmax(0, 1fr)",
        gap: 14,
        alignItems: "start",
        padding: "8px 0",
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
          background: accentBackground,
          color: accentColor,
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

function ContactMiniCard({ C, theme, icon, title, detail, value }) {
  const accentBackground = theme === "light" ? "rgba(46, 35, 95, 0.08)" : C.purpleDim;

  return (
    <div
      style={{
        padding: "4px 0 0",
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
            background: accentBackground,
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

function Field({ label, icon, error = "", required = false, compact = false, children }) {
  const { C } = usePortalTheme();

  return (
    <label style={{ display: "grid", gap: compact ? 16 : 4 }}>
      <span style={{ fontSize: 11, fontWeight: 500, lineHeight: compact ? 1.2 : 1.35, color: C.t2 }}>
        {label}
        {required ? <span style={{ color: C.danger, marginLeft: 2 }}>*</span> : null}
      </span>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          {icon}
        </div>
        {children}
      </div>
      <span
        style={{
          minHeight: compact ? 10 : 14,
          fontSize: 11,
          lineHeight: compact ? 1.15 : 1.3,
          color: C.danger,
          visibility: error ? "visible" : "hidden",
        }}
      >
        {error || " "}
      </span>
    </label>
  );
}

function MessageBox({ color, bg, icon, message, onClose }) {
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
      <div style={{ flex: 1 }}>{message}</div>
      {onClose ? (
        <button
          type="button"
          aria-label="Close message"
          onClick={onClose}
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: 999,
            border: "none",
            background: "transparent",
            color,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <X size={14} />
        </button>
      ) : null}
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

function footerLinkStyle(C, color = C.purple) {
  return {
    background: "transparent",
    border: "none",
    color,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  };
}

function outlineCitizenActionButtonStyle(C) {
  return {
    width: "100%",
    minHeight: 40,
    padding: "10px 18px",
    borderRadius: 10,
    border: `1px solid ${C.purple}`,
    background: "transparent",
    color: C.purple,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.5,
    cursor: "pointer",
    transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease",
  };
}

function applyCitizenActionHoverState(element, hovered, color) {
  element.style.background = hovered ? color : "transparent";
  element.style.color = hovered ? "#FFFFFF" : color;
  element.style.borderColor = color;
}

function lookupCitizenMp(state) {
  const normalizedState = state.trim();
  if (!normalizedState) {
    return "";
  }

  const mpMap = {
    Delhi: "New Delhi Constituency MP",
    Maharashtra: "Maharashtra Regional MP",
    Karnataka: "Karnataka Regional MP",
    "Tamil Nadu": "Tamil Nadu Regional MP",
  };

  return mpMap[normalizedState] || `${normalizedState} Regional MP`;
}

function extractErrorMessage(error, fallback) {
  return toSafeUserMessage(error, fallback);
}

const REQUIRED_FIELD_MESSAGE = "This field is required";
const PASSWORD_MISMATCH_MESSAGE = "Both password fields need to be same.";

function validateCitizenRegistration(form) {
  return {
    firstName: validateCitizenName(form.firstName, true),
    middleName: validateCitizenName(form.middleName, false),
    lastName: validateCitizenName(form.lastName, true),
    sex: form.sex ? "" : REQUIRED_FIELD_MESSAGE,
    age: validateAge(form.age),
    email: validateEmail(form.email),
    aadhaarNumber: validateAadhaar(form.aadhaarNumber),
    mobileNumber: validateMobileNumber(form.mobileNumber),
    pincode: validatePincode(form.pincode),
    city: validateLocationName(form.city),
    state: validateLocationName(form.state),
    password: validatePasswordField(form.password),
    confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
  };
}

function validatePassword(password, confirmPassword) {
  const passwordError = validatePasswordField(password);
  if (passwordError) return passwordError;
  return validateConfirmPassword(password, confirmPassword);
}

function getCitizenLoginErrors(identifier, password) {
  return {
    identifier: getCitizenIdLengthError(identifier),
    password: getCitizenPasswordLengthError(password),
  };
}

function getCitizenIdLengthError(value) {
  if (value.length >= CITIZEN_LOGIN_ID_MAX_LENGTH) {
    return "Maximum length reached";
  }

  return "";
}

function getCitizenPasswordLengthError(value) {
  if (value.length >= CITIZEN_LOGIN_PASSWORD_MAX_LENGTH) {
    return "Maximum length reached";
  }

  return "";
}

function getOperatorIdentifierLengthError(value) {
  if (value.length >= OPERATOR_LOGIN_IDENTIFIER_MAX_LENGTH) {
    return "Maximum length reached";
  }

  return "";
}

function getOperatorPasswordLengthError(value) {
  if (value.length >= OPERATOR_LOGIN_PASSWORD_MAX_LENGTH) {
    return "Maximum length reached";
  }

  return "";
}

function isTwelveDigitAadhaar(aadhaarNumber) {
  return /^\d{12}$/.test(aadhaarNumber);
}

function validateCitizenName(value, required) {
  const trimmedValue = value.trim();

  if (required && !trimmedValue) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (trimmedValue.length >= CITIZEN_NAME_MAX_LENGTH) {
    return "Maximum length reached";
  }

  return "";
}

function validateAge(value) {
  if (!value) {
    return REQUIRED_FIELD_MESSAGE;
  }

  const numericAge = Number(value);
  if (!Number.isInteger(numericAge) || numericAge <= 10 || numericAge >= 200) {
    return "Put valid age";
  }

  return "";
}

function validateEmail(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
    return "Enter a valid email address";
  }

  return "";
}

function validateAadhaar(value) {
  if (!value) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (!isTwelveDigitAadhaar(value)) {
    return "Enter a valid 12-digit Aadhaar number";
  }

  return "";
}

function validateMobileNumber(value) {
  if (!value) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (!/^\d{10}$/.test(value)) {
    return "Enter a valid 10-digit mobile number";
  }

  return "";
}

function validatePincode(value) {
  if (!value) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (!/^\d{6}$/.test(value)) {
    return "Enter a valid 6-digit pincode";
  }

  return "";
}

function validateLocationName(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (!/^[A-Za-z][A-Za-z\s.-]*$/.test(trimmedValue)) {
    return "Enter a valid value";
  }

  return "";
}

function validatePasswordField(password) {
  if (!password) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (password.length >= CITIZEN_REGISTER_PASSWORD_MAX_LENGTH) {
    return "Maximum length reached";
  }

  if (password.length < 12) {
    return "Password must be at least 12 characters long";
  }

  if (!/[A-Za-z]/.test(password)) {
    return "Password must contain at least one alphabet";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return "";
}

function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return REQUIRED_FIELD_MESSAGE;
  }

  if (confirmPassword.length >= CITIZEN_REGISTER_PASSWORD_MAX_LENGTH) {
    return "Maximum length reached";
  }

  if (password !== confirmPassword) {
    return PASSWORD_MISMATCH_MESSAGE;
  }

  return "";
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
