import { useEffect, useRef, useState } from "react";
import { FiBell, FiCalendar, FiLogOut, FiMaximize, FiMinimize, FiMoon, FiSettings, FiSun, FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { usePortalTheme } from "../theme/portalTheme.jsx";
import { getHomePathForRole, PATHS } from "../../routes/paths.js";
import { sanitizeImageSrc } from "../security/url.js";
import { useAuth } from "../auth/AuthContext.jsx";

const WORKSPACE_TITLES = [
  { match: "/citizen/", title: "Citizen Services" },
  { match: "/masteradmin/", title: "Master Admin" },
  { match: "/admin/", title: "Admin Workspace" },
  { match: "/Minister/", title: "Minister Portal" },
  { match: "/DEO/", title: "DEO Workspace" },
  { match: "/settings", title: "Settings" },
];

const ROLE_LABELS = {
  citizen: "Citizen",
  admin: "Admin",
  masteradmin: "Master Admin",
  deo: "DEO",
  minister: "Minister",
};

const Header = () => {
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { C, theme, toggleTheme } = usePortalTheme();
  const { session, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentUser = {
    name: session?.user?.firstName || session?.user?.username || "Portal User",
    role: session?.role || "visitor",
    email: session?.user?.email || "",
    avatar: null,
  };

  const safeAvatar = sanitizeImageSrc(currentUser.avatar);
  const workspaceTitle = WORKSPACE_TITLES.find((item) => location.pathname.startsWith(item.match))?.title || "Unified Portal";
  const roleLabel = ROLE_LABELS[currentUser.role] || currentUser.role;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      return;
    }

    document.exitFullscreen();
  };

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
        minHeight: 73,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {workspaceTitle}
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2, fontWeight: 500 }}>
            E-Parinam workspace
          </div>
        </div>
        <div className="portal-badge" style={{ background: C.purpleDim, color: C.purple }}>
          {roleLabel.toUpperCase()}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }} ref={ref}>
        <HeaderIcon
          icon={theme === "dark" ? FiSun : FiMoon}
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        />
        <HeaderIcon icon={isFullscreen ? FiMinimize : FiMaximize} onClick={toggleFullscreen} title="Toggle Fullscreen" />
        <HeaderIcon icon={FiCalendar} onClick={() => navigate(getHomePathForRole(session?.role || "citizen"))} title="Go Home" />
        <HeaderIcon icon={FiBell} dot={false} onClick={() => setOpen(false)} title="Notifications" />

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          title="User Menu"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            cursor: "pointer",
            border: open ? `2px solid ${C.purple}` : `1px solid ${C.border}`,
            overflow: "hidden",
            background: C.purpleDim,
            transition: "border-color var(--portal-duration-fast) ease, transform var(--portal-duration-fast) ease",
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
                background: C.purpleDim,
                color: C.purple,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {userInitial}
            </div>
          )}
        </button>

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
                  }}
                >
                  {userInitial}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <p style={{ color: C.t1, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser.name}
                </p>
                <p style={{ color: C.purple, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {roleLabel}
                </p>
                <p style={{ color: C.t3, fontSize: 11, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser.email}
                </p>
              </div>
            </div>

            <ul style={{ padding: "8px 0", margin: 0, listStyle: "none" }}>
              <MenuItem icon={FiUser} label="Profile" onClick={() => setOpen(false)} />
              <MenuItem icon={FiSettings} label="Settings" onClick={() => { navigate(PATHS.settings); setOpen(false); }} />
              <MenuItem icon={FiCalendar} label="Workspace" onClick={() => { navigate(getHomePathForRole(session?.role || "citizen")); setOpen(false); }} />
              <MenuItem icon={FiLogOut} label="Logout" danger onClick={async () => { setOpen(false); await logout(); navigate(PATHS.login); }} />
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

const HeaderIcon = ({ icon: Icon, badge, dot, onClick, title }) => {
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
        border: `1px solid ${hovered ? `${C.purple}40` : C.border}`,
        background: hovered ? C.purpleDim : C.bgElevated,
        color: hovered ? C.purple : C.t2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background var(--portal-duration-fast) ease, border-color var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease",
        cursor: "pointer",
      }}
    >
      <Icon size={17} />

      {badge && badge > 0 && (
        <span style={{ position: "absolute", top: -8, right: -8, fontSize: 10, fontWeight: 700, padding: "2px 8px", lineHeight: "14px", borderRadius: 999, background: C.mintDim, color: C.mint }}>
          {badge}
        </span>
      )}

      {dot && (
        <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: 999, background: C.danger }} />
      )}
    </button>
  );
};

const MenuItem = ({ icon: Icon, label, danger, onClick }) => {
  const { C } = usePortalTheme();
  const [hovered, setHovered] = useState(false);

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
      }}
    >
      <Icon size={16} />
      {label}
    </li>
  );
};

export default Header;
