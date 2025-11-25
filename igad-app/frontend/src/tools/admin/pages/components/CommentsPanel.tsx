import { useState, useEffect } from 'react'
import { MessageCircle, Send, Reply, Clock } from 'lucide-react'
import styles from './CommentsPanel.module.css'

interface Comment {
  id: string
  prompt_id: string
  parent_id?: string
  content: string
  author: string
  author_name: string
  created_at: string
  replies: Comment[]
}

interface CommentsPanelProps {
  promptId: string
  isOpen: boolean
  onClose: () => void
}

export function CommentsPanel({ promptId, isOpen, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && promptId) {
      fetchComments()
    }
  }, [isOpen, promptId])

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/prompts/${promptId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      }
    } catch (error) {}
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/prompts/${promptId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            content: newComment,
            ...(replyTo && { parent_id: replyTo }),
          }),
        }
      )

      if (response.ok) {
        setNewComment('')
        setReplyTo(null)
        fetchComments()
      }
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${styles.comment} ${isReply ? styles.reply : ''}`}>
      <div className={styles.commentHeader}>
        <span className={styles.author}>{comment.author_name}</span>
        <span className={styles.date}>
          <Clock size={12} />
          {formatDate(comment.created_at)}
        </span>
      </div>

      <div className={styles.commentContent}>{comment.content}</div>

      {!isReply && (
        <button onClick={() => setReplyTo(comment.id)} className={styles.replyButton}>
          <Reply size={14} />
          Reply
        </button>
      )}

      {comment.replies.map(reply => renderComment(reply, true))}

      {replyTo === comment.id && (
        <form onSubmit={handleSubmitComment} className={styles.replyForm}>
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Write a reply..."
            className={styles.replyInput}
            rows={2}
          />
          <div className={styles.replyActions}>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null)
                setNewComment('')
              }}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newComment.trim() || isLoading}
              className={styles.submitButton}
            >
              <Send size={14} />
              Reply
            </button>
          </div>
        </form>
      )}
    </div>
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <MessageCircle size={20} />
            Comments
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.commentsList}>
            {comments.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageCircle size={48} />
                <p>No comments yet</p>
                <span>Be the first to add feedback!</span>
              </div>
            ) : (
              comments.map(comment => renderComment(comment))
            )}
          </div>

          {!replyTo && (
            <form onSubmit={handleSubmitComment} className={styles.newCommentForm}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className={styles.commentInput}
                rows={3}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isLoading}
                className={styles.submitButton}
              >
                <Send size={16} />
                {isLoading ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
