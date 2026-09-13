import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  GraduationCap,
  MailPlus,
  MessageSquare,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Video,
  XCircle,
} from "lucide-react";
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
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/velora/app-shell";
import { Avatar, EmptyState, PrivacyBadge, SectionHeading } from "@/components/velora/primitives";
import {
  currentUser,
  ensureDirectConversation,
  generateMeetingId,
  getStoredAuth,
  getStoredConversations,
  getStoredInvitations,
  saveMeeting,
  saveStoredConversations,
  saveStoredInvitations,
  saveStoredMessage,
  type Meeting,
  type MentorshipInvitation,
} from "@/lib/mock-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Mentorship Network · Velora Circle" },
      {
        name: "description",
        content:
          "Role-based Mentorship Network for Velora Circle. Connect with mentors and trainees privately with consent-based messaging and meetings.",
      },
      { property: "og:title", content: "Mentorship Network · Velora Circle" },
      { property: "og:description", content: "Consent-based Mentorship Collaboration." },
    ],
  }),
  component: MentorshipPage,
});

function MentorshipPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredAuth().user || currentUser);
  const [invitations, setInvitations] = useState<MentorshipInvitation[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [query, setQuery] = useState("");

  const isMentor = user.designation === "mentor";

  // Recipient input & lookup state
  const [recipientName, setRecipientName] = useState("");
  const [recipientLookupFound, setRecipientLookupFound] = useState<{
    name: string;
    handle: string;
    designation: string;
  } | null>(null);

  // Edit partner name modal
  const [editingPartnerModal, setEditingPartnerModal] = useState<{
    connId: string;
    isSender: boolean;
    name: string;
  } | null>(null);
  const [customNameInput, setCustomNameInput] = useState("");

  // 1:1 Meeting modal state
  const [meetingPartnerModal, setMeetingPartnerModal] = useState<{
    conn: MentorshipInvitation;
    partner: MentorshipInvitation["recipient"] | MentorshipInvitation["sender"];
  } | null>(null);
  const [meetingTopic, setMeetingTopic] = useState("1:1 Mentorship Discussion");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [meetingTime, setMeetingTime] = useState("16:00");
  const [meetingDuration, setMeetingDuration] = useState("45");

  // Load invitations and sync real profile names
  useEffect(() => {
    const stored = getStoredInvitations();
    setInvitations(stored);

    const syncRealNames = async (invs: MentorshipInvitation[]) => {
      let changed = false;
      const updated = await Promise.all(
        invs.map(async (inv) => {
          let modified = false;
          const copy: MentorshipInvitation = {
            ...inv,
            sender: { ...inv.sender },
            recipient: { ...inv.recipient },
          };

          const userEmailPrefix = user.email ? user.email.split("@")[0].toLowerCase() : "";

          const isSenderCurr =
            (inv.sender.email && user.email && inv.sender.email.toLowerCase() === user.email.toLowerCase()) ||
            user.handle?.toLowerCase() === copy.sender.handle.toLowerCase() ||
            user.name?.toLowerCase() === copy.sender.name.toLowerCase() ||
            Boolean(userEmailPrefix && copy.sender.name.toLowerCase() === userEmailPrefix) ||
            Boolean(userEmailPrefix && copy.sender.handle.toLowerCase() === `@${userEmailPrefix}`);

          const isRecipCurr =
            (inv.recipient.email && user.email && inv.recipient.email.toLowerCase() === user.email.toLowerCase()) ||
            user.handle?.toLowerCase() === copy.recipient.handle.toLowerCase() ||
            user.name?.toLowerCase() === copy.recipient.name.toLowerCase() ||
            Boolean(userEmailPrefix && copy.recipient.name.toLowerCase() === userEmailPrefix) ||
            Boolean(userEmailPrefix && copy.recipient.handle.toLowerCase() === `@${userEmailPrefix}`);

          // 1. Sync current user's side with active profile
          if (isSenderCurr) {
            if (copy.sender.name !== user.name && user.name) {
              copy.sender.name = user.name;
              copy.sender.initials = user.initials;
              if (user.avatar) copy.sender.avatar = user.avatar;
              if (user.designation) copy.sender.designation = user.designation;
              if (user.email) copy.sender.email = user.email;
              modified = true;
            }
          }

          if (isRecipCurr) {
            if (copy.recipient.name !== user.name && user.name) {
              copy.recipient.name = user.name;
              copy.recipient.initials = user.initials;
              if (user.avatar) copy.recipient.avatar = user.avatar;
              if (user.designation) copy.recipient.designation = user.designation;
              if (user.email) copy.recipient.email = user.email;
              modified = true;
            }
          }

          // 2. Lookup partner in MongoDB backend to fetch their REAL profile name
          const other = isSenderCurr ? copy.recipient : copy.sender;
          try {
            const queryTerm = other.email || other.handle?.replace(/^@/, "") || other.name;
            const res = await fetch(
              `http://localhost:5000/api/auth/lookup?query=${encodeURIComponent(queryTerm)}`
            );
            const data = await res.json();
            if (data.success && data.user && data.user.name) {
              if (other.name !== data.user.name) {
                other.name = data.user.name;
                other.handle = data.user.handle || other.handle;
                other.initials = data.user.initials || other.initials;
                if (data.user.avatar) other.avatar = data.user.avatar;
                if (data.user.designation) other.designation = data.user.designation;
                if (data.user.email) other.email = data.user.email;
                modified = true;
              }
            }
          } catch {
            // ignore network error
          }

          if (modified) changed = true;
          return copy;
        })
      );

      if (changed) {
        saveStoredInvitations(updated);
        setInvitations(updated);
      }
    };

    syncRealNames(stored);

    const handleAuthChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.user) {
        setUser(detail.user);
      }
    };

    const handleInvChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setInvitations(detail);
      }
    };

    window.addEventListener("velora_auth_changed", handleAuthChange);
    window.addEventListener("velora_invitations_changed", handleInvChange);
    return () => {
      window.removeEventListener("velora_auth_changed", handleAuthChange);
      window.removeEventListener("velora_invitations_changed", handleInvChange);
    };
  }, [user]);

  // Live lookup when email changes in invite dialog
  const handleEmailBlur = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/auth/lookup?email=${encodeURIComponent(recipientEmail.trim())}`
      );
      const data = await res.json();
      if (data.success && data.user) {
        setRecipientLookupFound({
          name: data.user.name,
          handle: data.user.handle,
          designation: data.user.designation,
        });
        if (!recipientName) {
          setRecipientName(data.user.name);
        }
      } else {
        setRecipientLookupFound(null);
      }
    } catch {
      setRecipientLookupFound(null);
    }
  };

  // Send invitation handler
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Please provide a valid recipient email address");
      return;
    }

    const email = recipientEmail.trim().toLowerCase();
    if (email === user.email.toLowerCase()) {
      toast.error("You cannot invite yourself");
      return;
    }

    setSendingInvite(true);

    let resolvedName = recipientName.trim();
    let resolvedHandle = `@${email.split("@")[0]}`;
    let resolvedInitials = email.substring(0, 2).toUpperCase();
    let resolvedDesignation = isMentor ? "intern" : "mentor";
    let resolvedAvatar = undefined;

    // Check backend lookup for recipient
    try {
      const res = await fetch(`http://localhost:5000/api/auth/lookup?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && data.user) {
        if (!resolvedName) resolvedName = data.user.name;
        resolvedHandle = data.user.handle || resolvedHandle;
        resolvedInitials = data.user.initials || resolvedInitials;
        resolvedDesignation = data.user.designation || resolvedDesignation;
        resolvedAvatar = data.user.avatar;
      }
    } catch {
      // offline fallback
    }

    if (!resolvedName) {
      const raw = email.split("@")[0];
      resolvedName = raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    const newInvite: MentorshipInvitation = {
      id: `inv_${Date.now()}`,
      sender: {
        id: user.id || "sender_curr",
        name: user.name,
        email: user.email,
        handle: user.handle,
        initials: user.initials,
        avatar: user.avatar,
        designation: user.designation || "mentor",
      },
      recipient: {
        id: `rec_${Date.now()}`,
        name: resolvedName,
        email: email,
        handle: resolvedHandle,
        initials: resolvedInitials,
        avatar: resolvedAvatar,
        designation: resolvedDesignation,
      },
      status: "pending",
      note: inviteNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [newInvite, ...invitations];
    saveStoredInvitations(updated);
    setInvitations(updated);

    toast.success(`Mentorship invitation sent to ${resolvedName}!`);
    setRecipientEmail("");
    setRecipientName("");
    setRecipientLookupFound(null);
    setInviteNote("");
    setInviteModalOpen(false);
    setSendingInvite(false);
  };

  // Save customized display name for a connection
  const handleSavePartnerName = (connId: string, isSender: boolean, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const newInitials = trimmed
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const updated = invitations.map((inv) => {
      if (inv.id === connId) {
        const copy = { ...inv, sender: { ...inv.sender }, recipient: { ...inv.recipient } };
        if (isSender) {
          copy.sender.name = trimmed;
          copy.sender.initials = newInitials;
        } else {
          copy.recipient.name = trimmed;
          copy.recipient.initials = newInitials;
        }
        return copy;
      }
      return inv;
    });

    saveStoredInvitations(updated);
    setInvitations(updated);

    // Also update existing conversation if created
    const convos = getStoredConversations();
    const convoId = `dm_${connId}`;
    const updatedConvos = convos.map((c) => {
      if (c.id === convoId || c.id === connId) {
        return {
          ...c,
          name: trimmed,
          initials: newInitials,
        };
      }
      return c;
    });
    saveStoredConversations(updatedConvos);

    setEditingPartnerModal(null);
    toast.success(`Display name updated to "${trimmed}"!`);
  };

  // Accept invitation handler
  const handleAccept = (invId: string) => {
    let acceptedInv: MentorshipInvitation | undefined;
    const updated = invitations.map((inv) => {
      if (inv.id === invId) {
        const convoId = `dm_${inv.id}`;
        acceptedInv = {
          ...inv,
          status: "accepted" as const,
          conversationId: convoId,
        };
        return acceptedInv;
      }
      return inv;
    });
    saveStoredInvitations(updated);
    setInvitations(updated);

    if (acceptedInv) {
      const isSender =
        (acceptedInv.sender.email && user.email && acceptedInv.sender.email.toLowerCase() === user.email.toLowerCase()) ||
        user.handle?.toLowerCase() === acceptedInv.sender.handle.toLowerCase() ||
        user.name?.toLowerCase() === acceptedInv.sender.name.toLowerCase();
      const partner = isSender ? acceptedInv.recipient : acceptedInv.sender;
      const partnerRole = isMentor ? "Trainee" : "Mentor";
      ensureDirectConversation({
        id: acceptedInv.conversationId || `dm_${acceptedInv.id}`,
        name: partner.name,
        initials: partner.initials,
        kind: "direct",
        privacy: `Direct Mentorship · ${partnerRole}`,
        partnerEmail: partner.email,
        partnerRole,
        preview: acceptedInv.note ? `Note: "${acceptedInv.note}"` : "Mentorship connected. Say hello!",
        time: "Just now",
      });
    }

    toast.success("Invitation accepted! Private direct chat and meetings are now unlocked.");
  };

  // Open direct chat
  const handleOpenDirectChat = (
    conn: MentorshipInvitation,
    partner: MentorshipInvitation["recipient"] | MentorshipInvitation["sender"]
  ) => {
    const convoId = conn.conversationId || `dm_${conn.id}`;
    const partnerRole = isMentor ? "Trainee" : "Mentor";
    ensureDirectConversation({
      id: convoId,
      name: partner.name,
      initials: partner.initials,
      kind: "direct",
      privacy: `Direct Mentorship · ${partnerRole}`,
      partnerEmail: partner.email,
      partnerRole,
      preview: conn.note ? `Note: "${conn.note}"` : "Mentorship connection active.",
      time: "Just now",
    });

    void navigate({
      to: "/messages",
      search: { id: convoId },
    });
  };

  // Start instant 1:1 call
  const handleStartInstantCall = (
    conn: MentorshipInvitation,
    partner: MentorshipInvitation["recipient"] | MentorshipInvitation["sender"]
  ) => {
    const meetingId = generateMeetingId();
    const now = new Date();
    const meeting: Meeting = {
      id: meetingId,
      title: `1:1 Mentorship · ${user.name} & ${partner.name}`,
      day: "Today",
      time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      host: user.name,
      privacy: "Private 1:1 Mentorship",
      duration: "45 min",
      group: "today",
      meetingUrl: `${window.location.origin}/meeting/${meetingId}`,
    };

    saveMeeting(meeting);

    const convoId = conn.conversationId || `dm_${conn.id}`;
    const partnerRole = isMentor ? "Trainee" : "Mentor";
    ensureDirectConversation({
      id: convoId,
      name: partner.name,
      initials: partner.initials,
      kind: "direct",
      privacy: `Direct Mentorship · ${partnerRole}`,
      partnerEmail: partner.email,
      partnerRole,
      preview: "1:1 Video Meeting Started",
      time: "Just now",
    });

    saveStoredMessage(convoId, {
      id: `msg_${Date.now()}`,
      author: user.name,
      senderEmail: user.email,
      senderId: user.id,
      role: user.designation || "member",
      initials: user.initials,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      body: `📞 I've started our 1:1 Mentorship meeting. Join here: ${window.location.origin}/meeting/${meetingId}`,
      kind: "text",
    });

    toast.success(`1:1 Call started with ${partner.name}! Joining meeting...`);
    setMeetingPartnerModal(null);
    void navigate({ to: `/meeting/${meetingId}` });
  };

  // Schedule 1:1 meeting
  const handleScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingPartnerModal) return;
    const { conn, partner } = meetingPartnerModal;

    const meetingId = generateMeetingId();
    const title = meetingTopic.trim() || `1:1 Mentorship · ${user.name} & ${partner.name}`;

    const meeting: Meeting = {
      id: meetingId,
      title,
      scheduledAt: `${meetingDate}T${meetingTime}:00Z`,
      day: meetingDate === new Date().toISOString().split("T")[0] ? "Today" : meetingDate,
      time: meetingTime,
      duration: `${meetingDuration} min`,
      durationMinutes: parseInt(meetingDuration, 10) || 45,
      host: user.name,
      privacy: "Private 1:1 Mentorship",
      group: "upcoming",
      status: "upcoming",
      meetingUrl: `${window.location.origin}/meeting/${meetingId}`,
    };

    saveMeeting(meeting);

    const convoId = conn.conversationId || `dm_${conn.id}`;
    const partnerRole = isMentor ? "Trainee" : "Mentor";
    ensureDirectConversation({
      id: convoId,
      name: partner.name,
      initials: partner.initials,
      kind: "direct",
      privacy: `Direct Mentorship · ${partnerRole}`,
      partnerEmail: partner.email,
      partnerRole,
      preview: `Scheduled 1:1: ${title}`,
      time: "Just now",
    });

    saveStoredMessage(convoId, {
      id: `msg_${Date.now()}`,
      author: user.name,
      senderEmail: user.email,
      senderId: user.id,
      role: user.designation || "member",
      initials: user.initials,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      body: `📅 Scheduled 1:1: ${title}\nDate: ${meetingDate} at ${meetingTime} (${meetingDuration} min)\nJoin link: ${window.location.origin}/meeting/${meetingId}`,
      kind: "text",
    });

    toast.success(`1:1 Meeting scheduled and invitation sent to ${partner.name}!`);
    setMeetingPartnerModal(null);
  };

  // Decline invitation handler
  const handleDecline = (invId: string) => {
    const updated = invitations.map((inv) => {
      if (inv.id === invId) {
        return { ...inv, status: "declined" as const };
      }
      return inv;
    });
    saveStoredInvitations(updated);
    setInvitations(updated);
    toast.info("Mentorship invitation declined.");
  };

  // Filter connections and invites
  const activeConnections = invitations.filter((i) => i.status === "accepted");
  const pendingIncoming = invitations.filter(
    (i) =>
      i.status === "pending" &&
      i.recipient.name.toLowerCase() === user.email.split("@")[0].toLowerCase()
  );
  const pendingOutgoing = invitations.filter(
    (i) => i.status === "pending" && i.sender.handle === user.handle
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-9">
        {/* Header */}
        <header className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">Mentorship Network</h1>
              <PrivacyBadge
                label={isMentor ? "Mentor Mode" : "Trainee Mode"}
                tone="accent"
                icon={GraduationCap}
              />
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Role-based collaboration · Unsolicited DMs and calls are blocked until an invitation is mutually accepted.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span>{isMentor ? "Invite Trainee" : "Connect with Mentor"}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span>{isMentor ? "Invite a Trainee / Intern" : "Request Mentorship"}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {isMentor
                      ? "Send a formal mentorship invite to a trainee. Once they accept, direct 1:1 messaging and meeting scheduling will unlock automatically."
                      : "Send a connection request to a mentor to begin 1:1 guidance."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rec-email" className="text-xs font-semibold">
                      {isMentor ? "Trainee Email" : "Mentor Email"}
                    </Label>
                    <Input
                      id="rec-email"
                      type="email"
                      placeholder="colleague@velora.io"
                      value={recipientEmail}
                      onChange={(e) => {
                        setRecipientEmail(e.target.value);
                        if (recipientLookupFound) setRecipientLookupFound(null);
                      }}
                      onBlur={handleEmailBlur}
                      required
                      autoFocus
                    />
                  </div>

                  {recipientLookupFound && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="truncate">
                        Registered profile: <strong>{recipientLookupFound.name}</strong> ({recipientLookupFound.handle})
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="rec-name" className="text-xs font-semibold">
                      Recipient Full Name <span className="font-normal text-muted-foreground">(Display Name)</span>
                    </Label>
                    <Input
                      id="rec-name"
                      type="text"
                      placeholder={recipientLookupFound ? recipientLookupFound.name : "e.g. Ram Sah or Alex Mentor"}
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inv-note" className="text-xs font-semibold">
                      Track or Project Note <span className="font-normal text-muted-foreground">(Optional)</span>
                    </Label>
                    <Textarea
                      id="inv-note"
                      placeholder="e.g. Welcome to the Frontend Engineering Track. Excited to guide you through the Q3 roadmap!"
                      value={inviteNote}
                      onChange={(e) => setInviteNote(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="rounded-xl border border-border/70 bg-surface/50 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    <span>Full privacy: recipient will review and must accept before any messaging channel opens.</span>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setInviteModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sendingInvite || !recipientEmail}>
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Info Card */}
        <div className="surface-panel rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Consent-First Privacy Guard: </span>
            Neither party can start cold 1:1 video meetings or unsolicited direct messages without reciprocal confirmation. Once accepted, both parties unlock private messaging and direct meeting scheduling.
          </div>
        </div>

        {/* Tabs for Active Connections vs Pending */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <UserCheck className="h-4 w-4" />
              <span>Active Connections ({activeConnections.length})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              <span>
                Pending Requests ({pendingIncoming.length + pendingOutgoing.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* ACTIVE CONNECTIONS TAB */}
          <TabsContent value="active" className="space-y-4">
            <SectionHeading
              title="Active Mentorship Connections"
              description="Direct channels and meeting scheduling are active."
            />

            {activeConnections.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {activeConnections.map((conn) => {
                  const isSender =
                    user.handle?.toLowerCase() === conn.sender.handle.toLowerCase() ||
                    user.name?.toLowerCase() === conn.sender.name.toLowerCase() ||
                    Boolean(user.email && conn.sender.name.toLowerCase() === user.email.split("@")[0].toLowerCase());
                  const partner = isSender ? conn.recipient : conn.sender;
                  return (
                    <div
                      key={conn.id}
                      className="surface-panel rounded-2xl p-5 border border-border hover:border-border-strong transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar initials={partner.initials} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-sm truncate">{partner.name}</h3>
                              <button
                                type="button"
                                title="Edit display name"
                                onClick={() => {
                                  setEditingPartnerModal({
                                    connId: conn.id,
                                    isSender,
                                    name: partner.name,
                                  });
                                  setCustomNameInput(partner.name);
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-surface"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{partner.handle}</p>
                          </div>
                        </div>
                        <PrivacyBadge
                          label={partner.designation === "mentor" ? "Mentor" : "Trainee"}
                          tone="accent"
                        />
                      </div>

                      {conn.note && (
                        <p className="mt-3 text-xs bg-accent/30 rounded-xl p-2.5 text-foreground/80 italic">
                          &quot;{conn.note}&quot;
                        </p>
                      )}

                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={() => handleOpenDirectChat(conn, partner)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Direct Chat</span>
                        </Button>
                        <Button
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={() => {
                            setMeetingPartnerModal({ conn, partner });
                            setMeetingTopic(`1:1 Mentorship · ${user.name} & ${partner.name}`);
                          }}
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          <span>Set 1:1 Meeting</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="surface-panel rounded-2xl p-10 text-center space-y-3">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold">No active mentorship connections yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isMentor
                    ? "Click 'Invite Trainee' above to invite your interns or mentees. Once accepted, your private 1:1 channel and meeting rights will unlock."
                    : "When a mentor invites you or when you request connection, accepted partnerships will show here."}
                </p>
              </div>
            )}

            {/* 1:1 Meeting Modal */}
            <Dialog
              open={Boolean(meetingPartnerModal)}
              onOpenChange={(open) => !open && setMeetingPartnerModal(null)}
            >
              <DialogContent className="glass sm:max-w-[480px]">
                {meetingPartnerModal && (
                  <>
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <Avatar initials={meetingPartnerModal.partner.initials} size="md" />
                        <div className="min-w-0">
                          <DialogTitle className="text-base font-semibold">
                            1:1 Meeting with {meetingPartnerModal.partner.name}
                          </DialogTitle>
                          <DialogDescription className="text-xs">
                            Private, end-to-end encrypted session. Only invited participants can join.
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>

                    {/* Quick Launch Call */}
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                          <Video className="h-4 w-4" /> Start Call Immediately
                        </span>
                        <PrivacyBadge label="Live WebRTC" tone="accent" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Launch an instant 1:1 video room. An invitation link will automatically be posted into {meetingPartnerModal.partner.name}&apos;s direct chat.
                      </p>
                      <Button
                        className="w-full gap-2 mt-1"
                        onClick={() =>
                          handleStartInstantCall(
                            meetingPartnerModal.conn,
                            meetingPartnerModal.partner
                          )
                        }
                      >
                        <Video className="h-4 w-4" />
                        <span>Start Instant Call Now</span>
                      </Button>
                    </div>

                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-border" />
                      <span className="flex-shrink mx-3 text-[11px] text-muted-foreground uppercase tracking-wider">
                        Or Schedule for Later
                      </span>
                      <div className="flex-grow border-t border-border" />
                    </div>

                    {/* Schedule form */}
                    <form onSubmit={handleScheduleMeeting} className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="m-topic" className="text-xs">
                          Meeting Topic
                        </Label>
                        <Input
                          id="m-topic"
                          value={meetingTopic}
                          onChange={(e) => setMeetingTopic(e.target.value)}
                          placeholder="e.g. Weekly Mentorship Catchup"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="m-date" className="text-xs">
                            Date
                          </Label>
                          <Input
                            id="m-date"
                            type="date"
                            value={meetingDate}
                            onChange={(e) => setMeetingDate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="m-time" className="text-xs">
                            Time
                          </Label>
                          <Input
                            id="m-time"
                            type="time"
                            value={meetingTime}
                            onChange={(e) => setMeetingTime(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="m-duration" className="text-xs">
                          Duration
                        </Label>
                        <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                          <SelectTrigger id="m-duration" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setMeetingPartnerModal(null)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="gap-2">
                          <CalendarPlus className="h-4 w-4" />
                          <span>Schedule &amp; Send Invite</span>
                        </Button>
                      </DialogFooter>
                    </form>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* PENDING REQUESTS TAB */}
          <TabsContent value="pending" className="space-y-6">
            {/* Incoming Requests */}
            <div className="space-y-3">
              <SectionHeading
                title="Incoming Invitations"
                description="Review mentorship connection requests awaiting your decision."
              />

              {pendingIncoming.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {pendingIncoming.map((inv) => (
                    <div
                      key={inv.id}
                      className="surface-panel rounded-2xl p-5 border border-primary/20 bg-primary/[0.02]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={inv.sender.initials} size="md" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-sm">{inv.sender.name}</h3>
                              <button
                                type="button"
                                title="Edit display name"
                                onClick={() => {
                                  setEditingPartnerModal({
                                    connId: inv.id,
                                    isSender: false,
                                    name: inv.sender.name,
                                  });
                                  setCustomNameInput(inv.sender.name);
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-surface"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground">{inv.sender.handle}</p>
                          </div>
                        </div>
                        <PrivacyBadge label="Pending Your Approval" tone="brand" />
                      </div>

                      {inv.note && (
                        <p className="mt-3 text-xs bg-background/60 border border-border/60 rounded-xl p-3 text-foreground/90">
                          {inv.note}
                        </p>
                      )}

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDecline(inv.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => handleAccept(inv.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accept & Unlock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No incoming invitations pending.</p>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="space-y-3 pt-4 border-t border-border">
              <SectionHeading
                title="Sent Invitations"
                description="Invitations you sent awaiting recipient confirmation."
              />

              {pendingOutgoing.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {pendingOutgoing.map((inv) => (
                    <div key={inv.id} className="surface-panel rounded-2xl p-4 border border-border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{inv.recipient.name}</p>
                            <button
                              type="button"
                              title="Edit display name"
                              onClick={() => {
                                setEditingPartnerModal({
                                  connId: inv.id,
                                  isSender: true,
                                  name: inv.recipient.name,
                                });
                                setCustomNameInput(inv.recipient.name);
                              }}
                              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-surface"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{inv.recipient.handle}</p>
                        </div>
                        <PrivacyBadge label="Awaiting Acceptance" tone="muted" />
                      </div>
                      {inv.note && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-1 italic">
                          &quot;{inv.note}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No outgoing invitations sent.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Connection Display Name Modal */}
        <Dialog
          open={Boolean(editingPartnerModal)}
          onOpenChange={(open) => !open && setEditingPartnerModal(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                <span>Edit Connection Display Name</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Set a friendly real name for this mentorship connection (e.g. mentor or intern&apos;s full name).
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingPartnerModal && customNameInput.trim()) {
                  handleSavePartnerName(
                    editingPartnerModal.connId,
                    editingPartnerModal.isSender,
                    customNameInput.trim()
                  );
                }
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="custom-partner-name" className="text-xs font-semibold">
                  Display Name
                </Label>
                <Input
                  id="custom-partner-name"
                  type="text"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  placeholder="e.g. Ram Sah or Alex Johnson"
                  required
                  autoFocus
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingPartnerModal(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Name
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

