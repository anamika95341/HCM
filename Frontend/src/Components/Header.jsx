import { useEffect, useRef, useState } from "react";
import {
    FiMaximize,
    FiMessageSquare,
    FiBell,
    FiUser,
    FiSettings,
    FiLogOut,
    FiMinimize,
} from "react-icons/fi";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const Header = () => {
    const user = JSON.parse(localStorage.getItem("loggedInUser")) || {};
    const ref = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { projectId } = useParams();

    // 🟢 Context remove kiya hai, UI intact rakhne ke liye hardcode kar diya
    const hasUnread = false;

    const [open, setOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        // Check if route matches /project/:projectId
        if (!location.pathname.startsWith("/project/") || !projectId) {
            setCurrentProject(null);
            return;
        }

        const projects = JSON.parse(localStorage.getItem("projects")) || [];
        const foundProject = projects.find(
            (p) => String(p.id) === String(projectId)
        );

        setCurrentProject(foundProject || null);
    }, [location.pathname, projectId]);


    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () =>
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);


    // close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Get user initial for avatar fallback
    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

    // 🟢 NAYA: Redirect rokne ke liye function
    const handlePreventRedirect = (e) => {
        if (e) e.preventDefault();
    };

    return (
        <header className="h-12 bg-white shadow flex items-center justify-between px-6">
            <div className="">
                {currentProject && (
                    <div className="text-gray-900 text-lg font-medium capitalize">{currentProject?.name}</div>
                )}
            </div>
            <div className="flex items-center gap-4 relative" ref={ref}>
                <HeaderIcon icon={isFullscreen ? FiMinimize : FiMaximize} onClick={toggleFullscreen} />

                {/* 🟢 Notifications modal remove kar diya gaya hai */}
                <HeaderIcon icon={FiBell} dot={hasUnread} onClick={(e) => {
                    handlePreventRedirect(e);
                    setOpen(false);
                }} />

                {/* Avatar Button */}
                <button onClick={(e) => { handlePreventRedirect(e); setOpen((v) => !v); }} className="focus:outline-none">
                    {user?.avatar ? (
                        <img
                            src={user.avatar}
                            alt="User Avatar"
                            className="w-8 h-8 rounded-full object-cover border border-gray-300 cursor-pointer shadow-sm"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm border border-gray-300 cursor-pointer shadow-sm">
                            {userInitial}
                        </div>
                    )}
                </button>

                {/* Profile Dropdown */}
                {open && (
                    <div className="absolute right-0 top-11 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                        {/* User info */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                            {/* Dropdown Avatar */}
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border border-gray-200 shrink-0">
                                    {userInitial}
                                </div>
                            )}

                            <div className="flex flex-col overflow-hidden">
                                <p className="font-bold text-gray-800 text-sm truncate">
                                    {user?.name || "Unknown User"}
                                </p>
                                <p className="text-blue-600 text-xs font-medium capitalize truncate">
                                    {user?.role || "Employee"}
                                </p>
                                <p className="text-gray-500 text-[11px] truncate mt-0.5">
                                    {user?.email || "No email"}
                                </p>
                            </div>
                        </div>

                        {/* Menu */}
                        <ul className="py-2 text-sm">
                            {/* 🟢 Saare actions par redirection rok diya gaya hai */}
                            <MenuItem
                                icon={FiUser}
                                label="Profile"
                                onClick={(e) => {
                                    handlePreventRedirect(e);
                                    setOpen(false);
                                }}
                            />
                            <MenuItem icon={FiSettings} label="Settings" onClick={(e) => {
                                handlePreventRedirect(e);
                                setOpen(false);
                            }} />
                            <MenuItem icon={FiLogOut} label="Logout" danger onClick={(e) => {
                                handlePreventRedirect(e);
                                // localStorage.removeItem("loggedInUser");
                                // localStorage.removeItem("token");
                                navigate("/");
                            }} />
                        </ul>
                    </div>
                )}

                {/* 🟢 Saare modals theek yahan se hata diye gaye hain (Profile & Notification) */}
            </div>
        </header>
    );
};

const HeaderIcon = ({ icon: Icon, badge, dot, onClick }) => (
    <button className="relative text-gray-500 hover:text-gray-700 cursor-pointer" onClick={onClick}>
        <Icon size={18} />

        {badge && badge > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] px-1.5 rounded-full">
                {badge}
            </span>
        )}

        {dot && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
    </button>
);

const MenuItem = ({ icon: Icon, label, danger, onClick }) => (
    <li className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
        ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"}
        `}
        onClick={onClick} >
        <Icon size={16} />
        {label}
    </li>
);

export default Header;