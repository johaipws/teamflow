import { useCallback, useEffect, useState } from 'react'
import API from '../api/axios'

function TaskCollaboration({ taskId }) {
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [comment, setComment] = useState('')
  const [attachment, setAttachment] = useState({ name: '', url: '' })

  const refresh = useCallback(async () => {
    const [commentResult, attachmentResult] = await Promise.all([
      API.get(`/tasks/${taskId}/comments`),
      API.get(`/tasks/${taskId}/attachments`),
    ])
    setComments(commentResult.data)
    setAttachments(attachmentResult.data)
  }, [taskId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addComment(event) {
    event.preventDefault()
    await API.post(`/tasks/${taskId}/comments`, { comment })
    setComment('')
    refresh()
  }

  async function addAttachment(event) {
    event.preventDefault()
    await API.post(`/tasks/${taskId}/attachments`, attachment)
    setAttachment({ name: '', url: '' })
    refresh()
  }

  return (
    <div className="responsive-two-column-grid" style={styles.grid}>
      <section>
        <h3 style={styles.title}>Comments</h3>
        <form onSubmit={addComment} style={styles.form}>
          <textarea style={styles.input} value={comment}
            onChange={event => setComment(event.target.value)}
            placeholder="Add a comment..." required />
          <button style={styles.button}>Post comment</button>
        </form>
        {comments.map(item => (
          <div key={item.id} style={styles.item}>
            <strong>{item.author_name}</strong>
            <p>{item.comment}</p>
            <small>{new Date(item.created_at).toLocaleString()}</small>
          </div>
        ))}
      </section>
      <section>
        <h3 style={styles.title}>Attachments</h3>
        <form onSubmit={addAttachment} style={styles.form}>
          <input style={styles.input} placeholder="Link name" value={attachment.name}
            onChange={event => setAttachment({ ...attachment, name: event.target.value })} required />
          <input style={styles.input} type="url" placeholder="https://..." value={attachment.url}
            onChange={event => setAttachment({ ...attachment, url: event.target.value })} required />
          <button style={styles.button}>Add link</button>
        </form>
        {attachments.map(item => (
          <div key={item.id} style={styles.item}>
            <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
            <small>Added by {item.added_by_name}</small>
          </div>
        ))}
      </section>
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  title: { color: '#1e1b4b', fontSize: '16px' },
  form: { display: 'grid', gap: '8px', marginBottom: '16px' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' },
  button: { border: 0, borderRadius: '8px', padding: '10px', background: '#4f46e5', color: '#fff' },
  item: { display: 'grid', gap: '4px', padding: '10px 0', borderBottom: '1px solid #eee', fontSize: '13px' },
}

export default TaskCollaboration
