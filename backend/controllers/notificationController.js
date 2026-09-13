const Notification = require('../models/Notification');

/**
 * @desc    Get current user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30);

    const formatted = notifications.map((n) => {
      // Calculate relative human time
      const diffMins = Math.round((Date.now() - new Date(n.createdAt).getTime()) / 60000);
      let time = `${diffMins} min`;
      if (diffMins >= 60) {
        const diffHours = Math.round(diffMins / 60);
        time = diffHours >= 24 ? `${Math.round(diffHours / 24)} d` : `${diffHours} h`;
      }

      return {
        id: n._id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        time,
        unread: n.unread,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    notification.unread = false;
    await notification.save();

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, unread: true },
      { $set: { unread: false } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
