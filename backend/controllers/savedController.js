const SavedItem = require('../models/SavedItem');

/**
 * @desc    Get user's saved messages, files, links
 * @route   GET /api/saved
 * @access  Private
 */
const getSavedItems = async (req, res, next) => {
  try {
    const items = await SavedItem.find({ user: req.user.id })
      .populate('messageRef', 'body createdAt kind file')
      .populate('fileRef', 'name size url fileType')
      .sort({ createdAt: -1 });

    const messages = items
      .filter((i) => i.kind === 'message')
      .map((i) => ({
        id: i._id,
        from: i.fromAuthor || 'Participant',
        circle: i.circleName || 'Private conversation',
        body: i.body || (i.messageRef ? i.messageRef.body : ''),
        time: new Date(i.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));

    const files = items
      .filter((i) => i.kind === 'file')
      .map((i) => ({
        id: i._id,
        title: i.title || (i.fileRef ? i.fileRef.name : 'Saved file'),
        url: i.url || (i.fileRef ? i.fileRef.url : ''),
        time: new Date(i.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }));

    const links = items
      .filter((i) => i.kind === 'link')
      .map((i) => ({
        id: i._id,
        title: i.title,
        url: i.url,
        time: new Date(i.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }));

    res.status(200).json({
      success: true,
      data: {
        messages,
        files,
        links,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Save an item (message, file, link)
 * @route   POST /api/saved
 * @access  Private
 */
const saveItem = async (req, res, next) => {
  try {
    const { kind, title, body, url, fromAuthor, circleName, messageRef, fileRef } = req.body;

    if (!kind || !['message', 'file', 'link'].includes(kind)) {
      return res.status(400).json({
        success: false,
        error: "kind must be 'message', 'file', or 'link'.",
      });
    }

    const saved = await SavedItem.create({
      user: req.user.id,
      kind,
      title: title || '',
      body: body || '',
      url: url || '',
      fromAuthor: fromAuthor || '',
      circleName: circleName || '',
      messageRef: messageRef || null,
      fileRef: fileRef || null,
    });

    res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove a saved item
 * @route   DELETE /api/saved/:id
 * @access  Private
 */
const removeSavedItem = async (req, res, next) => {
  try {
    const item = await SavedItem.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Saved item not found.' });
    }

    await item.deleteOne();

    res.status(200).json({ success: true, message: 'Saved item removed.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSavedItems,
  saveItem,
  removeSavedItem,
};
