import { Link } from "@tanstack/react-router";
import {
  Clock,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  MoreHorizontal,
  Radio,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PrivacyBadge } from "@/components/velora/primitives";
import type { Circle, FileItem, Meeting } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function CircleCard({ circle }: { circle: Circle }) {
  return (
    <Link
      to="/circles/$circleId"
      params={{ circleId: circle.id }}
      className="surface-panel focus-visible:ring-ring group hover:border-border-strong block rounded-2xl p-5 transition-all duration-200 outline-none hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevate)] focus-visible:ring-2"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <h3 className="truncate text-sm font-semibold">{circle.name}</h3>
        <PrivacyBadge label={circle.privacy} tone="accent" />
      </div>
      <p className="text-muted-foreground mt-2.5 line-clamp-2 text-xs leading-relaxed">
        {circle.description}
      </p>
      <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-[11px]">
        <Clock className="h-3 w-3" aria-hidden />
        {circle.activity}
      </div>
    </Link>
  );
}

export function MeetingCard({ meeting, past }: { meeting: Meeting; past?: boolean }) {
  return (
    <div className="surface-panel hover:border-border-strong rounded-2xl p-5 transition-all duration-200 hover:shadow-[var(--shadow-elevate)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{meeting.title}</h3>
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {meeting.day} · {meeting.time} · {meeting.duration}
          </p>
        </div>
        <PrivacyBadge label={meeting.privacy} tone={past ? "muted" : "accent"} />
      </div>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <p className="text-muted-foreground truncate text-[11px]">Host · {meeting.host}</p>
        {past ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast("Meeting summary", { description: meeting.title })}
          >
            View summary
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link to="/meeting/$meetingId" params={{ meetingId: meeting.id }}>
              <Video className="h-4 w-4" /> Join
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

const fileIcon = {
  pdf: FileText,
  doc: FileText,
  image: FileImage,
  sheet: FileSpreadsheet,
  zip: FileArchive,
  video: FileVideo,
};

export function FileRow({ file }: { file: FileItem }) {
  const Icon = fileIcon[file.type];
  return (
    <div className="border-border hover:bg-accent/40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-3 transition-colors last:border-b-0 sm:px-4">
      <span className="bg-surface-2 text-primary border-border grid h-10 w-10 shrink-0 place-items-center rounded-xl border">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">{file.name}</p>
        <p className="text-muted-foreground truncate text-[11px]">
          {file.owner} · {file.date} · {file.size}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${file.name}`}
            className="text-muted-foreground hover:bg-accent hover:text-foreground grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => toast("Download started")}>Download</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast("Saved to your library")}>Save</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast("Share link copied")}>Share</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => toast("Removed")}>
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon = Users,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: typeof Users;
  tone?: "brand";
}) {
  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[11px] tracking-widest uppercase">{label}</p>
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg border",
            tone === "brand"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-surface-2 text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="font-display mt-3 text-2xl font-bold">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-[11px]">{hint}</p>}
    </div>
  );
}

export function LiveDot({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
      <Radio className="text-success h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
