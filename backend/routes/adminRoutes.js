const express = require('express');
const {
  getOverview,
  getMembers,
  updateUserRole,
  inviteMember,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { ROLES } = require('../config/constants');

const router = express.Router();

// All admin routes strictly require Owner or Admin role
router.use(protect);
router.use(authorize(ROLES.OWNER, ROLES.ADMIN));

router.get('/overview', getOverview);
router.get('/members', getMembers);
router.put('/members/:userId/role', updateUserRole);
router.post('/invite', inviteMember);

module.exports = router;
