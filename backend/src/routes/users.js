const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const db = require('../db')
const auth = require('../middleware/auth')
const allowRoles = require('../middleware/roles')

// GET all users (for dropdowns)
router.get('/', auth, async (req, res) => {
  try {
    const fields = req.user.role === 'lead'
      ? 'id, name, email, role'
      : 'id, name, role'
    const [users] = await db.query(
      `SELECT ${fields} FROM users ORDER BY name ASC`
    )
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', auth, allowRoles('lead'), async (req, res) => {
  const { name, email, password, role } = req.body
  const allowedRoles = ['developer', 'qa', 'lead']

  try {
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ message: 'Name, email, and an 8-character password are required' })
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, role]
    )
    res.status(201).json({ id: result.insertId, message: 'User created' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already registered' })
    }
    res.status(500).json({ message: 'Server error' })
  }
})

router.patch('/:id/password', auth, allowRoles('lead'), async (req, res) => {
  const { password } = req.body
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must contain at least 8 characters' })
  }
  const hash = await bcrypt.hash(password, 10)
  const [result] = await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.params.id])
  if (!result.affectedRows) return res.status(404).json({ message: 'User not found' })
  res.json({ message: 'Temporary password set' })
})

module.exports = router
