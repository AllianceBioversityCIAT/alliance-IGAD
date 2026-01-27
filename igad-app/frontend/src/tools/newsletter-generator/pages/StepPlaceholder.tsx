import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Construction } from 'lucide-react'
import { NewsletterLayout } from '../components/NewsletterLayout'
import { useNewsletter } from '../hooks/useNewsletter'
import styles from './newsletterGenerator.module.css'

interface StepPlaceholderProps {
  stepNumber: 2 | 3 | 4
  stepTitle: string
}

export function StepPlaceholder({ stepNumber, stepTitle }: StepPlaceholderProps) {
  const { newsletterCode } = useParams<{ newsletterCode: string }>()
  const navigate = useNavigate()

  const { newsletter, isLoading, updateConfig } = useNewsletter({
    newsletterCode,
  })

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [stepNumber])

  // Calculate completed steps
  const completedSteps: number[] = []
  if (newsletter?.current_step && newsletter.current_step > 1) completedSteps.push(1)
  if (newsletter?.current_step && newsletter.current_step > 2) completedSteps.push(2)
  if (newsletter?.current_step && newsletter.current_step > 3) completedSteps.push(3)

  const handlePrevious = () => {
    const prevStep = stepNumber - 1
    navigate(`/newsletter-generator/${newsletterCode}/step-${prevStep}`)
  }

  const handleNext = () => {
    if (stepNumber < 4) {
      updateConfig({ current_step: stepNumber + 1 })
      navigate(`/newsletter-generator/${newsletterCode}/step-${stepNumber + 1}`)
    }
  }

  // Navigation buttons - must be an array for React.Children.toArray in NewsletterLayout
  const navigationButtons = [
    <button
      key="previous"
      className={`${styles.navButton} ${styles.navButtonSecondary}`}
      onClick={handlePrevious}
      disabled={isLoading}
    >
      <ChevronLeft size={18} />
      Previous
    </button>,
    <button
      key="next"
      className={`${styles.navButton} ${styles.navButtonPrimary}`}
      onClick={handleNext}
      disabled={stepNumber === 4 || isLoading}
    >
      {stepNumber === 4 ? 'Finish' : 'Next'}
      <ChevronRight size={18} />
    </button>,
  ]

  return (
    <NewsletterLayout
      currentStep={stepNumber}
      completedSteps={completedSteps}
      navigationButtons={navigationButtons}
      newsletterCode={newsletter?.newsletterCode}
      newsletterId={newsletter?.id}
      newsletterStatus={newsletter?.status}
      isLoadingNewsletter={isLoading}
      isLoadingStepData={isLoading}
    >
      <div className={styles.stepContentWrapper}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
          }}
        >
          <Construction
            size={48}
            style={{
              color: '#f59e0b',
              marginBottom: '24px',
            }}
          />
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '12px',
            }}
          >
            {stepTitle}
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: '#6B7280',
              maxWidth: '400px',
              lineHeight: '1.6',
            }}
          >
            This step is currently under development. The full functionality will be available soon.
          </p>
          <div
            style={{
              marginTop: '24px',
              padding: '8px 16px',
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              color: '#92400e',
              fontSize: '13px',
            }}
          >
            Coming in the next release
          </div>
        </div>
      </div>
    </NewsletterLayout>
  )
}

// Step-specific wrappers
export function Step2ContentPlanning() {
  return <StepPlaceholder stepNumber={2} stepTitle="Content Planning" />
}

export function Step3OutlineReview() {
  return <StepPlaceholder stepNumber={3} stepTitle="Outline Review" />
}

export function Step4Drafting() {
  return <StepPlaceholder stepNumber={4} stepTitle="Drafting & Export" />
}
