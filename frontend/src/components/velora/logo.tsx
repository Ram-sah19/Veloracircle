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
        <linearGradient id="velora-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" className="stroke-current opacity-25" fill="none" />
      <path
        d="M9 10.5 L16 22.5 L23 10.5"
        fill="none"
        stroke="url(#velora-mark)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
