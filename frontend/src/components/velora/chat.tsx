import {
  CornerUpLeft,
  Copy,
  FileText,
  Forward,
  Mic,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Send,
  Smile,
  Bookmark,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, IconButton } from "@/components/velora/primitives";
import type { Conversation, Message } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function ConversationItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "focus-visible:ring-ring grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-200 outline-none focus-visible:ring-2",
        active ? "border-border bg-surface-2/80" : "hover:bg-accent/50",
      )}
    >
      <Avatar initials={conversation.initials} size="md" tone={active ? "brand" : "default"} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{conversation.name}</span>
        <span className="text-muted-foreground block truncate text-xs">{conversation.preview}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-muted-foreground text-[11px]">{conversation.time}</span>
        {conversation.unread ? (
          <span className="bg-primary text-primary-foreground min-w-5 rounded-full px-1.5 text-center text-[10px] leading-[18px] font-semibold">
            {conversation.unread}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function MessageActions() {
  const act = (label: string) => toast(label, { description: "Mock action" });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Message actions"
          className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => act("Reply")}>
          <CornerUpLeft className="h-4 w-4" /> Reply
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => act("Reaction added")}>
          <Smile className="h-4 w-4" /> React
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => act("Copied")}>
          <Copy className="h-4 w-4" /> Copy
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => act("Saved")}>
          <Bookmark className="h-4 w-4" /> Save
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => act("Forwarded")}>
          <Forward className="h-4 w-4" /> Forward
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => act("Deleted")}>
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const self = message.self;
  return (
    <div
      className={cn(
        "animate-velora-in group flex w-full gap-3",
        self ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar initials={message.initials} size="sm" tone={self ? "brand" : "default"} />
      <div className={cn("flex min-w-0 max-w-[min(560px,82%)] flex-col", self && "items-end")}>
        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px]">
          <span className="text-foreground/70 font-medium">{self ? "You" : message.author}</span>
          <span>{message.time}</span>
          <MessageActions />
        </div>

        {message.replyTo && (
          <div className="border-primary/50 bg-surface-2/50 text-muted-foreground mb-1.5 max-w-full truncate rounded-lg border-l-2 px-3 py-1.5 text-[11px]">
            <span className="text-foreground/70 font-medium">{message.replyTo.author}: </span>
            {message.replyTo.body}
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl border px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm transition-shadow",
            self
              ? "border-primary/30 bg-primary/15 rounded-tr-md"
              : "border-border bg-surface rounded-tl-md",
          )}
        >
          {message.kind === "file" && message.file && (
            <div className="border-border bg-surface-2/70 mb-2 flex items-center gap-3 rounded-xl border p-2.5">
              <span className="bg-primary/10 text-primary grid h-9 w-9 shrink-0 place-items-center rounded-lg">
                <FileText className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{message.file.name}</span>
                <span className="text-muted-foreground block text-[11px]">{message.file.size}</span>
              </span>
            </div>
          )}
          {message.kind === "voice" ? (
            <div className="flex items-center gap-3">
              <span className="bg-primary/15 text-primary grid h-8 w-8 place-items-center rounded-full">
                <Play className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="flex h-6 items-end gap-[3px]" aria-hidden>
                {[6, 12, 18, 9, 22, 14, 8, 16, 11, 20, 7, 13, 17, 9].map((h, i) => (
                  <span
                    key={i}
                    className="bg-primary/50 w-[3px] rounded-full"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </span>
              <span className="text-muted-foreground text-[11px]">0:42</span>
            </div>
          ) : (
            message.body
          )}
        </div>

        {message.reactions && (
          <div className="mt-1.5 flex gap-1.5">
            {message.reactions.map((r) => (
              <span
                key={r.emoji}
                className="border-border bg-surface-2/70 text-muted-foreground rounded-full border px-2 py-0.5 text-[11px]"
              >
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageComposer({ placeholder = "Message…" }: { placeholder?: string }) {
  const [value, setValue] = useState("");

  const send = () => {
    if (!value.trim()) return;
    toast.success("Message sent", { description: "Encrypted end-to-end" });
    setValue("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="border-border bg-surface/80 safe-bottom border-t p-3 backdrop-blur-xl sm:p-4"
    >
      <div className="border-border bg-surface-2/60 focus-within:border-primary/40 flex items-end gap-1.5 rounded-2xl border p-1.5 transition-colors">
        <IconButton icon={Plus} label="More options" className="h-9 w-9" />
        <IconButton icon={Paperclip} label="Attach file" className="hidden h-9 w-9 sm:inline-flex" />
        <label className="sr-only" htmlFor="composer">
          Write a message
        </label>
        <textarea
          id="composer"
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          className="placeholder:text-muted-foreground max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
        />
        <IconButton icon={Smile} label="Emoji" className="hidden h-9 w-9 sm:inline-flex" />
        <IconButton icon={Mic} label="Record voice message" className="h-9 w-9" />
        <button
          type="submit"
          aria-label="Send message"
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 outline-none hover:brightness-110 active:scale-95 focus-visible:ring-2"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}
