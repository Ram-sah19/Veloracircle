const path = require('path');
const fs = require('fs');
const File = require('../models/File');

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Determine high-level file type from extension / MIME
 */
function getFileType(mimeType, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf' || ext === '.pdf') return 'pdf';
  if (['.doc', '.docx', '.txt', '.md'].includes(ext)) return 'doc';
  if (['.xls', '.xlsx', '.csv', '.sheet'].includes(ext)) return 'sheet';
  if (['.zip', '.tar', '.gz', '.rar', '.7z'].includes(ext)) return 'zip';
  return 'other';
}

/**
 * @desc    Upload file
 * @route   POST /api/files/upload
 * @access  Private
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please select a file to upload.' });
    }

    const { circleId, conversationId } = req.body;
    const fileType = getFileType(req.file.mimetype, req.file.originalname);
    const sizeFormatted = formatBytes(req.file.size);

    const relativeUrl = `/api/files/download/${req.file.filename}`;

    const newFile = await File.create({
      name: req.file.originalname,
      originalName: req.file.originalname,
      size: sizeFormatted,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      fileType,
      path: req.file.path,
      url: relativeUrl,
      owner: req.user.id,
      circle: circleId || null,
      conversation: conversationId || null,
    });

    res.status(201).json({
      success: true,
      data: {
        id: newFile._id,
        name: newFile.name,
        type: newFile.fileType,
        size: newFile.size,
        url: newFile.url,
        date: 'Today',
        owner: req.user.name,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get files list categorized into recent, shared, mine
 * @route   GET /api/files
 * @access  Private
 */
const getFiles = async (req, res, next) => {
  try {
    const { group, query } = req.query;

    let filter = { isDeleted: false };
    if (query) {
      filter.name = { $regex: query, $options: 'i' };
    }

    const files = await File.find(filter)
      .populate('owner', 'name handle initials avatar')
      .sort({ createdAt: -1 });

    const formatted = files.map((f) => {
      const isMine = f.owner && f.owner._id.toString() === req.user.id.toString();
      let fileGroup = isMine ? 'mine' : 'shared';

      // If created within last 7 days, tag as recent
      const diffDays = (Date.now() - new Date(f.createdAt).getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 7) {
        fileGroup = 'recent';
      }

      return {
        id: f._id,
        name: f.name,
        type: f.fileType,
        size: f.size,
        date: new Date(f.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        owner: f.owner ? f.owner.name : 'Unknown',
        url: f.url,
        group: isMine ? 'mine' : fileGroup,
      };
    });

    let result = formatted;
    if (group && ['recent', 'shared', 'mine'].includes(group)) {
      result = formatted.filter((f) => f.group === group);
    }

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Download / Stream file
 * @route   GET /api/files/download/:filename
 * @access  Public (or protected if token attached)
 */
const downloadFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const file = await File.findOne({ path: { $regex: filename, $options: 'i' }, isDeleted: false });

    const filePath = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found on disk.' });
    }

    if (file) {
      file.downloadsCount += 1;
      await file.save();
    }

    res.download(filePath, file ? file.originalName : filename);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete file
 * @route   DELETE /api/files/:id
 * @access  Private
 */
const deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const isOwner = file.owner.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'owner' || req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this file' });
    }

    file.isDeleted = true;
    await file.save();

    res.status(200).json({ success: true, message: 'File deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile,
};
