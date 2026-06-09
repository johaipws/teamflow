const express = require('express')
const router = express.Router()
const db = require('../db')
const auth = require('../middleware/auth')
const jwt = require('jsonwebtoken')
const { publicKey } = require('../push')
const { emailConfigured, emailProvider } = require('../notificationDispatcher')

router.get('/', auth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT * FROM notifications
     WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  )
  res.json(rows)
})

router.patch('/:id/read', auth, async (req, res) => {
  await db.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  )
  res.json({ message: 'Notification read' })
})

router.patch('/read-all', auth, async (req, res) => {
  await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id])
  res.json({ message: 'Notifications read' })
})

router.get('/channels', auth, async (req, res) => {
  const [subscriptions] = await db.query(
    'SELECT COUNT(*) count FROM push_subscriptions WHERE user_id = ?',
    [req.user.id]
  )
  res.json({
    realtime: true,
    emailConfigured,
    emailProvider,
    pushConfigured: true,
    pushSubscribed: subscriptions[0].count > 0,
    vapidPublicKey: publicKey,
  })
})

router.post('/stream-token', auth, async (req, res) => {
  const token = jwt.sign(
    { id: req.user.id, role: req.user.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m', audience: 'notification-stream' }
  )
  res.json({ token })
})

router.post('/push-subscriptions', auth, async (req, res) => {
  const subscription = req.body.subscription
  if (!subscription?.endpoint) {
    return res.status(400).json({ message: 'Invalid push subscription' })
  }
  await db.query(
    'UPDATE notifications SET push_sent_at = COALESCE(push_sent_at, NOW()) WHERE user_id = ?',
    [req.user.id]
  )
  await db.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, subscription_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), subscription_json = VALUES(subscription_json)`,
    [req.user.id, subscription.endpoint, JSON.stringify(subscription)]
  )
  res.status(201).json({ message: 'Browser push enabled' })
})

router.delete('/push-subscriptions', auth, async (req, res) => {
  const { endpoint } = req.body
  await db.query(
    'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
    [req.user.id, endpoint]
  )
  res.json({ message: 'Browser push disabled' })
})

module.exports = router
