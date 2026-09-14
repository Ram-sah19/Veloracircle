import {
  BookmarkIcon,
  Check,
  CheckCheck,
  Code2,
  Copy,
  CornerUpLeft,
  FileText,
  Forward,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  Send,
  Smile,
  Trash2,
  Video,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, IconButton } from "@/components/velora/primitives";
import type { Conversation, Message } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return "";
  if (timeStr.toLowerCase() === "just now") return "Just now";
  if (!timeStr.includes("T") && !timeStr.includes("-")) return timeStr;
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return timeStr;
  }
}

// ─── ConversationItem ──────────────────────────────────────────────────────────

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

// ─── Emoji Quick Picker ────────────────────────────────────────────────────────

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

function EmojiPicker({
  onReact,
  userReacted,
}: {
  onReact: (emoji: string) => void;
  userReacted?: string;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-border bg-surface shadow-lg px-1 py-1">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          title={emoji}
          onClick={() => onReact(emoji)}
          className={cn(
            "h-7 w-7 rounded-lg text-base transition-all hover:scale-125 hover:bg-accent/50",
            userReacted === emoji && "ring-2 ring-primary/60 bg-primary/10",
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ─── Read Receipt Tick ─────────────────────────────────────────────────────────

function ReadTick({ readBy, currentUserId }: { readBy?: string[]; currentUserId?: string }) {
  const isRead = Array.isArray(readBy) && readBy.some((id) => !currentUserId || id !== currentUserId);
  return isRead ? (
    <CheckCheck className="h-3 w-3 text-primary" aria-label="Read" />
  ) : (
    <CheckCheck className="h-3 w-3 text-muted-foreground/60" aria-label="Delivered" />
  );
}

// ─── Poll Card ─────────────────────────────────────────────────────────────────

function PollCard({
  poll,
  messageId,
  onVote,
}: {
  poll: NonNullable<Message["poll"]>;
  messageId: string;
  onVote?: (messageId: string, optionIndex: number) => void;
}) {
  const totalVotes = poll.options.reduce((s, o) => s + (o.votes || 0), 0);
  return (
    <div className="space-y-2 min-w-[200px]">
      <p className="font-semibold text-[13px]">📊 {poll.question}</p>
      {poll.options.map((opt, i) => {
        const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
        return (
          <button
            key={i}
            type="button"
            disabled={poll.closed}
            onClick={() => onVote && onVote(messageId, i)}
            className={cn(
              "relative w-full rounded-lg border px-3 py-2 text-left text-[12px] transition-colors overflow-hidden",
              opt.votedByMe
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-surface-2/60 hover:bg-accent/40",
              poll.closed && "cursor-default",
            )}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
              style={{ width: `${pct}%` }}
            />
            <span className="relative flex items-center justify-between gap-2">
              <span>{opt.text}</span>
              <span className="font-semibold text-muted-foreground">
                {pct}% ({opt.votes || 0})
              </span>
            </span>
          </button>
        );
      })}
      <p className="text-[11px] text-muted-foreground">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        {poll.closed ? " · Poll closed" : ""}
      </p>
    </div>
  );
}

// ─── Code Block ────────────────────────────────────────────────────────────────

function CodeBlock({ body, lang }: { body: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(body || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="group/code rounded-xl border border-border bg-zinc-950 overflow-hidden text-[12px] leading-relaxed font-mono min-w-[220px]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/5">
        <span className="text-zinc-400 text-[11px]">{lang || "code"}</span>
        <button
          type="button"
          onClick={copy}
          title="Copy code"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-zinc-100 whitespace-pre-wrap break-words">
        <code>{body}</code>
      </pre>
    </div>
  );
}

// ─── Message Actions Dropdown ──────────────────────────────────────────────────

function MessageActions({
  messageId,
  self,
  onPin,
  onReply,
  onDelete,
}: {
  messageId: string;
  self: boolean;
  onPin?: (id: string) => void;
  onReply?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
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
        {onReply && (
          <DropdownMenuItem onSelect={() => onReply(messageId)}>
            <CornerUpLeft className="h-4 w-4" /> Reply
          </DropdownMenuItem>
        )}
        {onPin && (
          <DropdownMenuItem onSelect={() => onPin(messageId)}>
            <Pin className="h-4 w-4" /> Pin
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => {
            navigator.clipboard.writeText("");
            toast("Copied to clipboard");
          }}
        >
          <Copy className="h-4 w-4" /> Copy
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast("Saved!")}>
          <BookmarkIcon className="h-4 w-4" /> Save
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast("Forwarded!")}>
          <Forward className="h-4 w-4" /> Forward
        </DropdownMenuItem>
        {self && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(messageId)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────

export function MessageBubble({
  message,
  currentUserId,
  onReact,
  onVote,
  onPin,
  onReply,
  onDelete,
}: {
  message: Message;
  currentUserId?: string;
  onReact?: (messageId: string, emoji: string, remove: boolean) => void;
  onVote?: (messageId: string, optionIndex: number) => void;
  onPin?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}) {
  const self = Boolean(message.self);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const userReactedEmoji = message.reactions?.find((r) => r.userReacted)?.emoji;

  const handleReact = (emoji: string) => {
    const alreadyReacted = message.reactions?.find((r) => r.emoji === emoji && r.userReacted);
    onReact?.(message.id, emoji, Boolean(alreadyReacted));
    setShowEmojiPicker(false);
  };

  return (
    <div
      className={cn("animate-velora-in group flex w-full gap-3", self ? "flex-row-reverse" : "flex-row")}
    >
      <Avatar initials={message.initials} size="sm" tone={self ? "brand" : "default"} />
      <div className={cn("flex min-w-0 max-w-[min(560px,82%)] flex-col", self ? "items-end" : "items-start")}>
        {/* Author row */}
        <div className={cn("text-muted-foreground mb-1 flex items-center gap-2 text-[11px]", self && "flex-row-reverse")}>
          <span className={cn("font-medium", self ? "text-primary font-semibold" : "text-foreground font-semibold")}>
            {self ? "You" : message.author}
          </span>
          <span>{formatDisplayTime(message.time)}</span>
          {/* Read tick (only for own messages) */}
          {self && (
            <ReadTick readBy={message.readBy} currentUserId={currentUserId} />
          )}
          {/* Emoji react trigger */}
          <div className="relative">
            <button
              type="button"
              title="React"
              onClick={() => setShowEmojiPicker((p) => !p)}
              className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
            {showEmojiPicker && (
              <div
                className={cn(
                  "absolute z-50 mt-1",
                  self ? "right-0" : "left-0",
                  "top-full",
                )}
              >
                <EmojiPicker onReact={handleReact} userReacted={userReactedEmoji} />
              </div>
            )}
          </div>
          <MessageActions
            messageId={message.id}
            self={self}
            onPin={onPin}
            onReply={onReply}
            onDelete={onDelete}
          />
        </div>

        {/* Reply preview */}
        {message.replyTo && (
          <div className="border-primary/50 bg-surface-2/50 text-muted-foreground mb-1.5 max-w-full truncate rounded-lg border-l-2 px-3 py-1.5 text-[11px]">
            <span className="text-foreground/70 font-medium">{message.replyTo.author}: </span>
            {message.replyTo.body}
          </div>
        )}

        {/* Bubble body */}
        {message.kind === "code" ? (
          <CodeBlock body={message.body || ""} lang={message.codeLang} />
        ) : (
          <div
            className={cn(
              "rounded-2xl border px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm transition-shadow",
              self ? "border-primary/30 bg-primary/15 rounded-tr-md" : "border-border bg-surface rounded-tl-md",
              message.isPinned && "ring-1 ring-amber-400/60",
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

            {message.kind === "poll" && message.poll ? (
              <PollCard poll={message.poll} messageId={message.id} onVote={onVote} />
            ) : (
              <>
                <div>{message.body}</div>
                {(() => {
                  const meetingMatch = message.body?.match(/(?:https?:\/\/[^\s]+)?(\/meeting\/(vel-[a-z0-9-]+))/i);
                  if (!meetingMatch) return null;
                  const meetingPath = meetingMatch[1];
                  return (
                    <div className="mt-2.5 rounded-xl border border-primary/30 bg-primary/10 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <Video className="h-4 w-4" />
                        <span>1:1 Video Meeting Invitation</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Encrypted peer-to-peer room ready to join.
                      </p>
                      <a
                        href={meetingPath}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Join Meeting Room</span>
                      </a>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1.5 flex gap-1.5 flex-wrap">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                title={`${r.count} reaction${r.count !== 1 ? "s" : ""}`}
                onClick={() => handleReact(r.emoji)}
                className={cn(
                  "border rounded-full px-2 py-0.5 text-[11px] transition-colors",
                  r.userReacted
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-surface-2/70 text-muted-foreground hover:border-primary/30",
                )}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Poll Modal ─────────────────────────────────────────────────────────

function CreatePollForm({ onSubmit, onCancel }: { onSubmit: (q: string, opts: string[]) => void; onCancel: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => setOptions((o) => [...o, ""]);
  const updateOption = (i: number, v: string) => setOptions((o) => o.map((x, idx) => idx === i ? v : x));
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3 p-4 rounded-2xl border border-border bg-surface shadow-xl w-72">
      <p className="font-semibold text-sm">📊 Create a Poll</p>
      <input
        type="text"
        placeholder="Question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary/50"
      />
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
          />
          {options.length > 2 && (
            <button type="button" onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive">
              ×
            </button>
          )}
        </div>
      ))}
      {options.length < 4 && (
        <button type="button" onClick={addOption} className="text-xs text-muted-foreground hover:text-foreground">
          + Add option
        </button>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border py-1.5 text-sm hover:bg-accent/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            const validOpts = options.filter((o) => o.trim());
            if (question.trim() && validOpts.length >= 2) {
              onSubmit(question.trim(), validOpts);
            }
          }}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-1.5 text-sm hover:brightness-110"
        >
          Create
        </button>
      </div>
    </div>
  );
}

// ─── Create Code Snippet Modal ─────────────────────────────────────────────────

const CODE_LANGS = ["javascript", "typescript", "python", "go", "rust", "java", "css", "html", "sql", "bash", "json", "other"];

function CreateCodeForm({ onSubmit, onCancel }: { onSubmit: (code: string, lang: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("javascript");
  return (
    <div className="space-y-3 p-4 rounded-2xl border border-border bg-surface shadow-xl w-80">
      <p className="font-semibold text-sm flex items-center gap-1.5">
        <Code2 className="h-4 w-4" /> Insert Code Snippet
      </p>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
      >
        {CODE_LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <textarea
        rows={6}
        placeholder="Paste your code here..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full rounded-xl border border-border bg-zinc-950 text-zinc-100 font-mono px-3 py-2 text-xs outline-none focus:border-primary/50 resize-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border py-1.5 text-sm hover:bg-accent/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => code.trim() && onSubmit(code.trim(), lang)}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-1.5 text-sm hover:brightness-110"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── MessageComposer ───────────────────────────────────────────────────────────

export function MessageComposer({
  placeholder = "Message…",
  onSend,
  onSendPoll,
  onSendCode,
  onTypingStart,
  onTypingStop,
}: {
  placeholder?: string;
  onSend?: (body: string) => void;
  onSendPoll?: (question: string, options: string[]) => void;
  onSendCode?: (code: string, lang: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}) {
  const [value, setValue] = useState("");
  const [showPollForm, setShowPollForm] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  // Typing debounce
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (e.target.value.length > 0) {
      onTypingStart?.();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTypingStop?.();
      }, 1500);
    } else {
      onTypingStop?.();
    }
  };

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setValue("");
    onTypingStop?.();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  if (showPollForm) {
    return (
      <div className="border-border bg-surface/80 border-t p-3 sm:p-4">
        <CreatePollForm
          onSubmit={(q, opts) => {
            onSendPoll?.(q, opts);
            setShowPollForm(false);
          }}
          onCancel={() => setShowPollForm(false)}
        />
      </div>
    );
  }

  if (showCodeForm) {
    return (
      <div className="border-border bg-surface/80 border-t p-3 sm:p-4">
        <CreateCodeForm
          onSubmit={(code, lang) => {
            onSendCode?.(code, lang);
            setShowCodeForm(false);
          }}
          onCancel={() => setShowCodeForm(false)}
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="border-border bg-surface/80 safe-bottom border-t p-3 backdrop-blur-xl sm:p-4"
    >
      <div className="border-border bg-surface-2/60 focus-within:border-primary/40 flex items-end gap-1.5 rounded-2xl border p-1.5 transition-colors">
        {/* Extras menu */}
        <DropdownMenu open={showExtras} onOpenChange={setShowExtras}>
          <DropdownMenuTrigger asChild>
            <IconButton icon={Plus} label="More options" className="h-9 w-9" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-44 mb-1">
            <DropdownMenuItem onSelect={() => { setShowExtras(false); setShowPollForm(true); }}>
              📊 Create Poll
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setShowExtras(false); setShowCodeForm(true); }}>
              <Code2 className="h-4 w-4" /> Code Snippet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton icon={Paperclip} label="Attach file" className="hidden h-9 w-9 sm:inline-flex" />
        <label className="sr-only" htmlFor="composer">
          Write a message
        </label>
        <textarea
          id="composer"
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          className="placeholder:text-muted-foreground max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
        />
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
