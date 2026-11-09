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
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string };

const navGroups: { label?: string; items: NavItem[] }[] = [
  { items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }] },
  {
    label: "Billing",
    items: [
      { to: "/invoices", icon: FileText, label: "Invoices" },
      { to: "/quotes", icon: ClipboardList, label: "Quotes" },
      { to: "/recurring", icon: RefreshCw, label: "Recurring" },
    ],
  },
  {
    label: "Work",
    items: [
      { to: "/clients", icon: Users, label: "Clients" },
      { to: "/time", icon: Clock, label: "Time" },
      { to: "/expenses", icon: Receipt, label: "Expenses" },
    ],
  },
  { label: "Books", items: [{ to: "/reports", icon: BarChart2, label: "Reports" }] },
];

const settingsItem: NavItem = { to: "/settings", icon: Settings, label: "Settings" };

/** Flat mark: the Devanagari initial in ink on the brand amber */
function LogoMark() {
  return (
    <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg bg-primary text-[15px] font-semibold leading-none text-primary-foreground">
      ह
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap">
      <span className="text-[15px] font-semibold text-foreground">Hisab</span>
      <span className="text-[13px] text-faint">हिसाब</span>
    </div>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
      {initials}
    </div>
  );
}

const rowClass = (collapsed?: boolean) =>
  cn(
    "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
    collapsed && "justify-center px-0"
  );

function NavRow({ item, collapsed, onNavClick }: { item: NavItem; collapsed?: boolean; onNavClick?: () => void }) {
  const { to, icon: Icon, label } = item;
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      onClick={onNavClick}
      className={({ isActive }) =>
        cn(
          rowClass(collapsed),
          isActive
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} strokeWidth={1.75} className={cn("shrink-0", isActive && "text-brand-ink")} />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

function NavContent({ collapsed, onNavClick }: { collapsed?: boolean; onNavClick?: () => void }) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const name = session?.user.name || session?.user.email || "U";

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main">
        {navGroups.map((group, i) => (
          <div key={group.label ?? i} className={cn(i > 0 && "mt-5")}>
            {group.label &&
              (collapsed ? (
                <div className="mx-auto mb-2 h-px w-5 bg-border" aria-hidden="true" />
              ) : (
                <p className="mb-1 px-2.5 text-xs text-faint">{group.label}</p>
              ))}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow key={item.to} item={item} collapsed={collapsed} onNavClick={onNavClick} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-border px-3 py-3">
        <NavRow item={settingsItem} collapsed={collapsed} onNavClick={onNavClick} />
        <button
          onClick={toggle}
          title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
          className={cn(rowClass(collapsed), "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
          {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>

        {session?.user && (
          <div
            className={cn("mt-2 flex items-center gap-2.5 px-2.5 py-1.5", collapsed && "justify-center px-0")}
            title={collapsed ? `${session.user.name} · ${session.user.email}` : undefined}
          >
            <UserAvatar name={name} />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{session.user.name}</p>
                  <p className="truncate text-xs text-faint">{session.user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="shrink-0 cursor-pointer rounded-md p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={15} strokeWidth={1.75} />
                </button>
              </>
            )}
          </div>
        )}
        {collapsed && (
          <button
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className={cn(rowClass(true), "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("hisab-sidebar") === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("hisab-sidebar", next ? "collapsed" : "expanded");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <Wordmark />
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="-mr-2 cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 animate-fade-in md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="-mr-1.5 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <NavContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-card md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border",
            collapsed ? "justify-center" : "justify-between pl-5 pr-3"
          )}
        >
          {collapsed ? (
            <button
              onClick={toggleSidebar}
              className="group relative cursor-pointer rounded-lg"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <span className="group-hover:invisible">
                <LogoMark />
              </span>
              <PanelLeftOpen
                size={16}
                strokeWidth={1.75}
                className="invisible absolute inset-0 m-auto text-muted-foreground group-hover:visible"
              />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <LogoMark />
                <Wordmark />
              </div>
              <button
                onClick={toggleSidebar}
                className="cursor-pointer rounded-md p-1.5 text-faint transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={16} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
        <NavContent collapsed={collapsed} />
      </aside>

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
