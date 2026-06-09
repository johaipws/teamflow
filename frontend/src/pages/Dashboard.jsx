import { useEffect, useState } from 'react'
import API from '../api/axios'

function Dashboard() {
  const [stats, setStats] = useState({ total: 0, in_progress: 0, in_qa: 0, done: 0 })
  const [recentTasks, setRecentTasks] = useState([])
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await API.get('/tasks')
      const tasks = res.data
      setStats({
        total: tasks.length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        in_qa: tasks.filter(t => t.status === 'in_qa' || t.status === 'ready_for_qa').length,
        done: tasks.filter(t => t.status === 'done').length
      })
      setRecentTasks(tasks.slice(0, 5))
    } catch (err) {
      console.error(err)
    }
  }

  const STATUS_LABELS = {
    todo: 'To Do', in_progress: 'In Progress',
    ready_for_qa: 'Ready for QA', in_qa: 'In QA',
    changes_requested: 'Changes Requested', done: 'Done'
  }

  return (
    <div className="responsive-page" style={styles.main}>
      <div className="page-header" style={styles.header}>
        <h1 style={styles.welcome}>Welcome back, {user.name} 👋</h1>
        <span style={styles.role}>{user.role?.toUpperCase()}</span>
      </div>

      <div className="responsive-stats" style={styles.stats}>
        {[
          { label: 'Total Tasks', value: stats.total },
          { label: 'In Progress', value: stats.in_progress },
          { label: 'In QA', value: stats.in_qa },
          { label: 'Done', value: stats.done },
        ].map(s => (
          <div key={s.label} style={styles.card}>
            <p style={styles.cardLabel}>{s.label}</p>
            <p style={styles.cardValue}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Tasks</h2>
        {recentTasks.length === 0 ? (
          <p style={styles.empty}>No tasks yet. Create your first task!</p>
        ) : (
          recentTasks.map(task => (
            <div className="responsive-row" key={task.id} style={styles.taskRow}>
              <div>
                <p style={styles.taskTitle}>{task.title}</p>
                <p style={styles.taskSub}>📁 {task.project_name} · 👤 {task.assignee_name || 'Unassigned'}</p>
              </div>
              <span style={styles.taskStatus}>{STATUS_LABELS[task.status]}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  main: { padding: '32px', background: '#f0f2f5', minHeight: '100vh' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '32px'
  },
  welcome: { fontSize: '24px', fontWeight: '700', color: '#1e1b4b' },
  role: {
    background: '#4f46e5', color: '#fff',
    padding: '4px 12px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '600'
  },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px', marginBottom: '32px'
  },
  card: {
    background: '#fff', padding: '24px',
    borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  cardLabel: { color: '#666', fontSize: '13px', marginBottom: '8px' },
  cardValue: { fontSize: '32px', fontWeight: '700', color: '#1e1b4b' },
  section: {
    background: '#fff', padding: '24px',
    borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  sectionTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e1b4b' },
  empty: { color: '#999', fontSize: '14px' },
  taskRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '12px 0',
    borderBottom: '1px solid #f0f2f5'
  },
  taskTitle: { fontSize: '14px', fontWeight: '500', color: '#1e1b4b' },
  taskSub: { fontSize: '12px', color: '#888', marginTop: '2px' },
  taskStatus: {
    fontSize: '12px', color: '#4f46e5',
    background: '#eef2ff', padding: '4px 10px', borderRadius: '20px'
  }
}

export default Dashboard
