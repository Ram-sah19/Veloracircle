const express = require('express');
const { body } = require('express-validator');
const {
  getMeetings,
  createMeeting,
  getMeetingById,
  endMeeting,
  getMeetingChat,
} = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/', getMeetings);
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Meeting title is required'),
    validate,
  ],
  createMeeting
);
router.get('/:meetingId', getMeetingById);
router.post('/:meetingId/end', endMeeting);
router.get('/:meetingId/chat', getMeetingChat);

module.exports = router;
