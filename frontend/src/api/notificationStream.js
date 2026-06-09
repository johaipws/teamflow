import API from './axios'

export async function connectNotificationStream({ after = 0, onNotification, onError }) {
  const tokenResponse = await API.post('/notifications/stream-token')
  const apiBase = import.meta.env.VITE_API_URL || '/api'
  const url = `${apiBase}/notifications/stream?token=${encodeURIComponent(tokenResponse.data.token)}&after=${after}`
  const source = new EventSource(url)

  source.addEventListener('notification', event => {
    onNotification(JSON.parse(event.data))
  })
  source.onerror = onError

  return source
}
