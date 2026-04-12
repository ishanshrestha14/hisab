import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  RefreshCw,
  BarChart2,
  LogOut,
  Sun,
  Moon,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/invoices", icon: FileText, label: "Invoices" },
  { to: "/quotes", icon: ClipboardList, label: "Quotes" },
  { to: "/recurring", icon: RefreshCw, label: "Recurring" },
  { to: "/reports", icon: BarChart2, label: "Reports" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
      {initials}
    </div>
  );
}

export default function AppLayout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("hisab-sidebar") === "collapsed";
  });

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("hisab-sidebar", next ? "collapsed" : "expanded");
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-border bg-card transition-all duration-200 ease-in-out",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border transition-all duration-200",
            collapsed ? "justify-center px-0" : "gap-3 px-5"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white font-bold text-sm select-none">
            ह
          </div>
          {!collapsed && (
            <div className="leading-tight overflow-hidden">
              <span className="font-semibold text-foreground">Hisab</span>
              <span className="ml-1.5 text-xs text-muted-foreground">हिसाब</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2 overflow-hidden">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                  collapsed ? "justify-center px-0 py-2.5" : "",
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={cn("shrink-0", isActive ? "text-brand" : "")} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-2 space-y-0.5">
          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed ? "justify-center px-0 py-2.5" : ""
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed ? "justify-center px-0 py-2.5" : ""
            )}
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && (
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            )}
          </button>

          {/* User info — expanded only */}
          {!collapsed && session?.user && (
            <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
              <UserAvatar name={session.user.name ?? session.user.email ?? "U"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {session.user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
          )}

          {/* User avatar — collapsed only */}
          {collapsed && session?.user && (
            <div
              className="flex justify-center py-1"
              title={session.user.name ?? session.user.email ?? ""}
            >
              <UserAvatar name={session.user.name ?? session.user.email ?? "U"} />
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed ? "justify-center px-0 py-2.5" : ""
            )}
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
