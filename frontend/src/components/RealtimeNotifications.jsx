import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api/axios'

function RealtimeNotifications() {
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let source
    let closeTimer
    let reconnectTimer
    let stopped = false

    async function connect() {
      const response = await API.get('/notifications')
      const latestId = response.data[0]?.id || 0
      const tokenResponse = await API.post('/notifications/stream-token')
      const token = tokenResponse.data.token
      const apiBase = import.meta.env.VITE_API_URL || '/api'
      const url = `${apiBase}/notifications/stream?token=${encodeURIComponent(token)}&after=${latestId}`
      source = new EventSource(url)
      source.addEventListener('notification', event => {
        const notification = JSON.parse(event.data)
        setToast(notification)
        clearTimeout(closeTimer)
        closeTimer = setTimeout(() => setToast(null), 7000)
      })
      source.onerror = () => {
        source.close()
        if (!stopped) reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect().catch(console.error)
    return () => {
      stopped = true
      source?.close()
      clearTimeout(closeTimer)
      clearTimeout(reconnectTimer)
    }
  }, [navigate])

  if (!toast) return null
  return (
    <button
      style={styles.toast}
      onClick={() => {
        if (toast.task_id) navigate(`/tasks/${toast.task_id}`)
        setToast(null)
      }}
    >
      <strong>TeamFlow</strong>
      <span>{toast.message}</span>
    </button>
  )
}

const styles = {
  toast: {
    position: 'fixed', right: '24px', bottom: '24px', zIndex: 2000,
    width: '340px', display: 'grid', gap: '6px', textAlign: 'left',
    padding: '16px', border: 0, borderRadius: '12px',
    background: '#1e1b4b', color: '#fff',
    boxShadow: '0 14px 35px rgba(0,0,0,0.25)', cursor: 'pointer',
  },
}

export default RealtimeNotifications
