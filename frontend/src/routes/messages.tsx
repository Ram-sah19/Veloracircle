import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, MoreHorizontal, Phone, Search, Video } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/velora/app-shell";
import { ConversationItem, MessageBubble, MessageComposer } from "@/components/velora/chat";
import { IconButton, PrivacyBadge } from "@/components/velora/primitives";
import { conversations, messageThread } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Velora Circle" },
      {
        name: "description",
        content:
          "Private one-to-one and Circle conversations with hidden participant information and encrypted delivery.",
      },
      { property: "og:title", content: "Messages — Velora Circle" },
      {
        property: "og:description",
        content: "Private conversations without unnecessary visibility.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const [activeId, setActiveId] = useState(conversations[0]!.id);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const active = conversations.find((c) => c.id === activeId)!;
  const list = conversations
    .filter((c) => (tab === "unread" ? c.unread : tab === "pinned" ? c.pinned : true))
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

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
            {list.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={() => {
                  setActiveId(c.id);
                  setMobileOpen(true);
                }}
              />
            ))}
          </div>
        </div>

        {/* Conversation window */}
        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            !mobileOpen && "hidden md:flex",
          )}
        >
          <header className="border-border bg-background/70 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2.5 backdrop-blur-xl sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <IconButton
                icon={ArrowLeft}
                label="Back to conversations"
                className="md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{active.name}</p>
                <p className="text-muted-foreground truncate text-[11px]">{active.privacy}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton icon={Search} label="Search in conversation" className="hidden sm:inline-flex" />
              <IconButton icon={Phone} label="Start audio call" />
              <IconButton icon={Video} label="Start video call" />
              <IconButton icon={MoreHorizontal} label="More options" />
            </div>
          </header>

          <div className="scrollbar-slim min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-6">
            <div className="flex justify-center">
              <PrivacyBadge label="Messages are visible only to authorized participants" tone="muted" />
            </div>
            {messageThread.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>

          <div className="pb-16 lg:pb-0">
            <MessageComposer placeholder={`Message ${active.name}…`} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
