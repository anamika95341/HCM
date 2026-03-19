import { NavLink } from "react-router-dom";
import { useRef } from "react";

const SidebarItem = ({ children, type = "NavLink", to, icon: Icon, label, collapsed, onClick }) => {
    const ref = useRef(null);

    return (
        <div className="relative group" ref={ref}>
            {type === "NavLink" ? (
                <NavLink to={to} className={({ isActive }) => `flex items-center gap-2 p-2 text-sm rounded
                    ${isActive ? "bg-blue-100 text-blue-600 font-semibold" : "text-gray-600 hover:bg-gray-200"}`}>
                    <Icon className="text-[16px] min-w-4 h-4" />
                    <div className={`whitespace-nowrap transition-all text-sm leading-4 h-4
                        ${collapsed ? "w-0 opacity-0 hidden" : "max-w-fit opacity-100"} `}>
                        {label}
                    </div>
                </NavLink>
            ) : type === "Button" ? (
                <button type="button" onClick={onClick} className="w-full flex items-center gap-2 p-2 text-sm rounded text-gray-600 hover:bg-gray-200 cursor-pointer">
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
    return (
        <div className="fixed -translate-y-full translate-x-12.5 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md shadow-lg opacity-0 scale-95
            group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[9999]">
            {label}

            {/* Tip */}
            <span className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45 -left-1"></span>
        </div>
    );
};

export default SidebarItem;