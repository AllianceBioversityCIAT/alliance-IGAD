import styles from './Skeleton.module.css'

interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  className?: string
}

export function Skeleton({
  width,
  height = '20px',
  borderRadius = '4px',
  className = '',
}: SkeletonProps) {
  return (
    <div className={`${styles.skeleton} ${className}`} style={{ width, height, borderRadius }} />
  )
}

export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '80%' : '100%'}
          height="16px"
          className={styles.textLine}
        />
      ))}
    </div>
  )
}
