const express = require('express');
const {
  getMessages,
  sendMessage,
  clearConversationMessages,
  searchMessages,
  markMessagesRead,
  voteOnPoll,
  addReaction,
  removeReaction,
  deleteMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Nested routes under /api/conversations/:conversationId/messages
router.get('/', getMessages);
router.post('/', sendMessage);
router.get('/search', searchMessages);
router.post('/read', markMessagesRead);
router.delete('/clear', clearConversationMessages);

// Message-specific action routes under /api/messages
router.post('/:id/reactions', addReaction);
router.delete('/:id/reactions/:emoji', removeReaction);
router.post('/:id/poll/vote', voteOnPoll);
router.delete('/:id', deleteMessage);

module.exports = router;
