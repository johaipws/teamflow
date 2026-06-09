const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')
const allowRoles = require('../middleware/roles')

// GET all projects
router.get('/', auth, async (req, res) => {
  try {
    const [projects] = await db.query(
      `SELECT p.*, u.name as created_by_name,
        COUNT(t.id) AS task_count,
        SUM(t.status = 'done') AS done_count
       FROM projects p 
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN tasks t ON t.project_id = p.id
       GROUP BY p.id, u.name
       ORDER BY p.created_at DESC`
    )
    res.json(projects)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// CREATE project
router.post('/', auth, allowRoles('lead'), async (req, res) => {
  const { name, description } = req.body
  try {
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Project name is required' })
    }
    const [result] = await db.query(
      'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, req.user.id]
    )
    res.status(201).json({ message: 'Project created', id: result.insertId })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE project
router.delete('/:id', auth, allowRoles('lead'), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM projects WHERE id = ?', [req.params.id])
    if (!result.affectedRows) return res.status(404).json({ message: 'Project not found' })
    res.json({ message: 'Project deleted' })
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'Delete or move the project tasks first' })
    }
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/:id', auth, allowRoles('lead'), async (req, res) => {
  const { name, description } = req.body
  if (!name?.trim()) return res.status(400).json({ message: 'Project name is required' })
  const [result] = await db.query(
    'UPDATE projects SET name = ?, description = ? WHERE id = ?',
    [name.trim(), description || null, req.params.id]
  )
  if (!result.affectedRows) return res.status(404).json({ message: 'Project not found' })
  res.json({ message: 'Project updated' })
})

module.exports = router
