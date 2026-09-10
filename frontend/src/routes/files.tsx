import { createFileRoute } from "@tanstack/react-router";
import { Search, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/velora/app-shell";
import { FileRow } from "@/components/velora/cards";
import { EmptyState, SectionHeading } from "@/components/velora/primitives";
import { files } from "@/lib/mock-data";

export const Route = createFileRoute("/files")({
  head: () => ({
    meta: [
      { title: "Files — Velora Circle" },
      {
        name: "description",
        content: "Secure file sharing across your private Circles and direct conversations.",
      },
      { property: "og:title", content: "Files — Velora Circle" },
      { property: "og:description", content: "Secure, private file sharing." },
    ],
  }),
  component: FilesPage,
});

function FilesPage() {
  const [query, setQuery] = useState("");
  const match = (group: "recent" | "shared" | "mine") =>
    files.filter((f) => f.group === group && f.name.toLowerCase().includes(query.toLowerCase()));

  const sections = [
    { key: "recent" as const, title: "Recent" },
    { key: "shared" as const, title: "Shared with me" },
    { key: "mine" as const, title: "My files" },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-9">
        <header className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">Files</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Encrypted at rest · Downloads follow Circle policy.
            </p>
          </div>
          <Button onClick={() => toast.success("Upload ready", { description: "Mock upload" })}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </header>

        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files"
            aria-label="Search files"
            className="pl-9"
          />
        </div>

        {sections.map((s) => {
          const list = match(s.key);
          return (
            <section key={s.key}>
              <SectionHeading title={s.title} />
              {list.length ? (
                <div className="surface-panel overflow-hidden rounded-2xl">
                  {list.map((f) => (
                    <FileRow key={f.id} file={f} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nothing here yet"
                  description="Files shared in your Circles will appear in this section."
                />
              )}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
