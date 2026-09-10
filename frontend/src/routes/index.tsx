import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, ShieldCheck, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VeloraLogo } from "@/components/velora/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Velora Circle" },
      {
        name: "description",
        content:
          "Sign in to Velora Circle. Private conversations, hidden member directories, and secure meetings for focused teams.",
      },
      { property: "og:title", content: "Sign in — Velora Circle" },
      {
        property: "og:description",
        content: "Connect, meet, and collaborate without unnecessary visibility.",
      },
    ],
  }),
  component: WelcomePage,
});

function NodeArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 400"
      className="text-primary pointer-events-none absolute -right-16 -bottom-20 h-[420px] w-[420px] opacity-25"
    >
      <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.7">
        <path d="M60 320 L150 240 L240 280 L330 190" />
        <path d="M150 240 L120 130 L240 90" />
        <path d="M240 280 L300 340" />
        <path d="M120 130 L60 320" />
        <path d="M240 90 L330 190" />
      </g>
      {[
        [60, 320],
        [150, 240],
        [240, 280],
        [330, 190],
        [120, 130],
        [240, 90],
        [300, 340],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="currentColor" />
      ))}
    </svg>
  );
}

function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="mesh-bg bg-background relative min-h-[100dvh] overflow-hidden">
      <div className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 gap-10 px-5 py-8 lg:grid-cols-[1.1fr_minmax(0,440px)] lg:items-center lg:gap-16 lg:px-10">
        <section className="relative flex min-w-0 flex-col justify-center">
          <VeloraLogo />
          <h1 className="mt-12 text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.05] font-extrabold">
            Private conversations.
            <br />
            <span className="text-gradient-brand">Focused collaboration.</span>
          </h1>
          <p className="text-muted-foreground mt-5 max-w-md text-sm leading-relaxed sm:text-base">
            Connect, meet, and collaborate without unnecessary visibility.
          </p>

          <ul className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            {[
              { icon: EyeOff, label: "Hidden member directory" },
              { icon: Lock, label: "Private Circles by default" },
              { icon: ShieldCheck, label: "Encrypted meetings" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="surface-panel flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs"
              >
                <Icon className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0">{label}</span>
              </li>
            ))}
          </ul>
          <NodeArt />
        </section>

        <section className="glass relative z-10 rounded-3xl p-6 shadow-[var(--shadow-float)] sm:p-8">
          <h2 className="text-lg font-semibold">Welcome back</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Sign in to your private workspace.
          </p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void navigate({ to: "/home" });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="h-11 w-full">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
              <span className="bg-border h-px flex-1" />
              or
              <span className="bg-border h-px flex-1" />
            </div>

            <Button type="button" variant="outline" className="h-11 w-full" asChild>
              <Link to="/home">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.63 4.11-5.35 4.11-3.22 0-5.85-2.66-5.85-5.94S8.78 6.31 12 6.31c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.74 14.53 2.8 12 2.8 6.98 2.8 2.9 6.87 2.9 11.9S6.98 21 12 21c5.77 0 9.6-4.05 9.6-9.76 0-.65-.08-1.15-.25-1.64Z"
                  />
                </svg>
                Continue with Google
              </Link>
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-xs">
            New to Velora?{" "}
            <Link to="/home" className="text-primary font-medium hover:underline">
              Create account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
