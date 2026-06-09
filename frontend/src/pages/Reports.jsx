import { useEffect, useState } from 'react'
import API from '../api/axios'

function Reports() {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  useEffect(() => {
    API.get('/reports/kpi')
      .then(response => setReport(response.data))
      .catch(requestError => setError(requestError.response?.data?.message || 'Reports could not be loaded'))
  }, [])
  if (error) return <div style={styles.page}><h1>KPI Reports</h1><p style={styles.error}>{error}</p></div>
  if (!report) return <div style={styles.page}>Loading reports...</div>

  return (
    <div style={styles.page}>
      <h1>{user.role === 'lead' ? 'Organization KPI Reports' : 'My KPI Report'}</h1>
      <div style={styles.cards}>
        <Metric label="Total tasks" value={report.summary.total || 0} />
        <Metric label="Completed" value={report.summary.completed || 0} />
        <Metric label="Overdue" value={report.summary.overdue || 0} />
        <Metric label="Average estimate" value={`${report.summary.average_estimate || 0}h`} />
      </div>
      <section style={styles.section}>
        <h2>Project performance</h2>
        {report.byProject.map(item => (
          <Row key={item.id} name={item.name}
            value={`${item.done_tasks || 0}/${item.total_tasks} done, ${item.overdue_tasks || 0} overdue`} />
        ))}
      </section>
      <section style={styles.section}>
        <h2>Time by team member</h2>
        {report.byUser.map(item => (
          <Row key={item.id} name={`${item.name} (${item.role})`}
            value={`${item.total_minutes || 0} minutes across ${item.tasks_worked} tasks`} />
        ))}
      </section>
    </div>
  )
}

function Metric({ label, value }) {
  return <div style={styles.card}><small>{label}</small><strong>{value}</strong></div>
}
function Row({ name, value }) {
  return <div style={styles.row}><span>{name}</span><strong>{value}</strong></div>
}
const styles = {
  page: { padding: '32px', minHeight: '100vh', background: '#f0f2f5', color: '#1e1b4b' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  card: { display: 'grid', gap: '10px', background: '#fff', borderRadius: '12px', padding: '22px' },
  section: { background: '#fff', borderRadius: '12px', padding: '22px', marginTop: '20px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' },
  error: { color: '#dc2626', background: '#fee2e2', padding: '12px', borderRadius: '8px' },
}
export default Reports
