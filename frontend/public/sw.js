self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'TeamFlow', {
      body: data.body || 'You have a new notification',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { taskId: data.taskId, notificationId: data.notificationId },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const taskId = event.notification.data?.taskId
  const target = taskId ? `/tasks/${taskId}` : '/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients[0]
      if (existing) {
        existing.navigate(target)
        return existing.focus()
      }
      return self.clients.openWindow(target)
    })
  )
})
