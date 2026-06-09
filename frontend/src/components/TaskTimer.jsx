import { useCallback, useEffect, useState } from 'react'
import API from '../api/axios'

function TaskTimer({ taskId, onTimerUpdate, onRunningChange }) {
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let interval
    if (isRunning) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const checkActiveTimer = useCallback(async () => {
    try {
      const res = await API.get(`/timelogs/active/${taskId}`)
      if (res.data) {
        const started = new Date(res.data.started_at)
        const elapsed = Math.floor((new Date() - started) / 1000)
        setSeconds(elapsed)
        setIsRunning(true)
        if (onRunningChange) onRunningChange(true)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [taskId, onRunningChange])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await API.get(`/timelogs/task/${taskId}`)
      setLogs(res.data.filter(l => l.ended_at !== null))
    } catch (err) {
      console.error(err)
    }
  }, [taskId])

  useEffect(() => {
    checkActiveTimer()
    fetchLogs()
  }, [checkActiveTimer, fetchLogs])

  const handleStart = async () => {
  try {
    await API.post(`/timelogs/start/${taskId}`)
    setSeconds(0)
    setIsRunning(true)
    if (onTimerUpdate) onTimerUpdate()
    if (onRunningChange) onRunningChange(true)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to start timer')
  }
}

const handleStop = async () => {
  try {
    await API.post(`/timelogs/stop/${taskId}`)
    setIsRunning(false)
    setSeconds(0)
    fetchLogs()
    if (onTimerUpdate) onTimerUpdate()
    if (onRunningChange) onRunningChange(false)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to stop timer')
  }
}

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const formatMinutes = (mins) => {
    if (!mins) return '0m'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)

  if (loading) return <p style={{ color: '#999', fontSize: '13px' }}>Loading timer...</p>

  return (
    <div style={styles.container}>
      {/* Timer Display */}
      <div className="timer-box" style={styles.timerBox}>
        <div style={styles.timerDisplay}>
          <span style={{
            ...styles.timerText,
            color: isRunning ? '#4f46e5' : '#333'
          }}>
            {formatTime(seconds)}
          </span>
          {isRunning && <span style={styles.liveTag}>● LIVE</span>}
        </div>

        <button
          style={{
            ...styles.timerBtn,
            background: isRunning ? '#fee2e2' : '#dcfce7',
            color: isRunning ? '#dc2626' : '#16a34a'
          }}
          onClick={isRunning ? handleStop : handleStart}
        >
          {isRunning ? '⏹ Stop Timer' : '▶ Start Timer'}
        </button>
      </div>

      {/* Total Time */}
      <div style={styles.totalBox}>
        <span style={styles.totalLabel}>Total logged:</span>
        <span style={styles.totalValue}>{formatMinutes(totalMinutes)}</span>
      </div>

      {/* Time Logs */}
      {logs.length > 0 && (
        <div style={styles.logs}>
          <p style={styles.logsTitle}>Time Log History</p>
          {logs.map(log => (
            <div className="timer-log-row" key={log.id} style={styles.logItem}>
              <span style={styles.logUser}>👤 {log.user_name}</span>
              <span style={styles.logDate}>
                {new Date(log.started_at).toLocaleDateString()}
              </span>
              <span style={styles.logDuration}>
                {formatMinutes(log.duration_minutes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    background: '#f8f9fa', borderRadius: '10px',
    padding: '16px', marginTop: '16px'
  },
  timerBox: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: '12px'
  },
  timerDisplay: { display: 'flex', alignItems: 'center', gap: '10px' },
  timerText: { fontSize: '28px', fontWeight: '700', fontFamily: 'monospace' },
  liveTag: {
    fontSize: '11px', color: '#ef4444',
    fontWeight: '600', animation: 'pulse 1s infinite'
  },
  timerBtn: {
    padding: '8px 16px', border: 'none',
    borderRadius: '8px', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600'
  },
  totalBox: {
    display: 'flex', gap: '8px',
    alignItems: 'center', marginBottom: '12px'
  },
  totalLabel: { fontSize: '13px', color: '#666' },
  totalValue: { fontSize: '13px', fontWeight: '700', color: '#1e1b4b' },
  logs: {},
  logsTitle: {
    fontSize: '12px', fontWeight: '600',
    color: '#666', marginBottom: '8px',
    textTransform: 'uppercase'
  },
  logItem: {
    display: 'flex', justifyContent: 'space-between',
    padding: '6px 0', borderBottom: '1px solid #eee',
    fontSize: '13px'
  },
  logUser: { color: '#444', flex: 1 },
  logDate: { color: '#888', flex: 1, textAlign: 'center' },
  logDuration: { color: '#4f46e5', fontWeight: '600', textAlign: 'right' }
}

export default TaskTimer
