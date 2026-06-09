const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')

// START timer for a task
router.post('/start/:taskId', auth, async (req, res) => {
  let connection

  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [tasks] = await connection.query(
      'SELECT status, assignee_id FROM tasks WHERE id = ? FOR UPDATE',
      [req.params.taskId]
    )
    if (tasks.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Task not found' })
    }
    if (req.user.role === 'developer' && tasks[0].assignee_id !== req.user.id) {
      await connection.rollback()
      return res.status(403).json({ message: 'This task is assigned to another developer' })
    }
    if (!['developer', 'lead'].includes(req.user.role)) {
      await connection.rollback()
      return res.status(403).json({ message: 'Only developers and leads can track task time' })
    }
    if (!['todo', 'in_progress', 'changes_requested'].includes(tasks[0].status)) {
      await connection.rollback()
      return res.status(409).json({ message: 'Time cannot be logged in the current task status' })
    }

    const [active] = await connection.query(
      'SELECT * FROM time_logs WHERE task_id = ? AND user_id = ? AND ended_at IS NULL',
      [req.params.taskId, req.user.id]
    )

    if (active.length > 0) {
      await connection.rollback()
      return res.status(400).json({ message: 'Timer already running for this task' })
    }

    await connection.query(
      'INSERT INTO time_logs (task_id, user_id, started_at) VALUES (?, ?, NOW())',
      [req.params.taskId, req.user.id]
    )

    if (tasks[0].status === 'todo') {
      await connection.query(
        'UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?',
        ['in_progress', req.params.taskId]
      )
      await connection.query(
        'INSERT INTO status_logs (task_id, changed_by, from_status, to_status) VALUES (?, ?, ?, ?)',
        [req.params.taskId, req.user.id, 'todo', 'in_progress']
      )
    }

    await connection.commit()
    res.json({ message: 'Timer started' })
  } catch (err) {
    if (connection) await connection.rollback()
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally {
    if (connection) connection.release()
  }
})

// STOP timer for a task
router.post('/stop/:taskId', auth, async (req, res) => {
  try {
    // Find active timer
    const [active] = await db.query(
      'SELECT * FROM time_logs WHERE task_id = ? AND user_id = ? AND ended_at IS NULL',
      [req.params.taskId, req.user.id]
    )

    if (active.length === 0) {
      return res.status(400).json({ message: 'No active timer found' })
    }

    const timer = active[0]
    const startedAt = new Date(timer.started_at)
    const endedAt = new Date()
    const durationMinutes = Math.round((endedAt - startedAt) / 60000)

    // Stop the timer
    await db.query(
      'UPDATE time_logs SET ended_at = NOW(), duration_minutes = ? WHERE id = ?',
      [durationMinutes, timer.id]
    )

    res.json({ message: 'Timer stopped', duration_minutes: durationMinutes })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET active timer for a task
router.get('/active/:taskId', auth, async (req, res) => {
  try {
    const [active] = await db.query(
      'SELECT * FROM time_logs WHERE task_id = ? AND user_id = ? AND ended_at IS NULL',
      [req.params.taskId, req.user.id]
    )
    res.json(active.length > 0 ? active[0] : null)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET all time logs for a task
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const [logs] = await db.query(
      `SELECT t.*, u.name as user_name 
       FROM time_logs t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.task_id = ?
       ORDER BY t.started_at DESC`,
      [req.params.taskId]
    )
    res.json(logs)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET total time per user (for KPI)
router.get('/summary', auth, async (req, res) => {
  try {
    const [summary] = await db.query(
      `SELECT 
        u.id, u.name, u.role,
        COUNT(DISTINCT t.task_id) as tasks_worked,
        SUM(t.duration_minutes) as total_minutes
       FROM time_logs t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.ended_at IS NOT NULL
       GROUP BY u.id, u.name, u.role
       ORDER BY total_minutes DESC`
    )
    res.json(summary)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
