# Step 1: Configuration - Frontend Implementation

> **Updated:** 2026-01-26 - Aligned with Figma design (node 955:4044)

## Component Structure

```
pages/Step1Configuration.tsx          # Main page component
components/AudienceCheckboxGroup.tsx  # Audience selection checkboxes
components/DualToneSlider.tsx         # Tone configuration (Professional/Casual, Technical/Approachable)
components/DiscreteSlider.tsx         # NEW: Slider with discrete stops (Length, Frequency)
components/ExampleUploadSection.tsx   # NEW: Upload example newsletters
```

---

## Design Reference (Figma)

**Node:** `955:4044`
**URL:** https://www.figma.com/design/mUmeInkEfKNUMpWKYcOv11/IGAD?node-id=955-4044

### Color Palette (from Figma)
```css
/* Primary */
--green-primary: #00a63e;
--green-dark: #166534;
--green-light: #dcfce7;

/* Info Card */
--info-bg: #eff6ff;
--info-border: #bedbff;
--info-text: #364153;

/* Inputs */
--input-bg: #f3f3f5;
--input-border: rgba(0, 0, 0, 0.1);

/* Slider */
--slider-track: #ececf0;
--slider-fill: #166534;
--slider-thumb-border: #166534;

/* Buttons */
--btn-primary: #155dfc;
--btn-secondary-border: rgba(0, 0, 0, 0.1);
```

---

## Step1Configuration.tsx

### Full Implementation

```typescript
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import debounce from 'lodash/debounce'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { NewsletterLayout } from '../components/NewsletterLayout'
import { AudienceCheckboxGroup } from '../components/AudienceCheckboxGroup'
import { DualToneSlider } from '../components/DualToneSlider'
import { DiscreteSlider } from '../components/DiscreteSlider'
import { ExampleUploadSection } from '../components/ExampleUploadSection'
import { newsletterService } from '../services/newsletterService'
import { useToast } from '@/shared/components/ui/ToastContainer'
import styles from './newsletterGenerator.module.css'

// Types
interface NewsletterConfig {
  target_audience: string[]
  tone_professional: number  // 0-100 (Professional to Casual)
  tone_technical: number     // 0-100 (Technical to Approachable)
  format_type: string
  length_preference: string
  frequency: string
  geographic_focus: string
  example_files: string[]
}

// Options - Aligned with Figma
const FORMAT_OPTIONS = [
  { value: 'email', label: 'Email Newsletter' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'web', label: 'Web Article' },
  { value: 'html', label: 'HTML Email' },
]

// Length as discrete slider (from Figma)
const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'long', label: 'Long' },
]

// Frequency as discrete slider (from Figma)
const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
]

// Default values
const DEFAULT_CONFIG: NewsletterConfig = {
  target_audience: [],
  tone_professional: 50,
  tone_technical: 50,
  format_type: '',
  length_preference: 'mixed',
  frequency: 'weekly',
  geographic_focus: '',
  example_files: [],
}

export function Step1Configuration() {
  const { newsletterCode } = useParams<{ newsletterCode: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  // State
  const [config, setConfig] = useState<NewsletterConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [newsletterId, setNewsletterId] = useState<string>()

  // Load newsletter data
  useEffect(() => {
    async function loadNewsletter() {
      if (!newsletterCode) {
        // Create new newsletter
        try {
          const newNewsletter = await newsletterService.createNewsletter({
            title: 'Newsletter Draft',
          })
          navigate(`/newsletter-generator/${newNewsletter.newsletterCode}/step-1`, {
            replace: true,
          })
        } catch (error) {
          showError('Failed to create newsletter', 'Please try again.')
        }
        return
      }

      setIsLoading(true)
      try {
        const newsletter = await newsletterService.getNewsletter(newsletterCode)
        setConfig({
          target_audience: newsletter.target_audience || [],
          tone_professional: newsletter.tone_professional ?? 50,
          tone_technical: newsletter.tone_technical ?? 50,
          format_type: newsletter.format_type || '',
          length_preference: newsletter.length_preference || 'mixed',
          frequency: newsletter.frequency || 'weekly',
          geographic_focus: newsletter.geographic_focus || '',
          example_files: newsletter.example_files || [],
        })
        setNewsletterId(newsletter.id)

        // Determine completed steps
        const completed: number[] = []
        if (isStep1Complete(newsletter)) completed.push(1)
        setCompletedSteps(completed)
      } catch (error) {
        showError('Failed to load newsletter', 'Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    loadNewsletter()
  }, [newsletterCode])

  // Debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce(async (data: Partial<NewsletterConfig>) => {
        if (!newsletterCode) return
        setIsSaving(true)
        try {
          await newsletterService.updateNewsletter(newsletterCode, data)
        } catch (error) {
          showError('Failed to save changes', 'Your changes may not be saved.')
        } finally {
          setIsSaving(false)
        }
      }, 500),
    [newsletterCode]
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  // Field update handler
  const updateField = useCallback(
    (field: keyof NewsletterConfig, value: NewsletterConfig[keyof NewsletterConfig]) => {
      setConfig((prev) => {
        const newConfig = { ...prev, [field]: value }
        debouncedSave({ [field]: value })
        return newConfig
      })

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    },
    [debouncedSave, errors]
  )

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (config.target_audience.length === 0) {
      newErrors.target_audience = 'Please select at least one target audience'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle next button
  const handleNext = async () => {
    if (!validate()) {
      showError('Validation Error', 'Please fix the errors before continuing.')
      return
    }

    // Ensure all changes are saved
    debouncedSave.flush()

    // Wait for any pending save
    await new Promise((resolve) => setTimeout(resolve, 100))

    navigate(`/newsletter-generator/${newsletterCode}/step-2`)
  }

  // Handle file upload
  const handleExampleUpload = async (files: File[]) => {
    if (!newsletterCode) return

    try {
      const uploadedUrls = await newsletterService.uploadExampleFiles(newsletterCode, files)
      setConfig((prev) => ({
        ...prev,
        example_files: [...prev.example_files, ...uploadedUrls],
      }))
      showSuccess('Files uploaded', 'Example newsletters uploaded successfully.')
    } catch (error) {
      showError('Upload failed', 'Failed to upload example files.')
    }
  }

  // Handle file delete
  const handleExampleDelete = async (fileUrl: string) => {
    if (!newsletterCode) return

    try {
      await newsletterService.deleteExampleFile(newsletterCode, fileUrl)
      setConfig((prev) => ({
        ...prev,
        example_files: prev.example_files.filter((f) => f !== fileUrl),
      }))
      showSuccess('File deleted', 'Example newsletter removed.')
    } catch (error) {
      showError('Delete failed', 'Failed to delete file.')
    }
  }

  // Navigation buttons
  const navigationButtons = (
    <div className={styles.navigationFooter}>
      <button
        className={styles.navButtonSecondary}
        disabled={true}
        aria-label="Previous step (disabled on first step)"
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <button
        className={styles.navButtonPrimary}
        onClick={handleNext}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Next'}
        <ChevronRight size={16} />
      </button>
    </div>
  )

  return (
    <NewsletterLayout
      currentStep={1}
      totalSteps={4}
      completedSteps={completedSteps}
      navigationButtons={navigationButtons}
      newsletterCode={newsletterCode}
      newsletterId={newsletterId}
      isLoadingNewsletter={isLoading}
    >
      <div className={styles.stepContent}>
        {/* Welcome Info Card - Matches Figma exactly */}
        <div className={styles.welcomeInfoCard}>
          <p>
            Welcome to the newsletter generator. This tool will help you stay up-to-date
            with important news and events taking place across the IGAD region and generate
            newsletters for your own consumption or to send to others.
          </p>
        </div>

        {/* Card 1: Target Audience */}
        <div className={styles.formCard}>
          <h3 className={styles.cardQuestion}>
            Who is the intended audience for the newsletter?
          </h3>
          <p className={styles.cardHint}>Select all that apply</p>
          <AudienceCheckboxGroup
            selectedAudiences={config.target_audience}
            onChange={(audiences) => updateField('target_audience', audiences)}
            disabled={isLoading}
          />
          {errors.target_audience && (
            <p className={styles.errorMessage}>{errors.target_audience}</p>
          )}
        </div>

        {/* Card 2: Tone Settings */}
        <div className={styles.formCard}>
          <h3 className={styles.cardTitle}>What tone should the newsletter have?</h3>
          <DualToneSlider
            professionalValue={config.tone_professional}
            technicalValue={config.tone_technical}
            onProfessionalChange={(value) => updateField('tone_professional', value)}
            onTechnicalChange={(value) => updateField('tone_technical', value)}
            disabled={isLoading}
          />
        </div>

        {/* Card 3: Format Dropdown */}
        <div className={styles.formCard}>
          <h3 className={styles.cardQuestion}>
            What format would you like the final newsletter to be shared in?
          </h3>
          <select
            className={styles.selectInput}
            value={config.format_type}
            onChange={(e) => updateField('format_type', e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select format</option>
            {FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Card 4: Length - Discrete Slider */}
        <div className={styles.formCard}>
          <h3 className={styles.cardQuestion}>
            What format would you like the pieces in?
          </h3>
          <DiscreteSlider
            options={LENGTH_OPTIONS}
            value={config.length_preference}
            onChange={(value) => updateField('length_preference', value)}
            disabled={isLoading}
            showSelected={true}
          />
        </div>

        {/* Card 5: Frequency - Discrete Slider */}
        <div className={styles.formCard}>
          <h3 className={styles.cardQuestion}>
            How often would you like it generated?
          </h3>
          <DiscreteSlider
            options={FREQUENCY_OPTIONS}
            value={config.frequency}
            onChange={(value) => updateField('frequency', value)}
            disabled={isLoading}
            showSelected={true}
          />
        </div>

        {/* Card 6: Geographic Focus */}
        <div className={styles.formCard}>
          <h3 className={styles.cardQuestion}>
            What geographic area should the newsletter focus on?
          </h3>
          <input
            type="text"
            className={styles.textInput}
            value={config.geographic_focus}
            onChange={(e) => updateField('geographic_focus', e.target.value)}
            placeholder="e.g., IGAD region, East Africa, specific countries..."
            disabled={isLoading}
          />
        </div>

        {/* Card 7: Upload Example Newsletters (Optional) */}
        <div className={styles.formCard}>
          <h3 className={styles.cardQuestion}>
            Upload Example Newsletters (Optional)
          </h3>
          <p className={styles.cardDescription}>
            Upload existing newsletters or examples you'd like to reference for design
            and layout inspiration. The AI will analyze these to match your preferred style.
          </p>
          <ExampleUploadSection
            files={config.example_files}
            onUpload={handleExampleUpload}
            onDelete={handleExampleDelete}
            supportedFormats={['PDF', 'DOC', 'DOCX', 'HTML', 'TXT']}
            disabled={isLoading}
          />
        </div>
      </div>
    </NewsletterLayout>
  )
}

// Helper function
function isStep1Complete(config: Partial<NewsletterConfig>): boolean {
  return (
    Array.isArray(config.target_audience) &&
    config.target_audience.length > 0 &&
    typeof config.tone_professional === 'number' &&
    typeof config.tone_technical === 'number' &&
    !!config.format_type &&
    !!config.length_preference &&
    !!config.frequency
  )
}
```

---

## AudienceCheckboxGroup.tsx

```typescript
import React from 'react'
import styles from '../pages/newsletterGenerator.module.css'

interface AudienceCheckboxGroupProps {
  selectedAudiences: string[]
  onChange: (audiences: string[]) => void
  disabled?: boolean
}

const AUDIENCE_OPTIONS = [
  { id: 'myself', label: 'Myself' },
  { id: 'researchers', label: 'Researchers' },
  { id: 'development_partners', label: 'Development partners' },
  { id: 'policy_makers', label: 'Policy makers' },
  { id: 'ag_tech_industry', label: 'Ag-tech industry' },
  { id: 'field_staff', label: 'Field staff' },
  { id: 'farmers', label: 'Farmers' },
]

export function AudienceCheckboxGroup({
  selectedAudiences,
  onChange,
  disabled = false,
}: AudienceCheckboxGroupProps) {
  const handleToggle = (audienceId: string) => {
    if (disabled) return

    const isSelected = selectedAudiences.includes(audienceId)

    if (isSelected) {
      onChange(selectedAudiences.filter((id) => id !== audienceId))
    } else {
      onChange([...selectedAudiences, audienceId])
    }
  }

  return (
    <div className={styles.audienceList}>
      {AUDIENCE_OPTIONS.map((audience) => {
        const isSelected = selectedAudiences.includes(audience.id)

        return (
          <label
            key={audience.id}
            className={`${styles.audienceItem} ${disabled ? styles.audienceItemDisabled : ''}`}
          >
            <div
              className={`${styles.checkbox} ${isSelected ? styles.checkboxSelected : ''}`}
              onClick={() => handleToggle(audience.id)}
            />
            <span className={styles.audienceLabel}>{audience.label}</span>
          </label>
        )
      })}
    </div>
  )
}
```

---

## DualToneSlider.tsx

```typescript
import React from 'react'
import styles from '../pages/newsletterGenerator.module.css'

interface DualToneSliderProps {
  professionalValue: number  // 0 (Professional) to 100 (Casual)
  technicalValue: number     // 0 (Technical) to 100 (Approachable)
  onProfessionalChange: (value: number) => void
  onTechnicalChange: (value: number) => void
  disabled?: boolean
}

export function DualToneSlider({
  professionalValue,
  technicalValue,
  onProfessionalChange,
  onTechnicalChange,
  disabled = false,
}: DualToneSliderProps) {
  return (
    <div className={styles.toneSliderContainer}>
      {/* Professional/Casual Slider */}
      <div className={styles.sliderGroup}>
        <div className={styles.sliderLabels}>
          <span>Professional</span>
          <span>Casual</span>
        </div>
        <div className={styles.sliderTrack}>
          <div
            className={styles.sliderFill}
            style={{ width: `${professionalValue}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={professionalValue}
            onChange={(e) => onProfessionalChange(Number(e.target.value))}
            disabled={disabled}
            className={styles.sliderInput}
            aria-label="Professional to Casual tone"
          />
        </div>
      </div>

      {/* Technical/Approachable Slider */}
      <div className={styles.sliderGroup}>
        <div className={styles.sliderLabels}>
          <span>Technical</span>
          <span>Approachable</span>
        </div>
        <div className={styles.sliderTrack}>
          <div
            className={styles.sliderFill}
            style={{ width: `${technicalValue}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={technicalValue}
            onChange={(e) => onTechnicalChange(Number(e.target.value))}
            disabled={disabled}
            className={styles.sliderInput}
            aria-label="Technical to Approachable tone"
          />
        </div>
      </div>
    </div>
  )
}
```

---

## DiscreteSlider.tsx (NEW - from Figma)

```typescript
import React from 'react'
import styles from '../pages/newsletterGenerator.module.css'

interface SliderOption {
  value: string
  label: string
}

interface DiscreteSliderProps {
  options: SliderOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  showSelected?: boolean
}

export function DiscreteSlider({
  options,
  value,
  onChange,
  disabled = false,
  showSelected = true,
}: DiscreteSliderProps) {
  const currentIndex = options.findIndex((opt) => opt.value === value)
  const percentage = options.length > 1
    ? (currentIndex / (options.length - 1)) * 100
    : 0

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = Math.round(Number(e.target.value))
    if (options[index]) {
      onChange(options[index].value)
    }
  }

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className={styles.discreteSliderContainer}>
      {/* Labels row */}
      <div className={styles.discreteSliderLabels}>
        {options.map((option, index) => (
          <span
            key={option.value}
            className={`${styles.discreteLabel} ${
              option.value === value ? styles.discreteLabelActive : ''
            }`}
            style={{
              left: `${(index / (options.length - 1)) * 100}%`,
              transform: index === 0 ? 'none' :
                         index === options.length - 1 ? 'translateX(-100%)' :
                         'translateX(-50%)'
            }}
          >
            {option.label}
          </span>
        ))}
      </div>

      {/* Slider track */}
      <div className={styles.discreteSliderTrack}>
        <div
          className={styles.discreteSliderFill}
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min="0"
          max={options.length - 1}
          step="1"
          value={currentIndex >= 0 ? currentIndex : 0}
          onChange={handleSliderChange}
          disabled={disabled}
          className={styles.discreteSliderInput}
        />
      </div>

      {/* Selected indicator */}
      {showSelected && selectedOption && (
        <div className={styles.discreteSelectedLabel}>
          Selected: {selectedOption.label}
        </div>
      )}
    </div>
  )
}
```

---

## ExampleUploadSection.tsx (NEW - from Figma)

```typescript
import React, { useRef } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import styles from '../pages/newsletterGenerator.module.css'

interface ExampleUploadSectionProps {
  files: string[]
  onUpload: (files: File[]) => void
  onDelete: (fileUrl: string) => void
  supportedFormats: string[]
  disabled?: boolean
}

export function ExampleUploadSection({
  files,
  onUpload,
  onDelete,
  supportedFormats,
  disabled = false,
}: ExampleUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files))
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const acceptTypes = supportedFormats
    .map((f) => `.${f.toLowerCase()}`)
    .join(',')

  return (
    <div className={styles.exampleUploadContainer}>
      {/* Upload Button */}
      <button
        type="button"
        className={styles.uploadButton}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <Upload size={16} />
        Upload Example Newsletter Files
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        multiple
        onChange={handleFileSelect}
        className={styles.hiddenInput}
      />

      {/* Supported formats hint */}
      <p className={styles.supportedFormats}>
        Supported formats: {supportedFormats.join(', ')}
      </p>

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className={styles.uploadedFilesList}>
          {files.map((fileUrl) => {
            const filename = fileUrl.split('/').pop() || 'file'
            return (
              <div key={fileUrl} className={styles.uploadedFileItem}>
                <FileText size={16} />
                <span className={styles.uploadedFileName}>{filename}</span>
                <button
                  type="button"
                  className={styles.deleteFileButton}
                  onClick={() => onDelete(fileUrl)}
                  disabled={disabled}
                  aria-label={`Delete ${filename}`}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

---

## CSS Styles (add to newsletterGenerator.module.css)

```css
/* ============================================
   STEP 1: CONFIGURATION STYLES
   Aligned with Figma design node 955:4044
   ============================================ */

.stepContent {
  max-width: 896px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Welcome Info Card - Blue background */
.welcomeInfoCard {
  background: #eff6ff;
  border: 1px solid #bedbff;
  border-radius: 14px;
  padding: 25px;
}

.welcomeInfoCard p {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 22.75px;
  color: #364153;
  margin: 0;
}

/* Form Card - White with border */
.formCard {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
  padding: 25px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.cardQuestion {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  color: #0a0a0a;
  margin: 0;
}

.cardTitle {
  font-family: 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 500;
  line-height: 27px;
  color: #0a0a0a;
  margin: 0;
}

.cardHint {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #717182;
  margin: -32px 0 0 0;
}

.cardDescription {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #717182;
  margin: -32px 0 0 0;
}

.errorMessage {
  color: #dc2626;
  font-size: 13px;
  margin-top: -32px;
}

/* Audience Checkboxes - Vertical list */
.audienceList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audienceItem {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.audienceItemDisabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox {
  width: 16px;
  height: 16px;
  background: #f3f3f5;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  flex-shrink: 0;
}

.checkboxSelected {
  background: #166534;
  border-color: #166534;
  /* Add checkmark via ::after or SVG */
}

.audienceLabel {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #0a0a0a;
}

/* Tone Sliders */
.toneSliderContainer {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sliderGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sliderLabels {
  display: flex;
  justify-content: space-between;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #0a0a0a;
}

.sliderTrack {
  position: relative;
  height: 16px;
  background: #ececf0;
  border-radius: 9999px;
  overflow: hidden;
}

.sliderFill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #166534;
  border-radius: 9999px;
  transition: width 0.1s ease;
}

.sliderInput {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.sliderInput::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: white;
  border: 1px solid #166534;
  border-radius: 50%;
  box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

/* Discrete Slider (Length, Frequency) */
.discreteSliderContainer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.discreteSliderLabels {
  position: relative;
  display: flex;
  justify-content: space-between;
  height: 20px;
  margin-bottom: 8px;
}

.discreteLabel {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #0a0a0a;
}

.discreteLabelActive {
  font-weight: 500;
}

.discreteSliderTrack {
  position: relative;
  height: 16px;
  background: #ececf0;
  border-radius: 9999px;
  overflow: visible;
}

.discreteSliderFill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #166534;
  border-radius: 9999px;
  transition: width 0.15s ease;
}

.discreteSliderInput {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.discreteSelectedLabel {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #717182;
  text-align: center;
  margin-top: 8px;
}

/* Select Input */
.selectInput {
  width: 100%;
  padding: 13px;
  background: #f3f3f5;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #0a0a0a;
  appearance: none;
  cursor: pointer;
}

.selectInput:focus {
  outline: none;
  border-color: #166534;
}

/* Text Input */
.textInput {
  width: 100%;
  padding: 12px;
  background: #f3f3f5;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #0a0a0a;
}

.textInput::placeholder {
  color: #717182;
}

.textInput:focus {
  outline: none;
  border-color: #166534;
}

/* Example Upload Section */
.exampleUploadContainer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uploadButton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 36px;
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #0a0a0a;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.uploadButton:hover:not(:disabled) {
  border-color: #166534;
}

.uploadButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hiddenInput {
  display: none;
}

.supportedFormats {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  color: #717182;
  margin: 0;
}

.uploadedFilesList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.uploadedFileItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
}

.uploadedFileName {
  flex: 1;
  font-size: 13px;
  color: #374151;
}

.deleteFileButton {
  background: none;
  border: none;
  padding: 4px;
  color: #9ca3af;
  cursor: pointer;
}

.deleteFileButton:hover {
  color: #dc2626;
}

/* Navigation Footer */
.navigationFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
}

.navButtonSecondary {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #0a0a0a;
  cursor: pointer;
}

.navButtonSecondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.navButtonPrimary {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #155dfc;
  border: none;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: background 0.15s ease;
}

.navButtonPrimary:hover:not(:disabled) {
  background: #1347cc;
}

.navButtonPrimary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## Implementation Notes

1. **Step Count:** MVP uses 4 steps (not 6 shown in some Figma frames)
2. **Debounce Saves:** All field changes are debounced (500ms) to prevent excessive API calls
3. **Discrete Sliders:** Length and Frequency use discrete sliders with fixed stops (not dropdowns)
4. **Welcome Card:** Blue info card at top matches Figma exactly
5. **Colors:** All colors match Figma design tokens
6. **Example Upload:** Optional section for uploading reference newsletters
