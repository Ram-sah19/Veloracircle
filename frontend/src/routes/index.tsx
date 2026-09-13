import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, ShieldCheck, Eye, EyeOff, Loader2, Mail, KeyRound, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VeloraLogo } from "@/components/velora/logo";
import { getStoredAuth, saveAuthSession } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Velora Circle" },
      {
        name: "description",
        content:
          "Sign in to Velora Circle. Private conversations, hidden member directories, and secure meetings for focused teams.",
      },
      { property: "og:title", content: "Velora Circle" },
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
  const [authMode, setAuthMode] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP flow state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpName, setOtpName] = useState("");
  const [otpPassword, setOtpPassword] = useState("");
  const [otpConfirmPassword, setOtpConfirmPassword] = useState("");
  const [showOtpPassword, setShowOtpPassword] = useState(false);
  const [showOtpConfirmPassword, setShowOtpConfirmPassword] = useState(false);
  const [otpDesignation, setOtpDesignation] = useState<"mentor" | "intern">("intern");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Check existing session on mount
  useEffect(() => {
    const session = getStoredAuth();
    if (session && session.token && session.user) {
      void navigate({ to: "/home" });
    }
  }, [navigate]);

  // Request OTP from backend
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setDevOtpHint(null);
    try {
      const res = await fetch("http://localhost:5000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (data.success) {
        setOtpEmail(email.trim().toLowerCase());
        setOtpCode("");
        setOtpPassword("");
        setOtpConfirmPassword("");
        setShowOtpPassword(false);
        setShowOtpConfirmPassword(false);
        setOtpDesignation("intern");
        setDevOtpHint(data.devCode || null);
        setOtpModalOpen(true);
        if (data.emailDispatched) {
          toast.success(`Verification code emailed to ${email}! Check your inbox.`);
        } else {
          toast.success("Verification code generated! (Dev mode: check console or hint below)");
        }
      } else {
        toast.error(data.error || "Failed to send verification code");
      }
    } catch {
      // Offline fallback simulation
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpEmail(email.trim().toLowerCase());
      setOtpCode("");
      setOtpPassword("");
      setOtpConfirmPassword("");
      setShowOtpPassword(false);
      setShowOtpConfirmPassword(false);
      setDevOtpHint(mockCode);
      setOtpModalOpen(true);
      toast.info(`Development Mode: Your verification code is ${mockCode}`);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP & complete login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    // Password & Confirm Password Validation
    if (otpPassword || otpConfirmPassword) {
      if (otpPassword.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }
      if (otpPassword !== otpConfirmPassword) {
        toast.error("Passwords do not match. Please check and re-enter.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpEmail,
          otp: otpCode.trim(),
          name: otpName.trim() || undefined,
          password: otpPassword.trim() || undefined,
          designation: otpDesignation,
        }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        saveAuthSession(data.user, data.token);
        toast.success(`Welcome to Velora Circle, ${data.user.name}!`);
        setOtpModalOpen(false);
        void navigate({ to: "/home" });
      } else {
        toast.error(data.error || "Invalid verification code");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify code with server. Please check MongoDB connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please provide both email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        saveAuthSession(data.user, data.token);
        toast.success(`Welcome back, ${data.user.name}`);
        void navigate({ to: "/home" });
      } else {
        toast.error(data.error || "Invalid email or password");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to connect to authentication server. Please check backend.");
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-lg font-semibold">Welcome to Velora</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Passwordless email verification and secure access.
          </p>

          {/* Auth Method Tabs */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-xs font-medium border border-border/70">
            <button
              type="button"
              onClick={() => setAuthMode("otp")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                authMode === "otp"
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Email + OTP</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("password")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                authMode === "password"
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Password</span>
            </button>
          </div>

          {authMode === "otp" ? (
            /* Email + OTP Form */
            <form className="mt-5 space-y-4" onSubmit={handleSendOtp}>
              <div className="space-y-2">
                <Label htmlFor="otp-email-input">Email Address</Label>
                <div className="relative">
                  <Input
                    id="otp-email-input"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  We will send a 6-digit one-time code to verify your identity.
                </p>
              </div>

              <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>Continue with Email</span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          ) : (
            /* Standard Password Form */
            <form className="mt-5 space-y-4" onSubmit={handleStandardLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In with Password"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          )}

          <p className="text-muted-foreground mt-6 text-center text-xs">
            Secure · Encrypted · No unsolicited directory exposure
          </p>
        </section>
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={otpModalOpen} onOpenChange={setOtpModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Enter Verification Code</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Sent to <span className="font-medium text-foreground">{otpEmail}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="otp-name" className="text-xs font-semibold">Full Name</Label>
                <Input
                  id="otp-name"
                  placeholder="e.g. Akash Chaudhary"
                  value={otpName}
                  onChange={(e) => setOtpName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="otp-designation" className="text-xs font-semibold">Role / Track</Label>
                <Select
                  value={otpDesignation}
                  onValueChange={(val: "mentor" | "intern") => setOtpDesignation(val)}
                >
                  <SelectTrigger id="otp-designation" className="h-9">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="intern">Intern / Trainee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="otp-password" className="text-xs font-semibold">
                  Password <span className="font-normal text-[10px] text-muted-foreground">(Optional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="otp-password"
                    type={showOtpPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={otpPassword}
                    onChange={(e) => setOtpPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOtpPassword(!showOtpPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showOtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="otp-confirm-password" className="text-xs font-semibold">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="otp-confirm-password"
                    type={showOtpConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={otpConfirmPassword}
                    onChange={(e) => setOtpConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`pr-9 text-xs ${
                      otpConfirmPassword && otpPassword !== otpConfirmPassword
                        ? "border-destructive focus-visible:ring-destructive"
                        : otpConfirmPassword && otpPassword === otpConfirmPassword
                        ? "border-emerald-500/70 focus-visible:ring-emerald-500"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOtpConfirmPassword(!showOtpConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showOtpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {otpConfirmPassword && otpPassword !== otpConfirmPassword && (
              <p className="text-[11px] text-destructive -mt-1 font-medium">
                Passwords do not match.
              </p>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="otp-code" className="text-xs font-semibold">6-Digit Verification Code</Label>
                <span className="text-[10px] text-muted-foreground">Sent to your email</span>
              </div>
              <Input
                id="otp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="text-center tracking-[0.4em] text-lg font-mono font-bold h-12"
                required
              />
            </div>

            <div className="rounded-xl border border-border/70 bg-surface/50 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Setting a password allows you to log in instantly anytime without waiting for an OTP.</span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOtpModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  otpCode.length !== 6 ||
                  (!!otpPassword && otpPassword.length < 6) ||
                  (!!otpPassword && otpPassword !== otpConfirmPassword)
                }
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Verify & Sign In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
