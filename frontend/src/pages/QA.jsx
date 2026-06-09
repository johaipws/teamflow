import { useState, useEffect } from 'react'
import API from '../api/axios'

const PRIORITY_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7c3aed'
}

function QA() {
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [reviews, setReviews] = useState([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchQueue()
  }, [])

  const fetchQueue = async () => {
    try {
      const res = await API.get('/qa/queue')
      setTasks(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const fetchReviews = async (taskId) => {
    try {
      const res = await API.get(`/qa/reviews/${taskId}`)
      setReviews(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectTask = (task) => {
    setSelectedTask(task)
    setComment('')
    fetchReviews(task.id)
  }

  const handleReview = async (result) => {
    if (!comment.trim() && result === 'fail') {
      alert('Please add a comment explaining what needs to be changed.')
      return
    }
    setSubmitting(true)
    try {
      await API.post(`/qa/review/${selectedTask.id}`, { result, comment })
      setSelectedTask(null)
      setComment('')
      fetchQueue()
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
  }

  return (
    <div className="responsive-page" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>QA Queue</h1>
          <p style={styles.subtitle}>{tasks.length} tasks waiting for review</p>
        </div>
      </div>

      <div className="qa-layout" style={styles.layout}>
        {/* Task List */}
        <div className="qa-task-list" style={styles.list}>
          {loading ? (
            <p style={styles.empty}>Loading...</p>
          ) : tasks.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={styles.emptyIcon}>🎉</p>
              <p style={styles.emptyText}>All clear! No tasks in QA queue.</p>
            </div>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                style={{
                  ...styles.taskCard,
                  border: selectedTask?.id === task.id
                    ? '2px solid #4f46e5'
                    : '2px solid transparent'
                }}
                onClick={() => handleSelectTask(task)}
              >
                <div style={styles.taskTop}>
                  <span style={{
                    ...styles.priorityDot,
                    background: PRIORITY_COLORS[task.priority]
                  }} />
                  <p style={styles.taskTitle}>{task.title}</p>
                </div>
                <p style={styles.taskMeta}>📁 {task.project_name}</p>
                <p style={styles.taskMeta}>👤 {task.assignee_name || 'Unassigned'}</p>
                <span style={{
                  ...styles.statusBadge,
                  background: task.status === 'ready_for_qa' ? '#fef9c3' : '#f3e8ff',
                  color: task.status === 'ready_for_qa' ? '#a16207' : '#7e22ce'
                }}>
                  {task.status === 'ready_for_qa' ? 'Ready for QA' : 'In QA'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Review Panel */}
        {selectedTask && (
          <div className="qa-review-panel" style={styles.panel}>
            <h2 style={styles.panelTitle}>{selectedTask.title}</h2>
            <p style={styles.panelProject}>📁 {selectedTask.project_name}</p>

            {selectedTask.description && (
              <div style={styles.descBox}>
                <p style={styles.descLabel}>Description</p>
                <p style={styles.descText}>{selectedTask.description}</p>
              </div>
            )}

            <div className="responsive-three-column-grid" style={styles.metaGrid}>
              <div style={styles.metaBox}>
                <p style={styles.metaLabel}>Assigned To</p>
                <p style={styles.metaValue}>👤 {selectedTask.assignee_name || 'Unassigned'}</p>
              </div>
              <div style={styles.metaBox}>
                <p style={styles.metaLabel}>Priority</p>
                <p style={{ ...styles.metaValue, color: PRIORITY_COLORS[selectedTask.priority], fontWeight: '600' }}>
                  {selectedTask.priority?.toUpperCase()}
                </p>
              </div>
              <div style={styles.metaBox}>
                <p style={styles.metaLabel}>Estimated</p>
                <p style={styles.metaValue}>⏱ {selectedTask.estimated_hours || '-'}h</p>
              </div>
            </div>

            {/* Previous Reviews */}
            {reviews.length > 0 && (
              <div style={styles.reviewHistory}>
                <p style={styles.descLabel}>Review History</p>
                {reviews.map(r => (
                  <div key={r.id} style={{
                    ...styles.reviewItem,
                    borderLeft: `3px solid ${r.result === 'pass' ? '#22c55e' : '#ef4444'}`
                  }}>
                    <div style={styles.reviewTop}>
                      <span style={{
                        color: r.result === 'pass' ? '#16a34a' : '#dc2626',
                        fontWeight: '600', fontSize: '13px'
                      }}>
                        {r.result === 'pass' ? '✅ Passed' : '❌ Failed'}
                      </span>
                      <span style={styles.reviewDate}>
                        {new Date(r.reviewed_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.comment && <p style={styles.reviewComment}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Review Form */}
            <div style={styles.reviewForm}>
              <p style={styles.descLabel}>Your Review</p>
              <textarea
                style={styles.textarea}
                placeholder="Add a comment (required for fail, optional for pass)..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div className="responsive-actions" style={styles.reviewBtns}>
                <button
                  style={styles.failBtn}
                  onClick={() => handleReview('fail')}
                  disabled={submitting}
                >
                  ❌ Request Changes
                </button>
                <button
                  style={styles.passBtn}
                  onClick={() => handleReview('pass')}
                  disabled={submitting}
                >
                  ✅ Approve & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No task selected */}
        {!selectedTask && tasks.length > 0 && (
          <div className="qa-no-selection" style={styles.noSelect}>
            <p style={styles.noSelectIcon}>👈</p>
            <p style={styles.noSelectText}>Select a task to review</p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '32px', background: '#f0f2f5', minHeight: '100vh' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1e1b4b' },
  subtitle: { color: '#666', fontSize: '14px', marginTop: '4px' },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  list: { width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
  taskCard: {
    background: '#fff', borderRadius: '12px',
    padding: '16px', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'border 0.2s'
  },
  taskTop: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  priorityDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  taskTitle: { fontSize: '14px', fontWeight: '600', color: '#1e1b4b' },
  taskMeta: { fontSize: '12px', color: '#888', marginBottom: '4px' },
  statusBadge: {
    display: 'inline-block', marginTop: '8px',
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '11px', fontWeight: '600'
  },
  panel: {
    flex: 1, background: '#fff', borderRadius: '12px',
    padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  panelTitle: { fontSize: '20px', fontWeight: '700', color: '#1e1b4b', marginBottom: '4px' },
  panelProject: { color: '#888', fontSize: '13px', marginBottom: '20px' },
  descBox: {
    background: '#f8f9fa', borderRadius: '8px',
    padding: '12px', marginBottom: '16px'
  },
  descLabel: { fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '6px', textTransform: 'uppercase' },
  descText: { fontSize: '14px', color: '#444' },
  metaGrid: { display: 'flex', gap: '16px', marginBottom: '20px' },
  metaBox: {
    flex: 1, background: '#f8f9fa',
    borderRadius: '8px', padding: '12px'
  },
  metaLabel: { fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' },
  metaValue: { fontSize: '14px', fontWeight: '500', color: '#333' },
  reviewHistory: { marginBottom: '20px' },
  reviewItem: {
    background: '#f8f9fa', borderRadius: '8px',
    padding: '10px 12px', marginBottom: '8px'
  },
  reviewTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  reviewDate: { fontSize: '12px', color: '#888' },
  reviewComment: { fontSize: '13px', color: '#555' },
  reviewForm: {},
  textarea: {
    width: '100%', padding: '10px 12px',
    borderRadius: '8px', border: '1px solid #ddd',
    fontSize: '14px', height: '100px',
    resize: 'vertical', outline: 'none',
    boxSizing: 'border-box', marginBottom: '12px'
  },
  reviewBtns: { display: 'flex', gap: '12px' },
  failBtn: {
    flex: 1, padding: '12px',
    background: '#fee2e2', color: '#dc2626',
    border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer'
  },
  passBtn: {
    flex: 1, padding: '12px',
    background: '#dcfce7', color: '#16a34a',
    border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer'
  },
  empty: { color: '#999', textAlign: 'center' },
  emptyBox: { textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px' },
  emptyIcon: { fontSize: '40px', marginBottom: '8px' },
  emptyText: { color: '#666', fontSize: '15px' },
  noSelect: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#fff', borderRadius: '12px', padding: '60px'
  },
  noSelectIcon: { fontSize: '32px', marginBottom: '8px' },
  noSelectText: { color: '#999', fontSize: '15px' }
}

export default QA
