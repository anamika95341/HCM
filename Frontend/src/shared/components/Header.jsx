import { useEffect, useRef, useState } from "react";
import { FiBell, FiCalendar, FiLogOut, FiMaximize, FiMinimize, FiSettings, FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { usePortalTheme } from "../theme/portalTheme.jsx";
import { getHomePathForRole, PATHS } from "../../routes/paths.js";
import { sanitizeImageSrc } from "../security/url.js";
import { useAuth } from "../auth/AuthContext.jsx";

const WORKSPACE_TITLES = [
  { match: "/citizen/", title: "Citizen Module" },
  { match: "/admin/", title: "Admin Module" },
  { match: "/Minister/", title: "Minister Module" },
  { match: "/DEO/", title: "DEO Module" },
  { match: "/settings", title: "Settings" },
];

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
  const workspaceTitle = WORKSPACE_TITLES.find((item) => location.pathname.startsWith(item.match))?.title || "Unified Portal Interface";

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
      className="flex items-center justify-between px-6 py-4"
      style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}
    >
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold" style={{ color: C.t3 }}>
          Government Workspace
        </div>
        <div className="text-sm font-semibold mt-1" style={{ color: C.t1 }}>
          {workspaceTitle}
        </div>
      </div>

      <div className="flex items-center gap-3 relative" ref={ref}>
        <HeaderIcon icon={isFullscreen ? FiMinimize : FiMaximize} onClick={toggleFullscreen} title="Toggle Fullscreen" />
        <HeaderIcon icon={FiCalendar} onClick={() => navigate(getHomePathForRole(session?.role || "citizen"))} title="Open Workspace" />
        <HeaderIcon icon={FiBell} dot={false} onClick={() => setOpen(false)} title="Notifications" />

        <button type="button" onClick={() => setOpen((value) => !value)} className="focus:outline-none" title="User Menu">
          {safeAvatar ? (
            <img
              src={safeAvatar}
              alt="User Avatar"
              className="w-9 h-9 rounded-full object-cover"
              style={{ border: `1px solid ${C.border}` }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: C.purpleDim, color: C.purple, border: `1px solid ${C.border}` }}
            >
              {userInitial}
            </div>
          )}
        </button>

        {open && (
          <div
            className="absolute right-0 top-12 w-72 rounded-xl z-50 overflow-hidden"
            style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "var(--portal-shadow)" }}
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
                  {currentUser.role}
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
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.card,
        color: C.t2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
      style={{ color: danger ? C.danger : C.t2 }}
    >
      <Icon size={16} />
      {label}
    </li>
  );
};

export default Header;
