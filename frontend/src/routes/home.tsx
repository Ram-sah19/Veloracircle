import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, MessageSquarePlus, Plus, ShieldCheck, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/velora/app-shell";
import { CircleCard, MeetingCard } from "@/components/velora/cards";
import { ConversationItem } from "@/components/velora/chat";
import { CreateCircleModal, ScheduleMeetingModal } from "@/components/velora/modals";
import { PrivacyBadge, SectionHeading } from "@/components/velora/primitives";
import { circles, conversations, currentUser, meetings } from "@/lib/mock-data";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Velora Circle" },
      {
        name: "description",
        content:
          "Your private Velora workspace: upcoming meetings, recent conversations and private spaces in one place.",
      },
      { property: "og:title", content: "Home — Velora Circle" },
      {
        property: "og:description",
        content: "Your private workspace, all in one place.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const upcoming = meetings.filter((m) => m.group !== "past").slice(0, 2);

  return (
    <AppShell
      rightPanel={
        <div className="space-y-5">
          <div className="surface-panel rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary h-4 w-4" aria-hidden />
              <p className="text-sm font-semibold">Privacy posture</p>
            </div>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Member directories, counts and presence are hidden across all of your Circles.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PrivacyBadge label="Directory hidden" tone="accent" />
              <PrivacyBadge label="Counts hidden" tone="muted" />
            </div>
          </div>

          <div>
            <SectionHeading title="Quick actions" />
            <div className="space-y-2">
              <CreateCircleModal
                trigger={
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4" /> Create a Circle
                  </Button>
                }
              />
              <ScheduleMeetingModal
                trigger={
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarPlus className="h-4 w-4" /> Schedule meeting
                  </Button>
                }
              />
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/files">Browse shared files</Link>
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Good morning, {currentUser.name.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Your private workspace, all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/meeting/$meetingId" params={{ meetingId: "product-strategy" }}>
                <Video className="h-4 w-4" /> Start Meeting
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/messages">
                <MessageSquarePlus className="h-4 w-4" /> New Message
              </Link>
            </Button>
          </div>
        </header>

        <section>
          <SectionHeading
            title="Upcoming meetings"
            description="Private by default — attendees are never disclosed."
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/meetings">View all</Link>
              </Button>
            }
          />
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading
            title="Recent conversations"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/messages">Open messages</Link>
              </Button>
            }
          />
          <div className="surface-panel rounded-2xl p-2">
            {conversations.slice(0, 4).map((c) => (
              <ConversationItem key={c.id} conversation={c} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading
            title="Private spaces"
            description="Member visibility restricted"
            action={
              <CreateCircleModal
                trigger={
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" /> New Circle
                  </Button>
                }
              />
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {circles.map((c) => (
              <CircleCard key={c.id} circle={c} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
