import { Upload, Edit, Layers, FileCheck } from 'lucide-react'

export const stepConfig = [
  {
    id: 1,
    title: 'Information Consolidation',
    icon: Upload,
    stage: 'Scoping',
    stageColor: '#6d97d5',
  },
  { id: 2, title: 'Concept Review', icon: Edit, stage: 'Review', stageColor: '#d59e6d' },
  { id: 3, title: 'Structure', icon: Layers, stage: 'Planning', stageColor: '#8c6dd5' },
  { id: 4, title: 'Proposal Review', icon: FileCheck, stage: 'Refining', stageColor: '#48cd65' },
]

export interface StepProps {
  formData: {
    uploadedFiles: { [key: string]: (File | string)[] }
    textInputs: { [key: string]: string }
  }
  setFormData: React.Dispatch<
    React.SetStateAction<{
      uploadedFiles: { [key: string]: (File | string)[] }
      textInputs: { [key: string]: string }
    }>
  >
  proposalId?: string
  rfpAnalysis?: import('../types/analysis').RFPAnalysis
  conceptAnalysis?: import('../types/analysis').ConceptAnalysis
  conceptDocument?: import('../types/analysis').ConceptDocument
  conceptEvaluationData?: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  } | null
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  }) => void
}
