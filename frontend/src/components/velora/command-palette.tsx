import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, FileText, Hash, MessageSquare } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { circles, conversations, files, meetings } from "@/lib/mock-data";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search messages, circles, meetings, files…" />
      <CommandList className="scrollbar-slim">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Messages">
          {conversations.slice(0, 4).map((c) => (
            <CommandItem key={c.id} value={`message ${c.name} ${c.preview}`} onSelect={() => go("/messages")}>
              <MessageSquare className="h-4 w-4" />
              <span className="truncate">{c.name}</span>
              <span className="text-muted-foreground ml-auto truncate text-xs">{c.preview}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Circles">
          {circles.map((c) => (
            <CommandItem key={c.id} value={`circle ${c.name}`} onSelect={() => go(`/circles/${c.id}`)}>
              <Hash className="h-4 w-4" />
              <span className="truncate">{c.name}</span>
              <span className="text-muted-foreground ml-auto text-xs">{c.privacy}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Meetings">
          {meetings.slice(0, 4).map((m) => (
            <CommandItem key={m.id} value={`meeting ${m.title}`} onSelect={() => go("/meetings")}>
              <CalendarClock className="h-4 w-4" />
              <span className="truncate">{m.title}</span>
              <span className="text-muted-foreground ml-auto text-xs">
                {m.day} · {m.time}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Files">
          {files.slice(0, 4).map((f) => (
            <CommandItem key={f.id} value={`file ${f.name}`} onSelect={() => go("/files")}>
              <FileText className="h-4 w-4" />
              <span className="truncate">{f.name}</span>
              <span className="text-muted-foreground ml-auto text-xs">{f.size}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
