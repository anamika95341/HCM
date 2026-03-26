import { useEffect, useRef, useState } from "react";
import { FiBell, FiCalendar, FiLogOut, FiMaximize, FiMinimize, FiSettings, FiUser } from "react-icons/fi";
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
  const { C } = usePortalTheme();
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
      className="flex items-center justify-between"
      style={{
        background: `linear-gradient(180deg, ${C.card} 0%, ${C.bgElevated} 100%)`,
        borderBottom: `1px solid ${C.border}`,
        padding: "0 24px",
        height: 62,
        flexShrink: 0,
        boxShadow: "0 1px 0 rgba(255,255,255,0.55)",
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {workspaceTitle}
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2, fontWeight: 500 }}>
            Government Unified Portal
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            background: C.purpleDim,
            color: C.purple,
            letterSpacing: "0.04em",
          }}
        >
          {roleLabel.toUpperCase()}
        </div>
      </div>

      <div className="flex items-center gap-2 relative" ref={ref}>
        <HeaderIcon icon={isFullscreen ? FiMinimize : FiMaximize} onClick={toggleFullscreen} title="Toggle Fullscreen" />
        <HeaderIcon icon={FiCalendar} onClick={() => navigate(getHomePathForRole(session?.role || "citizen"))} title="Go Home" />
        <HeaderIcon icon={FiBell} dot={false} onClick={() => setOpen(false)} title="Notifications" />

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="focus:outline-none"
          title="User Menu"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            cursor: "pointer",
            border: open ? `2px solid ${C.purple}` : `2px solid ${C.border}`,
            overflow: "hidden",
            background: C.purpleDim,
            transition: "border-color 0.15s ease, transform 0.15s ease",
            flexShrink: 0,
          }}
        >
          {safeAvatar ? (
            <img
              src={safeAvatar}
              alt="User Avatar"
              className="w-9 h-9 rounded-full object-cover"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ width: "100%", height: "100%", background: C.purpleDim, color: C.purple }}
            >
              {userInitial}
            </div>
          )}
        </button>

        {open && (
          <div
            className="absolute right-0 w-72 rounded-xl z-50 overflow-hidden"
            style={{
              top: "calc(100% + 10px)",
              background: C.card,
              border: `1px solid ${C.border}`,
              boxShadow: "0 18px 48px rgba(15,23,42,0.14), 0 6px 18px rgba(15,23,42,0.08)",
            }}
          >
            <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: `1px solid ${C.border}`, background: C.bgElevated }}>
              {safeAvatar ? (
                <img src={safeAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" style={{ border: `1px solid ${C.border}` }} />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
                  style={{ background: C.purpleDim, color: C.purple, border: `1px solid ${C.border}` }}
                >
                  {userInitial}
                </div>
              )}

              <div className="flex flex-col overflow-hidden">
                <p className="font-bold text-sm truncate" style={{ color: C.t1 }}>
                  {currentUser.name}
                </p>
                <p className="text-xs font-medium capitalize truncate" style={{ color: C.purple }}>
                  {roleLabel}
                </p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: C.t3 }}>
                  {currentUser.email}
                </p>
              </div>
            </div>

            <ul className="py-2 text-sm">
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

  return (
    <button
      type="button"
      className="relative cursor-pointer transition-colors"
      onClick={onClick}
      title={title}
      style={{
        width: 34,
        height: 34,
        borderRadius: 11,
        border: `1px solid ${C.border}`,
        background: C.bg,
        color: C.t2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <Icon size={17} />

      {badge && badge > 0 && (
        <span className="absolute -top-2 -right-2 text-white text-[10px] px-1.5 rounded-full" style={{ background: C.purple }}>
          {badge}
        </span>
      )}

      {dot && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: C.danger }} />
      )}
    </button>
  );
};

const MenuItem = ({ icon: Icon, label, danger, onClick }) => {
  const { C } = usePortalTheme();

  return (
    <li
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
      onClick={onClick}
      style={{ color: danger ? C.danger : C.t2, borderRadius: 10, margin: "0 8px" }}
    >
      <Icon size={16} />
      {label}
    </li>
  );
};

export default Header;
