import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MoreHorizontal, Pencil, Phone, Search, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/velora/app-shell";
import { ConversationItem, MessageBubble, MessageComposer } from "@/components/velora/chat";
import { EmptyState, IconButton, PrivacyBadge } from "@/components/velora/primitives";
import {
  currentUser,
  generateMeetingId,
  getStoredAuth,
  getStoredConversations,
  getStoredMessages,
  saveMeeting,
  saveStoredConversations,
  saveStoredMessage,
  syncConversationsWithInvitations,
  type Conversation,
  type Meeting,
  type Message,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
    convoId: typeof search.convoId === "string" ? search.convoId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Velora Circle" },
      {
        name: "description",
        content:
          "Private one-to-one and Circle conversations with hidden participant information and encrypted delivery.",
      },
      { property: "og:title", content: "Velora Circle" },
      {
        property: "og:description",
        content: "Private conversations without unnecessary visibility.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const targetId = search.id || search.convoId;

  const [user, setUser] = useState(() => getStoredAuth().user || currentUser);
  const [conversationsList, setConversationsList] = useState<Conversation[]>(() =>
    syncConversationsWithInvitations(getStoredAuth().user || currentUser)
  );
  const [activeId, setActiveId] = useState<string>(() => targetId || getStoredConversations()[0]?.id || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(Boolean(targetId));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Edit partner name modal
  const [editingPartnerModal, setEditingPartnerModal] = useState<{
    convoId: string;
    name: string;
  } | null>(null);
  const [customNameInput, setCustomNameInput] = useState("");

  // Sync conversations list & real profile names
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.user) {
        setUser(detail.user);
        const synced = syncConversationsWithInvitations(detail.user);
        setConversationsList(synced);
      }
    };

    const refreshConversations = () => {
      const synced = syncConversationsWithInvitations(user);
      setConversationsList(synced);
      if (!activeId && synced.length > 0) {
        setActiveId(synced[0].id);
      }

      // Check for raw email names and fetch real names from backend
      void (async () => {
        let changed = false;
        const resolved = await Promise.all(
          synced.map(async (c) => {
            if (c.kind !== "direct") return c;
            if (/^[a-zA-Z0-9._-]+$/.test(c.name) && (c.name.includes("@") || /\d/.test(c.name))) {
              try {
                const res = await fetch(
                  `http://localhost:5000/api/auth/lookup?query=${encodeURIComponent(c.name)}`
                );
                const data = await res.json();
                if (data.success && data.user && data.user.name && data.user.name !== c.name) {
                  changed = true;
                  return {
                    ...c,
                    name: data.user.name,
                    initials: data.user.initials || c.initials,
                  };
                }
              } catch {
                // offline fallback
              }
            }
            return c;
          })
        );
        if (changed) {
          saveStoredConversations(resolved);
          setConversationsList(resolved);
        }
      })();
    };

    refreshConversations();

    const handleConvosUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setConversationsList(detail);
      } else {
        refreshConversations();
      }
    };

    window.addEventListener("velora_auth_changed", handleAuthChange);
    window.addEventListener("velora_conversations_updated", handleConvosUpdated);
    return () => {
      window.removeEventListener("velora_auth_changed", handleAuthChange);
      window.removeEventListener("velora_conversations_updated", handleConvosUpdated);
    };
  }, [activeId, user]);

  // Handle URL param selection
  useEffect(() => {
    if (targetId) {
      setActiveId(targetId);
      setMobileOpen(true);
    }
  }, [targetId]);

  // Sync active thread messages
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    const loadThread = () => {
      const stored = getStoredMessages(activeId);
      if (stored.length === 0) {
        // Welcome message for new direct connection
        const activeConvo = conversationsList.find((c) => c.id === activeId);
        const welcome: Message = {
          id: `welcome_${activeId}`,
          author: "Velora System",
          initials: "VS",
          time: "Just now",
          body: `🔒 Private end-to-end direct channel established with ${
            activeConvo?.name || "participant"
          }. Messages and meeting invites are visible only between authorized participants.`,
        };
        setMessages([welcome]);
      } else {
        setMessages(stored);
      }
    };

    loadThread();

    const handleMessagesUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.convoId === activeId) {
        setMessages(detail.messages);
      }
    };

    window.addEventListener("velora_messages_updated", handleMessagesUpdated);
    return () => {
      window.removeEventListener("velora_messages_updated", handleMessagesUpdated);
    };
  }, [activeId, conversationsList]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const active = conversationsList.find((c) => c.id === activeId);
  const list = conversationsList
    .filter((c) => (tab === "unread" ? c.unread : tab === "pinned" ? c.pinned : true))
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  // Send message handler
  const handleSendMessage = (body: string) => {
    if (!activeId || !body.trim()) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      author: user.name,
      senderEmail: user.email,
      senderId: user.id,
      role: user.designation || "member",
      initials: user.initials,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      body: body.trim(),
      kind: "text",
    };

    saveStoredMessage(activeId, newMsg);
    setMessages((prev) => [...prev, newMsg]);
  };

  // Save customized display name for conversation
  const handleSavePartnerName = (convoId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const newInitials = trimmed
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const updated = conversationsList.map((c) => {
      if (c.id === convoId) {
        return {
          ...c,
          name: trimmed,
          initials: newInitials,
        };
      }
      return c;
    });

    saveStoredConversations(updated);
    setConversationsList(updated);
    setEditingPartnerModal(null);
    toast.success(`Display name updated to "${trimmed}"!`);
  };

  // Launch instant call from chat header
  const handleStartCall = () => {
    if (!active) return;
    const meetingId = generateMeetingId();
    const now = new Date();
    const meeting: Meeting = {
      id: meetingId,
      title: `1:1 Mentorship Call · ${user.name} & ${active.name}`,
      day: "Today",
      time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      host: user.name,
      privacy: "Private 1:1 Meeting",
      duration: "45 min",
      group: "today",
      meetingUrl: `${window.location.origin}/meeting/${meetingId}`,
    };

    saveMeeting(meeting);

    // Post invite link to chat
    const inviteMsg: Message = {
      id: `msg_${Date.now()}`,
      author: user.name,
      senderEmail: user.email,
      senderId: user.id,
      role: user.designation || "member",
      initials: user.initials,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      body: `📞 I've started our 1:1 Video Meeting! Join here: ${window.location.origin}/meeting/${meetingId}`,
      kind: "text",
    };
    saveStoredMessage(active.id, inviteMsg);

    toast.success("1:1 Call started", {
      description: `Invitation sent to ${active.name}. Joining room now...`,
    });

    void navigate({ to: `/meeting/${meetingId}` });
  };

  return (
    <AppShell flush>
      <div className="flex h-full min-h-0">
        {/* Conversation list */}
        <div
          className={cn(
            "border-border flex min-h-0 w-full flex-col border-r md:w-[320px] md:shrink-0",
            mobileOpen && "hidden md:flex",
          )}
        >
          <div className="space-y-3 p-3">
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="pl-9"
              />
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex-1">
                  Unread
                </TabsTrigger>
                <TabsTrigger value="pinned" className="flex-1">
                  Pinned
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="scrollbar-slim min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-24 lg:pb-3">
            {list.length > 0 ? (
              list.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onSelect={() => {
                    setActiveId(c.id);
                    setMobileOpen(true);
                  }}
                />
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No conversations found.
              </div>
            )}
          </div>
        </div>

        {/* Conversation window */}
        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            !mobileOpen && "hidden md:flex",
          )}
        >
          {active ? (
            <>
              <header className="border-border bg-background/70 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2.5 backdrop-blur-xl sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <IconButton
                    icon={ArrowLeft}
                    label="Back to conversations"
                    className="md:hidden"
                    onClick={() => setMobileOpen(false)}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{active.name}</p>
                      <button
                        type="button"
                        title="Edit display name"
                        onClick={() => {
                          setEditingPartnerModal({ convoId: active.id, name: active.name });
                          setCustomNameInput(active.name);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-surface"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-muted-foreground truncate text-[11px] font-medium">
                      {active.privacy?.includes("Mentorship")
                        ? `Direct Mentorship · ${user.designation === "mentor" ? "Trainee" : "Mentor"}`
                        : active.privacy}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton icon={Search} label="Search in conversation" className="hidden sm:inline-flex" />
                  <IconButton
                    icon={Phone}
                    label="Start audio call"
                    onClick={handleStartCall}
                  />
                  <IconButton
                    icon={Video}
                    label="Start video call"
                    onClick={handleStartCall}
                  />
                  <IconButton icon={MoreHorizontal} label="More options" />
                </div>
              </header>

              <div className="scrollbar-slim min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-6">
                <div className="flex justify-center">
                  <PrivacyBadge label="Messages are visible only to authorized participants" tone="muted" />
                </div>
                {messages.map((m) => {
                  const userPrefix = user.email ? user.email.split("@")[0].toLowerCase() : "";
                  const isSelf = Boolean(
                    (m.senderEmail && user.email && m.senderEmail.toLowerCase() === user.email.toLowerCase()) ||
                    (m.senderId && user.id && m.senderId === user.id) ||
                    (m.author && user.name && m.author.toLowerCase() === user.name.toLowerCase()) ||
                    (userPrefix && m.author && m.author.toLowerCase() === userPrefix) ||
                    (userPrefix && m.initials && m.initials === user.initials && m.author.toLowerCase().includes(userPrefix))
                  );
                  return <MessageBubble key={m.id} message={{ ...m, self: isSelf }} />;
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="pb-16 lg:pb-0">
                <MessageComposer
                  placeholder={`Message ${active.name}…`}
                  onSend={handleSendMessage}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
              <EmptyState
                title="No conversation selected"
                description="Select a mentorship conversation or start a new direct chat to begin."
              />
            </div>
          )}
        </section>
      </div>

      {/* Edit Partner Display Name Modal */}
      <Dialog
        open={Boolean(editingPartnerModal)}
        onOpenChange={(open) => !open && setEditingPartnerModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <span>Edit Partner Display Name</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set a friendly real name for this person (e.g. mentor or trainee&apos;s full name).
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingPartnerModal && customNameInput.trim()) {
                handleSavePartnerName(editingPartnerModal.convoId, customNameInput.trim());
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="custom-partner-name" className="text-xs font-semibold">
                Display Name
              </Label>
              <Input
                id="custom-partner-name"
                type="text"
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                placeholder="e.g. Ram Sah or Alex Johnson"
                required
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingPartnerModal(null)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
