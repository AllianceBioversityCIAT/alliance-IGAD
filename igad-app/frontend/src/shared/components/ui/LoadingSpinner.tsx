import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  overlay?: boolean
}

export function LoadingSpinner({ size = 'md', text, overlay = false }: LoadingSpinnerProps) {
  const content = (
    <div className={`${styles.container} ${overlay ? styles.overlay : ''}`}>
      <div className={`${styles.spinner} ${styles[size]}`}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {text && <p className={styles.text}>{text}</p>}
    </div>
  )

  return content
}
