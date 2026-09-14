/**
 * System Constants for Velora Circle
 */

const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  GUEST: 'guest',
};

const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 5,
  [ROLES.ADMIN]: 4,
  [ROLES.MODERATOR]: 3,
  [ROLES.MEMBER]: 2,
  [ROLES.GUEST]: 1,
};

const PRIVACY_LEVELS = {
  PRIVATE: 'private',
  RESTRICTED: 'restricted',
  INVITE_ONLY: 'invite',
};

const CONVERSATION_KINDS = {
  DIRECT: 'direct',
  CIRCLE: 'circle',
};

const MESSAGE_KINDS = {
  TEXT: 'text',
  FILE: 'file',
  IMAGE: 'image',
  VOICE: 'voice',
  POLL: 'poll',
  CODE: 'code',
};

const MEETING_STATUS = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  ENDED: 'ended',
};

const NOTIFICATION_KINDS = {
  MESSAGE: 'message',
  MEETING: 'meeting',
  INVITE: 'invite',
  FILE: 'file',
  SCHEDULE: 'schedule',
};

const FILE_GROUPS = {
  RECENT: 'recent',
  SHARED: 'shared',
  MINE: 'mine',
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  PRIVACY_LEVELS,
  CONVERSATION_KINDS,
  MESSAGE_KINDS,
  MEETING_STATUS,
  NOTIFICATION_KINDS,
  FILE_GROUPS,
};
