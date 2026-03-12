import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Eye,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { proposalService, Proposal } from '@/tools/proposal-writer/services/proposalService'
import { useToast } from '@/shared/components/ui/ToastContainer'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import styles from './DashboardPage.module.css'

type ProposalStatus = 'draft' | 'in_progress' | 'review' | 'completed' | 'archived'
type SortField = 'proposalCode' | 'title' | 'status' | 'progress' | 'created_at' | 'updated_at'
type SortDirection = 'asc' | 'desc' | null

const STATUS_CONFIG: Record<ProposalStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: styles.statusDraft },
  in_progress: { label: 'In Progress', className: styles.statusInProgress },
  review: { label: 'Under Review', className: styles.statusReview },
  completed: { label: 'Completed', className: styles.statusCompleted },
  archived: { label: 'Archived', className: styles.statusArchived },
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

// Helper to get proposal title with fallback to text_inputs['proposal-title']
const getProposalTitle = (proposal: Proposal): string => {
  const formTitle = proposal.text_inputs?.['proposal-title']
  if (formTitle && formTitle.trim()) {
    return formTitle
  }
  if (proposal.title && !proposal.title.startsWith('Proposal Draft -')) {
    return proposal.title
  }
  return proposal.title || 'Untitled Proposal'
}

// Helper to compute proposal progress step (1-4)
// Mirrors backend _compute_completed_steps logic using metadata keys
const getProposalStep = (proposal: Proposal): number => {
  if (proposal.status === 'completed') return 4

  // Use completed_steps if available (from individual fetch)
  const completedSteps = (proposal as unknown as Record<string, unknown>).completed_steps
  if (Array.isArray(completedSteps) && completedSteps.length > 0) {
    return Math.max(...(completedSteps as number[]))
  }

  // Fall back to metadata parsing (for list endpoint)
  const metadata = (proposal.metadata || {}) as Record<string, unknown>

  // Step 4: Draft feedback
  if (metadata.draft_feedback_status === 'completed' || metadata.draft_feedback_analysis) return 4

  // Step 3: Template generated
  if (
    metadata.template_generation_status === 'completed' ||
    metadata.proposal_template ||
    metadata.generated_proposal_content
  )
    return 3

  // Step 2: Analyses complete or concept document exists
  if (
    (metadata.rfp_analysis_status === 'completed' &&
      metadata.concept_analysis_status === 'completed') ||
    metadata.concept_document
  )
    return 2

  // Step 1: Has documents
  const uploadedFiles = (proposal.uploaded_files || {}) as Record<string, string[]>
  if (uploadedFiles['rfp-document']?.length > 0) return 1

  return 1
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('updated_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
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
      } catch {
        showError('Failed to load proposals', 'Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Compute stats from all proposals
  const stats = useMemo(() => {
    const total = proposals.length
    const inProgress = proposals.filter(
      p => p.status === 'draft' || p.status === 'in_progress'
    ).length
    const underReview = proposals.filter(p => p.status === 'review').length
    const completed = proposals.filter(p => p.status === 'completed').length
    return { total, inProgress, underReview, completed }
  }, [proposals])

  // Filter, sort, and paginate
  const filteredProposals = useMemo(() => {
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
    if (statusFilter === 'active') {
      filtered = filtered.filter(p => p.status === 'draft' || p.status === 'in_progress')
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    return filtered
  }, [searchQuery, statusFilter, proposals])

  const sortedProposals = useMemo(() => {
    if (!sortField || !sortDirection) return filteredProposals

    return [...filteredProposals].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'proposalCode':
          comparison = (a.proposalCode || '').localeCompare(b.proposalCode || '')
          break
        case 'title':
          comparison = getProposalTitle(a).localeCompare(getProposalTitle(b))
          break
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '')
          break
        case 'progress':
          comparison = getProposalStep(a) - getProposalStep(b)
          break
        case 'created_at':
          comparison =
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          break
        case 'updated_at':
          comparison =
            new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
          break
      }

      return sortDirection === 'desc' ? -comparison : comparison
    })
  }, [filteredProposals, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedProposals.length / pageSize))
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedProposals.slice(start, start + pageSize)
  }, [sortedProposals, currentPage, pageSize])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortField, sortDirection, pageSize])

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        // Cycle: asc → desc → null
        if (sortDirection === 'asc') setSortDirection('desc')
        else if (sortDirection === 'desc') {
          setSortField('updated_at')
          setSortDirection('desc')
        }
      } else {
        setSortField(field)
        setSortDirection('asc')
      }
    },
    [sortField, sortDirection]
  )

  const handleStatCardClick = useCallback(
    (filter: string) => {
      setStatusFilter(prev => (prev === filter ? 'all' : filter))
    },
    []
  )

  const handleCreateNew = () => {
    localStorage.removeItem('draft_proposal_id')
    localStorage.removeItem('draft_proposal_code')
    localStorage.removeItem('draft_form_data')
    localStorage.removeItem('draft_rfp_analysis')
    navigate('/proposal-writer/step-1')
  }

  const handleEdit = (proposalId: string) => {
    localStorage.setItem('draft_proposal_id', proposalId)
    navigate('/proposal-writer/step-1')
  }

  const handleRowClick = (proposalId: string) => {
    handleEdit(proposalId)
  }

  const handleDeleteClick = (e: React.MouseEvent, proposalId: string, proposalCode: string) => {
    e.stopPropagation()
    setDeleteDialog({ isOpen: true, proposalId, proposalCode })
  }

  const handleEditClick = (e: React.MouseEvent, proposalId: string) => {
    e.stopPropagation()
    handleEdit(proposalId)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.proposalId) return

    setIsDeleting(true)
    try {
      await proposalService.deleteProposal(deleteDialog.proposalId)
      setProposals(prev => prev.filter(p => p.id !== deleteDialog.proposalId))
      showSuccess('Proposal deleted', `${deleteDialog.proposalCode} has been deleted.`)
      setDeleteDialog({ isOpen: false, proposalId: '', proposalCode: '' })
    } catch {
      showError('Failed to delete proposal', 'Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
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

  const renderProgressBar = (proposal: Proposal) => {
    const step = getProposalStep(proposal)
    const percent = step * 25
    return (
      <div className={styles.progressCell}>
        <div className={styles.progressBarTrack}>
          <div
            className={`${styles.progressBarFill} ${step === 4 ? styles.progressComplete : ''}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className={styles.progressLabel}>Step {step} of 4</span>
      </div>
    )
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronDown size={14} className={styles.sortIconInactive} />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className={styles.sortIconActive} />
    ) : (
      <ChevronDown size={14} className={styles.sortIconActive} />
    )
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

  const renderPagination = () => {
    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, sortedProposals.length)

    // Generate page numbers with ellipsis
    const getPageNumbers = (): (number | '...')[] => {
      if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
      }
      const pages: (number | '...')[] = [1]
      if (currentPage > 3) pages.push('...')
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
      return pages
    }

    return (
      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          Showing {startItem}-{endItem} of {sortedProposals.length} proposal
          {sortedProposals.length !== 1 ? 's' : ''}
        </span>

        <div className={styles.paginationControls}>
          <div className={styles.pageSizeSelector}>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className={styles.pageSizeSelect}
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>

          <div className={styles.pageButtons}>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {getPageNumbers().map((page, idx) =>
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  className={`${styles.pageButton} ${currentPage === page ? styles.pageButtonActive : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            )}

            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderTable = () => (
    <>
      {/* Desktop Table */}
      <div className={styles.tableCard}>
        <table className={styles.proposalTable}>
          <thead className={styles.tableHeader}>
            <tr>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort('proposalCode')}
              >
                <span>Proposal Code</span>
                {renderSortIcon('proposalCode')}
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('title')}>
                <span>Title</span>
                {renderSortIcon('title')}
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('status')}>
                <span>Status</span>
                {renderSortIcon('status')}
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('progress')}>
                <span>Progress</span>
                {renderSortIcon('progress')}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort('created_at')}
              >
                <span>Created</span>
                {renderSortIcon('created_at')}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort('updated_at')}
              >
                <span>Last Updated</span>
                {renderSortIcon('updated_at')}
              </th>
              <th className={styles.actionsColumn}>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {paginatedProposals.map(proposal => (
              <tr
                key={proposal.id}
                className={styles.clickableRow}
                onClick={() => handleRowClick(proposal.id)}
              >
                <td className={styles.proposalCodeCell}>{proposal.proposalCode}</td>
                <td className={styles.titleCell}>{getProposalTitle(proposal)}</td>
                <td>{renderStatusBadge(proposal.status)}</td>
                <td>{renderProgressBar(proposal)}</td>
                <td className={styles.dateCell}>{formatDate(proposal.created_at)}</td>
                <td className={styles.dateCell}>{formatDate(proposal.updated_at)}</td>
                <td className={styles.actionsCell}>
                  <button
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={e => handleEditClick(e, proposal.id)}
                    title="Edit proposal"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={e => handleDeleteClick(e, proposal.id, proposal.proposalCode)}
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

        {sortedProposals.length > 0 && renderPagination()}
      </div>

      {/* Mobile Card View */}
      <div className={styles.mobileCards}>
        {paginatedProposals.map(proposal => (
          <div
            key={proposal.id}
            className={styles.mobileCard}
            onClick={() => handleRowClick(proposal.id)}
          >
            <div className={styles.mobileCardHeader}>
              <span className={styles.mobileCardCode}>{proposal.proposalCode}</span>
              {renderStatusBadge(proposal.status)}
            </div>
            <h3 className={styles.mobileCardTitle}>{getProposalTitle(proposal)}</h3>
            <div className={styles.mobileCardProgress}>{renderProgressBar(proposal)}</div>
            <div className={styles.mobileCardDates}>
              <span>Created: {formatDate(proposal.created_at)}</span>
              <span>Updated: {formatDate(proposal.updated_at)}</span>
            </div>
            <div className={styles.mobileCardActions}>
              <button
                className={`${styles.actionButton} ${styles.editButton}`}
                onClick={e => handleEditClick(e, proposal.id)}
                title="Edit proposal"
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={e => handleDeleteClick(e, proposal.id, proposal.proposalCode)}
                title="Delete proposal"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}

        {filteredProposals.length === 0 && !isLoading && (
          <div className={styles.noResults}>
            <AlertCircle size={24} />
            <p>No proposals match your search criteria</p>
          </div>
        )}

        {sortedProposals.length > 0 && renderPagination()}
      </div>
    </>
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
          {/* Stats Cards */}
          {!isLoading && proposals.length > 0 && (
            <div className={styles.statsGrid}>
              <button
                className={`${styles.statCard} ${statusFilter === 'all' ? styles.statCardActive : ''}`}
                onClick={() => handleStatCardClick('all')}
              >
                <div className={`${styles.statIcon} ${styles.statIconTotal}`}>
                  <FileText size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{stats.total}</span>
                  <span className={styles.statLabel}>Total</span>
                </div>
              </button>

              <button
                className={`${styles.statCard} ${statusFilter === 'active' ? styles.statCardActive : ''}`}
                onClick={() => handleStatCardClick('active')}
              >
                <div className={`${styles.statIcon} ${styles.statIconProgress}`}>
                  <Clock size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{stats.inProgress}</span>
                  <span className={styles.statLabel}>In Progress</span>
                </div>
              </button>

              <button
                className={`${styles.statCard} ${statusFilter === 'review' ? styles.statCardActive : ''}`}
                onClick={() => handleStatCardClick('review')}
              >
                <div className={`${styles.statIcon} ${styles.statIconReview}`}>
                  <Eye size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{stats.underReview}</span>
                  <span className={styles.statLabel}>Under Review</span>
                </div>
              </button>

              <button
                className={`${styles.statCard} ${statusFilter === 'completed' ? styles.statCardActive : ''}`}
                onClick={() => handleStatCardClick('completed')}
              >
                <div className={`${styles.statIcon} ${styles.statIconCompleted}`}>
                  <CheckCircle size={20} />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{stats.completed}</span>
                  <span className={styles.statLabel}>Completed</span>
                </div>
              </button>
            </div>
          )}

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
                  <option value="active">In Progress</option>
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
