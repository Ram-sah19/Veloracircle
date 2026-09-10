import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bookmark,
  Boxes,
  CalendarClock,
  CircleUser,
  FolderClosed,
  Home,
  LifeBuoy,
  Lock,
  Menu,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/velora/command-palette";
import { VeloraLogo } from "@/components/velora/logo";
import { NotificationsMenu, ThemeToggle, UserMenu } from "@/components/velora/menus";
import { Avatar } from "@/components/velora/primitives";
import { currentUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const mainNav = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/messages", label: "Messages", icon: MessagesSquare },
  { to: "/circles", label: "Circles", icon: Users },
  { to: "/meetings", label: "Meetings", icon: CalendarClock },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/files", label: "Files", icon: FolderClosed },
] as const;

const workspaceNav = [
  { to: "/home", label: "My Workspace", icon: Boxes },
  { to: "/circles", label: "Private Spaces", icon: Lock },
  { to: "/files", label: "Shared Projects", icon: FolderClosed },
] as const;

const mobileNav = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/messages", label: "Messages", icon: MessagesSquare },
  { to: "/circles", label: "Circles", icon: Users },
  { to: "/meetings", label: "Meetings", icon: CalendarClock },
  { to: "/settings", label: "Profile", icon: CircleUser },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  collapsed?: boolean | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || (to !== "/home" && pathname.startsWith(to));

  return (
    <Link
      to={to as "/home"}
      onClick={onNavigate}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 outline-none focus-visible:ring-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <span
        className={cn(
          "bg-primary absolute left-0 h-5 w-[3px] rounded-r-full transition-all duration-200",
          active ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
      <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SidebarBody({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("px-4 pt-5 pb-4", collapsed && "flex justify-center px-2")}>
        <Link to="/home" aria-label="Velora Circle home">
          <VeloraLogo compact={collapsed} />
        </Link>
      </div>

      <nav className="scrollbar-slim min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        {mainNav.map((item) => (
          <NavLink key={item.label} {...item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        <div className="border-border my-3 border-t" />

        {!collapsed && (
          <p className="text-muted-foreground px-3 pt-1 pb-2 text-[10px] tracking-[0.2em] uppercase">
            Workspace
          </p>
        )}
        {workspaceNav.map((item) => (
          <NavLink
            key={item.label}
            {...item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}

        <div className="border-border my-3 border-t" />
        <NavLink
          to="/admin"
          label="Management"
          icon={ShieldCheck}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="space-y-1 px-3 pt-3 pb-4">
        <NavLink
          to="/settings"
          label="Settings"
          icon={Settings}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <NavLink
          to="/help"
          label="Help & Support"
          icon={LifeBuoy}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <div className="border-border mt-2 border-t pt-2">
          <UserMenu compact={collapsed} />
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  rightPanel,
  flush = false,
}: {
  children: ReactNode;
  rightPanel?: ReactNode;
  flush?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="bg-background flex h-[100dvh] w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "bg-sidebar border-sidebar-border hidden shrink-0 border-r transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="border-border bg-background/80 safe-top grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2.5 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors lg:hidden"
                >
                  <Menu className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-sidebar w-[290px] p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarBody onNavigate={() => setDrawerOpen(false)} />
              </SheetContent>
            </Sheet>

            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((v) => !v)}
              className="text-muted-foreground hover:bg-accent hover:text-foreground hidden h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors lg:grid"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="border-border bg-surface/60 text-muted-foreground hover:border-border-strong hover:text-foreground focus-visible:ring-ring flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3 text-left text-[13px] transition-colors outline-none focus-visible:ring-2 sm:max-w-md"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Search messages, circles, meetings…</span>
              <kbd className="border-border bg-surface-2 ml-auto hidden shrink-0 rounded-md border px-1.5 py-0.5 font-sans text-[10px] sm:block">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <NotificationsMenu />
            <div className="hidden sm:block">
              <UserMenu compact />
            </div>
            <Link to="/settings" className="sm:hidden" aria-label="Profile">
              <Avatar initials={currentUser.initials} size="sm" tone="brand" />
            </Link>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main
            className={cn(
              "scrollbar-slim min-w-0 flex-1 overflow-y-auto",
              flush ? "" : "px-4 pt-5 pb-24 sm:px-6 lg:pb-8",
            )}
          >
            {children}
          </main>
          {rightPanel && (
            <aside className="border-border bg-sidebar/40 scrollbar-slim hidden w-[320px] shrink-0 overflow-y-auto border-l p-5 xl:block">
              {rightPanel}
            </aside>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="border-border bg-background/95 safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t backdrop-blur-xl lg:hidden"
      >
        {mobileNav.map((item) => (
          <MobileNavItem key={item.label} {...item} />
        ))}
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function MobileNavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof Home;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
  return (
    <Link
      to={to as "/home"}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </Link>
  );
}
