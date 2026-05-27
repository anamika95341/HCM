import { useEffect, useRef, useState } from "react";
import { FiBell, FiLogOut, FiMoon, FiSettings, FiSun, FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePortalTheme } from "../theme/portalTheme.jsx";
import { PATHS } from "../../routes/paths.js";
import { sanitizeImageSrc } from "../security/url.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNotifications } from "../notifications/NotificationContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const WORKSPACE_TITLE_KEYS = [
  { match: "/citizen/", key: "header.citizenServices" },
  { match: "/masteradmin/", key: "header.masterAdmin" },
  { match: "/admin/", key: "header.adminWorkspace" },
  { match: "/Minister/", key: "header.ministerPortal" },
  { match: "/DEO/", key: "header.deoWorkspace" },
  { match: "/settings", key: "header.settings" },
];



const Header = () => {
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { C, theme, toggleTheme } = usePortalTheme();
  const { session, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const useCitizenNavUi = session?.role === "citizen" || session?.role === "admin";

  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const currentUser = {
    name: session?.user?.firstName || session?.user?.username || "Portal User",
    role: session?.role || "visitor",
    email: session?.user?.email || "",
    avatar: null,
  };

  const safeAvatar = sanitizeImageSrc(currentUser.avatar);
  const workspaceTitleKey = WORKSPACE_TITLE_KEYS.find((item) => location.pathname.startsWith(item.match))?.key;
  const workspaceTitle = workspaceTitleKey ? t(workspaceTitleKey) : t("header.unifiedPortal");

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const userInitial = currentUser.name.charAt(0).toUpperCase();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        background: C.bgElevated,
        borderBottom: `1px solid ${C.border}`,
        padding: "24px 32px",
        height:55,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 30,
        fontFamily: useCitizenNavUi ? "var(--portal-citizen-font)" : "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexWrap: "wrap" }}>
        
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }} ref={ref}>
        <LanguageToggle language={language} onToggle={toggleLanguage} C={C} isCitizen={useCitizenNavUi} />
        <HeaderIcon
          icon={theme === "dark" ? FiSun : FiMoon}
          onClick={toggleTheme}
          title={theme === "dark" ? t("header.switchToLight") : t("header.switchToDark")}
          isCitizen={useCitizenNavUi}
        />
        <HeaderIcon
          icon={FiBell}
          dot={unreadCount > 0}
          onClick={() => {
            setOpen(false);
            setNotificationsOpen((value) => !value);
          }}
          title={t("header.notifications")}
          isCitizen={useCitizenNavUi}
        />

        <button
          type="button"
          onClick={() => {
            setNotificationsOpen(false);
            setOpen((value) => !value);
          }}
          title="User Menu"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            cursor: "pointer",
            border: "none",
            overflow: "hidden",
            background: C.purple,
            color: "#FFFFFF",
            transition: "background var(--portal-duration-fast) ease, border-color var(--portal-duration-fast) ease, transform var(--portal-duration-fast) ease",
            flexShrink: 0,
          }}
        >
          {safeAvatar ? (
            <img
              src={safeAvatar}
              alt="User Avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: C.purple,
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: useCitizenNavUi ? "var(--portal-citizen-font)" : "inherit",
              }}
            >
              {userInitial}
            </div>
          )}
        </button>

        {notificationsOpen && (
          <div
            className="portal-floating portal-fade-slide"
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 48,
              width: 340,
              borderRadius: 12,
              zIndex: 50,
              overflow: "hidden",
              background: C.card,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: 16,
                borderBottom: `1px solid ${C.border}`,
                background: C.bgElevated,
              }}
            >
              <div>
                <p className={useCitizenNavUi ? "portal-citizen-value" : undefined} style={{ color: C.t1, fontWeight: 700, fontSize: useCitizenNavUi ? 14 : 13 }}>{t("header.notifications")}</p>
                <p className={useCitizenNavUi ? "portal-citizen-caption" : undefined} style={{ color: C.t3, fontSize: 12, marginTop: 2 }}>
                  {unreadCount > 0 ? t("header.unread", { count: unreadCount }) : t("header.allCaughtUp")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  markAllRead();
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: C.purple,
                  fontSize: useCitizenNavUi ? 12 : 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: useCitizenNavUi ? "var(--portal-citizen-font)" : "inherit",
                }}
              >
                {t("header.markAllRead")}
              </button>
            </div>

            <div style={{ maxHeight: 360, overflowY: "auto", padding: 8 }}>
              {notifications.length === 0 ? (
                <div className={useCitizenNavUi ? "portal-citizen-caption" : undefined} style={{ padding: 16, color: C.t3, fontSize: 12, textAlign: "center" }}>
                  {t("header.noNotifications")}
                </div>
              ) : (
                notifications.slice(0, 8).map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!item.isRead) {
                        markRead(item.id);
                      }
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom: index === Math.min(notifications.length, 8) - 1 ? "none" : `1px solid ${C.border}`,
                      background: "transparent",
                      borderRadius: 0,
                      padding: 12,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p className={useCitizenNavUi ? "portal-citizen-value" : undefined} style={{ color: C.t1, fontWeight: 700, fontSize: useCitizenNavUi ? 14 : 12 }}>{item.title}</p>
                        <p className={useCitizenNavUi ? "portal-citizen-caption" : undefined} style={{ color: C.t2, fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{item.body}</p>
                      </div>
                      {!item.isRead && (
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: C.danger, flexShrink: 0, marginTop: 4 }} />
                      )}
                    </div>
                    <p className={useCitizenNavUi ? "portal-citizen-caption" : undefined} style={{ color: C.t3, fontSize: 12, marginTop: 8 }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {open && (
          <div
            className="portal-floating portal-fade-slide"
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              width: 288,
              borderRadius: 12,
              zIndex: 50,
              overflow: "hidden",
              background: C.card,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 16,
                borderBottom: `1px solid ${C.border}`,
                background: C.bgElevated,
              }}
            >
              {safeAvatar ? (
                <img src={safeAvatar} alt="Avatar" style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover", border: `1px solid ${C.border}` }} />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 18,
                    background: C.purpleDim,
                    color: C.purple,
                    border: `1px solid ${C.border}`,
                    flexShrink: 0,
                    fontFamily: useCitizenNavUi ? "var(--portal-citizen-font)" : "inherit",
                  }}
                >
                  {userInitial}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <p className={useCitizenNavUi ? "portal-citizen-value" : undefined} style={{ color: C.t1, fontWeight: 700, fontSize: useCitizenNavUi ? 14 : 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser.name}
                </p>
             
                <p className={useCitizenNavUi ? "portal-citizen-caption" : undefined} style={{ color: C.t3, fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser.email}
                </p>
              </div>
            </div>

            <ul style={{ padding: "8px 0", margin: 0, listStyle: "none" }}>
              <MenuItem icon={FiUser} label={t("header.profileAccount")} onClick={() => { navigate(`${PATHS.settings}?tab=profile`); setOpen(false); }} />
              <MenuItem icon={FiSettings} label={t("header.notificationsMenu")} onClick={() => { navigate(`${PATHS.settings}?tab=notifications`); setOpen(false); }} />
              <MenuItem icon={FiLogOut} label={t("header.logout")} danger onClick={async () => { setOpen(false); await logout(); navigate(PATHS.login); }} />
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

const LanguageToggle = ({ language, onToggle, C, isCitizen = false }) => {
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onToggle}
      title={language === "en" ? t("header.switchToHindi") : t("header.switchToEnglish")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 36,
        minWidth: 42,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 10,
        border: `1px solid ${hovered ? C.purple : C.border}`,
        background: hovered ? C.purple : "transparent",
        color: hovered ? "#FFFFFF" : C.t2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background var(--portal-duration-fast) ease, border-color var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".04em",
        fontFamily: language === "hi" ? "'Noto Sans Devanagari', sans-serif" : "inherit",
        flexShrink: 0,
      }}
    >
      {language === "en" ? "हिं" : "EN"}
    </button>
  );
};

const HeaderIcon = ({ icon: Icon, dot, onClick, title, isCitizen = false }) => {
  const { C } = usePortalTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "none",
        background: hovered ? C.purple : "transparent",
        color: hovered ? "#FFFFFF" : C.t2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background var(--portal-duration-fast) ease, border-color var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
        cursor: "pointer",
      }}
    >
      <Icon size={17} />

      {dot && (
        <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: 999, background: C.danger }} />
      )}
    </button>
  );
};

const MenuItem = ({ icon: Icon, label, danger, onClick }) => {
  const { C } = usePortalTheme();
  const [hovered, setHovered] = useState(false);
  const portalRole = typeof document !== "undefined" ? document.querySelector(".portal-shell")?.dataset?.portalRole : undefined;
  const useCitizenNavUi = portalRole === "citizen" || portalRole === "admin";

  return (
    <li
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        cursor: "pointer",
        color: danger ? C.danger : C.t2,
        borderRadius: 10,
        margin: "0 8px",
        background: hovered ? (danger ? `${C.danger}12` : C.navHover) : "transparent",
        transition: "background 0.15s ease, color 0.15s ease",
        fontFamily: useCitizenNavUi ? "var(--portal-citizen-font)" : "inherit",
        fontSize: useCitizenNavUi ? 14 : 13,
        lineHeight: useCitizenNavUi ? 1.45 : 1.4,
        fontWeight: 500,
      }}
    >
      <Icon size={16} />
      {label}
    </li>
  );
};

export default Header;
