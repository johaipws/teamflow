import { useState, useEffect } from 'react'
import API from '../api/axios'

function CreateTaskModal({ onClose, onTaskCreated }) {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const isLead = currentUser.role === 'lead'
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [newProject, setNewProject] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [form, setForm] = useState({
    project_id: '',
    title: '',
    description: '',
    assignee_id: '',
    qa_id: '',
    priority: 'medium',
    estimated_hours: '',
    due_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProjects()
    fetchUsers()
  }, [])

  const fetchProjects = async () => {
    const res = await API.get('/projects')
    setProjects(res.data)
  }

  const fetchUsers = async () => {
    const res = await API.get('/users')
    setUsers(res.data)
  }

  const handleCreateProject = async () => {
    if (!newProject.trim()) return
    try {
      const res = await API.post('/projects', { name: newProject })
      await fetchProjects()
      setForm({ ...form, project_id: res.data.id })
      setShowNewProject(false)
      setNewProject('')
    } catch {
      setError('Failed to create project')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await API.post('/tasks', {
        ...form,
        assignee_id: isLead ? form.assignee_id : currentUser.id
      })
      onTaskCreated()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task')
    }
    setLoading(false)
  }

  const developers = users.filter(u => u.role === 'developer')
  const qas = users.filter(u => u.role === 'qa' || u.role === 'lead')

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Create New Task</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div style={styles.field}>
            <label style={styles.label}>Task Title *</label>
            <input
              style={styles.input}
              placeholder="e.g. Build login page"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              style={{ ...styles.input, height: '80px', resize: 'vertical' }}
              placeholder="Task details..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Project */}
          <div style={styles.field}>
            <label style={styles.label}>Project *</label>
            <div style={styles.row}>
              <select
                style={{ ...styles.input, flex: 1 }}
                value={form.project_id}
                onChange={e => setForm({ ...form, project_id: e.target.value })}
                required
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {isLead && (
                <button
                  type="button"
                  style={styles.newBtn}
                  onClick={() => setShowNewProject(!showNewProject)}
                >
                  + New
                </button>
              )}
            </div>
            {showNewProject && (
              <div style={{ ...styles.row, marginTop: '8px' }}>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="New project name..."
                  value={newProject}
                  onChange={e => setNewProject(e.target.value)}
                />
                <button
                  type="button"
                  style={styles.newBtn}
                  onClick={handleCreateProject}
                >
                  Create
                </button>
              </div>
            )}
          </div>

          {/* Two columns */}
          <div style={styles.grid}>
            {/* Assign To */}
            <div style={styles.field}>
              <label style={styles.label}>Assign To</label>
              {isLead ? (
                <select
                  style={styles.input}
                  value={form.assignee_id}
                  onChange={e => setForm({ ...form, assignee_id: e.target.value })}
                >
                  <option value="">Select developer...</option>
                  {developers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <input style={styles.input} value={currentUser.name || 'Current developer'} disabled />
              )}
            </div>

            {/* QA */}
            <div style={styles.field}>
              <label style={styles.label}>Assign QA</label>
              <select
                style={styles.input}
                value={form.qa_id}
                onChange={e => setForm({ ...form, qa_id: e.target.value })}
              >
                <option value="">Select QA...</option>
                {qas.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div style={styles.field}>
              <label style={styles.label}>Priority</label>
              <select
                style={styles.input}
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Estimated Hours */}
            <div style={styles.field}>
              <label style={styles.label}>Estimated Hours</label>
              <input
                style={styles.input}
                type="number"
                placeholder="e.g. 4"
                value={form.estimated_hours}
                onChange={e => setForm({ ...form, estimated_hours: e.target.value })}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Due Date</label>
              <input
                style={styles.input}
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#fff', borderRadius: '12px',
    padding: '32px', width: '100%', maxWidth: '560px',
    maxHeight: '90vh', overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '24px'
  },
  modalTitle: { fontSize: '20px', fontWeight: '700', color: '#1e1b4b' },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: '18px', cursor: 'pointer', color: '#666'
  },
  field: { marginBottom: '16px' },
  label: {
    display: 'block', marginBottom: '6px',
    fontWeight: '500', fontSize: '13px', color: '#444'
  },
  input: {
    width: '100%', padding: '10px 12px',
    borderRadius: '8px', border: '1px solid #ddd',
    fontSize: '14px', outline: 'none',
    boxSizing: 'border-box'
  },
  row: { display: 'flex', gap: '8px', alignItems: 'center' },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px'
  },
  newBtn: {
    padding: '10px 14px', background: '#4f46e5',
    color: '#fff', border: 'none', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
  },
  submitBtn: {
    width: '100%', padding: '12px',
    background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: '8px',
    fontSize: '16px', fontWeight: '600',
    cursor: 'pointer', marginTop: '8px'
  },
  error: { color: 'red', marginBottom: '12px', fontSize: '14px' }
}

export default CreateTaskModal
