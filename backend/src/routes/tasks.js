const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')
const allowRoles = require('../middleware/roles')
const notify = require('../notifications')

// GET all tasks (with project and user info)
router.get('/', auth, async (req, res) => {
  try {
    const conditions = []
    const params = []
    if (req.user.role === 'developer') {
      conditions.push('t.assignee_id = ?')
      params.push(req.user.id)
    } else if (req.user.role === 'qa') {
      conditions.push('t.qa_id = ?')
      params.push(req.user.id)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [tasks] = await db.query(
      `SELECT t.*, 
        p.name as project_name,
        u.name as assignee_name,
        q.name as qa_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users q ON t.qa_id = q.id
       ${where}
       ORDER BY t.created_at DESC`
      , params
    )
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET tasks by project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const conditions = ['t.project_id = ?']
    const params = [req.params.projectId]
    if (req.user.role === 'developer') {
      conditions.push('t.assignee_id = ?')
      params.push(req.user.id)
    } else if (req.user.role === 'qa') {
      conditions.push('t.qa_id = ?')
      params.push(req.user.id)
    }
    const [tasks] = await db.query(
      `SELECT t.*, 
        u.name as assignee_name,
        q.name as qa_name
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users q ON t.qa_id = q.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.created_at DESC`,
      params
    )
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// CREATE task
router.post('/', auth, allowRoles('developer', 'lead'), async (req, res) => {
  const { project_id, title, description, assignee_id, qa_id, priority, estimated_hours, due_date } = req.body
  let connection

  try {
    if (!project_id || !title?.trim()) {
      return res.status(400).json({ message: 'Project and title are required' })
    }
    if (!['low', 'medium', 'high', 'critical'].includes(priority || 'medium')) {
      return res.status(400).json({ message: 'Invalid priority' })
    }

    connection = await db.getConnection()
    await connection.beginTransaction()

    const effectiveAssigneeId = req.user.role === 'developer'
      ? req.user.id
      : assignee_id || null

    const [result] = await connection.query(
      `INSERT INTO tasks 
        (project_id, title, description, assignee_id, qa_id, priority, estimated_hours, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        title.trim(),
        description || null,
        effectiveAssigneeId,
        qa_id || null,
        priority || 'medium',
        estimated_hours || null,
        due_date || null
      ]
    )

    await connection.query(
      'INSERT INTO status_logs (task_id, changed_by, from_status, to_status) VALUES (?, ?, ?, ?)',
      [result.insertId, req.user.id, null, 'todo']
    )
    await notify(connection, effectiveAssigneeId, result.insertId, `Task assigned: "${title.trim()}"`, 'assignment')
    if (qa_id && Number(qa_id) !== Number(effectiveAssigneeId)) {
      await notify(connection, qa_id, result.insertId, `You are QA for "${title.trim()}"`, 'assignment')
    }

    await connection.commit()
    res.status(201).json({ message: 'Task created', id: result.insertId })
  } catch (err) {
    if (connection) await connection.rollback()
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally {
    if (connection) connection.release()
  }
})

// UPDATE task status
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body
  const role = req.user.role
  let connection

  const allowed = {
    developer: {
      todo: ['in_progress'],
      in_progress: ['ready_for_qa'],
      changes_requested: ['in_progress']
    },
    qa: {
      ready_for_qa: ['in_qa'],
      in_qa: ['ready_for_qa']
    },
    lead: {
      todo: ['in_progress'],
      in_progress: ['ready_for_qa'],
      ready_for_qa: ['in_qa'],
      in_qa: ['changes_requested', 'done'],
      changes_requested: ['in_progress'],
      done: ['in_progress']
    }
  }

  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [tasks] = await connection.query(
      'SELECT status, assignee_id, qa_id FROM tasks WHERE id = ? FOR UPDATE',
      [req.params.id]
    )
    if (tasks.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Task not found' })
    }

    const oldStatus = tasks[0].status
    if (role === 'developer' && tasks[0].assignee_id !== req.user.id) {
      await connection.rollback()
      return res.status(403).json({ message: 'This task is assigned to another developer' })
    }
    if (role === 'qa' && tasks[0].qa_id !== req.user.id) {
      await connection.rollback()
      return res.status(403).json({ message: 'This task is assigned to another QA reviewer' })
    }

    // Block if timer is running
    const [activeTimer] = await connection.query(
      'SELECT * FROM time_logs WHERE task_id = ? AND ended_at IS NULL',
      [req.params.id]
    )
    if (activeTimer.length > 0) {
      await connection.rollback()
      return res.status(403).json({
        message: 'Cannot change status while a timer is running. Stop the timer first.'
      })
    }

    // Check allowed transition
    const allowedForRole = allowed[role] || {}
    const allowedNextStatuses = allowedForRole[oldStatus] || []
    if (!allowedNextStatuses.includes(status)) {
      await connection.rollback()
      return res.status(403).json({
        message: `Not allowed to move task from "${oldStatus}" to "${status}" as ${role}`
      })
    }

    await connection.query(
      'UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, req.params.id]
    )
    const [details] = await connection.query(
      'SELECT title, assignee_id, qa_id FROM tasks WHERE id = ?',
      [req.params.id]
    )
    const recipient = status === 'ready_for_qa' ? details[0].qa_id : details[0].assignee_id
    if (recipient && recipient !== req.user.id) {
      await notify(connection, recipient, req.params.id, `"${details[0].title}" moved to ${status.replaceAll('_', ' ')}`, 'status')
    }

    await connection.query(
      'INSERT INTO status_logs (task_id, changed_by, from_status, to_status) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, oldStatus, status]
    )

    await connection.commit()
    res.json({ message: 'Status updated' })
  } catch (err) {
    if (connection) await connection.rollback()
    res.status(500).json({ message: 'Server error' })
  } finally {
    if (connection) connection.release()
  }
})

// UPDATE task details
router.put('/:id', auth, allowRoles('lead'), async (req, res) => {
  const { title, description, assignee_id, qa_id, priority, estimated_hours, due_date } = req.body
  try {
    await db.query(
      `UPDATE tasks SET 
        title = ?, description = ?, assignee_id = ?, 
        qa_id = ?, priority = ?, estimated_hours = ?, due_date = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [title, description, assignee_id, qa_id, priority, estimated_hours, due_date || null, req.params.id]
    )
    res.json({ message: 'Task updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE task
router.delete('/:id', auth, allowRoles('lead'), async (req, res) => {
  let connection

  try {
    connection = await db.getConnection()
    await connection.beginTransaction()
    await connection.query('DELETE FROM notifications WHERE task_id = ?', [req.params.id])
    await connection.query('DELETE FROM task_attachments WHERE task_id = ?', [req.params.id])
    await connection.query('DELETE FROM task_comments WHERE task_id = ?', [req.params.id])
    await connection.query('DELETE FROM qa_reviews WHERE task_id = ?', [req.params.id])
    await connection.query('DELETE FROM time_logs WHERE task_id = ?', [req.params.id])
    await connection.query('DELETE FROM status_logs WHERE task_id = ?', [req.params.id])
    const [result] = await connection.query('DELETE FROM tasks WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Task not found' })
    }
    await connection.commit()
    res.json({ message: 'Task deleted' })
  } catch (err) {
    if (connection) await connection.rollback()
    res.status(500).json({ message: 'Server error' })
  } finally {
    if (connection) connection.release()
  }
})

// GET status logs for a task
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const [logs] = await db.query(
      `SELECT s.*, u.name as changed_by_name
       FROM status_logs s
       LEFT JOIN users u ON s.changed_by = u.id
       WHERE s.task_id = ?
       ORDER BY s.changed_at DESC`,
      [req.params.id]
    )
    res.json(logs)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
