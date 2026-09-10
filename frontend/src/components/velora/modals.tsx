import { CheckCircle2, Lock, ShieldCheck, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { circles } from "@/lib/mock-data";

export function PrivacyToggle({
  label,
  description,
  defaultChecked = true,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="border-border bg-surface-2/40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border px-4 py-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13px] font-medium">
          {label}
        </Label>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">{description}</p>
        )}
      </div>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  );
}

export function CreateCircleModal({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="glass max-h-[90dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="text-primary h-4 w-4" aria-hidden /> Create a Private Circle
          </DialogTitle>
          <DialogDescription>
            Circles are private by default. Visibility settings can be tightened at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="circle-name">Circle name</Label>
            <Input id="circle-name" placeholder="e.g. Project Nova" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="circle-description">Description</Label>
            <Textarea
              id="circle-description"
              rows={3}
              placeholder="What is this Circle for?"
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="circle-privacy">Privacy level</Label>
            <Select defaultValue="private">
              <SelectTrigger id="circle-privacy" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="invite">Invite only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-muted-foreground text-[11px] tracking-widest uppercase">
              Visibility controls
            </p>
            <PrivacyToggle label="Hide member count" />
            <PrivacyToggle label="Hide member directory" />
            <PrivacyToggle label="Hide online status" />
            <PrivacyToggle label="Disable join and leave notifications" />
            <PrivacyToggle label="Restrict invitations" defaultChecked={false} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              toast.success("Circle created", { description: "Member directory hidden by default" });
            }}
          >
            Create Circle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleMeetingModal({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(() => setDone(false), 200);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="glass max-h-[90dvh] overflow-y-auto sm:max-w-[540px]">
        {done ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-2xl">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </span>
            <DialogTitle className="mt-5 text-base">Meeting scheduled</DialogTitle>
            <DialogDescription className="mt-1.5 max-w-xs text-xs">
              Invitations were sent privately. Participants are not disclosed to attendees.
            </DialogDescription>
            <Button className="mt-6" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="text-primary h-4 w-4" aria-hidden /> Schedule a meeting
              </DialogTitle>
              <DialogDescription>
                Meetings inherit the privacy posture of the selected Circle.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-title">Meeting title</Label>
                <Input id="meeting-title" placeholder="Product Strategy" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">Date</Label>
                  <Input id="meeting-date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-time">Time</Label>
                  <Input id="meeting-time" type="time" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-duration">Duration</Label>
                  <Select defaultValue="45">
                    <SelectTrigger id="meeting-duration" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-circle">Circle / participants</Label>
                <Select defaultValue={circles[0]!.id}>
                  <SelectTrigger id="meeting-circle" className="w-full">
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
              <div className="space-y-2">
                <Label htmlFor="meeting-description">Description</Label>
                <Textarea
                  id="meeting-description"
                  rows={3}
                  className="resize-none"
                  placeholder="Agenda and context"
                />
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-[11px] tracking-widest uppercase">
                  Privacy
                </p>
                <PrivacyToggle
                  label="Private meeting"
                  description="Participant list is hidden from attendees."
                />
                <PrivacyToggle label="Invite only" description="Link joining is disabled." />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDone(true)}>Schedule Meeting</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ManageCircleModal({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="glass sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="text-primary h-4 w-4" aria-hidden /> Manage Circle
          </DialogTitle>
          <DialogDescription>
            Administrative controls. Member data shown here is never exposed in member views.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <PrivacyToggle label="Hide member count" />
          <PrivacyToggle label="Hide member directory" />
          <PrivacyToggle label="Hide online status" />
          <PrivacyToggle label="Restrict invitations" defaultChecked={false} />
        </div>
        <DialogFooter>
          <Button asChild variant="outline">
            <a href="/admin">Open management console</a>
          </Button>
          <Button onClick={() => toast.success("Circle settings saved")}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
