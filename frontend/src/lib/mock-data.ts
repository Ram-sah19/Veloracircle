export type Role = "owner" | "admin" | "moderator" | "member" | "guest";

export type Designation = "mentor" | "intern" | "trainee";

export interface AuthUser {
  id?: string;
  name: string;
  handle: string;
  email: string;
  initials: string;
  status: string;
  role: Role;
  designation?: Designation | string;
  avatar?: string | null;
  authProvider?: string;
}

const AUTH_USER_KEY = "velora_auth_user";
const AUTH_TOKEN_KEY = "velora_auth_token";
const AUTH_TIMESTAMP_KEY = "velora_auth_timestamp";
const MAX_SESSION_AGE_MS = 20 * 24 * 60 * 60 * 1000; // 20 days in ms

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (typeof payload.exp === "number") {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return false;
  }
}

export function getStoredAuth(): { user: AuthUser | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const rawUser = localStorage.getItem(AUTH_USER_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const timestampStr = localStorage.getItem(AUTH_TIMESTAMP_KEY);

    if (!rawUser || !token) {
      return { user: null, token: null };
    }

    // Check 20-day age threshold
    const loginTime = timestampStr ? parseInt(timestampStr, 10) : 0;
    const isExceeded20Days = loginTime > 0 && Date.now() - loginTime > MAX_SESSION_AGE_MS;

    // Check JWT payload expiration
    const isExpired = isExceeded20Days || isJwtExpired(token);

    if (isExpired) {
      clearAuthSession();
      return { user: null, token: null };
    }

    return {
      user: JSON.parse(rawUser),
      token,
    };
  } catch {
    return { user: null, token: null };
  }
}

export function saveAuthSession(user: AuthUser, token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
    // Mutate exported object in place so modules referencing currentUser reflect new session
    Object.assign(currentUser, user);
    window.dispatchEvent(new CustomEvent("velora_auth_changed", { detail: { user, token } }));
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    currentUser.name = "";
    currentUser.email = "";
    currentUser.initials = "";
    currentUser.handle = "";
    currentUser.role = "member";
    currentUser.designation = "";
    window.dispatchEvent(new CustomEvent("velora_auth_changed", { detail: { user: null, token: null } }));
  }
}

const initialAuth = getStoredAuth();

export const currentUser: AuthUser = initialAuth.user || {
  name: "",
  handle: "",
  email: "",
  initials: "VC",
  status: "Available",
  role: "member" as Role,
  avatar: null,
  authProvider: "local",
};

export function clearAllMentorshipData() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
    localStorage.removeItem(INVITATIONS_STORAGE_KEY);

    // Clear all direct chat messages and cached conversations
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(MESSAGES_STORAGE_PREFIX) ||
          key.startsWith("dm_") ||
          key.startsWith("msg_") ||
          key.includes("velora_messages") ||
          key.includes("messages"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    window.dispatchEvent(new CustomEvent("velora_conversations_updated", { detail: [] }));
    window.dispatchEvent(new CustomEvent("velora_invitations_changed", { detail: [] }));
    window.dispatchEvent(
      new CustomEvent("velora_messages_updated", { detail: { convoId: "", messages: [] } })
    );
  } catch (err) {
    console.error("Error clearing mentorship data:", err);
  }
}

// Auto-execute immediate clean wipe as requested
if (typeof window !== "undefined") {
  const WIPE_ONCE_KEY = "velora_wipe_reset_20260913_akash_clean_v4";
  if (!localStorage.getItem(WIPE_ONCE_KEY)) {
    clearAllMentorshipData();
    localStorage.setItem(WIPE_ONCE_KEY, "done");
  }
}

export type Conversation = {
  id: string;
  name: string;
  initials: string;
  preview: string;
  time: string;
  unread?: number;
  pinned?: boolean;
  kind: "direct" | "circle";
  privacy: string;
  partnerEmail?: string;
  partnerRole?: string;
};

const CONVERSATIONS_STORAGE_KEY = "velora_conversations";
const MESSAGES_STORAGE_PREFIX = "velora_messages_";

export function getStoredConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredConversations(convos: Conversation[]): Conversation[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(convos));
    window.dispatchEvent(new CustomEvent("velora_conversations_updated", { detail: convos }));
  }
  return convos;
}

export function ensureDirectConversation(convo: Conversation): Conversation {
  const list = getStoredConversations();
  const index = list.findIndex((c) => c.id === convo.id);
  if (index >= 0) {
    const existing = list[index];
    const isUpdated =
      (convo.name && convo.name !== existing.name) ||
      (convo.privacy && convo.privacy !== existing.privacy) ||
      (convo.initials && convo.initials !== existing.initials);
    if (isUpdated) {
      list[index] = {
        ...existing,
        name: convo.name || existing.name,
        initials: convo.initials || existing.initials,
        privacy: convo.privacy || existing.privacy,
        partnerEmail: convo.partnerEmail || existing.partnerEmail,
        partnerRole: convo.partnerRole || existing.partnerRole,
      };
      saveStoredConversations(list);
      return list[index];
    }
    return existing;
  }
  const updated = [convo, ...list];
  saveStoredConversations(updated);
  return convo;
}

export function syncConversationsWithInvitations(activeUser?: AuthUser | null): Conversation[] {
  if (typeof window === "undefined") return [];
  const curr = activeUser || getStoredAuth().user || currentUser;
  const userPrefix = curr.email ? curr.email.split("@")[0].toLowerCase() : "";
  const invs = getStoredInvitations();
  const convos = getStoredConversations();
  let changed = false;

  const updatedConvos = convos.map((convo) => {
    const matchingInv = invs.find(
      (inv) =>
        inv.conversationId === convo.id ||
        `dm_${inv.id}` === convo.id ||
        (inv.status === "accepted" &&
          (inv.recipient.name.toLowerCase() === convo.name.toLowerCase() ||
            inv.sender.name.toLowerCase() === convo.name.toLowerCase() ||
            (inv.recipient.email && convo.partnerEmail && inv.recipient.email.toLowerCase() === convo.partnerEmail.toLowerCase()) ||
            (inv.sender.email && convo.partnerEmail && inv.sender.email.toLowerCase() === convo.partnerEmail.toLowerCase())))
    );

    if (!matchingInv) {
      const isMentor = curr.designation === "mentor";
      const expectedPrivacy = `Direct Mentorship · ${isMentor ? "Trainee" : "Mentor"}`;
      if (convo.privacy?.includes("Mentorship") && convo.privacy !== expectedPrivacy) {
        changed = true;
        return {
          ...convo,
          privacy: expectedPrivacy,
          partnerRole: isMentor ? "Trainee" : "Mentor",
        };
      }
      return convo;
    }

    const isSenderCurr =
      (matchingInv.sender.email && curr.email && matchingInv.sender.email.toLowerCase() === curr.email.toLowerCase()) ||
      curr.handle?.toLowerCase() === matchingInv.sender.handle.toLowerCase() ||
      curr.name?.toLowerCase() === matchingInv.sender.name.toLowerCase() ||
      Boolean(userPrefix && matchingInv.sender.name.toLowerCase() === userPrefix) ||
      Boolean(userPrefix && matchingInv.sender.handle.toLowerCase() === `@${userPrefix}`);

    const partner = isSenderCurr ? matchingInv.recipient : matchingInv.sender;
    const isMentor = curr.designation === "mentor";
    const partnerRoleLabel = isMentor ? "Trainee" : "Mentor";
    const expectedPrivacy = `Direct Mentorship · ${partnerRoleLabel}`;

    if (
      convo.name !== partner.name ||
      convo.initials !== partner.initials ||
      convo.privacy !== expectedPrivacy
    ) {
      changed = true;
      return {
        ...convo,
        name: partner.name,
        initials: partner.initials,
        privacy: expectedPrivacy,
        partnerEmail: partner.email,
        partnerRole: partnerRoleLabel,
      };
    }

    return convo;
  });

  // Also ensure all accepted invitations have an active conversation
  invs.forEach((inv) => {
    if (inv.status === "accepted") {
      const convoId = inv.conversationId || `dm_${inv.id}`;
      const exists = updatedConvos.some(
        (c) => c.id === convoId || c.id === inv.conversationId || c.id === `dm_${inv.id}`
      );
      if (!exists) {
        const isSenderCurr =
          (inv.sender.email && curr.email && inv.sender.email.toLowerCase() === curr.email.toLowerCase()) ||
          (curr.id && inv.sender.id === curr.id) ||
          curr.handle?.toLowerCase() === inv.sender.handle.toLowerCase() ||
          curr.name?.toLowerCase() === inv.sender.name.toLowerCase();
        const partner = isSenderCurr ? inv.recipient : inv.sender;
        const isMentor = curr.designation === "mentor";
        const partnerRole = isMentor ? "Trainee" : "Mentor";
        updatedConvos.unshift({
          id: convoId,
          name: partner.name,
          initials: partner.initials,
          kind: "direct",
          privacy: `Direct Mentorship · ${partnerRole}`,
          partnerEmail: partner.email,
          partnerRole,
          preview: inv.note ? `Note: "${inv.note}"` : "Mentorship connected. Say hello!",
          time: "Just now",
        });
        changed = true;
      }
    }
  });

  if (changed) {
    saveStoredConversations(updatedConvos);
    return updatedConvos;
  }
  return convos;
}

export function getStoredMessages(convoId: string): Message[] {
  if (typeof window === "undefined" || !convoId) return [];
  try {
    const raw = localStorage.getItem(`${MESSAGES_STORAGE_PREFIX}${convoId}`);
    if (!raw) return [];
    const list: Message[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // First pass: collect server message bodies
    const serverBodies = new Set<string>();
    list.forEach((m) => {
      if (m && m.id && !m.id.startsWith("msg_") && m.body) {
        serverBodies.add(`${(m.author || "").toLowerCase()}_${m.body.trim()}`);
      }
    });

    // Deduplicate: drop temp msg_ messages if real server message exists
    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();
    return list.filter((m) => {
      if (!m || !m.id) return false;
      if (m.kind === "voice" || m.body === "🎤 Voice message") return false;
      if (seenIds.has(m.id)) return false;

      const bodyKey = `${(m.author || "").toLowerCase()}_${(m.body || "").trim()}`;
      // Drop temp message if server version exists
      if (m.id.startsWith("msg_") && serverBodies.has(bodyKey)) {
        return false;
      }

      if (seenSignatures.has(bodyKey) && m.body?.trim()) {
        return false;
      }
      if (m.body?.trim()) {
        seenSignatures.add(bodyKey);
      }
      seenIds.add(m.id);
      return true;
    });
  } catch {
    return [];
  }
}

export function saveStoredMessage(convoId: string, message: Message): Message[] {
  if (typeof window === "undefined" || !convoId) return [message];
  if (message.kind === "voice" || message.body === "🎤 Voice message") return getStoredMessages(convoId);
  try {
    const current = getStoredMessages(convoId);
    // If exact ID already exists, return current without modifying
    if (current.some((m) => m.id === message.id)) {
      return current;
    }

    const msgBody = (message.body || "").trim();

    // If this is a server message replacing an optimistic message with temp ID
    const optimisticIndex = current.findIndex(
      (m) =>
        m.id.startsWith("msg_") &&
        (m.body || "").trim() === msgBody
    );

    let updated: Message[];
    if (optimisticIndex !== -1) {
      updated = [...current];
      updated[optimisticIndex] = message;
    } else {
      // Check if duplicate server message with same body and author
      const isDuplicate = current.some(
        (m) =>
          !m.id.startsWith("msg_") &&
          !message.id.startsWith("msg_") &&
          (m.body || "").trim() === msgBody &&
          (m.author === message.author || m.senderEmail === message.senderEmail)
      );
      if (isDuplicate && msgBody) {
        return current;
      }
      updated = [...current, message];
    }

    localStorage.setItem(`${MESSAGES_STORAGE_PREFIX}${convoId}`, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("velora_messages_updated", { detail: { convoId, messages: updated } })
    );

    // Also update the conversation's preview and time
    const convos = getStoredConversations();
    const target = convos.find((c) => c.id === convoId);
    if (target) {
      target.preview = message.body || (message.kind === "file" ? "Sent a file" : "Sent a message");
      target.time = message.time;
      saveStoredConversations(convos);
    }

    return updated;
  } catch {
    return [message];
  }
}

export const conversations: Conversation[] = [];

export type Message = {
  id: string;
  author: string;
  initials: string;
  self?: boolean;
  time: string;
  body?: string;
  kind?: "text" | "file" | "image" | "poll" | "code";
  file?: { name: string; size: string; url?: string; duration?: string };
  reactions?: { emoji: string; count: number; userReacted?: boolean }[];
  replyTo?: { author: string; body: string };
  senderEmail?: string;
  senderId?: string;
  role?: string;
  readBy?: string[]; // array of user IDs who read this message
  codeLang?: string; // language for code snippets
  isPinned?: boolean;
  poll?: {
    question: string;
    options: { text: string; votes: number; votedByMe?: boolean }[];
    closed?: boolean;
  };
};


export const messageThread: Message[] = [];

export type Meeting = {
  id: string;
  title: string;
  day?: string;
  time?: string;
  host?: string | { id: string; name: string };
  privacy?: string;
  duration?: string;
  group?: "today" | "upcoming" | "past";
  circleId?: string;
  circleName?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  isPrivate?: boolean;
  inviteOnly?: boolean;
  participantCount?: number;
  status?: "scheduled" | "upcoming" | "live" | "ended";
  meetingUrl?: string;
};

// Storage key for user-created meetings
const MEETINGS_STORAGE_KEY = "velora_meetings";

export function generateMeetingId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `vel-${segment(3)}-${segment(3)}`;
}

export function getStoredMeetings(): Meeting[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEETINGS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMeeting(meeting: Meeting): Meeting[] {
  const current = getStoredMeetings();
  const updated = [meeting, ...current.filter((m) => m.id !== meeting.id)];
  if (typeof window !== "undefined") {
    localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event for cross-component reactivity
    window.dispatchEvent(new CustomEvent("velora_meetings_updated", { detail: updated }));
  }
  return updated;
}

export function createInstantMeeting(title?: string): Meeting {
  const id = generateMeetingId();
  const now = new Date();
  const meeting: Meeting = {
    id,
    title: title || "Instant Meeting",
    day: "Today",
    time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    host: currentUser.name,
    privacy: "Private Meeting",
    duration: "45 min",
    group: "today",
  };
  saveMeeting(meeting);
  return meeting;
}

export function createMeetingForLater(title?: string): { meeting: Meeting; url: string } {
  const id = generateMeetingId();
  const now = new Date();
  const meeting: Meeting = {
    id,
    title: title || "Scheduled Meeting",
    day: "Today",
    time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    host: currentUser.name,
    privacy: "Private Meeting",
    duration: "45 min",
    group: "upcoming",
  };
  saveMeeting(meeting);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return { meeting, url: `${baseUrl}/meeting/${id}` };
}

// Initial in-memory export for static references
export const meetings: Meeting[] = [];

export type Circle = {
  id: string;
  name: string;
  privacy: string;
  activity: string;
  description: string;
};

export const circles: Circle[] = [];

export type FileItem = {
  id: string;
  name: string;
  type: "pdf" | "image" | "doc" | "sheet" | "zip" | "video";
  size: string;
  date: string;
  owner: string;
  group: "recent" | "shared" | "mine";
};

export const files: FileItem[] = [];

export const savedMessages: {
  id: string;
  from: string;
  circle: string;
  body: string;
  time: string;
}[] = [];

export const savedLinks: {
  id: string;
  title: string;
  url: string;
  time: string;
}[] = [];

export const notifications: {
  id: string;
  kind: "message" | "meeting" | "invite" | "file" | "schedule";
  title: string;
  body: string;
  time: string;
  unread: boolean;
}[] = [];

export const members: {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: string;
  joined: string;
}[] = [];

export interface MentorshipInvitation {
  id: string;
  sender: {
    id: string;
    name: string;
    email?: string;
    handle: string;
    initials: string;
    avatar?: string | null;
    designation: string;
  };
  recipient: {
    id: string;
    name: string;
    email?: string;
    handle: string;
    initials: string;
    avatar?: string | null;
    designation: string;
  };
  status: "pending" | "accepted" | "declined";
  note?: string;
  conversationId?: string;
  createdAt: string;
}

const INVITATIONS_STORAGE_KEY = "velora_mentorship_invitations";

export function getStoredInvitations(): MentorshipInvitation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVITATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredInvitations(invites: MentorshipInvitation[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invites));
    window.dispatchEvent(new CustomEvent("velora_invitations_changed", { detail: invites }));
  }
}

