const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')
const allowRoles = require('../middleware/roles')
const notify = require('../notifications')

// GET all tasks ready for QA
router.get('/queue', auth, allowRoles('qa', 'lead'), async (req, res) => {
  try {
    const qaFilter = req.user.role === 'qa' ? 'AND t.qa_id = ?' : ''
    const params = req.user.role === 'qa' ? [req.user.id] : []
    const [tasks] = await db.query(
      `SELECT t.*, 
        p.name as project_name,
        u.name as assignee_name,
        q.name as qa_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users q ON t.qa_id = q.id
       WHERE t.status IN ('ready_for_qa', 'in_qa')
       ${qaFilter}
       ORDER BY t.updated_at DESC`
      , params
    )
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET reviews for a task
router.get('/reviews/:taskId', auth, allowRoles('qa', 'lead'), async (req, res) => {
  try {
    const [reviews] = await db.query(
      `SELECT r.*, u.name as reviewer_name 
       FROM qa_reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.task_id = ?
       ORDER BY r.reviewed_at DESC`,
      [req.params.taskId]
    )
    res.json(reviews)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// SUBMIT QA review (pass or fail)
router.post('/review/:taskId', auth, allowRoles('qa', 'lead'), async (req, res) => {
  const { result, comment } = req.body
  const taskId = req.params.taskId
  let connection

  try {
    if (!['pass', 'fail'].includes(result)) {
      return res.status(400).json({ message: 'Review result must be pass or fail' })
    }
    if (result === 'fail' && !comment?.trim()) {
      return res.status(400).json({ message: 'A comment is required when requesting changes' })
    }

    connection = await db.getConnection()
    await connection.beginTransaction()

    const [tasks] = await connection.query(
      'SELECT status, qa_id, assignee_id, title FROM tasks WHERE id = ? FOR UPDATE',
      [taskId]
    )
    if (tasks.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Task not found' })
    }
    if (req.user.role === 'qa' && tasks[0].qa_id && tasks[0].qa_id !== req.user.id) {
      await connection.rollback()
      return res.status(403).json({ message: 'This task is assigned to another QA reviewer' })
    }
    if (!['ready_for_qa', 'in_qa'].includes(tasks[0].status)) {
      await connection.rollback()
      return res.status(409).json({ message: 'Task is not ready for QA review' })
    }

    // 1. Save the review
    await connection.query(
      'INSERT INTO qa_reviews (task_id, reviewer_id, result, comment) VALUES (?, ?, ?, ?)',
      [taskId, req.user.id, result, comment]
    )
    await notify(
      connection,
      tasks[0].assignee_id,
      taskId,
      result === 'pass'
        ? `"${tasks[0].title}" was approved`
        : `Changes requested for "${tasks[0].title}"`,
      'qa'
    )

    const oldStatus = tasks[0].status

    // 3. Update task status based on result
    const newStatus = result === 'pass' ? 'done' : 'changes_requested'
    await connection.query(
      'UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, taskId]
    )

    // 4. Log status change
    await connection.query(
      'INSERT INTO status_logs (task_id, changed_by, from_status, to_status) VALUES (?, ?, ?, ?)',
      [taskId, req.user.id, oldStatus, newStatus]
    )

    await connection.commit()
    res.json({ message: `Task ${result === 'pass' ? 'approved' : 'sent back for changes'}` })
  } catch (err) {
    if (connection) await connection.rollback()
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally {
    if (connection) connection.release()
  }
})

module.exports = router
