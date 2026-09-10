import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  UserRound,
  Users,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/velora/app-shell";
import { PrivacyToggle } from "@/components/velora/modals";
import { Avatar, SectionHeading } from "@/components/velora/primitives";
import { useTheme } from "@/components/velora/theme";
import { currentUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Velora Circle" },
      {
        name: "description",
        content:
          "Control account, privacy, notification, security and appearance preferences in Velora Circle.",
      },
      { property: "og:title", content: "Settings — Velora Circle" },
      { property: "og:description", content: "Privacy-first preferences and controls." },
    ],
  }),
  component: SettingsPage,
});

const sections = [
  { key: "account", label: "Account", icon: UserRound },
  { key: "privacy", label: "Privacy", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Lock },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "meetings", label: "Meetings", icon: CalendarClock },
  { key: "circles", label: "Circles", icon: Users },
  { key: "devices", label: "Devices", icon: Monitor },
] as const;

function SettingsPage() {
  const [active, setActive] = useState<(typeof sections)[number]["key"]>("privacy");
  const { theme, setTheme } = useTheme();

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Preferences apply across every device signed in to your account.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="Settings sections"
            className="scrollbar-slim -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
          >
            {sections.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                aria-current={active === s.key ? "true" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  active === s.key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <s.icon className="h-4 w-4" aria-hidden />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 space-y-4">
            {active === "account" && (
              <div className="surface-panel space-y-5 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <Avatar initials={currentUser.initials} size="lg" tone="brand" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{currentUser.email}</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display name</Label>
                    <Input id="display-name" defaultValue={currentUser.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Input id="status" defaultValue={currentUser.status} />
                  </div>
                </div>
                <Button onClick={() => toast.success("Account updated")}>Save changes</Button>
              </div>
            )}

            {active === "privacy" && (
              <>
                <div className="surface-panel space-y-4 rounded-2xl p-5">
                  <SectionHeading
                    title="Visibility"
                    description="Control what other people can learn about you."
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="online-visibility">Who can see my online status?</Label>
                      <Select defaultValue="nobody">
                        <SelectTrigger id="online-visibility" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nobody">Nobody</SelectItem>
                          <SelectItem value="contacts">Direct contacts</SelectItem>
                          <SelectItem value="circles">My Circles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-policy">Who can invite me?</Label>
                      <Select defaultValue="admins">
                        <SelectTrigger id="invite-policy" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nobody">Nobody</SelectItem>
                          <SelectItem value="admins">Admins and Owners</SelectItem>
                          <SelectItem value="contacts">People I know</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <PrivacyToggle label="Show read receipts" defaultChecked={false} />
                    <PrivacyToggle label="Allow message forwarding" defaultChecked={false} />
                    <PrivacyToggle label="Allow file downloads" />
                  </div>
                </div>

                <div className="surface-panel space-y-3 rounded-2xl p-5">
                  <SectionHeading
                    title="Circle privacy defaults"
                    description="Applied to every new Circle you create."
                  />
                  <PrivacyToggle label="Hide member count" />
                  <PrivacyToggle label="Hide member directory" />
                  <PrivacyToggle label="Hide online members" />
                  <PrivacyToggle label="Restrict invitations" />
                </div>
              </>
            )}

            {active === "notifications" && (
              <div className="surface-panel space-y-3 rounded-2xl p-5">
                <SectionHeading title="Notifications" />
                <PrivacyToggle label="Direct messages" />
                <PrivacyToggle label="Circle mentions" />
                <PrivacyToggle label="Meeting reminders" />
                <PrivacyToggle label="File shares" defaultChecked={false} />
              </div>
            )}

            {active === "security" && (
              <div className="surface-panel space-y-3 rounded-2xl p-5">
                <SectionHeading title="Security" />
                <PrivacyToggle label="Two-factor authentication" />
                <PrivacyToggle label="Require device approval" />
                <PrivacyToggle label="Auto-lock after inactivity" />
                <Button variant="outline" onClick={() => toast("Sessions revoked")}>
                  Sign out all other sessions
                </Button>
              </div>
            )}

            {active === "appearance" && (
              <div className="surface-panel space-y-4 rounded-2xl p-5">
                <SectionHeading title="Appearance" description="Your preference is remembered." />
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      aria-pressed={theme === t}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-4 text-left text-[13px] transition-colors",
                        theme === t
                          ? "border-primary/40 bg-primary/10"
                          : "border-border hover:bg-accent/50",
                      )}
                    >
                      {t === "dark" ? (
                        <Moon className="h-4 w-4" aria-hidden />
                      ) : (
                        <Sun className="h-4 w-4" aria-hidden />
                      )}
                      {t === "dark" ? "Dark (recommended)" : "Light"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {active === "meetings" && (
              <div className="surface-panel space-y-3 rounded-2xl p-5">
                <SectionHeading title="Meetings" />
                <PrivacyToggle label="Join with camera off" />
                <PrivacyToggle label="Join muted" />
                <PrivacyToggle label="Hide participant list from attendees" />
                <PrivacyToggle label="Allow recording" defaultChecked={false} />
              </div>
            )}

            {active === "circles" && (
              <div className="surface-panel space-y-3 rounded-2xl p-5">
                <SectionHeading title="Circles" />
                <PrivacyToggle label="Hide member count" />
                <PrivacyToggle label="Hide member directory" />
                <PrivacyToggle label="Disable join and leave notifications" />
              </div>
            )}

            {active === "devices" && (
              <div className="surface-panel rounded-2xl p-5">
                <SectionHeading title="Devices" description="Active sessions on your account." />
                <ul className="space-y-2">
                  {[
                    { name: "MacBook Pro · Safari", meta: "This device · Mumbai" },
                    { name: "iPhone 15 Pro", meta: "Last active 2 h ago" },
                    { name: "iPad Air", meta: "Last active yesterday" },
                  ].map((d) => (
                    <li
                      key={d.name}
                      className="border-border grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{d.name}</p>
                        <p className="text-muted-foreground truncate text-[11px]">{d.meta}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => toast("Device removed")}>
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
