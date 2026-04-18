import { useEffect, useRef, useState } from "react";
import { FiBell, FiLogOut, FiMoon, FiSettings, FiSun, FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { usePortalTheme } from "../theme/portalTheme.jsx";
import { PATHS } from "../../routes/paths.js";
import { sanitizeImageSrc } from "../security/url.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNotifications } from "../notifications/NotificationContext.jsx";

const WORKSPACE_TITLES = [
  { match: "/citizen/", title: "Citizen Services" },
  { match: "/masteradmin/", title: "Master Admin" },
  { match: "/admin/", title: "Admin Workspace" },
  { match: "/Minister/", title: "Minister Portal" },
  { match: "/DEO/", title: "DEO Workspace" },
  { match: "/settings", title: "Settings" },
];



const Header = () => {
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { C, theme, toggleTheme } = usePortalTheme();
  const { session, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const useCitizenNavUi = session?.role === "citizen";

  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const currentUser = {
    name: session?.user?.firstName || session?.user?.username || "Portal User",
    role: session?.role || "visitor",
    email: session?.user?.email || "",
    avatar: null,
  };

  const safeAvatar = sanitizeImageSrc(currentUser.avatar);
  const workspaceTitle = WORKSPACE_TITLES.find((item) => location.pathname.startsWith(item.match))?.title || "Unified Portal";

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
        <HeaderIcon
          icon={theme === "dark" ? FiSun : FiMoon}
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          isCitizen={useCitizenNavUi}
        />
        <HeaderIcon
          icon={FiBell}
          dot={unreadCount > 0}
          onClick={() => {
            setOpen(false);
            setNotificationsOpen((value) => !value);
          }}
          title="Notifications"
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
            border: useCitizenNavUi ? "none" : open ? `2px solid ${C.purple}` : `1px solid ${C.border}`,
            overflow: "hidden",
            background: useCitizenNavUi ? C.purple : C.purpleDim,
            color: useCitizenNavUi ? "#FFFFFF" : C.purple,
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
                background: useCitizenNavUi ? C.purple : C.purpleDim,
                color: useCitizenNavUi ? "#FFFFFF" : C.purple,
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
                <p className={useCitizenNavUi ? "portal-citizen-value" : undefined} style={{ color: C.t1, fontWeight: 700, fontSize: useCitizenNavUi ? 14 : 13 }}>Notifications</p>
                <p className={useCitizenNavUi ? "portal-citizen-caption" : undefined} style={{ color: C.t3, fontSize: 12, marginTop: 2 }}>
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
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
                Mark all read
              </button>
            </div>

            <div style={{ maxHeight: 360, overflowY: "auto", padding: 8 }}>
              {notifications.length === 0 ? (
                <div className={useCitizenNavUi ? "portal-citizen-caption" : undefined} style={{ padding: 16, color: C.t3, fontSize: 12, textAlign: "center" }}>
                  No notifications yet.
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
              <MenuItem icon={FiUser} label="Profile & Account" onClick={() => { navigate(`${PATHS.settings}?tab=profile`); setOpen(false); }} />
              <MenuItem icon={FiSettings} label="Notifications" onClick={() => { navigate(`${PATHS.settings}?tab=notifications`); setOpen(false); }} />
              <MenuItem icon={FiLogOut} label="Logout" danger onClick={async () => { setOpen(false); await logout(); navigate(PATHS.login); }} />
            </ul>
          </div>
        )}
      </div>
    </header>
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
        border: isCitizen ? "none" : `1px solid ${hovered ? `${C.purple}40` : C.border}`,
        background: hovered ? C.purple : isCitizen ? "transparent" : C.bgElevated,
        color: hovered ? "#FFFFFF" : isCitizen ? C.t2 : C.t2,
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
  const useCitizenNavUi = typeof document !== "undefined" && document.querySelector(".portal-shell")?.dataset?.portalRole === "citizen";

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
