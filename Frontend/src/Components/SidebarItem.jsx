import { NavLink } from "react-router-dom";
import { useRef } from "react";
import { usePortalTheme } from "../theme/portalTheme";

const SidebarItem = ({ children, type = "NavLink", to, icon: Icon, label, collapsed, onClick }) => {
    const ref = useRef(null);
    const { C } = usePortalTheme();

    const baseItemStyle = {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: collapsed ? "12px" : "12px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        lineHeight: "16px",
        textDecoration: "none",
        color: C.t2,
        border: "1px solid transparent",
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
                        borderColor: isActive ? `${C.purple}33` : "transparent",
                        fontWeight: isActive ? 600 : 500,
                    })}
                >
                    <Icon className="text-[16px] min-w-4 h-4" />
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
                    <Icon className="text-[16px] min-w-4 h-4" />
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
            style={{ background: C.card, color: C.t1, border: `1px solid ${C.border}` }}
        >
            {label}

            <span
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 -left-1"
                style={{ background: C.card, borderLeft: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
            ></span>
        </div>
    );
};

export default SidebarItem;
