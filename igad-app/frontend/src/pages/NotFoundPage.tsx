import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>Page Not Found</h2>
        <p className={styles.description}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className={styles.button}>
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
