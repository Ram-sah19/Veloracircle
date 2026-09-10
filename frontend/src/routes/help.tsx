import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/velora/app-shell";
import { SectionHeading } from "@/components/velora/primitives";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — Velora Circle" },
      {
        name: "description",
        content: "Guides, privacy documentation and direct support for Velora Circle workspaces.",
      },
      { property: "og:title", content: "Help & Support — Velora Circle" },
      { property: "og:description", content: "Answers, guides and private support." },
    ],
  }),
  component: HelpPage,
});

const topics = [
  {
    icon: ShieldCheck,
    title: "How privacy works",
    body: "Why member counts, directories and presence are hidden from members by default.",
  },
  {
    icon: BookOpen,
    title: "Circle basics",
    body: "Creating, configuring and archiving private spaces for your team.",
  },
  {
    icon: MessageSquare,
    title: "Meetings and messaging",
    body: "Scheduling private meetings, sharing files, and using voice messages.",
  },
];

function HelpPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Help & Support</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Answers first, humans always available.
          </p>
        </header>

        <SectionHeading title="Popular topics" />
        <div className="grid gap-4 sm:grid-cols-2">
          {topics.map((t) => (
            <article key={t.title} className="surface-panel rounded-2xl p-5">
              <span className="bg-primary/10 text-primary grid h-9 w-9 place-items-center rounded-xl">
                <t.icon className="h-4 w-4" aria-hidden />
              </span>
              <h2 className="mt-3.5 text-sm font-semibold">{t.title}</h2>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{t.body}</p>
            </article>
          ))}
        </div>

        <div className="surface-panel mt-6 grid grid-cols-1 gap-4 rounded-2xl p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Still need a hand?</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Support conversations are private and never leave your workspace.
            </p>
          </div>
          <Button onClick={() => toast.success("Support request opened")}>
            <LifeBuoy className="h-4 w-4" /> Contact support
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
