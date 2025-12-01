import { Rocket, Lock } from 'lucide-react'
import styles from './coming-soon.module.css'

interface ComingSoonProps {
  stepNumber: number
  stepTitle: string
}

export function ComingSoonPlaceholder({ stepNumber, stepTitle }: ComingSoonProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <Rocket size={48} className={styles.rocketIcon} />
        </div>

        <h2 className={styles.title}>Coming Soon</h2>

        <p className={styles.description}>
          Step {stepNumber}: {stepTitle}
        </p>

        <p className={styles.message}>
          This feature is currently under development. We're working hard to bring you an amazing experience!
        </p>

        <div className={styles.badge}>
          <Lock size={16} />
          <span>Work in Progress</span>
        </div>
      </div>
    </div>
  )
}
