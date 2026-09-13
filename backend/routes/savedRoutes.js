const express = require('express');
const {
  getSavedItems,
  saveItem,
  removeSavedItem,
} = require('../controllers/savedController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getSavedItems);
router.post('/', saveItem);
router.delete('/:id', removeSavedItem);

module.exports = router;
