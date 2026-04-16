import { NavLink } from "react-router-dom";
import { useRef, useState } from "react";
import { usePortalTheme } from "../theme/portalTheme.jsx";

const SidebarItem = ({ children, type = "NavLink", to, icon: Icon, label, collapsed, onClick, isCitizen = false }) => {
  const ref = useRef(null);
  const { C } = usePortalTheme();
  const [navHover, setNavHover] = useState(false);

  const baseItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 40,
    padding: collapsed ? "var(--portal-space-6)" : "var(--portal-space-6) var(--portal-space-8)",
    borderRadius: 10,
    fontSize: isCitizen ? 14 : 13,
    lineHeight: isCitizen ? "1.45" : "16px",
    textDecoration: "none",
    color: C.t3,
    border: "none",
    fontWeight: 500,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    fontFamily: isCitizen ? "var(--portal-citizen-font)" : "inherit",
  };

  return (
    <div className="relative group" ref={ref}>
      {type === "NavLink" ? (
        <NavLink
          to={to}
          onMouseEnter={() => setNavHover(true)}
          onMouseLeave={() => setNavHover(false)}
          style={({ isActive }) => ({
            ...baseItemStyle,
            justifyContent: collapsed ? "center" : "flex-start",
            background: isActive ? C.card : navHover ? C.navHover : "transparent",
            color: isActive ? C.t1 : C.t3,
            fontWeight: isActive ? 600 : 500,
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={18} style={{ flexShrink: 0, color: isActive ? C.purple : C.t3 }} />
              {!collapsed && (
                <div
                  className={isCitizen ? "portal-citizen-value" : undefined}
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: isCitizen ? 14 : 13,
                    lineHeight: isCitizen ? 1.45 : "16px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {label}
                </div>
              )}
            </>
          )}
        </NavLink>
      ) : type === "Button" ? (
        <button
          type="button"
          onClick={onClick}
          style={{
            ...baseItemStyle,
            justifyContent: collapsed ? "center" : "flex-start",
            width: "100%",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <Icon size={18} style={{ flexShrink: 0 }} />
          {!collapsed && (
            <div
              className={isCitizen ? "portal-citizen-value" : undefined}
              style={{
                whiteSpace: "nowrap",
                fontSize: isCitizen ? 14 : 13,
                lineHeight: isCitizen ? 1.45 : "16px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </div>
          )}
        </button>
      ) : (
        <div>{children}</div>
      )}
      {collapsed && <Tooltip label={label} />}
    </div>
  );
};

const Tooltip = ({ label }) => {
  const { C } = usePortalTheme();
  return (
    <div
      className="portal-floating group-hover:opacity-100 group-hover:scale-100"
      style={{
        position: "fixed",
        transform: "translate(50px, -100%)",
        padding: "6px 10px",
        borderRadius: 10,
        opacity: 0,
        scale: "0.95",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        zIndex: 9999,
        background: C.card,
        color: C.t1,
        border: `1px solid ${C.border}`,
        fontFamily: "var(--portal-citizen-font)",
        fontSize: "12px",
        lineHeight: 1.5,
      }}
    >
      {label}

      <span
        style={{
          position: "absolute",
          top: "50%",
          left: -5,
          width: 10,
          height: 10,
          transform: "translateY(-50%) rotate(45deg)",
          background: C.card,
          borderLeft: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
        }}
      />
    </div>
  );
};

export default SidebarItem;
