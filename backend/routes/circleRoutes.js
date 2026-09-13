const express = require('express');
const { body } = require('express-validator');
const {
  getCircles,
  createCircle,
  getCircleById,
  updateCircle,
  addMember,
  removeMember,
  pinMessage,
} = require('../controllers/circleController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(protect); // All circle routes require authentication

router.get('/', getCircles);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Circle name is required'),
    validate,
  ],
  createCircle
);

router.get('/:id', getCircleById);
router.put('/:id', updateCircle);
router.post(
  '/:id/members',
  [body('userId').notEmpty().withMessage('userId is required'), validate],
  addMember
);
router.delete('/:id/members/:userId', removeMember);
router.put('/:id/pin', pinMessage);

module.exports = router;
