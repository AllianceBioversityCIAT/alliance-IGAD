import { Skeleton, SkeletonText } from '../../components/ui/Skeleton'
import styles from './PromptEditorPage.module.css'
import skeletonStyles from './PromptEditorSkeleton.module.css'

export function PromptEditorSkeleton() {
  return (
    <div className={styles.container}>
      {/* Header Skeleton */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Skeleton width="40px" height="40px" borderRadius="8px" />
          <div>
            <Skeleton width="200px" height="32px" className={skeletonStyles.titleSkeleton} />
            <Skeleton width="180px" height="16px" className={skeletonStyles.breadcrumbSkeleton} />
          </div>
        </div>

        <div className={styles.headerActions}>
          <Skeleton width="100px" height="38px" borderRadius="6px" />
          <Skeleton width="100px" height="38px" borderRadius="6px" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className={styles.content}>
        <div className={styles.editorSection}>
          {/* Basic Information Skeleton */}
          <div className={styles.formSection}>
            <Skeleton width="180px" height="24px" className={skeletonStyles.sectionTitle} />
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <Skeleton width="80px" height="16px" className={skeletonStyles.label} />
                <Skeleton width="100%" height="42px" borderRadius="6px" />
              </div>
              <div className={styles.formGroup}>
                <Skeleton width="80px" height="16px" className={skeletonStyles.label} />
                <Skeleton width="100%" height="42px" borderRadius="6px" />
              </div>
              <div className={styles.formGroup}>
                <Skeleton width="100px" height="16px" className={skeletonStyles.label} />
                <Skeleton width="100%" height="42px" borderRadius="6px" />
              </div>
              <div className={styles.formGroup}>
                <Skeleton width="60px" height="16px" className={skeletonStyles.label} />
                <Skeleton width="100%" height="42px" borderRadius="6px" />
              </div>
            </div>
          </div>

          {/* Categories Skeleton */}
          <div className={styles.formSection}>
            <Skeleton width="120px" height="24px" className={skeletonStyles.sectionTitle} />
            <div className={skeletonStyles.categoriesGrid}>
              <Skeleton width="140px" height="36px" borderRadius="18px" />
              <Skeleton width="120px" height="36px" borderRadius="18px" />
              <Skeleton width="160px" height="36px" borderRadius="18px" />
            </div>
          </div>

          {/* Prompts Skeleton */}
          <div className={styles.formSection}>
            <Skeleton width="160px" height="24px" className={skeletonStyles.sectionTitle} />
            <div className={styles.formGroup}>
              <Skeleton width="120px" height="16px" className={skeletonStyles.label} />
              <Skeleton width="100%" height="200px" borderRadius="6px" />
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <Skeleton width="180px" height="16px" className={skeletonStyles.label} />
              <Skeleton width="100%" height="200px" borderRadius="6px" />
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <Skeleton width="160px" height="16px" className={skeletonStyles.label} />
              <Skeleton width="100%" height="150px" borderRadius="6px" />
            </div>
          </div>
        </div>

        {/* Preview Section Skeleton */}
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <Skeleton width="120px" height="24px" />
            <Skeleton width="100px" height="32px" borderRadius="6px" />
          </div>
          <div className={skeletonStyles.previewContent}>
            <Skeleton width="100%" height="24px" className={skeletonStyles.previewItem} />
            <SkeletonText lines={4} className={skeletonStyles.previewText} />
            <Skeleton width="100%" height="24px" className={skeletonStyles.previewItem} />
            <SkeletonText lines={5} className={skeletonStyles.previewText} />
            <Skeleton width="100%" height="24px" className={skeletonStyles.previewItem} />
            <SkeletonText lines={3} className={skeletonStyles.previewText} />
          </div>
        </div>
      </div>
    </div>
  )
}
