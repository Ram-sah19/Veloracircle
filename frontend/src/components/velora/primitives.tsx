import type { LucideIcon } from "lucide-react";
import { Lock, ShieldCheck, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function PrivacyBadge({
  label,
  tone = "default",
  icon: Icon = Lock,
  className,
}: {
  label: string;
  tone?: "default" | "accent" | "muted";
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide whitespace-nowrap",
        tone === "accent"
          ? "border-primary/30 bg-primary/10 text-primary"
          : tone === "muted"
            ? "text-muted-foreground border-border bg-muted/40"
            : "border-border bg-surface-2/60 text-foreground/80",
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

export function SecureIndicator({ label = "Secure meeting" }: { label?: string }) {
  return (
    <span className="text-success inline-flex items-center gap-1.5 text-xs font-medium">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  active,
  variant = "ghost",
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  variant?: "ghost" | "solid" | "danger";
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "focus-visible:ring-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
            variant === "ghost" &&
              "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
            variant === "solid" && "border-border bg-surface-2 text-foreground hover:brightness-110",
            variant === "danger" &&
              "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25",
            active && "border-primary/40 bg-primary/15 text-primary",
            className,
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Avatar({
  initials,
  size = "md",
  tone = "default",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "brand";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-display inline-flex shrink-0 items-center justify-center rounded-xl border font-bold",
        size === "sm" && "h-8 w-8 text-[11px]",
        size === "md" && "h-10 w-10 text-xs",
        size === "lg" && "h-12 w-12 text-sm",
        tone === "brand"
          ? "border-primary/30 bg-primary/15 text-primary"
          : "border-border bg-surface-2 text-foreground/80",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function SectionHeading({
  title,
  action,
  description,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1 truncate text-xs">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon = EyeOff,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="surface-panel flex flex-col items-center rounded-2xl px-6 py-14 text-center">
      <span className="border-border bg-surface-2/70 text-muted-foreground mb-5 grid h-14 w-14 place-items-center rounded-2xl border">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1.5 max-w-xs text-xs leading-relaxed">{description}</p>
      {actionLabel && (
        <Button className="mt-6" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-surface-2/70 animate-pulse rounded-xl", className)} />;
}
