const express = require('express');
const {
  sendInvitation,
  getInvitations,
  acceptInvitation,
  declineInvitation,
  resetMentorship,
} = require('../controllers/mentorshipController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/invite', sendInvitation);
router.get('/invitations', getInvitations);
router.put('/invitations/:id/accept', acceptInvitation);
router.put('/invitations/:id/decline', declineInvitation);
router.delete('/reset', resetMentorship);

module.exports = router;
