import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, CalendarX, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/velora/app-shell";
import { MeetingCard } from "@/components/velora/cards";
import { ScheduleMeetingModal } from "@/components/velora/modals";
import { EmptyState, SectionHeading } from "@/components/velora/primitives";
import { meetings } from "@/lib/mock-data";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Velora Circle" },
      {
        name: "description",
        content:
          "Schedule and join private video meetings. Participant lists stay hidden from attendees.",
      },
      { property: "og:title", content: "Meetings — Velora Circle" },
      {
        property: "og:description",
        content: "Private, encrypted meetings for focused teams.",
      },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const today = meetings.filter((m) => m.group === "today");
  const upcoming = meetings.filter((m) => m.group === "upcoming");
  const past = meetings.filter((m) => m.group === "past");

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">Meetings</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Private meetings · Attendee lists are never disclosed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/meeting/$meetingId" params={{ meetingId: "product-strategy" }}>
                <Video className="h-4 w-4" /> Start Instant Meeting
              </Link>
            </Button>
            <ScheduleMeetingModal
              trigger={
                <Button variant="outline">
                  <CalendarPlus className="h-4 w-4" /> Schedule Meeting
                </Button>
              }
            />
          </div>
        </header>

        <section>
          <SectionHeading title="Today" />
          {today.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {today.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarX}
              title="No upcoming meetings"
              description="Your schedule is clear."
              actionLabel="Schedule a meeting"
            />
          )}
        </section>

        <section>
          <SectionHeading title="Upcoming" />
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading title="Past" />
          <div className="grid gap-4 md:grid-cols-2">
            {past.map((m) => (
              <MeetingCard key={m.id} meeting={m} past />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
