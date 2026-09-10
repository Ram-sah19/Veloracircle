import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  FileText,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, IconButton } from "@/components/velora/primitives";
import { useTheme } from "@/components/velora/theme";
import { currentUser, notifications } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const iconFor = {
  message: MessageSquare,
  meeting: CalendarClock,
  invite: UserPlus,
  file: FileText,
  schedule: CalendarClock,
};

export function NotificationsMenu() {
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications, ${unread} unread`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors outline-none focus-visible:ring-2"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread > 0 && (
            <span className="bg-primary ring-background absolute top-2 right-2 h-2 w-2 rounded-full ring-2" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <span className="text-muted-foreground text-[11px]">{unread} unread</span>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="scrollbar-slim max-h-[360px] overflow-y-auto py-1">
          {notifications.map((n) => {
            const Icon = iconFor[n.kind];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => toast.success("Notification opened", { description: n.title })}
                className="hover:bg-accent/60 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
                    n.unread
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-surface-2 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{n.title}</span>
                  <span className="text-muted-foreground block truncate text-xs">{n.body}</span>
                </span>
                <span className="text-muted-foreground shrink-0 text-[11px]">{n.time}</span>
              </button>
            );
          })}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem className="justify-between px-4 py-2.5 text-xs">
          Mark all as read <ChevronRight className="h-3.5 w-3.5" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu({ compact = false }: { compact?: boolean | undefined }) {
  const { theme, toggle } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className={cn(
            "hover:bg-accent focus-visible:ring-ring flex items-center gap-3 rounded-xl p-1.5 text-left transition-colors outline-none focus-visible:ring-2",
            compact ? "justify-center" : "w-full",
          )}
        >
          <Avatar initials={currentUser.initials} size="sm" tone="brand" />
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{currentUser.name}</span>
              <span className="text-muted-foreground block truncate text-[11px]">
                {currentUser.status}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-3">
          <Avatar initials={currentUser.initials} tone="brand" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{currentUser.name}</span>
            <span className="text-muted-foreground block truncate text-[11px] font-normal">
              {currentUser.email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <UserRound className="h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Shield className="h-4 w-4" /> Privacy
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Bell className="h-4 w-4" /> Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Palette className="h-4 w-4" /> Appearance
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Monitor className="h-4 w-4" /> Devices
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggle(); }}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/">
            <LogOut className="h-4 w-4" /> Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <IconButton
      icon={theme === "dark" ? Sun : Moon}
      label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    />
  );
}
