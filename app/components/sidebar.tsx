import { NavLink } from "react-router";
import {
  Monitor,
  Terminal,
  AlertCircle,
  ScrollText,
  UserRound,
  House,
  Siren,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "~/contexts/auth";

const navItems = [
  { to: "/dashboard", icon: Monitor, label: "Devices", end: true },
  { to: "/dashboard/commands", icon: Terminal, label: "Commands" },
  { to: "/dashboard/help", icon: AlertCircle, label: "Help Requests" },
  { to: "/dashboard/audit", icon: ScrollText, label: "Audit Logs" },
  { to: "/dashboard/profile", icon: UserRound, label: "Profile" },
  { to: "/dashboard/home-setup", icon: House, label: "Home setup" },
  { to: "/dashboard/sos", icon: Siren, label: "SOS" },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r border-gray-200 bg-gray-50 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-800">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
            Grandma's Caretaker
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
        >
          {collapsed ? <Menu size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
              } ${collapsed ? "justify-center" : ""}`
            }
          >
            <item.icon size={18} aria-hidden="true" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        {!collapsed && user && (
          <div className="mb-2 truncate text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={18} aria-hidden="true" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
