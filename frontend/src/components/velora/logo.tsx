import { cn } from "@/lib/utils";

export function VeloraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Velora Circle mark"
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <linearGradient id="velora-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary, #3b82f6)" />
          <stop offset="60%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="velora-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary, #3b82f6)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Subtle outer shield/halo ring */}
      <circle
        cx="16"
        cy="16"
        r="14.5"
        fill="url(#velora-glow)"
        className="stroke-primary/30"
        strokeWidth="1"
      />

      {/* Internal precision orbit ring */}
      <circle
        cx="16"
        cy="16"
        r="11.5"
        fill="none"
        className="stroke-primary/20"
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />

      {/* Core V-Chevron Geometry with rounded apex */}
      <path
        d="M8.5 10 L16 22 L23.5 10"
        fill="none"
        stroke="url(#velora-gradient)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central focal node */}
      <circle cx="16" cy="11" r="2.2" fill="url(#velora-gradient)" />
    </svg>
  );
}

export function VeloraLogo({
  compact = false,
  className,
}: {
  compact?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <VeloraMark className="h-8 w-8 shrink-0 text-primary" />
      {!compact && (
        <div className="min-w-0 leading-none">
          <div className="font-display truncate text-[13px] font-extrabold tracking-[0.18em] uppercase">
            Velora
          </div>
          <div className="text-muted-foreground mt-1 truncate text-[10px] tracking-[0.28em] uppercase">
            Circle
          </div>
        </div>
      )}
    </div>
  );
}
