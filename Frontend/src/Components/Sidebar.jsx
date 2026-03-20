import { FiLogOut } from "react-icons/fi";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    FiBarChart2,
    FiPlus,
    FiMenu,
} from "react-icons/fi";
import { LuBuilding } from "react-icons/lu";
import { BsFillGearFill } from "react-icons/bs";
import { FaRegEye, FaUsers } from "react-icons/fa";
import { RiTeamLine } from "react-icons/ri";
import SidebarItem from "./SidebarItem";
import { LuBox } from "react-icons/lu";

function Sidebar({ collapsed, onToggle }) {
    const [teams, setTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const navigate = useNavigate();

    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
    const employees = JSON.parse(localStorage.getItem("employees")) || [];

    const currentEmployee = employees.find(
        (e) => e.employeeId === loggedInUser?.employeeId
    );

    // 🟢 API logic removed, kept simple state updates
    useEffect(() => {
        const savedTeams = JSON.parse(localStorage.getItem("teams")) || [];
        setTeams(savedTeams);
        // You can fetch or set projects from local storage or static data here if needed
    }, []);

    // 🟢 Prevent Redirect Function
    const handlePreventRedirect = (e) => {
        e.preventDefault();
    };

    const handleLogout = (e) => {
        e.preventDefault(); // Logout pe bhi redirection rok diya currently
        // localStorage.removeItem("loggedInUser");
        // localStorage.removeItem("token");
        // navigate("/");
    };

    return (
        <>
            <div className="h-full flex flex-col bg-white border-r border-gray-200">
                <div className="flex items-center justify-between px-3 py-2 shadow">
                    {!collapsed && (
                        <span className="font-semibold text-gray-800 dark:text-gray-100">
                            <Link to="/" onClick={handlePreventRedirect}>Multiverse</Link>
                        </span>
                    )}
                    <SidebarItem type="" collapsed={collapsed} label="Expand Navigation Menu">
                        <button onClick={onToggle} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 cursor-pointer">
                            <FiMenu className="text-[16px] min-w-4 h-4" />
                        </button>
                    </SidebarItem>
                </div>
                <div className="h-full px-3 py-2 overflow-y-auto hide-scroll">
                    <ul className="w-full space-y-1">

                        {/* 🟢 NavLinks par onClick laga kar redirect roka gaya hai */}
                        <div onClick={handlePreventRedirect}>
                            <SidebarItem
                                type="NavLink"
                                to="/newcase"
                                icon={FiBarChart2}
                                label="Services"
                                collapsed={collapsed}
                            />
                        </div>
                        <div onClick={handlePreventRedirect}>
                            <SidebarItem
                                type="NavLink"
                                to="/citizencase"
                                icon={LuBox}
                                label="My Complaints"
                                collapsed={collapsed}
                            />
                        </div>

                        {/* 🟢 Role base checks removed, ab sabko show hoga */}
                        <div onClick={handlePreventRedirect}>
                            <SidebarItem
                                type="NavLink"
                                to="/meeting"
                                icon={RiTeamLine}
                                label="Meetings"
                                collapsed={collapsed}
                            />
                        </div>

                        <div onClick={handlePreventRedirect}>
                            <SidebarItem
                                type="NavLink"
                                to="/setting"
                                icon={BsFillGearFill}
                                label="Settings"
                                collapsed={collapsed}
                            />
                        </div>

                        <div onClick={handlePreventRedirect}>
                            <SidebarItem
                                type="NavLink"
                                to="/adminallcases"
                                icon={BsFillGearFill}
                                label="Work Pool"
                                collapsed={collapsed}
                            />
                        </div>

                        <div onClick={handlePreventRedirect}>
                            <SidebarItem
                                type="NavLink"
                                to="/admincases"
                                icon={BsFillGearFill}
                                label="My Cases" //Admin Cases
                                collapsed={collapsed}
                            />
                        </div>

                        <div onClick={handlePreventRedirect}>
                            <SidebarItem
                                type="NavLink"
                                to="/meetings"
                                icon={BsFillGearFill}
                                label="Meetings"
                                collapsed={collapsed}
                            />
                        </div>
                    </ul>
                </div>
                <div className="border-t border-gray-300 px-3 py-2">
                    <SidebarItem type="" collapsed={collapsed} label="Logout">
                        <button onClick={handleLogout} className="flex items-center gap-2 w-full p-2 text-red-600 hover:bg-red-100 rounded cursor-pointer">
                            <FiLogOut className="text-[16px] min-w-4 h-4" />
                            <div className={`whitespace-nowrap transition-all duration-300 text-sm leading-4 h-4 ${collapsed ? "w-0 opacity-0 hidden" : "max-w-fit opacity-100"} `}>
                                Logout
                            </div>
                        </button>
                    </SidebarItem>
                </div>
            </div>

            {/* 🟢 Saare modals theek yahan se hata diye gaye hain */}
        </>
    );
}

export default Sidebar;