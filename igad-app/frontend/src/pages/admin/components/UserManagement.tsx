import { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Settings,
} from 'lucide-react'
import { userService, CognitoUser } from '../../../services/userService'
import { CreateUserModal } from './CreateUserModal'
import { EditUserModal } from './EditUserModal'
import { ManageUserGroupsModal } from './ManageUserGroupsModal'
import { useToast } from '../../../components/ui/ToastContainer'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Spinner } from '../../../components/ui/Spinner'
import styles from './UserManagement.module.css'

interface UserFilters {
  search?: string
  status?: 'all' | 'enabled' | 'disabled'
  group?: string
}

export function UserManagement() {
  const [users, setUsers] = useState<CognitoUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<UserFilters>({})
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [managingGroupsUser, setManagingGroupsUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const { showSuccess, showError } = useToast()

  useEffect(() => {
    // Only fetch users when the component is visible and ready
    const timer = setTimeout(() => {
      fetchUsers()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await userService.listUsers()
      if (result.success) {
        setUsers(result.users)
      } else {
        setError('Failed to load users')
      }
    } catch (error) {
      setError('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = () => {
    setShowCreateUser(true)
  }

  const handleEditUser = (username: string) => {
    setEditingUser(username)
  }

  const handleManageGroups = (username: string) => {
    setManagingGroupsUser(username)
  }

  const handleDeleteUser = async (username: string, email: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete user "${email}"? This action cannot be undone.`,
      onConfirm: async () => {
        setIsDeleting(true)
        try {
          const result = await userService.deleteUser(username)
          if (result.success) {
            showSuccess('User deleted', `User ${email} has been successfully deleted`)
            await fetchUsers()
          } else {
            showError('Delete failed', result.message || 'Failed to delete user')
          }
        } catch (error) {
          showError('Delete failed', 'An unexpected error occurred')
        } finally {
          setIsDeleting(false)
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  const handleToggleUser = async (username: string, enabled: boolean, email: string) => {
    try {
      const result = enabled
        ? await userService.disableUser(username)
        : await userService.enableUser(username)

      if (result.success) {
        showSuccess(
          enabled ? 'User disabled' : 'User enabled',
          `User ${email} has been ${enabled ? 'disabled' : 'enabled'}`
        )
        await fetchUsers()
      } else {
        showError('Update failed', result.message || 'Failed to update user status')
      }
    } catch (error) {
      showError('Update failed', 'An unexpected error occurred')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) {
      return <span className={`${styles.statusBadge} ${styles.disabled}`}>Disabled</span>
    }

    switch (status) {
      case 'CONFIRMED':
        return <span className={`${styles.statusBadge} ${styles.confirmed}`}>Active</span>
      case 'UNCONFIRMED':
        return <span className={`${styles.statusBadge} ${styles.unconfirmed}`}>Pending</span>
      case 'FORCE_CHANGE_PASSWORD':
        return <span className={`${styles.statusBadge} ${styles.forceChange}`}>Password Reset</span>
      default:
        return <span className={`${styles.statusBadge} ${styles.unknown}`}>{status}</span>
    }
  }

  const filteredUsers = users.filter(user => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (
        !user.email.toLowerCase().includes(searchLower) &&
        !user.username.toLowerCase().includes(searchLower)
      ) {
        return false
      }
    }

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'enabled' && !user.enabled) {
        return false
      }
      if (filters.status === 'disabled' && user.enabled) {
        return false
      }
    }

    return true
  })

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleSection}>
            <Users className={styles.titleIcon} />
            <div>
              <h2 className={styles.title}>User Management</h2>
              <p className={styles.subtitle}>
                Manage users, roles, and permissions via AWS Cognito
              </p>
            </div>
          </div>
        </div>

        <button onClick={handleCreateUser} className={styles.createButton}>
          <UserPlus size={16} />
          Create User
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className={styles.closeError}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search users by email or username..."
            value={filters.search || ''}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <Filter className={styles.filterIcon} />
          <select
            value={filters.status || 'all'}
            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            className={styles.filterSelect}
          >
            <option value="all">All Users</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.tableHeader}>User</th>
              <th className={styles.tableHeader}>Status</th>
              <th className={styles.tableHeader}>Groups</th>
              <th className={styles.tableHeader}>Created</th>
              <th className={styles.tableHeader}>Last Modified</th>
              <th className={`${styles.tableHeader} ${styles.actionsHeader}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <div className={styles.userInfo}>
                      <div className={styles.skeleton} style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                      <div>
                        <div className={styles.skeleton} style={{ width: '120px', height: '16px', marginBottom: '4px' }}></div>
                        <div className={styles.skeleton} style={{ width: '180px', height: '14px' }}></div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.skeleton} style={{ width: '80px', height: '20px', borderRadius: '12px' }}></div>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.skeleton} style={{ width: '60px', height: '16px' }}></div>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.skeleton} style={{ width: '100px', height: '16px' }}></div>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.skeleton} style={{ width: '90px', height: '16px' }}></div>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.actionsCell}>
                      <div className={styles.skeleton} style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
                      <div className={styles.skeleton} style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
                      <div className={styles.skeleton} style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.username} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <div className={styles.userInfo}>
                      <div className={styles.userDetails}>
                        <div className={styles.userEmail}>
                          <Mail size={14} />
                          {user.email}
                        </div>
                        <div className={styles.username}>{user.username}</div>
                      </div>
                      <div className={styles.verificationStatus}>
                        {user.email_verified ? (
                          <CheckCircle size={16} className={styles.verified} />
                        ) : (
                          <AlertCircle size={16} className={styles.unverified} />
                        )}
                      </div>
                    </div>
                  </td>

                  <td className={styles.tableCell}>
                    {getStatusBadge(user.user_status, user.enabled)}
                  </td>

                  <td className={styles.tableCell}>
                    <div className={styles.groupsCell}>
                      {user.groups && user.groups.length > 0 ? (
                        user.groups.map((group, index) => (
                          <span key={index} className={styles.groupBadge}>
                            <Shield size={12} />
                            {group}
                          </span>
                        ))
                      ) : (
                        <span className={styles.noGroups}>No groups</span>
                      )}
                    </div>
                  </td>

                  <td className={styles.tableCell}>
                    <div className={styles.dateCell}>
                      <Calendar size={14} />
                      {formatDate(user.created_date)}
                    </div>
                  </td>

                  <td className={styles.tableCell}>
                    <div className={styles.dateCell}>
                      <Calendar size={14} />
                      {formatDate(user.last_modified_date)}
                    </div>
                  </td>

                  <td className={styles.tableCell}>
                    <div className={styles.actionsCell}>
                      <button
                        onClick={() => handleEditUser(user.username)}
                        className={styles.actionButton}
                        title="Edit user"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        onClick={() => handleManageGroups(user.username)}
                        className={styles.actionButton}
                        title="Manage groups"
                      >
                        <Settings size={14} />
                      </button>

                      <button
                        onClick={() => handleToggleUser(user.username, user.enabled, user.email)}
                        className={`${styles.actionButton} ${!user.enabled ? styles.enableButton : styles.disableButton}`}
                        title={user.enabled ? 'Disable user' : 'Enable user'}
                      >
                        {user.enabled ? <ShieldCheck size={14} /> : <Shield size={14} />}
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.username, user.email)}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onUserCreated={fetchUsers}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={!!editingUser}
        username={editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={fetchUsers}
      />

      {/* Manage User Groups Modal */}
      <ManageUserGroupsModal
        isOpen={!!managingGroupsUser}
        username={managingGroupsUser}
        onClose={() => setManagingGroupsUser(null)}
        onUserUpdated={fetchUsers}
      />
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
        confirmText="Delete"
        isLoading={isDeleting}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
