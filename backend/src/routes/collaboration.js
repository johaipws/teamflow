const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')
const notify = require('../notifications')

async function canAccessTask(req) {
  if (req.user.role === 'lead') return true
  const field = req.user.role === 'qa' ? 'qa_id' : 'assignee_id'
  const [tasks] = await db.query(
    `SELECT id FROM tasks WHERE id = ? AND ${field} = ?`,
    [req.params.taskId, req.user.id]
  )
  return tasks.length > 0
}

router.get('/:taskId/comments', auth, async (req, res) => {
  if (!await canAccessTask(req)) {
    return res.status(403).json({ message: 'You do not have access to this task' })
  }
  const [rows] = await db.query(
    `SELECT c.*, u.name AS author_name
     FROM task_comments c JOIN users u ON u.id = c.user_id
     WHERE c.task_id = ? ORDER BY c.created_at DESC`,
    [req.params.taskId]
  )
  res.json(rows)
})

router.post('/:taskId/comments', auth, async (req, res) => {
  if (!await canAccessTask(req)) {
    return res.status(403).json({ message: 'You do not have access to this task' })
  }
  const comment = req.body.comment?.trim()
  if (!comment) return res.status(400).json({ message: 'Comment is required' })

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [tasks] = await connection.query(
      'SELECT title, assignee_id, qa_id FROM tasks WHERE id = ?',
      [req.params.taskId]
    )
    if (!tasks.length) {
      await connection.rollback()
      return res.status(404).json({ message: 'Task not found' })
    }
    const [result] = await connection.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [req.params.taskId, req.user.id, comment]
    )
    const recipients = new Set([tasks[0].assignee_id, tasks[0].qa_id])
    recipients.delete(req.user.id)
    for (const userId of recipients) {
      await notify(connection, userId, req.params.taskId, `New comment on "${tasks[0].title}"`, 'comment')
    }
    await connection.commit()
    res.status(201).json({ id: result.insertId, message: 'Comment added' })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
})

router.get('/:taskId/attachments', auth, async (req, res) => {
  if (!await canAccessTask(req)) {
    return res.status(403).json({ message: 'You do not have access to this task' })
  }
  const [rows] = await db.query(
    `SELECT a.*, u.name AS added_by_name
     FROM task_attachments a JOIN users u ON u.id = a.added_by
     WHERE a.task_id = ? ORDER BY a.created_at DESC`,
    [req.params.taskId]
  )
  res.json(rows)
})

router.post('/:taskId/attachments', auth, async (req, res) => {
  if (!await canAccessTask(req)) {
    return res.status(403).json({ message: 'You do not have access to this task' })
  }
  const name = req.body.name?.trim()
  const url = req.body.url?.trim()
  if (!name || !/^https?:\/\//i.test(url || '')) {
    return res.status(400).json({ message: 'A name and valid HTTP/HTTPS URL are required' })
  }
  const [result] = await db.query(
    'INSERT INTO task_attachments (task_id, added_by, name, url) VALUES (?, ?, ?, ?)',
    [req.params.taskId, req.user.id, name, url]
  )
  res.status(201).json({ id: result.insertId, message: 'Attachment added' })
})

router.delete('/:taskId/attachments/:id', auth, async (req, res) => {
  if (!await canAccessTask(req)) {
    return res.status(403).json({ message: 'You do not have access to this task' })
  }
  const [result] = await db.query(
    `DELETE FROM task_attachments
     WHERE id = ? AND task_id = ? AND (added_by = ? OR ? = 'lead')`,
    [req.params.id, req.params.taskId, req.user.id, req.user.role]
  )
  if (!result.affectedRows) return res.status(404).json({ message: 'Attachment not found' })
  res.json({ message: 'Attachment deleted' })
})

module.exports = router
