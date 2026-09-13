const express = require('express');
const {
  getMessages,
  sendMessage,
  addReaction,
  removeReaction,
  deleteMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Nested routes mounted under /api/conversations/:conversationId/messages
router.get('/', getMessages);
router.post('/', sendMessage);

// Message-specific action routes mounted under /api/messages
router.post('/:id/reactions', addReaction);
router.delete('/:id/reactions/:emoji', removeReaction);
router.delete('/:id', deleteMessage);

module.exports = router;
