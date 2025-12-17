import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, Edit, Trash2, ChevronDown, AlertCircle } from 'lucide-react'
import { proposalService, Proposal } from '@/tools/proposal-writer/services/proposalService'
import { useToast } from '@/shared/components/ui/ToastContainer'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import styles from './DashboardPage.module.css'

type ProposalStatus = 'draft' | 'in_progress' | 'review' | 'completed' | 'archived'

const STATUS_CONFIG: Record<ProposalStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: styles.statusDraft },
  in_progress: { label: 'In Progress', className: styles.statusInProgress },
  review: { label: 'Under Review', className: styles.statusReview },
  completed: { label: 'Completed', className: styles.statusCompleted },
  archived: { label: 'Archived', className: styles.statusArchived },
}

// Helper to get proposal title with fallback to text_inputs['proposal-title']
const getProposalTitle = (proposal: Proposal): string => {
  // Priority: text_inputs['proposal-title'] > title > 'Untitled Proposal'
  const formTitle = proposal.text_inputs?.['proposal-title']
  if (formTitle && formTitle.trim()) {
    return formTitle
  }
  // Check if title is the generic placeholder
  if (proposal.title && !proposal.title.startsWith('Proposal Draft -')) {
    return proposal.title
  }
  return proposal.title || 'Untitled Proposal'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const [proposals, setProposals] = useState<Proposal[]>([])
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    proposalId: string
    proposalCode: string
  }>({ isOpen: false, proposalId: '', proposalCode: '' })
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch proposals on mount
  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setIsLoading(true)
        const response = await proposalService.listProposals()
        setProposals(response)
        setFilteredProposals(response)
      } catch (error) {
        // Removed console.error
        showError('Failed to load proposals', 'Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposals()
  }, [showError])

  // Filter proposals when search or status filter changes
  useEffect(() => {
    let filtered = proposals

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.proposalCode?.toLowerCase().includes(query) ||
          getProposalTitle(p).toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    setFilteredProposals(filtered)
  }, [searchQuery, statusFilter, proposals])

  const handleCreateNew = () => {
    // Clear any existing draft from localStorage
    localStorage.removeItem('draft_proposal_id')
    localStorage.removeItem('draft_proposal_code')
    localStorage.removeItem('draft_form_data')
    localStorage.removeItem('draft_rfp_analysis')

    navigate('/proposal-writer/step-1')
  }

  const handleEdit = (proposalId: string) => {
    // Save proposal ID to localStorage so ProposalWriterPage can load it
    localStorage.setItem('draft_proposal_id', proposalId)
    navigate('/proposal-writer/step-1')
  }

  const handleDeleteClick = (proposalId: string, proposalCode: string) => {
    setDeleteDialog({
      isOpen: true,
      proposalId,
      proposalCode,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.proposalId) {
      return
    }

    setIsDeleting(true)
    try {
      await proposalService.deleteProposal(deleteDialog.proposalId)
      setProposals(prev => prev.filter(p => p.id !== deleteDialog.proposalId))
      showSuccess('Proposal deleted', `${deleteDialog.proposalCode} has been deleted.`)
      setDeleteDialog({ isOpen: false, proposalId: '', proposalCode: '' })
    } catch (error) {
      // Removed console.error
      showError('Failed to delete proposal', 'Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return '-'
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderStatusBadge = (status: ProposalStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    return <span className={`${styles.statusBadge} ${config.className}`}>{config.label}</span>
  }

  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>
        <FileText size={48} />
      </div>
      <h3 className={styles.emptyStateTitle}>No proposals yet</h3>
      <p className={styles.emptyStateDescription}>
        Get started by creating your first proposal. Our AI-powered tool will help you craft
        compelling proposals.
      </p>
      <button className={styles.emptyStateButton} onClick={handleCreateNew}>
        <Plus size={20} />
        Create New Proposal
      </button>
    </div>
  )

  const renderLoadingState = () => (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p className={styles.loadingText}>Loading proposals...</p>
    </div>
  )

  const renderTable = () => (
    <div className={styles.tableCard}>
      <table className={styles.proposalTable}>
        <thead className={styles.tableHeader}>
          <tr>
            <th>Proposal Code</th>
            <th>Title</th>
            <th>Status</th>
            <th>Created</th>
            <th>Last Updated</th>
            <th className={styles.actionsColumn}>Actions</th>
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {filteredProposals.map(proposal => (
            <tr key={proposal.id}>
              <td className={styles.proposalCodeCell}>{proposal.proposalCode}</td>
              <td className={styles.titleCell}>{getProposalTitle(proposal)}</td>
              <td>{renderStatusBadge(proposal.status)}</td>
              <td className={styles.dateCell}>{formatDate(proposal.created_at)}</td>
              <td className={styles.dateCell}>{formatDate(proposal.updated_at)}</td>
              <td className={styles.actionsCell}>
                <button
                  className={`${styles.actionButton} ${styles.editButton}`}
                  onClick={() => handleEdit(proposal.id)}
                  title="Edit proposal"
                >
                  <Edit size={16} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => handleDeleteClick(proposal.id, proposal.proposalCode)}
                  title="Delete proposal"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredProposals.length === 0 && !isLoading && (
        <div className={styles.noResults}>
          <AlertCircle size={24} />
          <p>No proposals match your search criteria</p>
        </div>
      )}
    </div>
  )

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <div className={styles.titleIcon}>
              <FileText size={24} />
            </div>
            <div>
              <h1 className={styles.title}>My Proposals</h1>
              <p className={styles.subtitle}>Manage and track all your proposal submissions</p>
            </div>
          </div>
          <button className={styles.createButton} onClick={handleCreateNew}>
            <Plus size={20} />
            Create New Proposal
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.contentWrapper}>
          {/* Controls Bar */}
          <div className={styles.controlsCard}>
            <div className={styles.controlsBar}>
              <div className={styles.searchContainer}>
                <Search className={styles.searchIcon} size={20} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search by code or title..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.filterContainer}>
                <select
                  className={styles.filterSelect}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Under Review</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <ChevronDown className={styles.filterIcon} size={16} />
              </div>

              <div className={styles.resultsInfo}>
                <span className={styles.resultsCount}>
                  {filteredProposals.length} proposal{filteredProposals.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {isLoading
            ? renderLoadingState()
            : proposals.length === 0
              ? renderEmptyState()
              : renderTable()}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Proposal"
        message={`Are you sure you want to delete "${deleteDialog.proposalCode}"? This action cannot be undone.`}
        type="danger"
        confirmText="Delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, proposalId: '', proposalCode: '' })}
      />
    </div>
  )
}
