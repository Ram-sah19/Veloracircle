import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  Check,
  Circle,
  Copy,
  DoorClosed,
  Hand,
  Hourglass,
  Layers,
  Megaphone,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  MessageSquare,
  PhoneOff,
  Smile,
  UserCheck,
  Users,
  UserX,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VeloraLogo } from "@/components/velora/logo";
import { Avatar, IconButton, PrivacyBadge, SecureIndicator } from "@/components/velora/primitives";
import { currentUser, getStoredMeetings, type Meeting } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meeting/$meetingId")({
  head: () => ({
    meta: [
      { title: "Meeting room — Velora Circle" },
      {
        name: "description",
        content:
          "Secure, private meeting room. Participant counts stay hidden from attendees; hosts manage access.",
      },
      { property: "og:title", content: "Meeting room — Velora Circle" },
      { property: "og:description", content: "Secure meeting · Private participants." },
    ],
  }),
  component: MeetingRoom,
});

interface RemotePeer {
  socketId: string;
  userName: string;
  initials: string;
  stream?: MediaStream;
  audio: boolean;
  video: boolean;
  handRaised?: boolean;
  screenSharing?: boolean;
  breakoutRoomId?: string | null;
}

interface ChatMessage {
  id: string;
  senderName: string;
  body: string;
  time: string;
  self: boolean;
}

interface WaitingGuest {
  socketId: string;
  userName: string;
  initials: string;
  requestedAt: string;
}

interface BreakoutRoomItem {
  id: string;
  name: string;
  participantSocketIds: string[];
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function VideoTile({
  name,
  initials,
  self,
  muted,
  videoEnabled,
  stream,
  large,
  handRaised,
}: {
  name: string;
  initials: string;
  self?: boolean;
  muted?: boolean;
  videoEnabled?: boolean;
  stream?: MediaStream | null;
  large?: boolean;
  handRaised?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={cn(
        "border-border bg-surface relative overflow-hidden rounded-2xl border transition-all",
        large ? "aspect-video md:col-span-2" : "aspect-video",
        handRaised && "ring-2 ring-amber-400"
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={self}
        className={cn(
          "h-full w-full object-cover",
          !videoEnabled && "hidden",
          self && "-scale-x-100"
        )}
      />

      {!videoEnabled && (
        <>
          <div className="mesh-bg absolute inset-0 opacity-70" aria-hidden />
          <div className="relative grid h-full place-items-center">
            <Avatar initials={initials} size="lg" tone={self ? "brand" : "default"} />
          </div>
        </>
      )}

      {handRaised && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500/90 text-white px-2 py-1 text-[11px] font-semibold shadow">
          <Hand className="h-3 w-3" /> Raised hand
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2.5 bg-gradient-to-t from-black/60 to-transparent">
        <span className="glass truncate rounded-lg px-2 py-1 text-[11px] font-medium text-white">
          {self ? `${name} (You)` : name}
        </span>
        {muted && (
          <span className="glass text-destructive grid h-6 w-6 place-items-center rounded-lg bg-destructive/20">
            <MicOff className="h-3 w-3" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}

function MeetingRoom() {
  const { meetingId } = useParams({ from: "/meeting/$meetingId" });
  const navigate = useNavigate();
  const isHost = currentUser.role === "admin" || currentUser.role === "owner";

  // Meeting Metadata
  const [meeting] = useState<Meeting>(() => {
    const found = getStoredMeetings().find((m) => m.id === meetingId);
    if (found) return found;
    return {
      id: meetingId,
      title: `Meeting ${meetingId}`,
      circleName: "Velora Circle",
      scheduledAt: new Date().toISOString(),
      durationMinutes: 45,
      host: { id: currentUser.id, name: currentUser.name },
      isPrivate: true,
      inviteOnly: false,
      participantCount: 1,
      status: "live",
      meetingUrl: `${window.location.origin}/meeting/${meetingId}`,
    };
  });

  const [joined, setJoined] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [wasDenied, setWasDenied] = useState(false);
  const [denialReason, setDenialReason] = useState("");
  const [waitingGuests, setWaitingGuests] = useState<WaitingGuest[]>([]);

  // Breakout Rooms State
  const [breakoutModalOpen, setBreakoutModalOpen] = useState(false);
  const [activeBreakout, setActiveBreakout] = useState<{ id: string; name: string } | null>(null);
  const [breakoutRoomsList, setBreakoutRoomsList] = useState<{ id: string; name: string; count: number }[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
  const [broadcastInput, setBroadcastInput] = useState("");
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Chat & Reactions
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [floatingReaction, setFloatingReaction] = useState<{ emoji: string; userName: string } | null>(null);

  // Media Streams & WebRTC
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const preJoinVideoRef = useRef<HTMLVideoElement>(null);

  // Socket & Peers
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());

  // 1. Initial pre-join camera/microphone setup
  useEffect(() => {
    let active = true;

    async function initPreJoinMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        if (preJoinVideoRef.current) {
          preJoinVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Could not access camera/microphone:", err);
        toast.error("Camera or microphone permission not granted. Joining with audio/video off.");
        setCam(false);
        setMic(false);
      }
    }

    if (!joined) {
      initPreJoinMedia();
    }

    return () => {
      active = false;
    };
  }, [joined]);

  // Sync pre-join video ref when stream changes
  useEffect(() => {
    if (!joined && preJoinVideoRef.current && localStream) {
      preJoinVideoRef.current.srcObject = localStream;
    }
  }, [joined, localStream]);

  // Clean up all media tracks when leaving the component
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((peer) => peer.close());
      socketRef.current?.disconnect();
    };
  }, []);

  // 2. Toggle local audio track
  const toggleMic = () => {
    const nextState = !mic;
    setMic(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = nextState;
      });
    }
    if (socketRef.current && joined) {
      socketRef.current.emit("meeting:toggle_audio", { audio: nextState });
    }
  };

  // 3. Toggle local video track
  const toggleCam = () => {
    const nextState = !cam;
    setCam(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = nextState;
      });
    }
    if (socketRef.current && joined) {
      socketRef.current.emit("meeting:toggle_video", { video: nextState });
    }
  };

  // 4. WebRTC Peer Connection Helper
  const createPeerConnection = (targetSocketId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Send local tracks to the new peer
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote media tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemotePeers((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetSocketId);
          if (existing) {
            next.set(targetSocketId, { ...existing, stream: remoteStream });
          }
          return next;
        });
      }
    };

    // Forward ICE candidates through signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("meeting:ice_candidate", {
          to: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle peer disconnection
    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        peersRef.current.delete(targetSocketId);
        setRemotePeers((prev) => {
          const next = new Map(prev);
          next.delete(targetSocketId);
          return next;
        });
      }
    };

    peersRef.current.set(targetSocketId, pc);

    // If initiator, create offer
    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (socketRef.current) {
            socketRef.current.emit("meeting:offer", {
              to: targetSocketId,
              offer: pc.localDescription,
            });
          }
        })
        .catch((err) => console.error("Error creating offer:", err));
    }

    return pc;
  };

  // 5. Connect to Socket.io & Join or Knock into Meeting Room
  const handleJoinOrKnock = () => {
    const isGuestKnock = Boolean(meeting.inviteOnly && !isHost);

    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (isGuestKnock) {
        setIsWaiting(true);
        socket.emit("meeting:knock", {
          meetingId,
          userName: currentUser.name,
          initials: currentUser.initials,
        });
      } else {
        executeJoinRoom();
      }
    });

    // Knock Acknowledged
    socket.on("meeting:knock_acknowledged", () => {
      setIsWaiting(true);
    });

    // Guest Admitted by Host
    socket.on("meeting:admitted", () => {
      setIsWaiting(false);
      toast.success("Host admitted you into the meeting!");
      executeJoinRoom();
    });

    // Guest Denied by Host
    socket.on("meeting:denied", ({ reason }: { reason?: string }) => {
      setIsWaiting(false);
      setWasDenied(true);
      setDenialReason(reason || "The host declined your request to join.");
      socket.disconnect();
    });

    // Host received knock alert
    socket.on("meeting:knock_alert", ({ guest }: { guest: WaitingGuest; waitingCount: number }) => {
      setWaitingGuests((prev) => {
        if (prev.some((g) => g.socketId === guest.socketId)) return prev;
        return [...prev, guest];
      });
      toast(`🚪 ${guest.userName} requested to join`, {
        description: "Review waiting room in Participants drawer.",
        action: {
          label: "Admit",
          onClick: () => admitGuest(guest.socketId),
        },
      });
    });

    // Host received waiting list update
    socket.on("meeting:waiting_updated", ({ waitingList }: { waitingList: WaitingGuest[] }) => {
      setWaitingGuests(waitingList || []);
    });

    // Breakout Rooms: Assigned to a Breakout Room
    socket.on("breakout:assigned", ({ breakoutRoomId, breakoutRoomName }: { breakoutRoomId: string; breakoutRoomName: string }) => {
      setActiveBreakout({ id: breakoutRoomId, name: breakoutRoomName });
      toast.info(`Moved to ${breakoutRoomName}`, { icon: "🔀" });
      // Reconnect WebRTC mesh with only peers in this breakout room
      rejoinBreakoutScope(breakoutRoomId);
    });

    // Breakout Rooms: Broadcast announcement received from host
    socket.on("breakout:broadcast_message", ({ message, senderName }: { message: string; senderName: string }) => {
      setBroadcastMessage(`${senderName}: ${message}`);
      setTimeout(() => setBroadcastMessage(null), 8000);
    });

    // Breakout Rooms: Returned to main room
    socket.on("breakout:returned_to_main", () => {
      setActiveBreakout(null);
      toast.info("Returned to main meeting room");
      rejoinBreakoutScope(null);
    });

    // Breakout Rooms: Host closed all breakout rooms
    socket.on("breakout:closed_all", () => {
      setActiveBreakout(null);
      toast.info("Breakout rooms closed by host. Returned to main room.");
      rejoinBreakoutScope(null);
    });

    // Breakout status changed
    socket.on("breakout:status_changed", ({ rooms }: { rooms: { id: string; name: string; count: number }[] }) => {
      setBreakoutRoomsList(rooms || []);
    });

    // Received existing users list upon joining
    socket.on("meeting:all_users", (existingUsers: Array<{ socketId: string; userName: string; initials: string; audio: boolean; video: boolean; breakoutRoomId?: string }>) => {
      const initialPeers = new Map<string, RemotePeer>();
      existingUsers.forEach((user) => {
        if (user.socketId !== socket.id) {
          initialPeers.set(user.socketId, {
            socketId: user.socketId,
            userName: user.userName || "Participant",
            initials: user.initials || "P",
            audio: user.audio,
            video: user.video,
            breakoutRoomId: user.breakoutRoomId || null,
          });
          createPeerConnection(user.socketId, true);
        }
      });
      setRemotePeers(initialPeers);
    });

    // A new user joined after us
    socket.on("meeting:user_joined", (newUser: { socketId: string; userName: string; initials: string; audio: boolean; video: boolean; breakoutRoomId?: string }) => {
      setRemotePeers((prev) => {
        const next = new Map(prev);
        next.set(newUser.socketId, {
          socketId: newUser.socketId,
          userName: newUser.userName || "Participant",
          initials: newUser.initials || "P",
          audio: newUser.audio,
          video: newUser.video,
          breakoutRoomId: newUser.breakoutRoomId || null,
        });
        return next;
      });
      toast.info(`${newUser.userName || "A participant"} joined the meeting`);
    });

    // WebRTC Offer received
    socket.on("meeting:offer", async ({ from, offer, callerMeta }: { from: string; offer: RTCSessionDescriptionInit; callerMeta?: { userName: string; initials: string; audio: boolean; video: boolean } }) => {
      if (callerMeta) {
        setRemotePeers((prev) => {
          const next = new Map(prev);
          if (!next.has(from)) {
            next.set(from, {
              socketId: from,
              userName: callerMeta.userName || "Participant",
              initials: callerMeta.initials || "P",
              audio: callerMeta.audio,
              video: callerMeta.video,
            });
          }
          return next;
        });
      }

      let pc = peersRef.current.get(from);
      if (!pc) {
        pc = createPeerConnection(from, false);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("meeting:answer", {
          to: from,
          answer: pc.localDescription,
        });
      } catch (err) {
        console.error("Error answering offer:", err);
      }
    });

    // WebRTC Answer received
    socket.on("meeting:answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error setting remote description from answer:", err);
        }
      }
    });

    // ICE Candidate received
    socket.on("meeting:ice_candidate", async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate:", err);
        }
      }
    });

    // Audio toggle notification from peer
    socket.on("meeting:user_toggle_audio", ({ socketId, audio }: { socketId: string; audio: boolean }) => {
      setRemotePeers((prev) => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) {
          next.set(socketId, { ...peer, audio });
        }
        return next;
      });
    });

    // Video toggle notification from peer
    socket.on("meeting:user_toggle_video", ({ socketId, video }: { socketId: string; video: boolean }) => {
      setRemotePeers((prev) => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) {
          next.set(socketId, { ...peer, video });
        }
        return next;
      });
    });

    // Hand raise from peer
    socket.on("meeting:user_raise_hand", ({ socketId, userName, handRaised: peerHandRaised }: { socketId: string; userName: string; handRaised: boolean }) => {
      setRemotePeers((prev) => {
        const next = new Map(prev);
        const peer = next.get(socketId);
        if (peer) {
          next.set(socketId, { ...peer, handRaised: peerHandRaised });
        }
        return next;
      });
      if (peerHandRaised) {
        toast(`${userName} raised their hand`, { icon: "✋" });
      }
    });

    // Reaction received
    socket.on("meeting:user_reaction", ({ userName, emoji }: { userName: string; emoji: string }) => {
      setFloatingReaction({ emoji, userName });
      setTimeout(() => setFloatingReaction(null), 3000);
    });

    // In-meeting Chat Message
    socket.on("meeting:chat_message", (msg: { senderName: string; body: string; sentAt: string; socketId: string }) => {
      const isSelf = msg.socketId === socket.id;
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderName: isSelf ? "You" : msg.senderName,
          body: msg.body,
          time: new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          self: isSelf,
        },
      ]);
    });

    // User left room
    socket.on("meeting:user_left", ({ socketId, userName }: { socketId: string; userName: string }) => {
      const pc = peersRef.current.get(socketId);
      if (pc) {
        pc.close();
        peersRef.current.delete(socketId);
      }
      setRemotePeers((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      toast.info(`${userName || "A participant"} left the meeting`);
    });
  };

  const executeJoinRoom = (breakoutRoomId?: string | null) => {
    setJoined(true);
    socketRef.current?.emit("meeting:join", {
      meetingId,
      audio: mic,
      video: cam,
      isHost,
      breakoutRoomId: breakoutRoomId || null,
    });
  };

  const rejoinBreakoutScope = (breakoutRoomId: string | null) => {
    // Close existing peer connections to reset mesh to room peers only
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setRemotePeers(new Map());

    socketRef.current?.emit("meeting:join", {
      meetingId,
      audio: mic,
      video: cam,
      isHost,
      breakoutRoomId,
    });
  };

  // Host Admits a waiting guest
  const admitGuest = (guestSocketId: string) => {
    socketRef.current?.emit("meeting:admit", {
      meetingId,
      socketId: guestSocketId,
    });
    setWaitingGuests((prev) => prev.filter((g) => g.socketId !== guestSocketId));
    toast.success("Admitted guest into meeting");
  };

  // Host Denies a waiting guest
  const denyGuest = (guestSocketId: string) => {
    socketRef.current?.emit("meeting:deny", {
      meetingId,
      socketId: guestSocketId,
      reason: "The host declined your entry request.",
    });
    setWaitingGuests((prev) => prev.filter((g) => g.socketId !== guestSocketId));
    toast.info("Declined guest entry");
  };

  // Host Admits All
  const admitAllGuests = () => {
    socketRef.current?.emit("meeting:admit_all", { meetingId });
    setWaitingGuests([]);
    toast.success("Admitted all waiting guests");
  };

  // Host launches breakout rooms
  const handleLaunchBreakouts = (numRooms: number) => {
    const peers = Array.from(remotePeers.values());
    const rooms: BreakoutRoomItem[] = Array.from({ length: numRooms }, (_, i) => ({
      id: `breakout-${i + 1}-${Date.now()}`,
      name: `Breakout Room ${i + 1}`,
      participantSocketIds: [],
    }));

    // Distribute participants evenly across breakout rooms
    peers.forEach((peer, index) => {
      const targetRoom = rooms[index % numRooms];
      targetRoom.participantSocketIds.push(peer.socketId);
    });

    socketRef.current?.emit("breakout:create", {
      meetingId,
      rooms,
      durationMinutes: 15,
    });

    setBreakoutModalOpen(false);
    toast.success(`Created ${numRooms} Breakout Rooms`);
  };

  // Participant leaves breakout room to return to main meeting
  const handleReturnToMain = () => {
    socketRef.current?.emit("breakout:leave_to_main", { meetingId });
  };

  // Host ends all breakout rooms
  const handleCloseAllBreakouts = () => {
    socketRef.current?.emit("breakout:close_all", { meetingId });
    toast.info("Closed all breakout rooms");
  };

  // Host sends broadcast message to all breakout rooms
  const handleSendBroadcast = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!broadcastInput.trim() || !socketRef.current) return;
    socketRef.current.emit("breakout:broadcast", {
      meetingId,
      message: broadcastInput.trim(),
    });
    setBroadcastInput("");
    setBroadcastModalOpen(false);
    toast.success("Announcement broadcast to all breakout rooms");
  };

  // 6. Screen Sharing
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];

        // Replace track in peer connections
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Listen for user stopping share via browser native banner
        screenTrack.onended = () => {
          stopScreenShare();
        };

        setScreenSharing(true);
        socketRef.current?.emit("meeting:screen_share", { isSharing: true });
        toast.success("Screen sharing started");
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    // Restore camera video track
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) {
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(camTrack);
        }
      });
    }

    setScreenSharing(false);
    socketRef.current?.emit("meeting:screen_share", { isSharing: false });
    toast.info("Screen sharing ended");
  };

  // 7. Hand Raise
  const toggleHandRaise = () => {
    const next = !handRaised;
    setHandRaised(next);
    socketRef.current?.emit("meeting:raise_hand");
    toast(next ? "Hand raised" : "Hand lowered", { icon: "✋" });
  };

  // 8. Reactions
  const sendReaction = (emoji: string) => {
    socketRef.current?.emit("meeting:reaction", { emoji });
    setFloatingReaction({ emoji, userName: "You" });
    setTimeout(() => setFloatingReaction(null), 3000);
  };

  // 9. Send Chat Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("meeting:chat_message", { body: chatInput.trim() });
    setChatInput("");
  };

  // 10. Copy Meeting Link
  const copyMeetingLink = () => {
    const url = `${window.location.origin}/meeting/${meetingId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Meeting link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 11. Leave Meeting
  const leaveMeeting = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    socketRef.current?.emit("meeting:leave");
    socketRef.current?.disconnect();
    void navigate({ to: "/meetings" });
  };

  // Render Pre-join Screen
  if (!joined) {
    return (
      <div className="mesh-bg bg-background flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
        <VeloraLogo />
        <div className="glass mt-8 w-full max-w-md rounded-3xl p-6 text-center shadow-[var(--shadow-float)]">
          <h1 className="text-lg font-semibold">{meeting.title}</h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Meeting ID: <span className="font-mono text-foreground font-medium">{meetingId}</span>
          </p>

          <div className="border-border bg-surface relative mt-6 aspect-video overflow-hidden rounded-2xl border">
            <video
              ref={preJoinVideoRef}
              autoPlay
              playsInline
              muted
              className={cn("h-full w-full object-cover -scale-x-100", !cam && "hidden")}
            />
            {!cam && (
              <>
                <div className="mesh-bg absolute inset-0 opacity-70" aria-hidden />
                <div className="relative grid h-full place-items-center">
                  <VideoOff className="text-muted-foreground h-7 w-7" aria-hidden />
                </div>
              </>
            )}
            <span className="glass absolute bottom-2.5 left-2.5 rounded-lg px-2 py-1 text-[11px]">
              Camera preview
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <IconButton
              icon={mic ? Mic : MicOff}
              label={mic ? "Mute microphone" : "Unmute microphone"}
              variant="solid"
              active={mic}
              onClick={toggleMic}
              className="h-12 w-12"
            />
            <IconButton
              icon={cam ? Video : VideoOff}
              label={cam ? "Turn camera off" : "Turn camera on"}
              variant="solid"
              active={cam}
              onClick={toggleCam}
              className="h-12 w-12"
            />
          </div>

          <Button className="mt-6 h-11 w-full text-sm font-semibold" onClick={handleJoinOrKnock}>
            {meeting.inviteOnly && !isHost ? "Ask to Join (Knock)" : "Join Now"}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1.5"
              onClick={copyMeetingLink}
            >
              {copiedLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copiedLink ? "Link copied" : "Copy joining link"}
            </Button>
          </div>

          <div className="mt-4 flex justify-center">
            <SecureIndicator />
          </div>
        </div>
      </div>
    );
  }

  // Render Waiting Room Screen for Guests
  if (isWaiting) {
    return (
      <div className="mesh-bg bg-background flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
        <VeloraLogo />
        <div className="glass mt-8 w-full max-w-md rounded-3xl p-8 text-center shadow-[var(--shadow-float)] border border-border">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-pulse">
            <Hourglass className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-lg font-semibold">Waiting for the host to let you in</h1>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            This meeting is invite-only. The meeting host has been notified that you are waiting.
          </p>
          <div className="mt-6 p-3 rounded-xl bg-surface-2 border border-border text-xs text-muted-foreground">
            Meeting: <span className="font-medium text-foreground">{meeting.title}</span> ({meetingId})
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-6 text-xs text-muted-foreground"
            onClick={() => {
              socketRef.current?.disconnect();
              void navigate({ to: "/meetings" });
            }}
          >
            Leave Waiting Room
          </Button>
        </div>
      </div>
    );
  }

  // Render Entry Denied Screen
  if (wasDenied) {
    return (
      <div className="mesh-bg bg-background flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
        <VeloraLogo />
        <div className="glass mt-8 w-full max-w-md rounded-3xl p-8 text-center shadow-[var(--shadow-float)] border border-destructive/30">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <DoorClosed className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-lg font-semibold text-destructive">Entry Declined</h1>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            {denialReason || "The host declined your request to enter this meeting."}
          </p>
          <Button
            className="mt-6 w-full text-xs"
            onClick={() => void navigate({ to: "/meetings" })}
          >
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  const remotePeerList = Array.from(remotePeers.values());

  return (
    <div className="bg-background flex h-[100dvh] flex-col overflow-hidden relative">
      {/* Floating Reaction Notification */}
      {floatingReaction && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce flex items-center gap-2 px-4 py-2 rounded-full bg-surface-2 border border-border shadow-lg">
          <span className="text-2xl">{floatingReaction.emoji}</span>
          <span className="text-xs font-medium text-foreground">{floatingReaction.userName}</span>
        </div>
      )}

      {/* Breakout Broadcast Announcement Alert */}
      {broadcastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-xl">
          <Megaphone className="h-4 w-4 shrink-0 animate-bounce" />
          <span className="text-xs font-medium">{broadcastMessage}</span>
          <button onClick={() => setBroadcastMessage(null)} className="opacity-75 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Breakout Room Indicator & Return Button for Participants */}
      {activeBreakout && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-400">
              You are in {activeBreakout.name}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20 text-foreground"
            onClick={handleReturnToMain}
          >
            Return to main room
          </Button>
        </div>
      )}

      {/* Meeting Header */}
      <header className="border-border safe-top grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{meeting.title}</h1>
            <PrivacyBadge label="Private meeting" tone="accent" />
            {activeBreakout ? (
              <PrivacyBadge label={activeBreakout.name} tone="muted" />
            ) : (
              <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
                ({meetingId})
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <SecureIndicator />
            <button
              onClick={copyMeetingLink}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copiedLink ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isHost && (
            <IconButton
              icon={Users}
              label={
                waitingGuests.length > 0
                  ? `Participants (${waitingGuests.length} waiting)`
                  : "Participants (Host only)"
              }
              onClick={() => setPeopleOpen(true)}
              className={waitingGuests.length > 0 ? "relative text-amber-400 ring-1 ring-amber-400" : ""}
            />
          )}
          <IconButton icon={MessageSquare} label="Meeting chat" onClick={() => setChatOpen(true)} />
        </div>
      </header>

      {/* Video Grid & Side Chat */}
      <div className="flex min-h-0 flex-1">
        <main className="scrollbar-slim min-w-0 flex-1 overflow-y-auto p-3 pb-32 sm:p-5 sm:pb-32">
          <div
            className={cn(
              "mx-auto grid max-w-5xl gap-3",
              remotePeerList.length === 0
                ? "grid-cols-1 max-w-2xl"
                : remotePeerList.length === 1
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            )}
          >
            {/* Local Video Tile */}
            <VideoTile
              name={currentUser.name}
              initials={currentUser.initials}
              self
              muted={!mic}
              videoEnabled={cam}
              stream={localStream}
              handRaised={handRaised}
              large={remotePeerList.length === 0}
            />

            {/* Remote Peers Video Tiles */}
            {remotePeerList.map((peer) => (
              <VideoTile
                key={peer.socketId}
                name={peer.userName}
                initials={peer.initials}
                muted={!peer.audio}
                videoEnabled={peer.video}
                stream={peer.stream}
                handRaised={peer.handRaised}
              />
            ))}
          </div>
        </main>

        {/* Desktop Sidebar Chat */}
        <aside className="border-border hidden w-[330px] shrink-0 flex-col border-l xl:flex bg-surface-1">
          <div className="border-border border-b px-4 py-3">
            <p className="text-sm font-semibold">Meeting chat</p>
            <p className="text-muted-foreground text-[11px]">Visible to participants only</p>
          </div>
          <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-[13px]">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">
                No messages yet. Say hello to everyone in this meeting!
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id}>
                  <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px]">
                    <span className={cn("font-medium", m.self ? "text-primary" : "text-foreground/70")}>
                      {m.senderName}
                    </span>
                    {m.time}
                  </div>
                  <p className="text-foreground/90">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex gap-2">
            <input
              type="text"
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Message the meeting…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <Button type="submit" size="sm" variant="default" className="text-xs px-3">
              Send
            </Button>
          </form>
        </aside>
      </div>

      {/* Floating Control Bar (Google Meet Style) */}
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-4">
        <div className="glass pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl p-2.5 shadow-[var(--shadow-float)]">
          <IconButton
            icon={mic ? Mic : MicOff}
            label={mic ? "Mute" : "Unmute"}
            variant="solid"
            active={mic}
            onClick={toggleMic}
            className="h-12 w-12"
          />
          <IconButton
            icon={cam ? Video : VideoOff}
            label={cam ? "Stop camera" : "Start camera"}
            variant="solid"
            active={cam}
            onClick={toggleCam}
            className="h-12 w-12"
          />
          <IconButton
            icon={screenSharing ? MonitorX : MonitorUp}
            label={screenSharing ? "Stop sharing" : "Share screen"}
            variant="solid"
            active={screenSharing}
            className="hidden h-12 w-12 sm:inline-flex"
            onClick={toggleScreenShare}
          />
          <IconButton
            icon={Hand}
            label={handRaised ? "Lower hand" : "Raise hand"}
            variant="solid"
            active={handRaised}
            className="h-12 w-12"
            onClick={toggleHandRaise}
          />

          {/* Quick Reaction Buttons */}
          <div className="hidden sm:flex items-center gap-1 border-x border-border/50 px-1">
            {["👍", "👏", "❤️", "🎉"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                className="grid h-10 w-10 place-items-center rounded-xl hover:bg-surface-2 active:scale-95 text-base transition"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Host Breakout Rooms & Broadcast Actions */}
          {isHost && (
            <>
              <IconButton
                icon={Layers}
                label="Breakout Rooms"
                variant="solid"
                className="h-12 w-12 text-primary"
                onClick={() => setBreakoutModalOpen(true)}
              />
              <IconButton
                icon={Megaphone}
                label="Broadcast Announcement"
                variant="solid"
                className="hidden sm:inline-flex h-12 w-12"
                onClick={() => setBroadcastModalOpen(true)}
              />
            </>
          )}

          <IconButton
            icon={MessageSquare}
            label="Chat"
            variant="solid"
            className="h-12 w-12 xl:hidden"
            onClick={() => setChatOpen(true)}
          />

          {isHost && (
            <IconButton
              icon={Users}
              label={
                waitingGuests.length > 0
                  ? `Participants (${waitingGuests.length} waiting)`
                  : "Participants"
              }
              variant="solid"
              className={cn(
                "h-12 w-12",
                waitingGuests.length > 0 && "bg-amber-500/20 text-amber-400 border border-amber-500/50"
              )}
              onClick={() => setPeopleOpen(true)}
            />
          )}

          <IconButton
            icon={PhoneOff}
            label="Leave meeting"
            variant="danger"
            className="h-12 w-14"
            onClick={leaveMeeting}
          />
        </div>
      </div>

      {/* Host Breakout Rooms Modal */}
      <Dialog open={breakoutModalOpen} onOpenChange={setBreakoutModalOpen}>
        <DialogContent className="glass sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Breakout Rooms
            </DialogTitle>
            <DialogDescription>
              Divide participants into smaller groups for focused discussions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Select how many breakout rooms to create. Active participants will be distributed automatically.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((n) => (
                <Button
                  key={n}
                  variant="outline"
                  className="h-16 flex-col gap-1 border-border bg-surface-2/60 hover:border-primary"
                  onClick={() => handleLaunchBreakouts(n)}
                >
                  <span className="text-base font-bold">{n} Rooms</span>
                  <span className="text-[10px] text-muted-foreground">
                    ~{Math.ceil((remotePeerList.length || 1) / n)} per room
                  </span>
                </Button>
              ))}
            </div>

            {breakoutRoomsList.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Breakout rooms are currently active
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                  onClick={handleCloseAllBreakouts}
                >
                  Close All Rooms
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBreakoutModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Host Broadcast Announcement Modal */}
      <Dialog open={broadcastModalOpen} onOpenChange={setBroadcastModalOpen}>
        <DialogContent className="glass sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> Broadcast to All Rooms
            </DialogTitle>
            <DialogDescription>
              Send an instant announcement banner to all participants in breakout rooms.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendBroadcast} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-message">Announcement</Label>
              <Input
                id="broadcast-message"
                placeholder="e.g. 2 minutes remaining before we regroup!"
                value={broadcastInput}
                onChange={(e) => setBroadcastInput(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBroadcastModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Broadcast</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Chat Sheet */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="bottom" className="h-[80dvh] p-0 flex flex-col">
          <SheetHeader className="border-border grid grid-cols-[minmax(0,1fr)_auto] items-center border-b p-4">
            <SheetTitle className="truncate">Meeting chat</SheetTitle>
            <IconButton icon={X} label="Close chat" onClick={() => setChatOpen(false)} />
          </SheetHeader>
          <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-[13px]">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">
                No messages yet.
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id}>
                  <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px]">
                    <span className={cn("font-medium", m.self ? "text-primary" : "text-foreground/70")}>
                      {m.senderName}
                    </span>
                    {m.time}
                  </div>
                  <p className="text-foreground/90">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex gap-2">
            <input
              type="text"
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Message the meeting…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <Button type="submit" size="sm" variant="default" className="text-xs px-3">
              Send
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Host-only Participants Sheet with Waiting Room Section */}
      <Sheet open={peopleOpen} onOpenChange={setPeopleOpen}>
        <SheetContent side="bottom" className="h-[75dvh] p-0 flex flex-col">
          <SheetHeader className="border-border border-b p-4">
            <SheetTitle>Participants ({1 + remotePeerList.length})</SheetTitle>
            <p className="text-muted-foreground text-xs">
              Host view only. Attendees never see this list.
            </p>
          </SheetHeader>

          <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {/* Waiting Room Section (Knock to Join) */}
            {waitingGuests.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <Hourglass className="h-3.5 w-3.5" /> Waiting Room ({waitingGuests.length})
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] px-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                    onClick={admitAllGuests}
                  >
                    Admit All
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {waitingGuests.map((guest) => (
                    <div
                      key={guest.socketId}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/80 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar initials={guest.initials} size="sm" tone="muted" />
                        <span className="truncate font-medium">{guest.userName}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          onClick={() => admitGuest(guest.socketId)}
                        >
                          <UserCheck className="h-3 w-3" /> Admit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                          onClick={() => denyGuest(guest.socketId)}
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active In-Meeting Participants */}
            <div className="space-y-1">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider px-1">
                In Meeting
              </p>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 bg-surface-2/40">
                <Avatar initials={currentUser.initials} size="sm" tone="brand" />
                <span className="truncate text-[13px]">{currentUser.name} (You, Host)</span>
                <span className="text-muted-foreground text-[11px]">{mic ? "Speaking" : "Muted"}</span>
              </div>

              {remotePeerList.map((peer) => (
                <div
                  key={peer.socketId}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5"
                >
                  <Avatar initials={peer.initials} size="sm" tone="default" />
                  <span className="truncate text-[13px]">
                    {peer.userName}
                    {peer.breakoutRoomId && (
                      <span className="ml-2 text-[10px] text-amber-400 font-mono">
                        [Breakout]
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {peer.audio ? "Speaking" : "Muted"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
