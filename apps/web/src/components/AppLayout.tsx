import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  RefreshCw,
  Clock,
  Receipt,
  BarChart2,
  LogOut,
  Sun,
  Moon,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
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
  { to: "/time", icon: Clock, label: "Time" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
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

function NavContent({
  collapsed,
  onNavClick,
}: {
  collapsed?: boolean;
  onNavClick?: () => void;
}) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <>
      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            onClick={onNavClick}
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

        {/* User info — expanded */}
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

        {/* User avatar — collapsed */}
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
    </>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("hisab-sidebar") === "collapsed";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("hisab-sidebar", next ? "collapsed" : "expanded");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* ── Mobile top header ─────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white font-bold text-sm select-none">
            ह
          </div>
          <span className="font-semibold text-foreground">Hisab</span>
          <span className="text-xs text-muted-foreground">हिसाब</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* ── Mobile drawer overlay ──────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white font-bold text-sm select-none">
              ह
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-foreground">Hisab</span>
              <span className="ml-1.5 text-xs text-muted-foreground">हिसाब</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <NavContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside
        className={cn(
          "relative hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 ease-in-out",
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

        <NavContent collapsed={collapsed} />

        {/* Collapse toggle */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-2">
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
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
