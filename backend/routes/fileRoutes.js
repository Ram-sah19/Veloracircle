const express = require('express');
const {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile,
} = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', protect, getFiles);
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/download/:filename', downloadFile);
router.delete('/:id', protect, deleteFile);

module.exports = router;
