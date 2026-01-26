// Newsletter Generator - Barrel Export

// Pages
export { NewsletterGeneratorPage } from './pages/NewsletterGeneratorPage'
export { Step1Configuration } from './pages/Step1Configuration'
export {
  Step2ContentPlanning,
  Step3OutlineReview,
  Step4Drafting,
} from './pages/StepPlaceholder'

// Components
export { NewsletterLayout } from './components/NewsletterLayout'
export { NewsletterSecondaryNavbar } from './components/NewsletterSecondaryNavbar'
export { NewsletterSidebar } from './components/NewsletterSidebar'
export { AudienceCheckboxGroup } from './components/AudienceCheckboxGroup'
export { DualToneSlider } from './components/DualToneSlider'
export { DiscreteSlider } from './components/DiscreteSlider'

// Hooks
export { useNewsletter } from './hooks/useNewsletter'

// Services
export { newsletterService } from './services/newsletterService'

// Types
export * from './types/newsletter'

// Config
export { newsletterStepConfig } from './pages/newsletterStepConfig'
