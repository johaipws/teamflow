const jwt = require('jsonwebtoken')
const db = require('./db')

function streamNotifications(req, res) {
  let user
  try {
    user = jwt.verify(req.query.token, process.env.JWT_SECRET, {
      audience: 'notification-stream',
    })
  } catch {
    return res.status(401).end()
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  let lastId = Number(req.headers['last-event-id'] || req.query.after || 0)
  let running = false

  const poll = async () => {
    if (running) return
    running = true
    try {
      const [rows] = await db.query(
        `SELECT * FROM notifications
         WHERE user_id = ? AND id > ?
         ORDER BY id ASC`,
        [user.id, lastId]
      )
      for (const notification of rows) {
        lastId = notification.id
        res.write(`id: ${notification.id}\n`)
        res.write(`event: notification\n`)
        res.write(`data: ${JSON.stringify(notification)}\n\n`)
      }
      res.write(': keep-alive\n\n')
    } catch (error) {
      console.error('Notification stream error:', error.message)
    } finally {
      running = false
    }
  }

  const interval = setInterval(poll, 3000)
  poll()
  req.on('close', () => clearInterval(interval))
}

module.exports = streamNotifications
