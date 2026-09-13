const { ROLES } = require('../config/constants');

/**
 * Filter sensitive member lists and participant counts from Circle/Meeting payloads
 * for non-administrative users.
 */
function sanitizeCircleForUser(circle, userRole) {
  const c = circle.toObject ? circle.toObject() : { ...circle };
  const isAdminOrOwner = userRole === ROLES.OWNER || userRole === ROLES.ADMIN;

  if (!isAdminOrOwner) {
    // Strictly omit member list, counts, and join/leave telemetry
    delete c.members;
    delete c.memberCount;
    c.memberVisibility = 'restricted';
    c.memberDirectoryStatus = 'hidden';
  } else {
    // Admins get to see member count and full roster
    c.memberCount = circle.members ? circle.members.length : 0;
  }

  return c;
}

/**
 * Filter meeting participant counts for non-hosts
 */
function sanitizeMeetingForUser(meeting, userRole, userId) {
  const m = meeting.toObject ? meeting.toObject() : { ...meeting };
  const isHost =
    userRole === ROLES.OWNER ||
    userRole === ROLES.ADMIN ||
    (m.host && m.host.toString() === userId.toString());

  if (!isHost) {
    // Normal attendees see "Private meeting" without exact participant counts
    delete m.activeParticipants;
    m.participantVisibility = 'hidden';
    m.privacyBadge = 'Private meeting';
  }

  return m;
}

module.exports = {
  sanitizeCircleForUser,
  sanitizeMeetingForUser,
};
