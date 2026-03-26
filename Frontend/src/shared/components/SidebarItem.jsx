import { NavLink } from "react-router-dom";
import { useRef } from "react";
import { usePortalTheme } from "../theme/portalTheme.jsx";

const SidebarItem = ({ children, type = "NavLink", to, icon: Icon, label, collapsed, onClick }) => {
    const ref = useRef(null);
    const { C } = usePortalTheme();

    const baseItemStyle = {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: collapsed ? "10px" : "9px 12px",
        borderRadius: "10px",
        fontSize: "13px",
        lineHeight: "16px",
        textDecoration: "none",
        color: C.t2,
        border: "1px solid transparent",
        fontWeight: 500,
        transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
    };

    return (
        <div className="relative group" ref={ref}>
            {type === "NavLink" ? (
                <NavLink
                    to={to}
                    style={({ isActive }) => ({
                        ...baseItemStyle,
                        justifyContent: collapsed ? "center" : "flex-start",
                        background: isActive ? C.purpleDim : "transparent",
                        color: isActive ? C.purple : C.t2,
                        borderColor: isActive ? `${C.purple}28` : "transparent",
                        fontWeight: isActive ? 700 : 500,
                        boxShadow: isActive ? `inset 3px 0 0 ${C.purple}` : "none",
                    })}
                >
                    <Icon className="text-[16px] min-w-4 h-4" style={{ flexShrink: 0 }} />
                    <div className={`whitespace-nowrap transition-all text-sm leading-4 h-4
                        ${collapsed ? "w-0 opacity-0 hidden" : "max-w-fit opacity-100"} `}>
                        {label}
                    </div>
                </NavLink>
            ) : type === "Button" ? (
                <button
                    type="button"
                    onClick={onClick}
                    className="w-full cursor-pointer"
                    style={{
                        ...baseItemStyle,
                        justifyContent: collapsed ? "center" : "flex-start",
                        width: "100%",
                        background: "transparent",
                    }}
                >
                    <Icon className="text-[16px] min-w-4 h-4" style={{ flexShrink: 0 }} />
                    <div className={`whitespace-nowrap transition-all text-sm leading-4 h-4
                        ${collapsed ? "w-0 opacity-0 hidden" : "max-w-fit opacity-100"} `}>
                        {label}
                    </div>
                </button>
            ) : (
                <div className="">
                    {children}
                </div>
            )}
            {collapsed && <Tooltip label={label} parentRef={ref} />}
        </div>
    )
}

const Tooltip = ({ label }) => {
    const { C } = usePortalTheme();
    return (
        <div
            className="fixed -translate-y-full translate-x-12.5 text-xs px-3 py-1.5 rounded-md shadow-lg opacity-0 scale-95
            group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[9999]"
            style={{ background: C.t1, color: "#fff", border: `1px solid ${C.t1}`, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
        >
            {label}

            <span
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 -left-1"
                style={{ background: C.t1, borderLeft: `1px solid ${C.t1}`, borderBottom: `1px solid ${C.t1}` }}
            ></span>
        </div>
    );
};

export default SidebarItem;
