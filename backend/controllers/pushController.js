const User = require('../models/User');

let webpush = null;
try {
  webpush = require('web-push');
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || 'velora@example.com'}`,
      vapidPublicKey,
      vapidPrivateKey
    );
  }
} catch {
  console.log('[Push] web-push not installed. Run: npm install web-push');
}

/**
 * @desc    Save push subscription for current user
 * @route   POST /api/push/subscribe
 * @access  Private
 */
const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys) {
      return res.status(400).json({ success: false, error: 'endpoint and keys required' });
    }
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { pushSubscriptions: { endpoint, keys } },
    });
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get VAPID public key
 * @route   GET /api/push/vapid-public-key
 * @access  Public
 */
const getVapidPublicKey = (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || null });
};

/**
 * Internal helper: send push notification to a user by ID
 */
const sendPushToUser = async (userId, payload) => {
  if (!webpush) return;
  try {
    const user = await User.findById(userId).select('pushSubscriptions');
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) return;
    const notification = JSON.stringify(payload);
    const promises = user.pushSubscriptions.map((sub) =>
      webpush.sendNotification(sub, notification).catch(async (err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await User.findByIdAndUpdate(userId, {
            $pull: { pushSubscriptions: { endpoint: sub.endpoint } },
          });
        }
      })
    );
    await Promise.allSettled(promises);
  } catch {
    // silent
  }
};

module.exports = { subscribe, getVapidPublicKey, sendPushToUser };
