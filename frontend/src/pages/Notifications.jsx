import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api/axios'
import { connectNotificationStream } from '../api/notificationStream'

function Notifications() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState(null)
  const latestIdRef = useRef(0)
  const navigate = useNavigate()
  async function refresh() {
    try {
      const response = await API.get('/notifications')
      setItems(response.data)
      latestIdRef.current = response.data[0]?.id || 0
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Notifications could not be loaded')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { refresh() }, [])

  useEffect(() => {
    let source
    let reconnectTimer
    let stopped = false

    async function connect() {
      source = await connectNotificationStream({
        after: latestIdRef.current,
        onNotification: notification => {
          latestIdRef.current = Math.max(latestIdRef.current, notification.id)
          setItems(current => {
            if (current.some(item => item.id === notification.id)) return current
            return [notification, ...current]
          })
        },
        onError: () => {
          source?.close()
          if (!stopped) reconnectTimer = setTimeout(connect, 3000)
        },
      })
    }

    if (!loading) connect().catch(() => setError('Real-time notification updates disconnected'))
    return () => {
      stopped = true
      source?.close()
      clearTimeout(reconnectTimer)
    }
  }, [loading])

  useEffect(() => {
    API.get('/notifications/channels').then(response => setChannels(response.data))
  }, [])

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Browser push is not supported in this browser')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setError('Notification permission was not granted')
      return
    }
    const registration = await navigator.serviceWorker.register('/sw.js')
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(channels.vapidPublicKey),
    })
    await API.post('/notifications/push-subscriptions', { subscription })
    const response = await API.get('/notifications/channels')
    setChannels(response.data)
  }

  async function disablePush() {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await API.delete('/notifications/push-subscriptions', {
        data: { endpoint: subscription.endpoint },
      })
      await subscription.unsubscribe()
    }
    const response = await API.get('/notifications/channels')
    setChannels(response.data)
  }
  async function open(item) {
    await API.patch(`/notifications/${item.id}/read`)
    setItems(current => current.map(entry => (
      entry.id === item.id ? { ...entry, is_read: 1 } : entry
    )))
    if (item.task_id) navigate(`/tasks/${item.task_id}`)
  }
  async function readAll() {
    await API.patch('/notifications/read-all')
    setItems(current => current.map(item => ({ ...item, is_read: 1 })))
  }
  return (
    <div className="responsive-page" style={styles.page}>
      <div className="page-header"><h1>Notifications</h1><button onClick={readAll}>Mark all read</button></div>
      {channels && (
        <div className="notification-channels" style={styles.channels}>
          <span>Real-time popups: On</span>
          <span>Email: {channels.emailConfigured ? 'On' : 'Needs SMTP setup'}</span>
          <span>Browser push: {channels.pushSubscribed ? 'On' : 'Off'}</span>
          <button onClick={channels.pushSubscribed ? disablePush : enablePush}>
            {channels.pushSubscribed ? 'Disable browser push' : 'Enable browser push'}
          </button>
        </div>
      )}
      {error && <p style={styles.error}>{error}</p>}
      {loading && <p>Loading notifications...</p>}
      {!loading && !error && !items.length && <p>You have no notifications yet.</p>}
      {items.map(item => (
        <button key={item.id} style={{ ...styles.item, opacity: item.is_read ? 0.65 : 1 }} onClick={() => open(item)}>
          <strong>{item.message}</strong>
          <small>{new Date(item.created_at).toLocaleString()}</small>
        </button>
      ))}
    </div>
  )
}
const styles = {
  page: { padding: '32px', minHeight: '100vh', background: '#f0f2f5' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  item: { display: 'grid', width: '100%', textAlign: 'left', gap: '6px', background: '#fff', border: 0, borderRadius: '10px', padding: '16px', marginBottom: '10px' },
  error: { color: '#dc2626', background: '#fee2e2', padding: '12px', borderRadius: '8px' },
  channels: {
    display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
    background: '#fff', padding: '14px', borderRadius: '10px', marginBottom: '16px',
  },
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)))
}

export default Notifications
