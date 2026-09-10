import { createFileRoute } from "@tanstack/react-router";
import { Activity, MailPlus, Search, ShieldAlert, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/velora/app-shell";
import { StatCard } from "@/components/velora/cards";
import { Avatar, PrivacyBadge, SectionHeading } from "@/components/velora/primitives";
import { circles, members } from "@/lib/mock-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Management console — Velora Circle" },
      {
        name: "description",
        content:
          "Owner and Admin console for Circle statistics, member roles and invitations. Never visible to members.",
      },
      { property: "og:title", content: "Management console — Velora Circle" },
      { property: "og:description", content: "Administrative controls for Circle owners." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [query, setQuery] = useState("");
  const list = members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-9">
        <header className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">Management console</h1>
              <PrivacyBadge label="Owner / Admin only" tone="accent" icon={ShieldAlert} />
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Statistics and member data shown here never appear in member views.
            </p>
          </div>
          <Button onClick={() => toast.success("Invitation sent")}>
            <MailPlus className="h-4 w-4" /> Invite member
          </Button>
        </header>

        <section>
          <SectionHeading title="Circle overview" description="Alpha Circle" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active conversations" value="38" hint="+6 this week" icon={Activity} tone="brand" />
            <StatCard label="Members" value="125" hint="Hidden from members" icon={Users} />
            <StatCard label="Pending invites" value="9" hint="3 expiring soon" icon={MailPlus} />
            <StatCard label="Reports" value="2" hint="Awaiting review" icon={ShieldAlert} />
          </div>
        </section>

        <section>
          <SectionHeading title="Member management" />
          <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members"
                aria-label="Search members"
                className="pl-9"
              />
            </div>
            <Select defaultValue={circles[0]!.id}>
              <SelectTrigger className="w-full" aria-label="Filter by Circle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {circles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="surface-panel overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-[11px] tracking-wider uppercase">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-border hover:bg-accent/30 border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar initials={m.initials} size="sm" />
                        <span className="truncate font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PrivacyBadge label={m.role} tone={m.role === "Owner" ? "accent" : "muted"} icon={Users} />
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{m.status}</td>
                    <td className="text-muted-foreground px-4 py-3">{m.joined}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" aria-label={`Manage ${m.name}`}>
                            Manage
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => toast("Role updated")}>
                            Change role
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast("Access suspended")}>
                            Suspend access
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => toast("Member removed")}>
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
