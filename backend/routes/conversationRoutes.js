const express = require('express');
const {
  getConversations,
  getOrCreateDirect,
  togglePin,
  markRead,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.post('/direct', getOrCreateDirect);
router.put('/:id/pin', togglePin);
router.put('/:id/read', markRead);

module.exports = router;
