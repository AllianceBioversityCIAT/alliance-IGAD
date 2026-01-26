import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { NewsletterLayout } from '../components/NewsletterLayout'
import { AudienceCheckboxGroup } from '../components/AudienceCheckboxGroup'
import { DualToneSlider } from '../components/DualToneSlider'
import { DiscreteSlider } from '../components/DiscreteSlider'
import { useNewsletter } from '../hooks/useNewsletter'
import {
  AUDIENCE_OPTIONS,
  FORMAT_OPTIONS,
  LENGTH_OPTIONS,
  FREQUENCY_OPTIONS,
  DEFAULT_NEWSLETTER_CONFIG,
} from '../types/newsletter'
import styles from './newsletterGenerator.module.css'

export function Step1Configuration() {
  const { newsletterCode } = useParams<{ newsletterCode: string }>()
  const navigate = useNavigate()

  const { newsletter, isLoading, isSaving, updateConfig } = useNewsletter({
    newsletterCode,
    autoSaveDelay: 500,
  })

  // Use newsletter values or defaults
  const targetAudience = newsletter?.target_audience ?? DEFAULT_NEWSLETTER_CONFIG.target_audience
  const toneProfessional =
    newsletter?.tone_professional ?? DEFAULT_NEWSLETTER_CONFIG.tone_professional
  const toneTechnical = newsletter?.tone_technical ?? DEFAULT_NEWSLETTER_CONFIG.tone_technical
  const formatType = newsletter?.format_type ?? DEFAULT_NEWSLETTER_CONFIG.format_type
  const lengthPreference =
    newsletter?.length_preference ?? DEFAULT_NEWSLETTER_CONFIG.length_preference
  const frequency = newsletter?.frequency ?? DEFAULT_NEWSLETTER_CONFIG.frequency
  const geographicFocus = newsletter?.geographic_focus ?? DEFAULT_NEWSLETTER_CONFIG.geographic_focus

  // Calculate completed steps (for now, step 1 is complete if audience is selected)
  const completedSteps = newsletter?.current_step && newsletter.current_step > 1 ? [1] : []

  // Handlers
  const handleAudienceChange = (selectedValues: string[]) => {
    updateConfig({ target_audience: selectedValues })
  }

  const handleProfessionalChange = (value: number) => {
    updateConfig({ tone_professional: value })
  }

  const handleTechnicalChange = (value: number) => {
    updateConfig({ tone_technical: value })
  }

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateConfig({ format_type: e.target.value })
  }

  const handleLengthChange = (value: string) => {
    updateConfig({ length_preference: value })
  }

  const handleFrequencyChange = (value: string) => {
    updateConfig({ frequency: value })
  }

  const handleGeographicFocusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({ geographic_focus: e.target.value })
  }

  const handleNext = () => {
    // Update current step and navigate
    updateConfig({ current_step: 2 })
    navigate(`/newsletter-generator/${newsletterCode}/step-2`)
  }

  const handlePrevious = () => {
    // Step 1 has no previous - disabled
  }

  // Check if can proceed to next step
  const canProceed = targetAudience.length > 0

  // Navigation buttons
  const navigationButtons = (
    <>
      <button
        className={`${styles.navButton} ${styles.navButtonSecondary}`}
        onClick={handlePrevious}
        disabled={true}
      >
        <ChevronLeft size={18} />
        Previous
      </button>
      <button
        className={`${styles.navButton} ${styles.navButtonPrimary}`}
        onClick={handleNext}
        disabled={!canProceed || isLoading}
      >
        Next
        <ChevronRight size={18} />
      </button>
    </>
  )

  return (
    <NewsletterLayout
      currentStep={1}
      completedSteps={completedSteps}
      navigationButtons={navigationButtons}
      newsletterCode={newsletter?.newsletterCode}
      newsletterId={newsletter?.id}
      newsletterStatus={newsletter?.status}
      isLoadingNewsletter={isLoading}
      isLoadingStepData={isLoading}
    >
      <div className={styles.stepContentWrapper}>
        {/* Welcome Info Card */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardTitle}>
            <Info size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Welcome to the Newsletter Generator
          </div>
          <p className={styles.infoCardDescription}>
            Configure your newsletter preferences below. These settings will help us generate
            content that matches your audience and communication style. All changes are automatically
            saved.
          </p>
        </div>

        {/* Audience Card */}
        <div className={styles.formCard}>
          <h3 className={styles.formCardTitle}>Target Audience</h3>
          <p className={styles.formCardDescription}>
            Select who will be reading this newsletter. You can select multiple audiences.
          </p>
          <AudienceCheckboxGroup
            options={AUDIENCE_OPTIONS}
            selectedValues={targetAudience}
            onChange={handleAudienceChange}
            disabled={isLoading}
          />
          {targetAudience.length === 0 && (
            <p className={styles.errorMessage}>Please select at least one audience to continue.</p>
          )}
        </div>

        {/* Tone Card */}
        <div className={styles.formCard}>
          <h3 className={styles.formCardTitle}>Writing Tone</h3>
          <p className={styles.formCardDescription}>
            Adjust the sliders to set the tone of your newsletter content.
          </p>
          <DualToneSlider
            professionalValue={toneProfessional}
            technicalValue={toneTechnical}
            onProfessionalChange={handleProfessionalChange}
            onTechnicalChange={handleTechnicalChange}
            disabled={isLoading}
          />
        </div>

        {/* Format Card */}
        <div className={styles.formCard}>
          <h3 className={styles.formCardTitle}>Output Format</h3>
          <p className={styles.formCardDescription}>
            Choose the format for your newsletter output.
          </p>
          <div className={styles.formField}>
            <select
              className={styles.formSelect}
              value={formatType}
              onChange={handleFormatChange}
              disabled={isLoading}
            >
              {FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Length Card */}
        <div className={styles.formCard}>
          <h3 className={styles.formCardTitle}>Content Length</h3>
          <p className={styles.formCardDescription}>
            Select your preferred content length for newsletter sections.
          </p>
          <DiscreteSlider
            options={LENGTH_OPTIONS}
            value={lengthPreference}
            onChange={handleLengthChange}
            disabled={isLoading}
            showSelected={true}
          />
        </div>

        {/* Frequency Card */}
        <div className={styles.formCard}>
          <h3 className={styles.formCardTitle}>Publishing Frequency</h3>
          <p className={styles.formCardDescription}>
            How often do you plan to publish this newsletter?
          </p>
          <DiscreteSlider
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={handleFrequencyChange}
            disabled={isLoading}
            showSelected={true}
          />
        </div>

        {/* Geographic Focus Card */}
        <div className={styles.formCard}>
          <h3 className={styles.formCardTitle}>Geographic Focus</h3>
          <p className={styles.formCardDescription}>
            Specify the geographic region or focus for your newsletter content.
          </p>
          <div className={styles.formField}>
            <input
              type="text"
              className={styles.formInput}
              value={geographicFocus}
              onChange={handleGeographicFocusChange}
              placeholder="e.g., IGAD region, East Africa, specific countries..."
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Auto-save indicator */}
        {isSaving && (
          <div style={{ textAlign: 'center', color: '#717182', fontSize: '13px' }}>
            Saving changes...
          </div>
        )}
      </div>
    </NewsletterLayout>
  )
}
