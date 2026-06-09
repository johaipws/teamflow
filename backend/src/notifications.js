async function notify(connection, userId, taskId, message, type = 'info') {
  if (!userId) return
  await connection.query(
    'INSERT INTO notifications (user_id, task_id, message, type) VALUES (?, ?, ?, ?)',
    [userId, taskId || null, message, type]
  )
}

module.exports = notify
