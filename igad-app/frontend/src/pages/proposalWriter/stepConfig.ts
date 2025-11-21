import { Upload, Edit, CheckCircle, Eye, Download } from 'lucide-react'

export const stepConfig = [
  { id: 1, title: 'Information Consolidation', icon: Upload },
  { id: 2, title: 'Content Generation', icon: Edit },
  { id: 3, title: 'Structure & Validation', icon: CheckCircle },
  { id: 4, title: 'Review & Refinement', icon: Eye },
  { id: 5, title: 'Final Export', icon: Download },
]

export interface StepProps {
  formData: {
    uploadedFiles: { [key: string]: File[] }
    textInputs: { [key: string]: string }
  }
  setFormData: React.Dispatch<
    React.SetStateAction<{
      uploadedFiles: { [key: string]: File[] }
      textInputs: { [key: string]: string }
    }>
  >
  proposalId?: string
  rfpAnalysis?: any
  conceptAnalysis?: any
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments: { [key: string]: string }
  }) => void
  conceptDocument?: any
}
