import { useState, useEffect } from 'react'
import { Shield, Calendar, AlertCircle, Plus, Trash2, X } from 'lucide-react'
import { userService } from '@/tools/admin/services/userService'
import { CreateGroupModal } from './CreateGroupModal'
import styles from './GroupManagement.module.css'

interface Group {
  name: string
  description: string
  precedence?: number
  creation_date?: string
  last_modified_date?: string
}

export function GroupManagement() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await userService.listGroups()
      if (result.success) {
        setGroups(result.groups)
      } else {
        setError('Failed to load groups')
      }
    } catch (error) {
      setError('Failed to load groups')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGroup = async (groupName: string) => {
    if (confirm(`Are you sure you want to delete group "${groupName}"?`)) {
      try {
        const result = await userService.deleteGroup(groupName)
        if (result.success) {
          await fetchGroups() // Refresh the list
        } else {
          setError(result.message || 'Failed to delete group')
        }
      } catch (error) {
        setError('Failed to delete group')
      }
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'N/A'
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Shield className={styles.titleIcon} />
          <div>
            <h3 className={styles.title}>Security Groups</h3>
            <p className={styles.subtitle}>Manage user groups and permissions</p>
          </div>
        </div>

        <button onClick={() => setShowCreateGroup(true)} className={styles.createButton}>
          <Plus size={16} />
          Create Group
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className={styles.closeError}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.groupsList}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupInfo}>
                    <div className={styles.skeleton} style={{ width: '120px', height: '20px', marginBottom: '8px' }}></div>
                    <div className={styles.skeleton} style={{ width: '200px', height: '16px' }}></div>
                  </div>
                  <div className={styles.groupActions}>
                    <div className={styles.precedence}>
                      <div className={styles.skeleton} style={{ width: '60px', height: '12px', marginBottom: '4px' }}></div>
                      <div className={styles.skeleton} style={{ width: '20px', height: '16px' }}></div>
                    </div>
                    <div className={styles.skeleton} style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
                  </div>
                </div>
                <div className={styles.groupMeta}>
                  <div className={styles.metaItem}>
                    <div className={styles.skeleton} style={{ width: '14px', height: '14px', borderRadius: '2px' }}></div>
                    <div className={styles.skeleton} style={{ width: '100px', height: '14px' }}></div>
                  </div>
                  <div className={styles.metaItem}>
                    <div className={styles.skeleton} style={{ width: '14px', height: '14px', borderRadius: '2px' }}></div>
                    <div className={styles.skeleton} style={{ width: '110px', height: '14px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className={styles.empty}>
            <Shield size={48} className={styles.emptyIcon} />
            <h4>No Groups Found</h4>
            <p>No security groups are configured in your user pool.</p>
          </div>
        ) : (
          <div className={styles.groupsList}>
            {groups.map(group => (
              <div key={group.name} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupInfo}>
                    <h4 className={styles.groupName}>{group.name}</h4>
                    <p className={styles.groupDescription}>
                      {group.description || 'No description available'}
                    </p>
                  </div>
                  <div className={styles.groupActions}>
                    {group.precedence !== undefined && (
                      <div className={styles.precedence}>
                        <span className={styles.precedenceLabel}>Precedence</span>
                        <span className={styles.precedenceValue}>{group.precedence}</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteGroup(group.name)}
                      className={styles.deleteButton}
                      title="Delete group"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className={styles.groupMeta}>
                  <div className={styles.metaItem}>
                    <Calendar size={14} />
                    <span>Created: {formatDate(group.creation_date)}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Calendar size={14} />
                    <span>Modified: {formatDate(group.last_modified_date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={fetchGroups}
      />
    </div>
  )
}
