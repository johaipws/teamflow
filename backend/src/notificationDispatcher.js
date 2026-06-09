const nodemailer = require('nodemailer')
const db = require('./db')
const { webpush } = require('./push')

function createTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

const mailer = createTransport()

async function deliverEmail(notification) {
  if (!mailer) return
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: notification.email,
    subject: 'TeamFlow notification',
    text: notification.message,
  })
  await db.query('UPDATE notifications SET email_sent_at = NOW() WHERE id = ?', [notification.id])
}

async function deliverPush(notification) {
  const [subscriptions] = await db.query(
    'SELECT id, subscription_json FROM push_subscriptions WHERE user_id = ?',
    [notification.user_id]
  )
  if (!subscriptions.length) return

  for (const item of subscriptions) {
    try {
      await webpush.sendNotification(
        JSON.parse(item.subscription_json),
        JSON.stringify({
          title: 'TeamFlow',
          body: notification.message,
          taskId: notification.task_id,
          notificationId: notification.id,
        })
      )
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db.query('DELETE FROM push_subscriptions WHERE id = ?', [item.id])
      } else {
        throw error
      }
    }
  }
  await db.query('UPDATE notifications SET push_sent_at = NOW() WHERE id = ?', [notification.id])
}

async function dispatch() {
  const [rows] = await db.query(
    `SELECT n.*, u.email
     FROM notifications n JOIN users u ON u.id = n.user_id
     WHERE n.created_at >= NOW() - INTERVAL 1 DAY
       AND (n.email_sent_at IS NULL OR n.push_sent_at IS NULL)
     ORDER BY n.id ASC LIMIT 50`
  )
  for (const notification of rows) {
    try {
      if (!notification.email_sent_at) await deliverEmail(notification)
      if (!notification.push_sent_at) await deliverPush(notification)
    } catch (error) {
      console.error(`Notification delivery ${notification.id} failed:`, error.message)
    }
  }
}

function startNotificationDispatcher() {
  const timer = setInterval(dispatch, 10000)
  dispatch()
  return timer
}

module.exports = { startNotificationDispatcher, emailConfigured: Boolean(mailer) }
