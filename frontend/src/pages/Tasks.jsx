import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api/axios'
import CreateTaskModal from '../components/CreateTaskModal'

const STATUS_COLORS = {
  todo: { bg: '#f1f5f9', color: '#64748b', label: 'To Do' },
  in_progress: { bg: '#dbeafe', color: '#1d4ed8', label: 'In Progress' },
  ready_for_qa: { bg: '#fef9c3', color: '#a16207', label: 'Ready for QA' },
  in_qa: { bg: '#f3e8ff', color: '#7e22ce', label: 'In QA' },
  changes_requested: { bg: '#fee2e2', color: '#dc2626', label: 'Changes Requested' },
  done: { bg: '#dcfce7', color: '#16a34a', label: 'Done' }
}

const PRIORITY_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7c3aed'
}

const ALLOWED_TRANSITIONS = {
  developer: {
    todo: ['in_progress'],
    in_progress: ['ready_for_qa'],
    changes_requested: ['in_progress']
  },
  qa: {
    ready_for_qa: ['in_qa'],
    in_qa: ['ready_for_qa']
  },
  lead: {
    todo: ['in_progress'],
    in_progress: ['ready_for_qa'],
    ready_for_qa: ['in_qa'],
    in_qa: ['changes_requested', 'done'],
    changes_requested: ['in_progress'],
    done: ['in_progress']
  }
}

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchTasks()
    fetchProjects()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await API.get('/tasks')
      setTasks(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const fetchProjects = async () => {
    const res = await API.get('/projects')
    setProjects(res.data)
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await API.patch(`/tasks/${taskId}/status`, { status: newStatus })
      fetchTasks()
    } catch (err) {
      alert(err.response?.data?.message || 'Status change not allowed')
    }
  }

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return
    await API.delete(`/tasks/${taskId}`)
    fetchTasks()
  }

  const filtered = tasks.filter(t => {
    if (filterProject && t.project_id != filterProject) return false
    if (filterStatus && t.status !== filterStatus) return false
    return true
  })

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Tasks</h1>
          <p style={styles.subtitle}>{tasks.length} total tasks</p>
        </div>
        {(user.role === 'lead' || user.role === 'developer') && (
          <button style={styles.createBtn} onClick={() => setShowModal(true)}>
            + Create Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          style={styles.filter}
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          style={styles.filter}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Tasks List */}
      {loading ? (
        <p style={styles.empty}>Loading tasks...</p>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyBox}>
          <p style={styles.emptyText}>No tasks found.</p>
          {(user.role === 'lead' || user.role === 'developer') && (
            <button style={styles.createBtn} onClick={() => setShowModal(true)}>
              + Create your first task
            </button>
          )}
        </div>
      ) : (
        <div style={styles.taskList}>
          {filtered.map(task => {
            const nextStatuses = ALLOWED_TRANSITIONS[user.role]?.[task.status] || []
            return (
              <div key={task.id} style={styles.taskCard}>
                {/* Top row */}
                <div style={styles.taskTop}>
                  <div style={styles.taskLeft}>
                    <span style={{
                      ...styles.priorityDot,
                      background: PRIORITY_COLORS[task.priority]
                    }} title={task.priority} />
                    <div>
                      <p
                        style={{ ...styles.taskTitle, cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        {task.title}
                      </p>
                      <p style={styles.taskProject}>📁 {task.project_name || 'No Project'}</p>
                    </div>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    background: STATUS_COLORS[task.status]?.bg,
                    color: STATUS_COLORS[task.status]?.color
                  }}>
                    {STATUS_COLORS[task.status]?.label}
                  </span>
                </div>

                {/* Description */}
                {task.description && (
                  <p style={styles.taskDesc}>{task.description}</p>
                )}

                {/* Bottom row */}
                <div style={styles.taskBottom}>
                  <div style={styles.taskMeta}>
                    {task.assignee_name && (
                      <span style={styles.metaItem}>👤 {task.assignee_name}</span>
                    )}
                    {task.qa_name && (
                      <span style={styles.metaItem}>🔍 {task.qa_name}</span>
                    )}
                    {task.estimated_hours && (
                      <span style={styles.metaItem}>⏱ {task.estimated_hours}h</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={styles.actions}>
                    {nextStatuses.length > 0 && (
                      <select
                        style={styles.statusSelect}
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                      >
                        <option value={task.status}>{STATUS_COLORS[task.status]?.label}</option>
                        {nextStatuses.map(s => (
                          <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
                        ))}
                      </select>
                    )}
                    <button
                      style={styles.deleteBtn}
                      hidden={user.role !== 'lead'}
                      onClick={() => handleDelete(task.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (user.role === 'lead' || user.role === 'developer') && (
        <CreateTaskModal
          onClose={() => setShowModal(false)}
          onTaskCreated={fetchTasks}
        />
      )}
    </div>
  )
}

const styles = {
  container: { padding: '32px', background: '#f0f2f5', minHeight: '100vh' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '24px'
  },
  title: { fontSize: '24px', fontWeight: '700', color: '#1e1b4b' },
  subtitle: { color: '#666', fontSize: '14px', marginTop: '4px' },
  createBtn: {
    background: '#4f46e5', color: '#fff',
    border: 'none', padding: '10px 20px',
    borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: '600'
  },
  filters: { display: 'flex', gap: '12px', marginBottom: '24px' },
  filter: {
    padding: '8px 12px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '14px',
    background: '#fff', cursor: 'pointer'
  },
  taskList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  taskCard: {
    background: '#fff', borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  taskTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '8px'
  },
  taskLeft: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  priorityDot: {
    width: '10px', height: '10px',
    borderRadius: '50%', marginTop: '5px', flexShrink: 0
  },
  taskTitle: { fontSize: '15px', fontWeight: '600', color: '#1e1b4b' },
  taskProject: { fontSize: '12px', color: '#888', marginTop: '2px' },
  statusBadge: {
    padding: '4px 10px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap'
  },
  taskDesc: {
    fontSize: '13px', color: '#666',
    marginBottom: '12px', paddingLeft: '22px'
  },
  taskBottom: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginTop: '8px'
  },
  taskMeta: { display: 'flex', gap: '16px' },
  metaItem: { fontSize: '12px', color: '#666' },
  actions: { display: 'flex', gap: '8px', alignItems: 'center' },
  statusSelect: {
    padding: '6px 10px', borderRadius: '6px',
    border: '1px solid #ddd', fontSize: '12px',
    cursor: 'pointer', background: '#f8f9fa'
  },
  deleteBtn: {
    background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '16px'
  },
  empty: { color: '#999', textAlign: 'center', marginTop: '40px' },
  emptyBox: {
    textAlign: 'center', padding: '60px',
    background: '#fff', borderRadius: '12px'
  },
  emptyText: { color: '#999', marginBottom: '16px', fontSize: '16px' }
}

export default Tasks
