const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')
const auth = require('../middleware/auth')
const allowRoles = require('../middleware/roles')

// REGISTER
// POST /auth/register
router.post('/register', auth, allowRoles('lead'), async (req, res) => {
  const { name, email, password } = req.body

  try {
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ message: 'Name, email, and an 8-character password are required' })
    }
    // 2. Check if user already exists
    const [existing] = await db.query(
      'SELECT * FROM users WHERE email = ?', [email]
    )
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // 3. Hash the password (never store plain text)
    const hashedPassword = await bcrypt.hash(password, 10)

    // 4. Save user to database
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, 'developer']
    )

    res.status(201).json({ message: 'User registered successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// LOGIN
// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    // 1. Find user by email
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?', [email]
    )
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const user = users[0]

    // 2. Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    // 3. Create JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // 4. Send token + user info back
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must contain at least 8 characters' })
  }
  const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id])
  if (!users.length || !await bcrypt.compare(currentPassword || '', users[0].password)) {
    return res.status(400).json({ message: 'Current password is incorrect' })
  }
  const hash = await bcrypt.hash(newPassword, 10)
  await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id])
  res.json({ message: 'Password updated' })
})

module.exports = router
