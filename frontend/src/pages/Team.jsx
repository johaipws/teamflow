import { useEffect, useState } from 'react'
import API from '../api/axios'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'developer',
}

function Team() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchUsers() {
    try {
      const response = await API.get('/users')
      setUsers(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load team')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await API.post('/users', form)
      setForm(emptyForm)
      await fetchUsers()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  async function resetPassword(user) {
    const password = window.prompt(`Temporary password for ${user.name} (minimum 8 characters):`)
    if (!password) return
    try {
      const response = await API.patch(`/users/${user.id}/password`, { password })
      setError(response.data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Password reset failed')
    }
  }

  return (
    <div className="responsive-page" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Team</h1>
          <p style={styles.subtitle}>Create accounts and assign application roles.</p>
        </div>
      </div>

      <div className="team-layout" style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Add team member</h2>
          {error && <p style={styles.error}>{error}</p>}
          <form onSubmit={handleSubmit}>
            <label style={styles.label}>
              Name
              <input
                style={styles.input}
                value={form.name}
                onChange={event => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label style={styles.label}>
              Email
              <input
                style={styles.input}
                type="email"
                value={form.email}
                onChange={event => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
            <label style={styles.label}>
              Temporary password
              <input
                style={styles.input}
                type="password"
                minLength={8}
                value={form.password}
                onChange={event => setForm({ ...form, password: event.target.value })}
                required
              />
            </label>
            <label style={styles.label}>
              Role
              <select
                style={styles.input}
                value={form.role}
                onChange={event => setForm({ ...form, role: event.target.value })}
              >
                <option value="developer">Developer</option>
                <option value="qa">QA</option>
                <option value="lead">Lead</option>
              </select>
            </label>
            <button style={styles.button} type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create account'}
            </button>
          </form>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Members</h2>
          {users.map(user => (
            <div className="team-member-row" style={styles.member} key={user.id}>
              <div>
                <p style={styles.memberName}>{user.name}</p>
                <p style={styles.memberEmail}>{user.email}</p>
              </div>
              <span style={styles.role}>{user.role}</span>
              <button style={styles.resetButton} onClick={() => resetPassword(user)}>
                Reset password
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '32px', minHeight: '100vh', background: '#f0f2f5' },
  header: { marginBottom: '24px' },
  title: { margin: 0, color: '#1e1b4b', fontSize: '24px' },
  subtitle: { color: '#666', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px' },
  card: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  sectionTitle: { marginTop: 0, color: '#1e1b4b', fontSize: '18px' },
  label: { display: 'block', color: '#444', fontSize: '13px', marginBottom: '14px' },
  input: {
    display: 'block', width: '100%', boxSizing: 'border-box',
    marginTop: '6px', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: '8px',
  },
  button: {
    width: '100%', padding: '11px', border: 0, borderRadius: '8px',
    background: '#4f46e5', color: '#fff', fontWeight: '600', cursor: 'pointer',
  },
  error: { color: '#dc2626', fontSize: '13px' },
  member: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid #eee',
  },
  memberName: { margin: 0, color: '#1e1b4b', fontWeight: '600' },
  memberEmail: { margin: '3px 0 0', color: '#777', fontSize: '12px' },
  role: {
    background: '#eef2ff', color: '#4f46e5', padding: '4px 10px',
    borderRadius: '20px', fontSize: '11px', textTransform: 'uppercase',
  },
  resetButton: {
    border: 0, borderRadius: '6px', padding: '6px 8px',
    background: '#eef2ff', color: '#4f46e5', cursor: 'pointer',
  },
}

export default Team
