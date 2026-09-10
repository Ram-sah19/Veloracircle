import { createFileRoute } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/velora/app-shell";
import { CircleCard } from "@/components/velora/cards";
import { CreateCircleModal } from "@/components/velora/modals";
import { PrivacyBadge, SectionHeading } from "@/components/velora/primitives";
import { circles } from "@/lib/mock-data";

export const Route = createFileRoute("/circles/")({
  head: () => ({
    meta: [
      { title: "Circles — Velora Circle" },
      {
        name: "description",
        content:
          "Private group spaces where member counts, directories and presence stay hidden from members.",
      },
      { property: "og:title", content: "Circles — Velora Circle" },
      {
        property: "og:description",
        content: "Private spaces with restricted member visibility.",
      },
    ],
  }),
  component: CirclesPage,
});

function CirclesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">Circles</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Private spaces · Member visibility restricted
            </p>
          </div>
          <CreateCircleModal
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Create Circle
              </Button>
            }
          />
        </header>

        <div className="surface-panel mb-8 flex items-start gap-3 rounded-2xl p-4">
          <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] font-medium">Member information is hidden by design</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Counts, directories and join or leave activity are only available to Owners and
              Admins through the management console.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PrivacyBadge label="Directory hidden" tone="accent" />
              <PrivacyBadge label="Count hidden" tone="muted" />
              <PrivacyBadge label="Presence hidden" tone="muted" />
            </div>
          </div>
        </div>

        <SectionHeading title="Your Circles" />
        <div className="grid gap-4 sm:grid-cols-2">
          {circles.map((c) => (
            <CircleCard key={c.id} circle={c} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
