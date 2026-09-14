const express = require('express');
const {
  getConversations,
  getOrCreateDirect,
  togglePin,
  markRead,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.post('/direct', getOrCreateDirect);
router.put('/:id/pin', togglePin);
router.put('/:id/read', markRead);
router.get('/:id/pins', getPinnedMessages);
router.post('/:id/pin', pinMessage);
router.delete('/:id/pin/:messageId', unpinMessage);

module.exports = router;
