const express = require('express');
const { subscribe, getVapidPublicKey } = require('../controllers/pushController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', protect, subscribe);

module.exports = router;
