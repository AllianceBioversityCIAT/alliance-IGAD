import { Settings, FileSearch, ListOrdered, FileText } from 'lucide-react'

export const newsletterStepConfig = [
  {
    id: 1,
    title: 'Configuration',
    icon: Settings,
    description: 'Set audience, tone, and format preferences',
  },
  {
    id: 2,
    title: 'Content Planning',
    icon: FileSearch,
    description: 'Select topics and retrieve content',
  },
  {
    id: 3,
    title: 'Outline Review',
    icon: ListOrdered,
    description: 'Review and edit AI-generated outline',
  },
  {
    id: 4,
    title: 'Drafting & Export',
    icon: FileText,
    description: 'Generate and export newsletter',
  },
]
