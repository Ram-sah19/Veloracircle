import { useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronDown,
  Copy,
  Link as LinkIcon,
  Video,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScheduleMeetingModal } from "@/components/velora/modals";
import { createInstantMeeting, createMeetingForLater } from "@/lib/mock-data";

export function NewMeetingMenu({
  variant = "default",
  className,
}: {
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const navigate = useNavigate();
  const [laterModalOpen, setLaterModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedId, setGeneratedId] = useState("");
  const [copied, setCopied] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const handleStartInstant = () => {
    toast("Starting instant meeting…");
    const meeting = createInstantMeeting();
    navigate({
      to: "/meeting/$meetingId",
      params: { meetingId: meeting.id },
    });
  };

  const handleCreateForLater = () => {
    const { meeting, url } = createMeetingForLater();
    setGeneratedId(meeting.id);
    setGeneratedLink(url);
    setCopied(false);
    setLaterModalOpen(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Meeting link copied to clipboard");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} className={className}>
            <Video className="h-4 w-4" /> New Meeting
            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="glass w-64 p-1.5 shadow-[var(--shadow-float)]">
          <DropdownMenuItem
            onClick={handleStartInstant}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium"
          >
            <span className="bg-primary/10 text-primary grid h-8 w-8 place-items-center rounded-lg">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <p className="leading-tight">Start an instant meeting</p>
              <p className="text-muted-foreground text-[11px]">Join with camera & mic immediately</p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleCreateForLater}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium"
          >
            <span className="bg-primary/10 text-primary grid h-8 w-8 place-items-center rounded-lg">
              <LinkIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="leading-tight">Create a meeting for later</p>
              <p className="text-muted-foreground text-[11px]">Get a shareable link to join anytime</p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            onClick={() => setScheduleModalOpen(true)}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium"
          >
            <span className="bg-primary/10 text-primary grid h-8 w-8 place-items-center rounded-lg">
              <CalendarPlus className="h-4 w-4" />
            </span>
            <div>
              <p className="leading-tight">Schedule a meeting</p>
              <p className="text-muted-foreground text-[11px]">Set date, time, and privacy rules</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* "Create for later" Dialog */}
      <Dialog open={laterModalOpen} onOpenChange={setLaterModalOpen}>
        <DialogContent className="glass sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="text-primary h-5 w-5" /> Here's the link to your meeting
            </DialogTitle>
            <DialogDescription className="text-xs">
              Copy this link and send it to people you want to meet with. Be sure to save it so you
              can use it later, too.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                readOnly
                value={generatedLink}
                className="bg-surface-2/60 pr-10 text-xs font-mono"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              title="Copy link"
              className="h-9 w-9 shrink-0"
            >
              {copied ? (
                <Check className="text-success h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between gap-2 border-t pt-4">
            <Button variant="ghost" size="sm" onClick={() => setLaterModalOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setLaterModalOpen(false);
                navigate({
                  to: "/meeting/$meetingId",
                  params: { meetingId: generatedId },
                });
              }}
            >
              Join now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule meeting modal triggerable programmatically */}
      <ScheduleMeetingModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
      />
    </>
  );
}
