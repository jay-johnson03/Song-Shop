const express = require('express');
const router = express.Router();
const { query } = require('../db/query');

// Get all messages
router.get('/', async (req, res) => {
  try {
    const messages = await query(`
      SELECT m.messageId, m.messageText, m.createdAt, m.updatedAt, u.userName, u.spotifyId, u.profilePicUrl
      FROM messages m
      JOIN usertable u ON m.userId = u.userId
      WHERE u.isRestricted = 0
      ORDER BY m.createdAt DESC
    `);
    res.json({ messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
});

// Post a message
router.post('/', async (req, res) => {
  try {
    const { spotifyId, messageText } = req.body;
    
    if (!spotifyId || !messageText || messageText.trim().length === 0) {
      return res.status(400).json({ error: 'Missing spotifyId or message text' });
    }

    if (messageText.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }

    const userRows = await query('SELECT userId, isRestricted FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const { userId, isRestricted } = userRows[0];
    if (isRestricted) return res.status(403).json({ error: 'You have been restricted from posting messages' });

    const result = await query(
      'INSERT INTO messages (userId, messageText, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
      [userId, messageText]
    );

    res.json({ success: true, message: 'Message posted successfully', messageId: result.insertId });
  } catch (err) {
    console.error('Error posting message:', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// Update a message
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { spotifyId, messageText } = req.body;

    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    if (messageText.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }

    const msgRows = await query('SELECT userId FROM messages WHERE messageId = ?', [messageId]);
    if (msgRows.length === 0) return res.status(404).json({ error: 'Message not found' });

    const userRows = await query('SELECT userId FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    if (msgRows[0].userId !== userRows[0].userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    await query('UPDATE messages SET messageText = ?, updatedAt = NOW() WHERE messageId = ?', [messageText, messageId]);
    res.json({ success: true, message: 'Message updated successfully' });
  } catch (err) {
    console.error('Error updating message:', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete a message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { spotifyId } = req.body;

    const msgRows = await query('SELECT userId FROM messages WHERE messageId = ?', [messageId]);
    if (msgRows.length === 0) return res.status(404).json({ error: 'Message not found' });

    const userRows = await query('SELECT userId, spotifyId FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isAdmin = userRows[0].spotifyId === process.env.ADMIN_SPOTIFY_ID;
    const isOwner = msgRows[0].userId === userRows[0].userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You cannot delete this message' });
    }

    await query('DELETE FROM messages WHERE messageId = ?', [messageId]);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
