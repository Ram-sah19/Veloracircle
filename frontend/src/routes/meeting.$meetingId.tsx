import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  Circle,
  Hand,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  MessageSquare,
  PhoneOff,
  Smile,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageComposer } from "@/components/velora/chat";
import { VeloraLogo } from "@/components/velora/logo";
import { Avatar, IconButton, PrivacyBadge, SecureIndicator } from "@/components/velora/primitives";
import { currentUser, meetings } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meeting/$meetingId")({
  head: () => ({
    meta: [
      { title: "Meeting room — Velora Circle" },
      {
        name: "description",
        content:
          "Secure, private meeting room. Participant counts stay hidden from attendees; hosts manage access.",
      },
      { property: "og:title", content: "Meeting room — Velora Circle" },
      { property: "og:description", content: "Secure meeting · Private participants." },
    ],
  }),
  component: MeetingRoom,
});

const tiles = [
  { name: "Ram Sharma", initials: "RS", self: true, muted: false },
  { name: "Aarav Mehta", initials: "AM", muted: true },
  { name: "Lena Fischer", initials: "LF", muted: false },
  { name: "Priya Nair", initials: "PN", muted: true },
];

function VideoTile({
  name,
  initials,
  self,
  muted,
  large,
}: {
  name: string;
  initials: string;
  self?: boolean;
  muted?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border bg-surface relative overflow-hidden rounded-2xl border",
        large ? "aspect-video" : "aspect-video",
      )}
    >
      <div className="mesh-bg absolute inset-0 opacity-70" aria-hidden />
      <div className="relative grid h-full place-items-center">
        <Avatar initials={initials} size="lg" tone={self ? "brand" : "default"} />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2.5">
        <span className="glass truncate rounded-lg px-2 py-1 text-[11px] font-medium">
          {self ? "You" : name}
        </span>
        {muted && (
          <span className="glass text-muted-foreground grid h-6 w-6 place-items-center rounded-lg">
            <MicOff className="h-3 w-3" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}

function MeetingRoom() {
  const { meetingId } = useParams({ from: "/meeting/$meetingId" });
  const meeting = meetings.find((m) => m.id === meetingId) ?? meetings[0]!;
  const navigate = useNavigate();
  const isHost = currentUser.role === "admin" || currentUser.role === "owner";

  const [joined, setJoined] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);

  if (!joined) {
    return (
      <div className="mesh-bg bg-background flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
        <VeloraLogo />
        <div className="glass mt-8 w-full max-w-md rounded-3xl p-6 text-center shadow-[var(--shadow-float)]">
          <h1 className="text-lg font-semibold">{meeting.title}</h1>
          <p className="text-muted-foreground mt-1 text-xs">{meeting.privacy}</p>

          <div className="border-border bg-surface relative mt-6 aspect-video overflow-hidden rounded-2xl border">
            <div className="mesh-bg absolute inset-0 opacity-70" aria-hidden />
            <div className="relative grid h-full place-items-center">
              {cam ? (
                <Avatar initials={currentUser.initials} size="lg" tone="brand" />
              ) : (
                <VideoOff className="text-muted-foreground h-7 w-7" aria-hidden />
              )}
            </div>
            <span className="glass absolute bottom-2.5 left-2.5 rounded-lg px-2 py-1 text-[11px]">
              Camera preview
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <IconButton
              icon={mic ? Mic : MicOff}
              label={mic ? "Mute microphone" : "Unmute microphone"}
              variant="solid"
              active={mic}
              onClick={() => setMic((v) => !v)}
              className="h-12 w-12"
            />
            <IconButton
              icon={cam ? Video : VideoOff}
              label={cam ? "Turn camera off" : "Turn camera on"}
              variant="solid"
              active={cam}
              onClick={() => setCam((v) => !v)}
              className="h-12 w-12"
            />
          </div>

          <Button className="mt-6 h-11 w-full" onClick={() => setJoined(true)}>
            Join Meeting
          </Button>
          <div className="mt-4 flex justify-center">
            <SecureIndicator />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-[100dvh] flex-col overflow-hidden">
      <header className="border-border safe-top grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{meeting.title}</h1>
            <PrivacyBadge label="Private meeting" tone="accent" />
          </div>
          <div className="mt-1 flex items-center gap-3">
            <SecureIndicator />
            <span className="text-destructive inline-flex items-center gap-1.5 text-[11px]">
              <Circle className="h-2.5 w-2.5 fill-current" aria-hidden /> Recording
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isHost && (
            <IconButton icon={Users} label="Participants" onClick={() => setPeopleOpen(true)} />
          )}
          <IconButton icon={MessageSquare} label="Meeting chat" onClick={() => setChatOpen(true)} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="scrollbar-slim min-w-0 flex-1 overflow-y-auto p-3 pb-32 sm:p-5 sm:pb-32">
          <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2">
            {tiles.map((t, i) => (
              <VideoTile key={t.name} {...t} large={i === 0} />
            ))}
          </div>
        </main>

        <aside className="border-border hidden w-[330px] shrink-0 flex-col border-l xl:flex">
          <div className="border-border border-b px-4 py-3">
            <p className="text-sm font-semibold">Meeting chat</p>
            <p className="text-muted-foreground text-[11px]">Visible to participants only</p>
          </div>
          <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-[13px]">
            <ChatLine author="Lena Fischer" time="18:32" body="Sharing the Nova deck now." />
            <ChatLine author="Aarav Mehta" time="18:33" body="Audio is clear on my side." />
            <ChatLine author="You" time="18:35" body="Let's start with the privacy matrix." self />
          </div>
          <MessageComposer placeholder="Message the meeting…" />
        </aside>
      </div>

      {/* Floating control bar */}
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-4">
        <div className="glass pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl p-2 shadow-[var(--shadow-float)]">
          <IconButton
            icon={mic ? Mic : MicOff}
            label={mic ? "Mute" : "Unmute"}
            variant="solid"
            active={mic}
            onClick={() => setMic((v) => !v)}
            className="h-12 w-12"
          />
          <IconButton
            icon={cam ? Video : VideoOff}
            label={cam ? "Stop camera" : "Start camera"}
            variant="solid"
            active={cam}
            onClick={() => setCam((v) => !v)}
            className="h-12 w-12"
          />
          <IconButton
            icon={MonitorUp}
            label="Share screen"
            variant="solid"
            className="hidden h-12 w-12 sm:inline-flex"
            onClick={() => toast("Screen sharing started")}
          />
          <IconButton
            icon={Hand}
            label="Raise hand"
            variant="solid"
            className="h-12 w-12"
            onClick={() => toast("Hand raised")}
          />
          <IconButton
            icon={Smile}
            label="Reactions"
            variant="solid"
            className="hidden h-12 w-12 sm:inline-flex"
          />
          <IconButton
            icon={MessageSquare}
            label="Chat"
            variant="solid"
            className="h-12 w-12 xl:hidden"
            onClick={() => setChatOpen(true)}
          />
          {isHost && (
            <IconButton
              icon={Users}
              label="Participants"
              variant="solid"
              className="h-12 w-12"
              onClick={() => setPeopleOpen(true)}
            />
          )}
          <IconButton
            icon={MoreHorizontal}
            label="More"
            variant="solid"
            className="hidden h-12 w-12 sm:inline-flex"
          />
          <IconButton
            icon={PhoneOff}
            label="Leave meeting"
            variant="danger"
            className="h-12 w-14"
            onClick={() => void navigate({ to: "/meetings" })}
          />
        </div>
      </div>

      {/* Mobile / tablet chat sheet */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="bottom" className="h-[80dvh] p-0">
          <SheetHeader className="border-border grid grid-cols-[minmax(0,1fr)_auto] items-center border-b">
            <SheetTitle className="truncate">Meeting chat</SheetTitle>
            <IconButton icon={X} label="Close chat" onClick={() => setChatOpen(false)} />
          </SheetHeader>
          <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-[13px]">
            <ChatLine author="Lena Fischer" time="18:32" body="Sharing the Nova deck now." />
            <ChatLine author="Aarav Mehta" time="18:33" body="Audio is clear on my side." />
          </div>
          <MessageComposer placeholder="Message the meeting…" />
        </SheetContent>
      </Sheet>

      {/* Host-only participants sheet */}
      <Sheet open={peopleOpen} onOpenChange={setPeopleOpen}>
        <SheetContent side="bottom" className="h-[70dvh] p-0">
          <SheetHeader className="border-border border-b">
            <SheetTitle>Participants</SheetTitle>
            <p className="text-muted-foreground text-xs">
              Host view only. Attendees never see this list.
            </p>
          </SheetHeader>
          <div className="scrollbar-slim min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            {tiles.map((t) => (
              <div
                key={t.name}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <Avatar initials={t.initials} size="sm" tone={t.self ? "brand" : "default"} />
                <span className="truncate text-[13px]">{t.self ? "You" : t.name}</span>
                <span className="text-muted-foreground text-[11px]">
                  {t.muted ? "Muted" : "Speaking"}
                </span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ChatLine({
  author,
  time,
  body,
  self,
}: {
  author: string;
  time: string;
  body: string;
  self?: boolean;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px]">
        <span className={cn("font-medium", self ? "text-primary" : "text-foreground/70")}>
          {author}
        </span>
        {time}
      </div>
      <p className="text-foreground/90">{body}</p>
    </div>
  );
}
