import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Pencil,
  Phone,
  Pin,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/velora/app-shell";
import { ConversationItem, MessageBubble, MessageComposer } from "@/components/velora/chat";
import { EmptyState, IconButton, PrivacyBadge } from "@/components/velora/primitives";
import { registerPushNotifications } from "@/lib/push";
import {
  clearAllMentorshipData,
  currentUser,
  generateMeetingId,
  getStoredAuth,
  getStoredConversations,
  getStoredInvitations,
  getStoredMessages,
  saveMeeting,
  saveStoredConversations,
  saveStoredInvitations,
  saveStoredMessage,
  syncConversationsWithInvitations,
  type Conversation,
  type Meeting,
  type Message,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
    convoId: typeof search.convoId === "string" ? search.convoId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Velora Circle" },
      {
        name: "description",
        content:
          "Private one-to-one and Circle conversations with hidden participant information and encrypted delivery.",
      },
      { property: "og:title", content: "Velora Circle" },
      {
        property: "og:description",
        content: "Private conversations without unnecessary visibility.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const targetId = search.id || search.convoId;

  const [user, setUser] = useState(() => getStoredAuth().user || currentUser);
  const [conversationsList, setConversationsList] = useState<Conversation[]>(() =>
    syncConversationsWithInvitations(getStoredAuth().user || currentUser)
  );
  const [activeId, setActiveId] = useState<string>(() => targetId || getStoredConversations()[0]?.id || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(Boolean(targetId));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef<string | null>(activeId);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Search in conversation state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);

  // Pinned messages state
  const [pinnedMessages, setPinnedMessages] = useState<Array<{ messageId: string; body: string; author: string }>>([]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Edit partner name modal
  const [editingPartnerModal, setEditingPartnerModal] = useState<{
    convoId: string;
    name: string;
  } | null>(null);
  const [customNameInput, setCustomNameInput] = useState("");

  // Fetch conversations from backend with local fallback
  const fetchConversations = async () => {
    const { token } = getStoredAuth();
    if (token) {
      try {
        const invRes = await fetch("http://localhost:5000/api/mentorship/invitations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const invData = await invRes.json();
        if (invData.success && Array.isArray(invData.data)) {
          saveStoredInvitations(invData.data);
        }

        const res = await fetch("http://localhost:5000/api/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          saveStoredConversations(data.data);
          setConversationsList(data.data);
          if (!activeId || !data.data.some((c: Conversation) => c.id === activeId)) {
            const nextId = (targetId && data.data.some((c: Conversation) => c.id === targetId))
              ? targetId
              : data.data[0].id;
            setActiveId(nextId);
            activeIdRef.current = nextId;
            socketRef.current?.emit("conversation:join", nextId);
          }
          return data.data;
        }
      } catch {
        // fallback
      }
    }

    const synced = syncConversationsWithInvitations(user);
    setConversationsList(synced);
    if (!activeId && synced.length > 0) {
      setActiveId(targetId || synced[0].id);
    }
    return synced;
  };

  // Fetch pinned messages for current conversation
  const fetchPinnedMessages = async (convoId: string) => {
    const { token } = getStoredAuth();
    if (!token || !convoId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/conversations/${convoId}/pins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPinnedMessages(data.data);
      }
    } catch {
      // offline fallback
    }
  };

  // Connect Socket.IO for live real-time messaging & register push notifications
  useEffect(() => {
    void fetchConversations();

    const { token } = getStoredAuth();
    if (token) {
      registerPushNotifications(token).catch(() => {});
    }

    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    const handleConnect = () => {
      if (activeIdRef.current) {
        socket.emit("conversation:join", activeIdRef.current);
      }
    };

    if (socket.connected && activeIdRef.current) {
      socket.emit("conversation:join", activeIdRef.current);
    }

    const handleMessage = (newMsg: Message) => {
      if (newMsg.kind === "voice" || newMsg.body === "🎤 Voice message") return;
      const currentActiveId = activeIdRef.current;
      const activeConvo = conversationsList.find((c) => c.id === currentActiveId);
      const isSenderPartner = Boolean(
        activeConvo &&
        ((activeConvo.partnerEmail && newMsg.senderEmail && activeConvo.partnerEmail.toLowerCase() === newMsg.senderEmail.toLowerCase()) ||
         (newMsg.author && activeConvo.name && newMsg.author.toLowerCase() === activeConvo.name.toLowerCase()) ||
         (newMsg.senderId && currentActiveId && currentActiveId.replace(/^dm_(inv_)?/, "") === newMsg.senderId))
      );

      const convoMatch =
        !newMsg.conversationId ||
        !currentActiveId ||
        newMsg.conversationId === currentActiveId ||
        currentActiveId.includes(newMsg.conversationId) ||
        newMsg.conversationId.includes(currentActiveId) ||
        isSenderPartner;

      if (convoMatch) {
        if (!currentActiveId && newMsg.conversationId) {
          setActiveId(newMsg.conversationId);
          activeIdRef.current = newMsg.conversationId;
        }

        if (newMsg.author) {
          setTypingUsers((prev) => prev.filter((u) => u !== newMsg.author));
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          const msgBody = (newMsg.body || "").trim();

          const optimisticIndex = prev.findIndex(
            (m) =>
              m.id.startsWith("msg_") &&
              (m.body || "").trim() === msgBody
          );
          if (optimisticIndex !== -1) {
            const updated = [...prev];
            updated[optimisticIndex] = newMsg;
            return updated;
          }

          // If message is from me and already in thread, don't append a duplicate
          const userPrefix = user.email ? user.email.split("@")[0].toLowerCase() : "";
          const isFromMe = Boolean(
            (newMsg.senderEmail && user.email && newMsg.senderEmail.toLowerCase() === user.email.toLowerCase()) ||
            (newMsg.senderId && (user.id || (user as any)._id) && (newMsg.senderId === user.id || newMsg.senderId === (user as any)._id)) ||
            (newMsg.author && user.name && newMsg.author.toLowerCase() === user.name.toLowerCase()) ||
            (userPrefix && newMsg.author && newMsg.author.toLowerCase() === userPrefix)
          );
          if (isFromMe && msgBody) {
            const alreadyHasContent = prev.some(
              (m) => (m.body || "").trim() === msgBody
            );
            if (alreadyHasContent) return prev;
          }

          return [...prev, newMsg];
        });

        if (currentActiveId) {
          saveStoredMessage(currentActiveId, newMsg);
        }

        // Auto mark as read if active conversation
        const { token: currentToken } = getStoredAuth();
        if (currentToken && newMsg.id && !newMsg.self && currentActiveId) {
          fetch(`http://localhost:5000/api/conversations/${currentActiveId}/messages/read`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ messageIds: [newMsg.id] }),
          }).catch(() => {});
        }
      }

      // Always save to the message's own conversation storage
      if (newMsg.conversationId) {
        saveStoredMessage(newMsg.conversationId, newMsg);
      }

      // Always update conversation list preview
      setConversationsList((prev) =>
        prev.map((c) =>
          c.id === (newMsg.conversationId || currentActiveId)
            ? {
                ...c,
                preview: newMsg.body || "New message",
                time: "Just now",
                unread: c.id === currentActiveId ? 0 : (c.unread || 0) + 1,
              }
            : c
        )
      );
    };

    const handleUserTyping = ({ conversationId, originalConversationId, userName }: { conversationId: string; originalConversationId?: string; userName: string }) => {
      const cur = activeIdRef.current;
      if (!cur || !userName) return;
      if (user.name && userName.toLowerCase() === user.name.toLowerCase()) return;

      const isMatch =
        cur === conversationId ||
        (originalConversationId && cur === originalConversationId) ||
        cur.includes(conversationId) ||
        conversationId.includes(cur) ||
        Boolean(conversationsList.some((c) => c.id === cur && (c.name?.toLowerCase() === userName.toLowerCase() || (c as any).actualId === conversationId)));

      if (isMatch) {
        setTypingUsers((prev) => (prev.includes(userName) ? prev : [...prev, userName]));
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== userName));
        }, 4000);
      }
    };

    const handleUserStoppedTyping = ({ conversationId, originalConversationId, userName }: { conversationId: string; originalConversationId?: string; userName?: string }) => {
      const cur = activeIdRef.current;
      if (!cur) return;
      const isMatch =
        cur === conversationId ||
        (originalConversationId && cur === originalConversationId) ||
        cur.includes(conversationId) ||
        conversationId.includes(cur) ||
        Boolean(conversationsList.some((c) => c.id === cur && (!userName || c.name?.toLowerCase() === userName.toLowerCase())));

      if (isMatch) {
        setTypingUsers((prev) => (userName ? prev.filter((u) => u !== userName) : []));
      }
    };

    const handleMessagesRead = ({ messageIds, readByUserId }: { messageIds: string[]; readByUserId: string }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (messageIds.includes(m.id)) {
            const readBy = Array.isArray(m.readBy) ? m.readBy : [];
            if (!readBy.includes(readByUserId)) {
              return { ...m, readBy: [...readBy, readByUserId] };
            }
          }
          return m;
        })
      );
    };

    const handleReactionUpdated = ({ messageId, reactions }: { messageId: string; reactions: Array<{ emoji: string; count: number; userReacted?: boolean }> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    const handlePollUpdated = ({ messageId, poll }: { messageId: string; poll: NonNullable<Message["poll"]> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, poll } : m))
      );
    };

    const handleMessagePinned = () => {
      if (activeIdRef.current) fetchPinnedMessages(activeIdRef.current);
    };

    const handleMessageUnpinned = () => {
      if (activeIdRef.current) fetchPinnedMessages(activeIdRef.current);
    };

    const handleConversationCleared = ({ conversationId }: { conversationId: string }) => {
      if (activeIdRef.current === conversationId) {
        setMessages([]);
        setPinnedMessages([]);
      }
    };

    const handleConversationUpdated = () => {
      void fetchConversations();
    };

    const handleInvitationAccepted = () => {
      void fetchConversations();
    };

    socket.on("connect", handleConnect);
    socket.on("conversation:message", handleMessage);
    socket.on("conversation:new_message", handleMessage);
    socket.on("conversation:user_typing", handleUserTyping);
    socket.on("conversation:user_stopped_typing", handleUserStoppedTyping);
    socket.on("conversation:messages_read", handleMessagesRead);
    socket.on("conversation:reaction_updated", handleReactionUpdated);
    socket.on("conversation:poll_updated", handlePollUpdated);
    socket.on("conversation:message_pinned", handleMessagePinned);
    socket.on("conversation:message_unpinned", handleMessageUnpinned);
    socket.on("conversation:cleared", handleConversationCleared);
    socket.on("conversation:updated", handleConversationUpdated);
    socket.on("mentorship:invitation_accepted", handleInvitationAccepted);

    const handleAuthChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.user) {
        setUser(detail.user);
        void fetchConversations();
      }
    };

    const handleConvosUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setConversationsList(detail);
      } else {
        void fetchConversations();
      }
    };

    window.addEventListener("velora_auth_changed", handleAuthChange);
    window.addEventListener("velora_conversations_updated", handleConvosUpdated);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("conversation:message", handleMessage);
      socket.off("conversation:new_message", handleMessage);
      socket.off("conversation:user_typing", handleUserTyping);
      socket.off("conversation:user_stopped_typing", handleUserStoppedTyping);
      socket.off("conversation:messages_read", handleMessagesRead);
      socket.off("conversation:reaction_updated", handleReactionUpdated);
      socket.off("conversation:poll_updated", handlePollUpdated);
      socket.off("conversation:message_pinned", handleMessagePinned);
      socket.off("conversation:message_unpinned", handleMessageUnpinned);
      socket.off("conversation:cleared", handleConversationCleared);
      socket.off("conversation:updated", handleConversationUpdated);
      socket.off("mentorship:invitation_accepted", handleInvitationAccepted);
      window.removeEventListener("velora_auth_changed", handleAuthChange);
      window.removeEventListener("velora_conversations_updated", handleConvosUpdated);
    };
  }, [user?.id, user?.email]);

  // Handle URL param selection
  useEffect(() => {
    if (targetId) {
      setActiveId(targetId);
      setMobileOpen(true);
    }
  }, [targetId]);

  // Join active conversation room, load messages & mark read
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setPinnedMessages([]);
      return;
    }

    setTypingUsers([]);
    setSearchOpen(false);
    setSearchKeyword("");
    setSearchResults([]);

    socketRef.current?.emit("conversation:join", activeId);

    fetchPinnedMessages(activeId);

    const loadThread = async () => {
      const { token } = getStoredAuth();
      if (token) {
        try {
          const res = await fetch(`http://localhost:5000/api/conversations/${activeId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const cleanMsgs = (data.data as Message[]).filter(
              (m) => m.kind !== "voice" && m.body !== "🎤 Voice message"
            );
            setMessages(cleanMsgs);
            cleanMsgs.forEach((m: Message) => saveStoredMessage(activeId, m));

            if (data.conversationId && data.conversationId !== activeId) {
              cleanMsgs.forEach((m: Message) => saveStoredMessage(data.conversationId, m));
              socketRef.current?.emit("conversation:join", data.conversationId);
            }

            // Mark unread messages from other users as read
            const unreadIds = data.data
              .filter((m: Message) => !m.self && (!m.readBy || !m.readBy.includes(user.id || "")))
              .map((m: Message) => m.id);

            if (unreadIds.length > 0) {
              fetch(`http://localhost:5000/api/conversations/${activeId}/messages/read`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ messageIds: unreadIds }),
              }).catch(() => {});
            }
            return;
          }
        } catch {
          // offline fallback
        }
      }

      const stored = getStoredMessages(activeId);
      if (stored.length === 0) {
        const activeConvo = conversationsList.find((c) => c.id === activeId);
        const welcome: Message = {
          id: `welcome_${activeId}`,
          author: "Velora System",
          initials: "VS",
          time: "Just now",
          body: `🔒 Private end-to-end direct channel established with ${
            activeConvo?.name || "participant"
          }. Messages and meeting invites are visible only between authorized participants.`,
        };
        setMessages([welcome]);
      } else {
        setMessages(stored);
      }
    };

    void loadThread();

    const handleMessagesUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.convoId === activeId) {
        setMessages(detail.messages);
      }
    };

    window.addEventListener("velora_messages_updated", handleMessagesUpdated);
    return () => {
      if (socketRef.current?.connected && activeId) {
        socketRef.current.emit("conversation:leave", activeId);
      }
      window.removeEventListener("velora_messages_updated", handleMessagesUpdated);
    };
  }, [activeId]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const active = conversationsList.find((c) => c.id === activeId);
  const list = conversationsList
    .filter((c) => (tab === "unread" ? c.unread : tab === "pinned" ? c.pinned : true))
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  // Send message helper (handles text, file, poll, code)
  const sendMessagePayload = async (payload: {
    body?: string;
    kind?: "text" | "file" | "poll" | "code";
    file?: { name: string; size: string; url?: string; duration?: string };
    codeLang?: string;
    poll?: { question: string; options: string[] };
  }) => {
    if (!activeId) return;
    const tempId = `msg_${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      author: user.name,
      senderEmail: user.email,
      senderId: user.id,
      role: user.designation || "member",
      initials: user.initials,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      body: payload.body || "",
      kind: payload.kind || "text",
      file: payload.file,
      codeLang: payload.codeLang,
      poll: payload.poll
        ? {
            question: payload.poll.question,
            options: payload.poll.options.map((t) => ({ text: t, votes: 0, votedByMe: false })),
            closed: false,
          }
        : undefined,
    };

    saveStoredMessage(activeId, newMsg);
    setMessages((prev) => [...prev, newMsg]);

    const { token } = getStoredAuth();
    if (token) {
      try {
        const res = await fetch(`http://localhost:5000/api/conversations/${activeId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.data) {
          const serverMsg: Message = data.data;
          setMessages((prev) => {
            if (prev.some((m) => m.id === serverMsg.id)) {
              return prev.filter((m) => m.id !== tempId);
            }
            return prev.map((m) => (m.id === tempId ? { ...serverMsg, self: true } : m));
          });
          saveStoredMessage(activeId, { ...serverMsg, self: true });
          if (serverMsg.conversationId && serverMsg.conversationId !== activeId) {
            saveStoredMessage(serverMsg.conversationId, { ...serverMsg, self: true });
            socketRef.current?.emit("conversation:join", serverMsg.conversationId);
          }
        } else if (!data.success) {
          toast.error(data.error || "Failed to deliver message");
        }
      } catch {
        // offline fallback
      }
    }
  };

  const handleSendMessage = (body: string) => {
    sendMessagePayload({ body, kind: "text" });
  };

  // Send Poll
  const handleSendPoll = (question: string, options: string[]) => {
    sendMessagePayload({
      kind: "poll",
      body: `📊 Poll: ${question}`,
      poll: { question, options },
    });
  };

  // Send Code Snippet
  const handleSendCode = (code: string, lang: string) => {
    sendMessagePayload({
      kind: "code",
      body: code,
      codeLang: lang,
    });
  };

  // Typing indicators
  const handleTypingStart = () => {
    if (socketRef.current?.connected && activeId) {
      socketRef.current.emit("conversation:typing_start", {
        conversationId: activeId,
        userName: user.name,
      });
    }
  };

  const handleTypingStop = () => {
    if (socketRef.current?.connected && activeId) {
      socketRef.current.emit("conversation:typing_stop", {
        conversationId: activeId,
        userName: user.name,
      });
    }
  };

  // Emoji Reactions
  const handleReact = async (messageId: string, emoji: string, remove: boolean) => {
    const { token } = getStoredAuth();
    if (!token) return;
    try {
      if (remove) {
        await fetch(`http://localhost:5000/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`http://localhost:5000/api/messages/${messageId}/reactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ emoji }),
        });
      }
    } catch {
      // offline fallback
    }
  };

  // Poll Vote
  const handleVote = async (messageId: string, optionIndex: number) => {
    const { token } = getStoredAuth();
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${messageId}/poll/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optionIndex }),
      });
      const data = await res.json();
      if (data.success && data.data?.poll) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, poll: data.data.poll } : m))
        );
      }
    } catch {
      // offline fallback
    }
  };

  // Pin Message
  const handlePin = async (messageId: string) => {
    const { token } = getStoredAuth();
    if (!token || !activeId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/conversations/${activeId}/pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Message pinned!");
        fetchPinnedMessages(activeId);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isPinned: true } : m))
        );
      }
    } catch {
      toast.error("Failed to pin message");
    }
  };

  // Unpin Message
  const handleUnpin = async (messageId: string) => {
    const { token } = getStoredAuth();
    if (!token || !activeId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/conversations/${activeId}/pin/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.info("Message unpinned");
        fetchPinnedMessages(activeId);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isPinned: false } : m))
        );
      }
    } catch {
      toast.error("Failed to unpin message");
    }
  };

  // Message Search
  const handleSearch = async (q: string) => {
    setSearchKeyword(q);
    if (!q.trim() || !activeId) {
      setSearchResults([]);
      return;
    }
    const { token } = getStoredAuth();
    if (!token) return;
    setSearching(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/conversations/${activeId}/messages/search?q=${encodeURIComponent(q.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data);
      }
    } catch {
      // search fallback
    } finally {
      setSearching(false);
    }
  };

  // Save customized display name for conversation
  const handleSavePartnerName = (convoId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const newInitials = trimmed
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const updated = conversationsList.map((c) => {
      if (c.id === convoId) {
        return {
          ...c,
          name: trimmed,
          initials: newInitials,
        };
      }
      return c;
    });

    saveStoredConversations(updated);
    setConversationsList(updated);
    setEditingPartnerModal(null);
    toast.success(`Display name updated to "${trimmed}"!`);
  };

  // Launch instant call from chat header
  const handleStartCall = () => {
    if (!active) return;
    const meetingId = generateMeetingId();
    const now = new Date();
    const meeting: Meeting = {
      id: meetingId,
      title: `1:1 Mentorship Call · ${user.name} & ${active.name}`,
      day: "Today",
      time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      host: user.name,
      privacy: "Private 1:1 Meeting",
      duration: "45 min",
      group: "today",
      meetingUrl: `${window.location.origin}/meeting/${meetingId}`,
    };

    saveMeeting(meeting);

    const inviteMsg: Message = {
      id: `msg_${Date.now()}`,
      author: user.name,
      senderEmail: user.email,
      senderId: user.id,
      role: user.designation || "member",
      initials: user.initials,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      body: `📞 I've started our 1:1 Video Meeting! Join here: ${window.location.origin}/meeting/${meetingId}`,
      kind: "text",
    };
    saveStoredMessage(active.id, inviteMsg);

    toast.success("1:1 Call started", {
      description: `Invitation sent to ${active.name}. Joining room now...`,
    });

    void navigate({ to: `/meeting/${meetingId}` });
  };

  return (
    <AppShell flush>
      <div className="flex h-full min-h-0">
        {/* Conversation list */}
        <div
          className={cn(
            "border-border flex min-h-0 w-full flex-col border-r md:w-[320px] md:shrink-0",
            mobileOpen && "hidden md:flex",
          )}
        >
          <div className="space-y-3 p-3">
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="pl-9"
              />
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex-1">
                  Unread
                </TabsTrigger>
                <TabsTrigger value="pinned" className="flex-1">
                  Pinned
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="scrollbar-slim min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-24 lg:pb-3">
            {list.length > 0 ? (
              list.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onSelect={() => {
                    setActiveId(c.id);
                    setMobileOpen(true);
                  }}
                />
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No conversations found.
              </div>
            )}
          </div>
        </div>

        {/* Conversation window */}
        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            !mobileOpen && "hidden md:flex",
          )}
        >
          {active ? (
            <>
              {/* Header */}
              <header className="border-border bg-background/70 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2.5 backdrop-blur-xl sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <IconButton
                    icon={ArrowLeft}
                    label="Back to conversations"
                    className="md:hidden"
                    onClick={() => setMobileOpen(false)}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{active.name}</p>
                      <button
                        type="button"
                        title="Edit display name"
                        onClick={() => {
                          setEditingPartnerModal({ convoId: active.id, name: active.name });
                          setCustomNameInput(active.name);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-surface"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-muted-foreground truncate text-[11px] font-medium">
                      {active.privacy?.includes("Mentorship")
                        ? `Direct Mentorship · ${user.designation === "mentor" ? "Trainee" : "Mentor"}`
                        : active.privacy}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    icon={Search}
                    label="Search in conversation"
                    onClick={() => setSearchOpen((o) => !o)}
                  />
                  <IconButton
                    icon={Phone}
                    label="Start audio call"
                    onClick={handleStartCall}
                  />
                  <IconButton
                    icon={Video}
                    label="Start video call"
                    onClick={handleStartCall}
                  />
                  <IconButton
                    icon={Trash2}
                    label="Delete stored messages"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={async () => {
                      const { token } = getStoredAuth();
                      if (token && active.id) {
                        try {
                          await fetch(`http://localhost:5000/api/conversations/${active.id}/messages/clear`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          await fetch("http://localhost:5000/api/mentorship/reset", {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` },
                          });
                        } catch {
                          // ignore
                        }
                      }
                      clearAllMentorshipData();
                      setMessages([]);
                      setPinnedMessages([]);
                      toast.success("Messages deleted and storage cleaned.");
                    }}
                  />
                </div>
              </header>

              {/* Message Search Drawer */}
              {searchOpen && (
                <div className="border-b border-border bg-surface-2/80 p-2.5 flex flex-col gap-2 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      autoFocus
                      placeholder="Search messages in this conversation..."
                      value={searchKeyword}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchKeyword(""); }}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {searchKeyword && (
                    <div className="text-[11px] text-muted-foreground px-1">
                      {searching ? "Searching..." : `${searchResults.length} message(s) found:`}
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-slim">
                      {searchResults.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg bg-surface p-2 text-xs border border-border/60 hover:bg-accent/30 cursor-pointer"
                          onClick={() => {
                            const el = document.getElementById(`msg-${m.id}`);
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span className="font-semibold text-foreground">{m.author}</span>
                            <span>{new Date(m.time).toLocaleDateString()}</span>
                          </div>
                          <p className="truncate">{m.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pinned Messages Banner */}
              {pinnedMessages.length > 0 && (
                <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-amber-500 shrink-0">Pinned:</span>
                    <span className="truncate text-foreground/80">
                      {pinnedMessages[pinnedMessages.length - 1].body}
                    </span>
                  </div>
                  <button
                    type="button"
                    title="Unpin"
                    onClick={() => handleUnpin(pinnedMessages[pinnedMessages.length - 1].messageId)}
                    className="text-muted-foreground hover:text-foreground text-[11px] shrink-0 font-medium hover:underline"
                  >
                    Unpin
                  </button>
                </div>
              )}

              {/* Messages viewport */}
              <div className="scrollbar-slim min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-6">
                <div className="flex justify-center">
                  <PrivacyBadge label="Messages are visible only to authorized participants" tone="muted" />
                </div>
                {(() => {
                  const seenIds = new Set<string>();
                  const serverBodies = new Set<string>();
                  messages.forEach((m) => {
                    if (m && m.id && !m.id.startsWith("msg_") && m.body) {
                      serverBodies.add(`${(m.author || "").toLowerCase()}_${m.body.trim()}`);
                    }
                  });

                  const filtered = messages.filter((m) => {
                    if (!m || !m.id) return false;
                    if (seenIds.has(m.id)) return false;
                    const bodyKey = `${(m.author || "").toLowerCase()}_${(m.body || "").trim()}`;
                    if (m.id.startsWith("msg_") && serverBodies.has(bodyKey)) {
                      return false;
                    }
                    seenIds.add(m.id);
                    return true;
                  });

                  return filtered.map((m) => {
                    const userPrefix = user.email ? user.email.split("@")[0].toLowerCase() : "";
                    const isSelf = Boolean(
                      (m.senderEmail && user.email && m.senderEmail.toLowerCase() === user.email.toLowerCase()) ||
                      (m.senderId && (user.id || (user as any)._id) && (m.senderId === user.id || m.senderId === (user as any)._id)) ||
                      (m.author && user.name && m.author.toLowerCase() === user.name.toLowerCase()) ||
                      (userPrefix && m.author && m.author.toLowerCase() === userPrefix) ||
                      (userPrefix && m.initials && m.initials === user.initials && m.author.toLowerCase().includes(userPrefix))
                    );
                    return (
                      <div id={`msg-${m.id}`} key={m.id}>
                        <MessageBubble
                          message={{ ...m, self: isSelf }}
                          currentUserId={user.id || (user as any)._id}
                          onReact={handleReact}
                          onVote={handleVote}
                          onPin={handlePin}
                          onDelete={async (id) => {
                          const { token } = getStoredAuth();
                          if (token) {
                            try {
                              await fetch(`http://localhost:5000/api/messages/${id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                            } catch {
                              // delete fallback
                            }
                          }
                          setMessages((prev) => prev.filter((msg) => msg.id !== id));
                        }}
                      />
                    </div>
                  );
                });
              })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicator banner */}
              {typingUsers.length > 0 && (
                <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-muted-foreground bg-background/50 backdrop-blur-sm animate-pulse">
                  <div className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                  </div>
                  <span>
                    {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
                  </span>
                </div>
              )}

              {/* Composer */}
              <div className="pb-16 lg:pb-0">
                <MessageComposer
                  placeholder={`Message ${active.name}…`}
                  onSend={handleSendMessage}
                  onSendPoll={handleSendPoll}
                  onSendCode={handleSendCode}
                  onTypingStart={handleTypingStart}
                  onTypingStop={handleTypingStop}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
              <EmptyState
                title="No conversation selected"
                description="Select a mentorship conversation or start a new direct chat to begin."
              />
            </div>
          )}
        </section>
      </div>

      {/* Edit Partner Display Name Modal */}
      <Dialog
        open={Boolean(editingPartnerModal)}
        onOpenChange={(open) => !open && setEditingPartnerModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <span>Edit Partner Display Name</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set a friendly real name for this person (e.g. mentor or trainee&apos;s full name).
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingPartnerModal && customNameInput.trim()) {
                handleSavePartnerName(editingPartnerModal.convoId, customNameInput.trim());
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
    </AppShell>
  );
}
