import { Upload, Edit, FileText, Layers, Eye, Download } from 'lucide-react'

export const stepConfig = [
  { id: 1, title: 'Information Consolidation', icon: Upload },
  { id: 2, title: 'Content Generation', icon: Edit },
  { id: 3, title: 'Concept Review', icon: FileText },
  { id: 4, title: 'Structure & Workplan', icon: Layers },
  { id: 5, title: 'Review & Refinement', icon: Eye },
  { id: 6, title: 'Final Export', icon: Download },
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
    userComments?: { [key: string]: string }
  }) => void
  conceptDocument?: any
}
