export type Role = "owner" | "admin" | "moderator" | "member" | "guest";

export const currentUser = {
  name: "Ram Sharma",
  handle: "@ram",
  email: "ram@velora.io",
  initials: "RS",
  status: "Focused · Available for Circles",
  role: "admin" as Role,
};

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
};

export const conversations: Conversation[] = [];

export type Message = {
  id: string;
  author: string;
  initials: string;
  self?: boolean;
  time: string;
  body?: string;
  kind?: "text" | "file" | "image" | "voice";
  file?: { name: string; size: string; url?: string };
  reactions?: { emoji: string; count: number }[];
  replyTo?: { author: string; body: string };
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
