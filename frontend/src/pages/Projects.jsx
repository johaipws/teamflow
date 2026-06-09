import { useEffect, useState } from 'react'
import API from '../api/axios'

function Projects() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const response = await API.get('/projects')
      setProjects(response.data)
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Projects could not be loaded')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function createProject(event) {
    event.preventDefault()
    try {
      await API.post('/projects', form)
      setForm({ name: '', description: '' })
      refresh()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Project could not be created')
    }
  }

  async function deleteProject(id) {
    if (!window.confirm('Delete this project? Projects with tasks cannot be deleted.')) return
    try {
      await API.delete(`/projects/${id}`)
      refresh()
    } catch (error) {
      alert(error.response?.data?.message || 'Project could not be deleted')
    }
  }

  async function editProject(project) {
    const name = window.prompt('Project name:', project.name)
    if (!name) return
    const description = window.prompt('Project description:', project.description || '') ?? project.description
    await API.put(`/projects/${project.id}`, { name, description })
    refresh()
  }

  return (
    <div className="responsive-page" style={styles.page}>
      <h1 style={styles.heading}>Projects</h1>
      {error && <p style={styles.error}>{error}</p>}
      {user.role === 'lead' && (
        <form className="responsive-project-form" style={styles.form} onSubmit={createProject}>
          <input placeholder="Project name" value={form.name}
            onChange={event => setForm({ ...form, name: event.target.value })} required />
          <input placeholder="Description" value={form.description}
            onChange={event => setForm({ ...form, description: event.target.value })} />
          <button style={styles.button}>Create project</button>
        </form>
      )}
      <div className="responsive-card-grid" style={styles.grid}>
        {loading && <p>Loading projects...</p>}
        {!loading && !projects.length && <p>No projects yet.</p>}
        {projects.map(project => (
          <article style={styles.card} key={project.id}>
            <h2>{project.name}</h2>
            <p>{project.description || 'No description'}</p>
            <p>{project.task_count || 0} tasks, {project.done_count || 0} completed</p>
            <small>Created by {project.created_by_name}</small>
            {user.role === 'lead' && (
              <div style={styles.actions}>
                <button style={styles.editButton} onClick={() => editProject(project)}>Edit</button>
                <button style={styles.deleteButton} onClick={() => deleteProject(project.id)}>Delete</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { padding: '32px', minHeight: '100vh', background: '#f0f2f5' },
  heading: { color: '#1e1b4b' },
  form: { display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '10px', marginBottom: '24px' },
  button: { border: 0, borderRadius: '8px', padding: '10px 18px', background: '#4f46e5', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' },
  card: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px #0000000f' },
  actions: { display: 'flex', gap: '8px', marginTop: '14px' },
  editButton: { border: 0, color: '#4f46e5', background: '#eef2ff', padding: '8px', borderRadius: '6px' },
  deleteButton: { border: 0, color: '#dc2626', background: '#fee2e2', padding: '8px', borderRadius: '6px' },
  error: { color: '#dc2626', background: '#fee2e2', padding: '10px', borderRadius: '8px' },
}

export default Projects
