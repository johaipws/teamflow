import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import API from '../api/axios'
import TaskTimer from '../components/TaskTimer'
import TaskCollaboration from '../components/TaskCollaboration'

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

function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [statusLogs, setStatusLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [timerRunning, setTimerRunning] = useState(false)

  const fetchTask = useCallback(async () => {
    try {
      const res = await API.get('/tasks')
      const found = res.data.find(t => t.id == id)
      setTask(found)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [id])

  const fetchStatusLogs = useCallback(async () => {
    try {
      const res = await API.get(`/tasks/${id}/logs`)
      setStatusLogs(res.data)
    } catch (err) {
      console.error(err)
    }
  }, [id])

  useEffect(() => {
    fetchTask()
    fetchStatusLogs()
  }, [fetchStatusLogs, fetchTask])

  const handleStatusChange = async (newStatus) => {
    try {
      await API.patch(`/tasks/${id}/status`, { status: newStatus })
      fetchTask()
      fetchStatusLogs()
    } catch (err) {
      alert(err.response?.data?.message || 'Status change not allowed')
    }
  }

  if (loading) return <div style={styles.container}><p>Loading...</p></div>
  if (!task) return <div style={styles.container}><p>Task not found.</p></div>

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const nextStatuses = ALLOWED_TRANSITIONS[user.role]?.[task.status] || []

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button style={styles.backBtn} onClick={() => navigate('/tasks')}>
        ← Back to Tasks
      </button>

      <div style={styles.layout}>
        {/* Left - Task Details */}
        <div style={styles.main}>
          <div style={styles.taskHeader}>
            <div>
              <h1 style={styles.taskTitle}>{task.title}</h1>
              <p style={styles.taskProject}>📁 {task.project_name}</p>
            </div>
            <span style={{
              ...styles.priorityBadge,
              background: PRIORITY_COLORS[task.priority] + '20',
              color: PRIORITY_COLORS[task.priority]
            }}>
              {task.priority?.toUpperCase()}
            </span>
          </div>

          {task.description && (
            <div style={styles.section}>
              <p style={styles.sectionLabel}>Description</p>
              <p style={styles.descText}>{task.description}</p>
            </div>
          )}

          {/* Meta Info */}
          <div style={styles.metaGrid}>
            <div style={styles.metaBox}>
              <p style={styles.metaLabel}>Assigned To</p>
              <p style={styles.metaValue}>👤 {task.assignee_name || 'Unassigned'}</p>
            </div>
            <div style={styles.metaBox}>
              <p style={styles.metaLabel}>QA</p>
              <p style={styles.metaValue}>🔍 {task.qa_name || 'Unassigned'}</p>
            </div>
            <div style={styles.metaBox}>
              <p style={styles.metaLabel}>Estimated</p>
              <p style={styles.metaValue}>⏱ {task.estimated_hours || '-'}h</p>
            </div>
            <div style={styles.metaBox}>
              <p style={styles.metaLabel}>Created</p>
              <p style={styles.metaValue}>{new Date(task.created_at).toLocaleDateString()}</p>
            </div>
            <div style={styles.metaBox}>
              <p style={styles.metaLabel}>Due Date</p>
              <p style={{
                ...styles.metaValue,
                color: task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()
                  ? '#dc2626'
                  : '#333'
              }}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
              </p>
            </div>
          </div>

          {/* Status Change */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Status</p>
            <div style={styles.statusRow}>
              <span style={{
                ...styles.statusBadge,
                background: STATUS_COLORS[task.status]?.bg,
                color: STATUS_COLORS[task.status]?.color
              }}>
                {STATUS_COLORS[task.status]?.label}
              </span>
              {nextStatuses.length > 0 && (
                <select
                  style={{
                    ...styles.statusSelect,
                    opacity: timerRunning ? 0.4 : 1,
                    cursor: timerRunning ? 'not-allowed' : 'pointer'
                  }}
                  value={task.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={timerRunning}
                >
                  <option value={task.status}>{STATUS_COLORS[task.status]?.label}</option>
                  {nextStatuses.map(s => (
                    <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
                  ))}
                </select>
              )}
            </div>
            {timerRunning && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                ⏱ Stop the timer to change status
              </p>
            )}
          </div>

          {/* Timer */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Time Tracking</p>
            <TaskTimer
              taskId={id}
              onTimerUpdate={fetchTask}
              onRunningChange={setTimerRunning}
            />
          </div>
          <div style={styles.section}>
            <TaskCollaboration taskId={id} />
          </div>
        </div>

        {/* Right - Status History */}
        <div style={styles.sidebar}>
          <p style={styles.sectionLabel}>Status History</p>
          {statusLogs.length === 0 ? (
            <p style={styles.empty}>No history yet</p>
          ) : (
            <div style={styles.timeline}>
              {statusLogs.map((log, index) => (
                <div key={log.id} style={styles.timelineItem}>
                  <div style={styles.timelineDot} />
                  {index < statusLogs.length - 1 && <div style={styles.timelineLine} />}
                  <div style={styles.timelineContent}>
                    <p style={styles.timelineStatus}>
                      {log.from_status
                        ? `${STATUS_COLORS[log.from_status]?.label} → ${STATUS_COLORS[log.to_status]?.label}`
                        : `Created as ${STATUS_COLORS[log.to_status]?.label}`
                      }
                    </p>
                    <p style={styles.timelineDate}>
                      {new Date(log.changed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '32px', background: '#f0f2f5', minHeight: '100vh' },
  backBtn: {
    background: 'none', border: 'none',
    color: '#4f46e5', cursor: 'pointer',
    fontSize: '14px', fontWeight: '500',
    marginBottom: '24px', padding: '0'
  },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  main: {
    flex: 1, background: '#fff',
    borderRadius: '12px', padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  taskHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '20px'
  },
  taskTitle: { fontSize: '22px', fontWeight: '700', color: '#1e1b4b', marginBottom: '4px' },
  taskProject: { color: '#888', fontSize: '13px' },
  priorityBadge: {
    padding: '4px 12px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '700'
  },
  section: {
    borderTop: '1px solid #f0f2f5',
    paddingTop: '16px', marginTop: '16px'
  },
  sectionLabel: {
    fontSize: '12px', fontWeight: '700',
    color: '#888', textTransform: 'uppercase',
    marginBottom: '10px'
  },
  descText: { fontSize: '14px', color: '#444', lineHeight: '1.6' },
  metaGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '12px', marginTop: '16px'
  },
  metaBox: {
    background: '#f8f9fa', borderRadius: '8px', padding: '12px'
  },
  metaLabel: { fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' },
  metaValue: { fontSize: '14px', fontWeight: '500', color: '#333' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  statusBadge: {
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '13px', fontWeight: '600'
  },
  statusSelect: {
    padding: '6px 10px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '13px',
    background: '#f8f9fa'
  },
  sidebar: {
    width: '280px', background: '#fff',
    borderRadius: '12px', padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  timeline: { position: 'relative' },
  timelineItem: {
    display: 'flex', gap: '12px',
    position: 'relative', marginBottom: '16px'
  },
  timelineDot: {
    width: '10px', height: '10px',
    borderRadius: '50%', background: '#4f46e5',
    flexShrink: 0, marginTop: '4px'
  },
  timelineLine: {
    position: 'absolute', left: '4px',
    top: '14px', bottom: '-16px',
    width: '2px', background: '#e5e7eb'
  },
  timelineContent: {},
  timelineStatus: { fontSize: '13px', fontWeight: '500', color: '#333' },
  timelineDate: { fontSize: '11px', color: '#888', marginTop: '2px' },
  empty: { color: '#999', fontSize: '13px' }
}

export default TaskDetail
