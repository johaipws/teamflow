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

const emailJsConfigured = Boolean(
  process.env.EMAILJS_SERVICE_ID &&
  process.env.EMAILJS_TEMPLATE_ID &&
  process.env.EMAILJS_PUBLIC_KEY
)

const emailProvider = emailJsConfigured
  ? 'emailjs'
  : mailer
    ? 'smtp'
    : null

async function sendWithEmailJs(notification) {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY || undefined,
      template_params: {
        to_email: notification.email,
        to_name: notification.name,
        message: notification.message,
        notification_type: notification.type,
        task_id: notification.task_id || '',
        app_url: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      },
    }),
  })
  if (!response.ok) {
    throw new Error(`EmailJS ${response.status}: ${await response.text()}`)
  }
}

async function sendWithSmtp(notification) {
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: notification.email,
    subject: 'TeamFlow notification',
    text: notification.message,
  })
}

async function deliverEmail(notification) {
  if (!emailProvider) return
  if (emailProvider === 'emailjs') await sendWithEmailJs(notification)
  else await sendWithSmtp(notification)
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
    `SELECT n.*, u.email, u.name
     FROM notifications n JOIN users u ON u.id = n.user_id
     WHERE n.created_at >= NOW() - INTERVAL 1 DAY
       AND (n.email_sent_at IS NULL OR n.push_sent_at IS NULL)
     ORDER BY n.id ASC LIMIT 50`
  )
  for (const notification of rows) {
    try {
      if (!notification.email_sent_at) await deliverEmail(notification)
      if (!notification.push_sent_at) await deliverPush(notification)
      if (emailProvider === 'emailjs') {
        await new Promise(resolve => setTimeout(resolve, 1100))
      }
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

module.exports = {
  startNotificationDispatcher,
  emailConfigured: Boolean(emailProvider),
  emailProvider,
}
