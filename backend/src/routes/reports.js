const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')

router.get('/kpi', auth, async (req, res) => {
  const taskFilter = req.user.role === 'developer'
    ? 'WHERE t.assignee_id = ?'
    : req.user.role === 'qa'
      ? 'WHERE t.qa_id = ?'
      : ''
  const taskParams = req.user.role === 'lead' ? [] : [req.user.id]
  const userFilter = req.user.role === 'lead' ? '' : 'WHERE u.id = ?'
  const userParams = req.user.role === 'lead' ? [] : [req.user.id]

  const [statusRows] = await db.query(
    `SELECT t.status, COUNT(*) count FROM tasks t ${taskFilter} GROUP BY t.status`,
    taskParams
  )
  const [timeRows] = await db.query(
    `SELECT u.id, u.name, u.role, COALESCE(SUM(t.duration_minutes), 0) total_minutes,
      COUNT(DISTINCT t.task_id) tasks_worked
     FROM users u LEFT JOIN time_logs t ON t.user_id = u.id AND t.ended_at IS NOT NULL
     ${userFilter}
     GROUP BY u.id, u.name, u.role ORDER BY total_minutes DESC`,
    userParams
  )
  const [projectRows] = await db.query(
    `SELECT p.id, p.name, COUNT(t.id) total_tasks,
      SUM(t.status = 'done') done_tasks,
      SUM(t.due_date < CURDATE() AND t.status <> 'done') overdue_tasks
     FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
     ${taskFilter}
     GROUP BY p.id, p.name ORDER BY total_tasks DESC`
    , taskParams
  )
  const [summaryRows] = await db.query(
    `SELECT COUNT(*) total,
      SUM(status = 'done') completed,
      SUM(due_date < CURDATE() AND status <> 'done') overdue,
      ROUND(AVG(estimated_hours), 2) average_estimate
     FROM tasks t ${taskFilter}`,
    taskParams
  )
  res.json({ summary: summaryRows[0], byStatus: statusRows, byUser: timeRows, byProject: projectRows })
})

module.exports = router
