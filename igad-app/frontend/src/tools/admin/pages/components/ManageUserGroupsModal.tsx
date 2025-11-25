import { useState, useEffect } from 'react'
import { X, Shield, Users } from 'lucide-react'
import { userService, CognitoUser } from '@/tools/admin/services/userService'
import styles from './ManageUserGroupsModal.module.css'

interface ManageUserGroupsModalProps {
  isOpen: boolean
  username: string | null
  onClose: () => void
  onUserUpdated: () => void
}

export function ManageUserGroupsModal({
  isOpen,
  username,
  onClose,
  onUserUpdated,
}: ManageUserGroupsModalProps) {
  const [user, setUser] = useState<CognitoUser | null>(null)
  const [groups, setGroups] = useState<Array<{ name: string; description: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && username) {
      fetchData()
    }
  }, [isOpen, username])

  const fetchData = async () => {
    if (!username) {
      return
    }

    setIsLoading(true)
    try {
      const [userResult, groupsResult] = await Promise.all([
        userService.getUser(username),
        userService.listGroups(),
      ])

      if (userResult.success) {
        setUser(userResult.user)
      }

      if (groupsResult.success) {
        setGroups(groupsResult.groups)
      }
    } catch (error) {
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleGroup = async (groupName: string, isInGroup: boolean) => {
    if (!username) {
      return
    }

    try {
      const result = isInGroup
        ? await userService.removeUserFromGroup(username, groupName)
        : await userService.addUserToGroup(username, groupName)

      if (result.success) {
        await fetchData() // Refresh data
        onUserUpdated() // Refresh parent component
      } else {
        setError(result.message || 'Failed to update group membership')
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update group membership')
    }
  }

  if (!isOpen || !username) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Users size={20} />
            Manage Groups: {user?.email}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          {isLoading ? (
            <div className={styles.loading}>Loading groups...</div>
          ) : (
            <div className={styles.groupsList}>
              {groups.length === 0 ? (
                <div className={styles.empty}>
                  <Shield size={48} className={styles.emptyIcon} />
                  <p>No groups available</p>
                </div>
              ) : (
                groups.map(group => {
                  const isInGroup = user?.groups?.includes(group.name) || false
                  return (
                    <div key={group.name} className={styles.groupItem}>
                      <div className={styles.groupInfo}>
                        <div className={styles.groupName}>{group.name}</div>
                        <div className={styles.groupDescription}>{group.description}</div>
                      </div>
                      <button
                        onClick={() => handleToggleGroup(group.name, isInGroup)}
                        className={`${styles.groupToggle} ${isInGroup ? styles.groupActive : ''}`}
                        disabled={isLoading}
                      >
                        {isInGroup ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
