const Meeting = require('../models/Meeting');
const { MEETING_STATUS } = require('../config/constants');
const { sanitizeMeetingForUser } = require('../middleware/privacy');

/**
 * Generate human-readable random meeting ID like "prod-strat-839" or uuid
 */
function generateMeetingId(title) {
  const base = title
    ? title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15)
    : 'room';
  const rand = Math.floor(100 + Math.random() * 900);
  return `${base}-${rand}`;
}

/**
 * @desc    Get all meetings categorized into today, upcoming, past
 * @route   GET /api/meetings
 * @access  Private
 */
const getMeetings = async (req, res, next) => {
  try {
    const meetings = await Meeting.find({
      status: { $ne: MEETING_STATUS.ENDED },
    })
      .populate('host', 'name handle initials avatar')
      .populate('circle', 'name')
      .sort({ scheduledStart: 1 });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const formatted = meetings.map((m) => {
      let group = 'upcoming';
      const mDate = new Date(m.scheduledStart);

      if (mDate >= startOfToday && mDate <= endOfToday) {
        group = 'today';
      } else if (mDate < startOfToday) {
        group = 'past';
      }

      const sanitized = sanitizeMeetingForUser(m, req.user.role, req.user.id);

      return {
        id: m.meetingId,
        title: m.title,
        day:
          group === 'today'
            ? 'Today'
            : mDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: mDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        host: m.host ? m.host.name : 'Unknown',
        privacy: m.privacy,
        duration: m.duration,
        group,
        status: m.status,
        circle: m.circle ? m.circle.name : null,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Schedule or start an instant meeting
 * @route   POST /api/meetings
 * @access  Private
 */
const createMeeting = async (req, res, next) => {
  try {
    const { title, description, scheduledStart, duration, privacy, circleId, isInstant } = req.body;

    const meetingId = generateMeetingId(title);

    const meeting = await Meeting.create({
      meetingId,
      title: title || 'Quick Meeting',
      description: description || '',
      host: req.user.id,
      circle: circleId || null,
      privacy: privacy || 'Private Meeting',
      status: isInstant ? MEETING_STATUS.ACTIVE : MEETING_STATUS.SCHEDULED,
      scheduledStart: isInstant ? new Date() : scheduledStart || new Date(),
      duration: duration || '45 min',
    });

    res.status(201).json({
      success: true,
      data: {
        meetingId: meeting.meetingId,
        title: meeting.title,
        host: req.user.name,
        status: meeting.status,
        scheduledStart: meeting.scheduledStart,
        privacy: meeting.privacy,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get meeting room details
 * @route   GET /api/meetings/:meetingId
 * @access  Private
 */
const getMeetingById = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId })
      .populate('host', 'name handle initials avatar role')
      .populate('circle', 'name privacy');

    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found.' });
    }

    const sanitized = sanitizeMeetingForUser(meeting, req.user.role, req.user.id);

    res.status(200).json({
      success: true,
      data: sanitized,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    End meeting (Host / Admin only)
 * @route   POST /api/meetings/:meetingId/end
 * @access  Private
 */
const endMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found.' });
    }

    const isHost = meeting.host.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'owner' || req.user.role === 'admin';

    if (!isHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only the host or an administrator can end this meeting.',
      });
    }

    meeting.status = MEETING_STATUS.ENDED;
    meeting.activeParticipants = [];
    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'Meeting ended successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get in-meeting chat messages
 * @route   GET /api/meetings/:meetingId/chat
 * @access  Private
 */
const getMeetingChat = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found.' });
    }

    res.status(200).json({
      success: true,
      data: meeting.chatMessages || [],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMeetings,
  createMeeting,
  getMeetingById,
  endMeeting,
  getMeetingChat,
};
