const Meeting = require('../models/Meeting');

// In-memory tracker for live meeting rooms and sockets:
// meetingRooms[meetingId] = Map(socketId -> { userId, userName, peerId, audio, video, handRaised, screenSharing, isHost, breakoutRoomId })
const meetingRooms = new Map();

// In-memory tracker for waiting rooms:
// waitingRooms[meetingId] = Map(socketId -> { socketId, userId, userName, initials, requestedAt })
const waitingRooms = new Map();

// In-memory tracker for breakout rooms:
// breakoutRooms[meetingId] = Map(roomId -> { id, name, peers: Set(socketId) })
const meetingBreakouts = new Map();

function initMeetingSocket(io, socket) {
  // 1. Waiting Room: Knock to Join
  socket.on('meeting:knock', ({ meetingId, userName, initials }) => {
    socket.meetingId = meetingId;
    socket.join(`waiting:${meetingId}`);

    if (!waitingRooms.has(meetingId)) {
      waitingRooms.set(meetingId, new Map());
    }

    const waitRoom = waitingRooms.get(meetingId);
    const guestMeta = {
      socketId: socket.id,
      userId: socket.user ? socket.user._id : socket.id,
      userName: userName || (socket.user ? socket.user.name : 'Guest Participant'),
      initials: initials || (socket.user ? socket.user.initials : 'GP'),
      requestedAt: new Date(),
    };

    waitRoom.set(socket.id, guestMeta);

    // Alert all hosts in the meeting room that a guest is knocking
    io.to(`meeting:${meetingId}`).emit('meeting:knock_alert', {
      guest: guestMeta,
      waitingCount: waitRoom.size,
    });

    socket.emit('meeting:knock_acknowledged', {
      position: waitRoom.size,
      message: 'Waiting for the host to admit you into the meeting.',
    });
  });

  // 2. Host Admits a Waiting Guest
  socket.on('meeting:admit', ({ meetingId, socketId }) => {
    const waitRoom = waitingRooms.get(meetingId);
    if (waitRoom && waitRoom.has(socketId)) {
      const guest = waitRoom.get(socketId);
      waitRoom.delete(socketId);

      // Inform guest they are admitted
      io.to(socketId).emit('meeting:admitted', {
        meetingId,
      });

      // Update remaining waiting room count to hosts
      io.to(`meeting:${meetingId}`).emit('meeting:waiting_updated', {
        waitingList: Array.from(waitRoom.values()),
        waitingCount: waitRoom.size,
      });
    }
  });

  // 3. Host Denies a Waiting Guest
  socket.on('meeting:deny', ({ meetingId, socketId, reason }) => {
    const waitRoom = waitingRooms.get(meetingId);
    if (waitRoom && waitRoom.has(socketId)) {
      waitRoom.delete(socketId);

      // Inform guest they are denied
      io.to(socketId).emit('meeting:denied', {
        reason: reason || 'The host declined your request to join.',
      });

      // Update waiting list
      io.to(`meeting:${meetingId}`).emit('meeting:waiting_updated', {
        waitingList: Array.from(waitRoom.values()),
        waitingCount: waitRoom.size,
      });
    }
  });

  // 4. Host Admits All Waiting Guests
  socket.on('meeting:admit_all', ({ meetingId }) => {
    const waitRoom = waitingRooms.get(meetingId);
    if (waitRoom) {
      waitRoom.forEach((guest, sId) => {
        io.to(sId).emit('meeting:admitted', { meetingId });
      });
      waitRoom.clear();
      io.to(`meeting:${meetingId}`).emit('meeting:waiting_updated', {
        waitingList: [],
        waitingCount: 0,
      });
    }
  });

  // 5. Join a Meeting Room (Direct or after admission)
  socket.on('meeting:join', async ({ meetingId, peerId, audio, video, isHost, breakoutRoomId }) => {
    try {
      socket.leave(`waiting:${meetingId}`);
      socket.join(`meeting:${meetingId}`);
      socket.meetingId = meetingId;

      if (!meetingRooms.has(meetingId)) {
        meetingRooms.set(meetingId, new Map());
      }

      const room = meetingRooms.get(meetingId);
      const userMeta = {
        socketId: socket.id,
        userId: socket.user ? socket.user._id : socket.id,
        userName: socket.user ? socket.user.name : 'Participant',
        initials: socket.user ? socket.user.initials : 'P',
        peerId: peerId || socket.id,
        audio: audio !== undefined ? audio : true,
        video: video !== undefined ? video : true,
        handRaised: false,
        screenSharing: false,
        isHost: Boolean(isHost),
        breakoutRoomId: breakoutRoomId || null,
      };

      // Filter peers: if inside a breakout room, only connect to peers in the same breakout room
      const existingUsers = Array.from(room.values()).filter((u) => {
        if (userMeta.breakoutRoomId) {
          return u.breakoutRoomId === userMeta.breakoutRoomId;
        }
        return !u.breakoutRoomId;
      });

      room.set(socket.id, userMeta);

      // Send the list of existing peers in this scope to the newly joined user
      socket.emit('meeting:all_users', existingUsers);

      // If user is a host, send the current waiting room list
      if (isHost && waitingRooms.has(meetingId)) {
        socket.emit('meeting:waiting_updated', {
          waitingList: Array.from(waitingRooms.get(meetingId).values()),
          waitingCount: waitingRooms.get(meetingId).size,
        });
      }

      // Notify all other peers in the room that a new user joined
      socket.to(`meeting:${meetingId}`).emit('meeting:user_joined', userMeta);

      // Record active participant in database if meeting exists
      await Meeting.findOneAndUpdate(
        { meetingId },
        {
          $addToSet: {
            activeParticipants: {
              user: socket.user ? socket.user._id : null,
              socketId: socket.id,
              peerId: peerId || socket.id,
              audioEnabled: userMeta.audio,
              videoEnabled: userMeta.video,
              joinedAt: new Date(),
            },
          },
        }
      ).catch(() => {});
    } catch (err) {
      console.error('[Meeting Socket Join Error]:', err.message);
    }
  });

  // 6. WebRTC Signaling: Offer forwarding
  socket.on('meeting:offer', ({ to, offer }) => {
    io.to(to).emit('meeting:offer', {
      from: socket.id,
      callerMeta: meetingRooms.get(socket.meetingId)?.get(socket.id),
      offer,
    });
  });

  // 7. WebRTC Signaling: Answer forwarding
  socket.on('meeting:answer', ({ to, answer }) => {
    io.to(to).emit('meeting:answer', {
      from: socket.id,
      answer,
    });
  });

  // 8. WebRTC Signaling: ICE Candidate forwarding
  socket.on('meeting:ice_candidate', ({ to, candidate }) => {
    io.to(to).emit('meeting:ice_candidate', {
      from: socket.id,
      candidate,
    });
  });

  // 9. Audio / Microphone State Toggle
  socket.on('meeting:toggle_audio', ({ audio }) => {
    const room = meetingRooms.get(socket.meetingId);
    if (room && room.has(socket.id)) {
      room.get(socket.id).audio = audio;
      socket.to(`meeting:${socket.meetingId}`).emit('meeting:user_toggle_audio', {
        socketId: socket.id,
        audio,
      });
    }
  });

  // 10. Camera / Video State Toggle
  socket.on('meeting:toggle_video', ({ video }) => {
    const room = meetingRooms.get(socket.meetingId);
    if (room && room.has(socket.id)) {
      room.get(socket.id).video = video;
      socket.to(`meeting:${socket.meetingId}`).emit('meeting:user_toggle_video', {
        socketId: socket.id,
        video,
      });
    }
  });

  // 11. Screen Sharing Toggle
  socket.on('meeting:screen_share', ({ isSharing }) => {
    const room = meetingRooms.get(socket.meetingId);
    if (room && room.has(socket.id)) {
      room.get(socket.id).screenSharing = isSharing;
      socket.to(`meeting:${socket.meetingId}`).emit('meeting:user_screen_share', {
        socketId: socket.id,
        isSharing,
      });
    }
  });

  // 12. Hand Raise Toggle
  socket.on('meeting:raise_hand', () => {
    const room = meetingRooms.get(socket.meetingId);
    if (room && room.has(socket.id)) {
      const user = room.get(socket.id);
      user.handRaised = !user.handRaised;
      io.to(`meeting:${socket.meetingId}`).emit('meeting:user_raise_hand', {
        socketId: socket.id,
        userName: user.userName,
        handRaised: user.handRaised,
      });
    }
  });

  // 13. Floating Reaction Emoji
  socket.on('meeting:reaction', ({ emoji }) => {
    io.to(`meeting:${socket.meetingId}`).emit('meeting:user_reaction', {
      socketId: socket.id,
      userName: socket.user ? socket.user.name : 'Participant',
      emoji,
    });
  });

  // 14. In-Meeting Chat Message
  socket.on('meeting:chat_message', async ({ body }) => {
    try {
      if (!socket.meetingId || !body) return;

      const payload = {
        sender: socket.user ? socket.user._id : null,
        senderName: socket.user ? socket.user.name : 'Participant',
        body,
        sentAt: new Date(),
      };

      await Meeting.findOneAndUpdate(
        { meetingId: socket.meetingId },
        { $push: { chatMessages: payload } }
      ).catch(() => {});

      io.to(`meeting:${socket.meetingId}`).emit('meeting:chat_message', {
        ...payload,
        socketId: socket.id,
      });
    } catch (err) {
      console.error('[Meeting Chat Error]:', err.message);
    }
  });

  // 15. Breakout Rooms: Host creates rooms & assigns participants
  socket.on('breakout:create', ({ meetingId, rooms, durationMinutes }) => {
    // rooms: [{ id, name, participantSocketIds: [] }]
    if (!meetingBreakouts.has(meetingId)) {
      meetingBreakouts.set(meetingId, new Map());
    }

    const breakouts = meetingBreakouts.get(meetingId);
    breakouts.clear();

    const roomState = meetingRooms.get(meetingId);

    rooms.forEach((r) => {
      breakouts.set(r.id, {
        id: r.id,
        name: r.name,
        peers: new Set(r.participantSocketIds),
      });

      // Update user breakout assignments in meeting room state
      if (roomState) {
        r.participantSocketIds.forEach((sId) => {
          if (roomState.has(sId)) {
            roomState.get(sId).breakoutRoomId = r.id;
          }
          // Direct participant into breakout room
          io.to(sId).emit('breakout:assigned', {
            breakoutRoomId: r.id,
            breakoutRoomName: r.name,
            durationMinutes: durationMinutes || null,
          });
        });
      }
    });

    // Notify all participants about breakout status
    io.to(`meeting:${meetingId}`).emit('breakout:status_changed', {
      active: true,
      rooms: Array.from(breakouts.values()).map((br) => ({
        id: br.id,
        name: br.name,
        count: br.peers.size,
      })),
    });
  });

  // 16. Breakout Rooms: Host Broadcasts Message to all rooms
  socket.on('breakout:broadcast', ({ meetingId, message }) => {
    io.to(`meeting:${meetingId}`).emit('breakout:broadcast_message', {
      message,
      senderName: socket.user ? socket.user.name : 'Host',
      sentAt: new Date(),
    });
  });

  // 17. Breakout Rooms: Participant or Host returns to main room
  socket.on('breakout:leave_to_main', ({ meetingId }) => {
    const room = meetingRooms.get(meetingId);
    if (room && room.has(socket.id)) {
      room.get(socket.id).breakoutRoomId = null;
      socket.emit('breakout:returned_to_main');
      socket.to(`meeting:${meetingId}`).emit('breakout:user_returned_main', {
        socketId: socket.id,
        userName: room.get(socket.id).userName,
      });
    }
  });

  // 18. Breakout Rooms: Host closes all breakout rooms
  socket.on('breakout:close_all', ({ meetingId }) => {
    const breakouts = meetingBreakouts.get(meetingId);
    if (breakouts) {
      breakouts.clear();
    }

    const room = meetingRooms.get(meetingId);
    if (room) {
      room.forEach((user) => {
        user.breakoutRoomId = null;
      });
    }

    io.to(`meeting:${meetingId}`).emit('breakout:closed_all');
  });

  // 19. Leave Meeting
  socket.on('meeting:leave', () => {
    handleMeetingLeave(io, socket);
  });

  // 20. Disconnect Handler
  socket.on('disconnect', () => {
    handleMeetingLeave(io, socket);
  });
}

function handleMeetingLeave(io, socket) {
  if (!socket.meetingId) return;

  const meetingId = socket.meetingId;

  // Clean up from waiting room if socket disconnected while waiting
  const waitRoom = waitingRooms.get(meetingId);
  if (waitRoom && waitRoom.has(socket.id)) {
    waitRoom.delete(socket.id);
    io.to(`meeting:${meetingId}`).emit('meeting:waiting_updated', {
      waitingList: Array.from(waitRoom.values()),
      waitingCount: waitRoom.size,
    });
  }

  // Clean up from active meeting room
  const room = meetingRooms.get(meetingId);
  if (room && room.has(socket.id)) {
    const userMeta = room.get(socket.id);
    room.delete(socket.id);

    // Notify all remaining peers in room
    socket.to(`meeting:${meetingId}`).emit('meeting:user_left', {
      socketId: socket.id,
      userId: userMeta.userId,
      userName: userMeta.userName,
    });

    if (room.size === 0) {
      meetingRooms.delete(meetingId);
      waitingRooms.delete(meetingId);
      meetingBreakouts.delete(meetingId);
    }

    Meeting.findOneAndUpdate(
      { meetingId },
      { $pull: { activeParticipants: { socketId: socket.id } } }
    ).catch(() => {});

    socket.leave(`meeting:${meetingId}`);
    socket.leave(`waiting:${meetingId}`);
    socket.meetingId = null;
  }
}

module.exports = initMeetingSocket;
