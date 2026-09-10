import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, ExternalLink, FileText, MessageSquare } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/velora/app-shell";
import { FileRow } from "@/components/velora/cards";
import { EmptyState } from "@/components/velora/primitives";
import { files, savedLinks, savedMessages } from "@/lib/mock-data";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved — Velora Circle" },
      {
        name: "description",
        content: "Saved messages, files and links from your private Velora conversations.",
      },
      { property: "og:title", content: "Saved — Velora Circle" },
      { property: "og:description", content: "Everything you kept, privately." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Saved</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Private to you — nothing here is shared back to a Circle.
          </p>
        </header>

        <Tabs defaultValue="messages">
          <TabsList>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-5 space-y-3">
            {savedMessages.map((s) => (
              <article key={s.id} className="surface-panel rounded-2xl p-4">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="bg-primary/10 text-primary grid h-9 w-9 place-items-center rounded-xl">
                    <MessageSquare className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{s.from}</p>
                    <p className="text-muted-foreground truncate text-[11px]">{s.circle}</p>
                  </div>
                  <span className="text-muted-foreground text-[11px]">{s.time}</span>
                </div>
                <p className="text-foreground/85 mt-3 text-[13px] leading-relaxed">{s.body}</p>
              </article>
            ))}
          </TabsContent>

          <TabsContent value="files" className="mt-5">
            <div className="surface-panel overflow-hidden rounded-2xl">
              {files.slice(0, 4).map((f) => (
                <FileRow key={f.id} file={f} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="links" className="mt-5 space-y-3">
            {savedLinks.length ? (
              savedLinks.map((l) => (
                <div
                  key={l.id}
                  className="surface-panel grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-4"
                >
                  <span className="bg-primary/10 text-primary grid h-9 w-9 place-items-center rounded-xl">
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{l.title}</p>
                    <p className="text-muted-foreground truncate text-[11px]">{l.url}</p>
                  </div>
                  <span className="text-muted-foreground text-[11px]">{l.time}</span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Bookmark}
                title="No saved items"
                description="Save important messages, files, and links here."
              />
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-10">
          <EmptyState
            icon={FileText}
            title="Archive is empty"
            description="Older saved items you archive will appear in this section."
          />
        </div>
      </div>
    </AppShell>
  );
}
