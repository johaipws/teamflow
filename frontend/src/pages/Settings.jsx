import { useState } from 'react'
import API from '../api/axios'

function Settings() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  async function submit(event) {
    event.preventDefault()
    try {
      const response = await API.post('/auth/change-password', form)
      setMessage(response.data.message)
      setIsError(false)
      setForm({ currentPassword: '', newPassword: '' })
    } catch (error) {
      setMessage(error.response?.data?.message || 'Password update failed')
      setIsError(true)
    }
  }
  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={submit}>
        <h1>Settings</h1>
        <h2>Change password</h2>
        <p>Use your current login password, then choose a new password of at least 8 characters.</p>
        {message && <p style={{ color: isError ? '#dc2626' : '#16a34a' }}>{message}</p>}
        <input type="password" placeholder="Current password" value={form.currentPassword}
          onChange={event => setForm({ ...form, currentPassword: event.target.value })} required />
        <input type="password" minLength={8} placeholder="New password" value={form.newPassword}
          onChange={event => setForm({ ...form, newPassword: event.target.value })} required />
        <button style={styles.button}>Update password</button>
      </form>
    </div>
  )
}
const styles = {
  page: { padding: '32px', minHeight: '100vh', background: '#f0f2f5' },
  card: { display: 'grid', gap: '14px', maxWidth: '460px', background: '#fff', borderRadius: '12px', padding: '24px' },
  button: { border: 0, padding: '11px', borderRadius: '8px', background: '#4f46e5', color: '#fff' },
}
export default Settings
