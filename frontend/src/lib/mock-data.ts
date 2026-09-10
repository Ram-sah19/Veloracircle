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

export const conversations: Conversation[] = [
  {
    id: "design-circle",
    name: "Design Circle",
    initials: "DC",
    preview: "Can we finalize the UI flow?",
    time: "12 min",
    unread: 3,
    pinned: true,
    kind: "circle",
    privacy: "Private Circle",
  },
  {
    id: "aarav",
    name: "Aarav Mehta",
    initials: "AM",
    preview: "Sent the signed NDA — take a look when free.",
    time: "38 min",
    kind: "direct",
    pinned: true,
    privacy: "Private conversation",
  },
  {
    id: "alpha-circle",
    name: "Alpha Circle",
    initials: "AC",
    preview: "Pinned: Release checklist for Nova v2.",
    time: "1 h",
    unread: 7,
    kind: "circle",
    privacy: "Private Circle",
  },
  {
    id: "lena",
    name: "Lena Fischer",
    initials: "LF",
    preview: "Voice message · 0:42",
    time: "2 h",
    kind: "direct",
    privacy: "Private conversation",
  },
  {
    id: "core-team",
    name: "Core Team",
    initials: "CT",
    preview: "Standup notes are in the shared file.",
    time: "4 h",
    kind: "circle",
    privacy: "Restricted access",
  },
  {
    id: "mentorship-hub",
    name: "Mentorship Hub",
    initials: "MH",
    preview: "Session moved to Thursday evening.",
    time: "Yesterday",
    kind: "circle",
    privacy: "Invite only",
  },
  {
    id: "priya",
    name: "Priya Nair",
    initials: "PN",
    preview: "Thanks — reviewing the privacy spec now.",
    time: "Yesterday",
    kind: "direct",
    privacy: "Private conversation",
  },
];

export type Message = {
  id: string;
  author: string;
  initials: string;
  self?: boolean;
  time: string;
  body?: string;
  kind?: "text" | "file" | "image" | "voice";
  file?: { name: string; size: string };
  reactions?: { emoji: string; count: number }[];
  replyTo?: { author: string; body: string };
};

export const messageThread: Message[] = [
  {
    id: "m1",
    author: "Aarav Mehta",
    initials: "AM",
    time: "17:02",
    body: "Morning. I moved the privacy spec into the Circle so it stays off shared drives.",
  },
  {
    id: "m2",
    author: "Ram Sharma",
    initials: "RS",
    self: true,
    time: "17:04",
    body: "Perfect. Directory stays hidden for members — only the management panel resolves identities.",
    reactions: [{ emoji: "✓", count: 2 }],
  },
  {
    id: "m3",
    author: "Aarav Mehta",
    initials: "AM",
    time: "17:09",
    kind: "file",
    file: { name: "velora-privacy-model-v4.pdf", size: "2.4 MB" },
    body: "Latest revision, includes the visibility matrix.",
  },
  {
    id: "m4",
    author: "Lena Fischer",
    initials: "LF",
    time: "17:22",
    kind: "voice",
    body: "Voice message · 0:42",
  },
  {
    id: "m5",
    author: "Ram Sharma",
    initials: "RS",
    self: true,
    time: "17:26",
    replyTo: { author: "Lena Fischer", body: "Voice message · 0:42" },
    body: "Agreed — we ship the restricted invite flow first, then scheduled meetings.",
  },
  {
    id: "m6",
    author: "Aarav Mehta",
    initials: "AM",
    time: "17:31",
    body: "Can we finalize the UI flow before tonight's session?",
    reactions: [
      { emoji: "★", count: 3 },
      { emoji: "✓", count: 1 },
    ],
  },
];

export type Meeting = {
  id: string;
  title: string;
  day: string;
  time: string;
  host: string;
  privacy: string;
  duration: string;
  group: "today" | "upcoming" | "past";
};

export const meetings: Meeting[] = [
  {
    id: "product-strategy",
    title: "Product Strategy",
    day: "Today",
    time: "6:30 PM",
    host: "Ram Sharma",
    privacy: "Private Meeting",
    duration: "45 min",
    group: "today",
  },
  {
    id: "nova-review",
    title: "Project Nova · Design Review",
    day: "Today",
    time: "8:00 PM",
    host: "Lena Fischer",
    privacy: "Invite only",
    duration: "30 min",
    group: "today",
  },
  {
    id: "security-sync",
    title: "Security & Compliance Sync",
    day: "Tomorrow",
    time: "10:00 AM",
    host: "Priya Nair",
    privacy: "Private Meeting",
    duration: "1 h",
    group: "upcoming",
  },
  {
    id: "mentorship",
    title: "Mentorship Hub · Office Hours",
    day: "Thu, 11 Sep",
    time: "5:00 PM",
    host: "Aarav Mehta",
    privacy: "Restricted",
    duration: "1 h 30 min",
    group: "upcoming",
  },
  {
    id: "quarterly",
    title: "Quarterly Planning",
    day: "Mon, 1 Sep",
    time: "3:00 PM",
    host: "Ram Sharma",
    privacy: "Private Meeting",
    duration: "2 h",
    group: "past",
  },
  {
    id: "vendor",
    title: "Vendor Assessment",
    day: "Fri, 29 Aug",
    time: "11:30 AM",
    host: "Priya Nair",
    privacy: "Invite only",
    duration: "45 min",
    group: "past",
  },
];

export type Circle = {
  id: string;
  name: string;
  privacy: string;
  activity: string;
  description: string;
};

export const circles: Circle[] = [
  {
    id: "alpha-circle",
    name: "Alpha Circle",
    privacy: "Private Circle",
    activity: "Active 12 min ago",
    description: "Strategy and release coordination for the Velora core product.",
  },
  {
    id: "core-team",
    name: "Core Team",
    privacy: "Restricted Access",
    activity: "Active 4 h ago",
    description: "Day-to-day engineering coordination and incident response.",
  },
  {
    id: "mentorship-hub",
    name: "Mentorship Hub",
    privacy: "Invite Only",
    activity: "Active yesterday",
    description: "Guided sessions between senior engineers and new joiners.",
  },
  {
    id: "project-nova",
    name: "Project Nova",
    privacy: "Private Circle",
    activity: "Active 2 d ago",
    description: "Confidential workstream for the next-generation meeting stack.",
  },
];

export type FileItem = {
  id: string;
  name: string;
  type: "pdf" | "image" | "doc" | "sheet" | "zip" | "video";
  size: string;
  date: string;
  owner: string;
  group: "recent" | "shared" | "mine";
};

export const files: FileItem[] = [
  {
    id: "f1",
    name: "velora-privacy-model-v4.pdf",
    type: "pdf",
    size: "2.4 MB",
    date: "Today",
    owner: "Aarav Mehta",
    group: "recent",
  },
  {
    id: "f2",
    name: "nova-interface-explorations.png",
    type: "image",
    size: "8.1 MB",
    date: "Today",
    owner: "Lena Fischer",
    group: "recent",
  },
  {
    id: "f3",
    name: "q3-roadmap.sheet",
    type: "sheet",
    size: "412 KB",
    date: "Yesterday",
    owner: "Ram Sharma",
    group: "recent",
  },
  {
    id: "f4",
    name: "security-review-notes.doc",
    type: "doc",
    size: "96 KB",
    date: "2 Sep",
    owner: "Priya Nair",
    group: "shared",
  },
  {
    id: "f5",
    name: "brand-assets.zip",
    type: "zip",
    size: "54 MB",
    date: "1 Sep",
    owner: "Lena Fischer",
    group: "shared",
  },
  {
    id: "f6",
    name: "meeting-recording-strategy.video",
    type: "video",
    size: "310 MB",
    date: "29 Aug",
    owner: "Ram Sharma",
    group: "mine",
  },
  {
    id: "f7",
    name: "invite-policy-draft.doc",
    type: "doc",
    size: "128 KB",
    date: "27 Aug",
    owner: "Ram Sharma",
    group: "mine",
  },
];

export const savedMessages = [
  {
    id: "s1",
    from: "Aarav Mehta",
    circle: "Alpha Circle",
    body: "Directory visibility stays off by default for every new Circle.",
    time: "Today · 17:02",
  },
  {
    id: "s2",
    from: "Priya Nair",
    circle: "Core Team",
    body: "Rotation keys are refreshed weekly; nothing is stored client-side.",
    time: "Yesterday · 09:41",
  },
];

export const savedLinks = [
  { id: "l1", title: "Velora privacy whitepaper", url: "velora.io/privacy", time: "2 Sep" },
  { id: "l2", title: "Meeting encryption overview", url: "velora.io/docs/e2ee", time: "28 Aug" },
];

export const notifications = [
  {
    id: "n1",
    kind: "message" as const,
    title: "New message in Design Circle",
    body: "Can we finalize the UI flow?",
    time: "12 min",
    unread: true,
  },
  {
    id: "n2",
    kind: "meeting" as const,
    title: "Product Strategy starts soon",
    body: "Today · 6:30 PM · Private Meeting",
    time: "40 min",
    unread: true,
  },
  {
    id: "n3",
    kind: "invite" as const,
    title: "You were invited to Project Nova",
    body: "Invitation from Lena Fischer",
    time: "2 h",
    unread: true,
  },
  {
    id: "n4",
    kind: "file" as const,
    title: "File shared with you",
    body: "velora-privacy-model-v4.pdf",
    time: "5 h",
    unread: false,
  },
  {
    id: "n5",
    kind: "schedule" as const,
    title: "Meeting scheduled",
    body: "Security & Compliance Sync · Tomorrow 10:00 AM",
    time: "Yesterday",
    unread: false,
  },
];

export const members = [
  {
    id: "u1",
    name: "Ram Sharma",
    initials: "RS",
    role: "Owner",
    status: "Active",
    joined: "12 Jan 2025",
  },
  {
    id: "u2",
    name: "Aarav Mehta",
    initials: "AM",
    role: "Admin",
    status: "Active",
    joined: "3 Feb 2025",
  },
  {
    id: "u3",
    name: "Lena Fischer",
    initials: "LF",
    role: "Moderator",
    status: "Active",
    joined: "19 Mar 2025",
  },
  {
    id: "u4",
    name: "Priya Nair",
    initials: "PN",
    role: "Member",
    status: "Active",
    joined: "8 Apr 2025",
  },
  {
    id: "u5",
    name: "Tomás Ruiz",
    initials: "TR",
    role: "Member",
    status: "Idle",
    joined: "22 May 2025",
  },
  {
    id: "u6",
    name: "Hana Kobayashi",
    initials: "HK",
    role: "Guest",
    status: "Pending",
    joined: "2 Jul 2025",
  },
];
