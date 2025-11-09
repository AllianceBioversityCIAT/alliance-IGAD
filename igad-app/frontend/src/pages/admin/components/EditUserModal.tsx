import { useState, useEffect } from 'react'
import { X, User, Mail, Key, Shield } from 'lucide-react'
import { userService, CognitoUser } from '../../../services/userService'
import styles from './EditUserModal.module.css'

interface EditUserModalProps {
  isOpen: boolean
  username: string | null
  onClose: () => void
  onUserUpdated: () => void
}

export function EditUserModal({ isOpen, username, onClose, onUserUpdated }: EditUserModalProps) {
  const [user, setUser] = useState<CognitoUser | null>(null)
  const [groups, setGroups] = useState<Array<{ name: string; description: string }>>([])
  const [formData, setFormData] = useState({
    email: '',
    email_verified: false,
  })
  const [resetPassword, setResetPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && username) {
      fetchUserData()
      fetchGroups()
    }
  }, [isOpen, username])

  const fetchUserData = async () => {
    if (!username) {
      return
    }

    setIsLoading(true)
    try {
      const result = await userService.getUser(username)
      if (result.success) {
        setUser(result.user)
        setFormData({
          email: result.user.email,
          email_verified: result.user.email_verified,
        })
      } else {
        setError('Failed to load user data')
      }
    } catch (error) {
      setError('Failed to load user data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const result = await userService.listGroups()
      if (result.success) {
        setGroups(result.groups)
      }
    } catch (error) {}
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await userService.updateUser(username, {
        attributes: {
          email: formData.email,
          email_verified: formData.email_verified.toString(),
        },
      })

      if (result.success) {
        onUserUpdated()
        onClose()
      } else {
        setError(result.message || 'Failed to update user')
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!username || !resetPassword) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await userService.resetUserPassword(username, {
        temporary_password: resetPassword,
      })

      if (result.success) {
        setResetPassword('')
        alert('Password reset successfully')
      } else {
        setError(result.message || 'Failed to reset password')
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to reset password')
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
        await fetchUserData() // Refresh user data
      } else {
        setError(result.message || 'Failed to update group membership')
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update group membership')
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setResetPassword(password)
  }

  if (!isOpen || !username) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit User: {user?.email}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          {isLoading && !user ? (
            <div className={styles.loading}>Loading user data...</div>
          ) : (
            <>
              {/* User Details */}
              <form onSubmit={handleUpdateUser} className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <User size={16} />
                  User Details
                </h3>

                <div className={styles.field}>
                  <label className={styles.label}>Username</label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    className={styles.input}
                    disabled
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.checkboxField}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.email_verified}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, email_verified: e.target.checked }))
                      }
                      className={styles.checkbox}
                    />
                    <Mail size={16} />
                    Email verified
                  </label>
                </div>

                <button type="submit" className={styles.updateButton} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update User'}
                </button>
              </form>

              {/* Password Reset */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <Key size={16} />
                  Reset Password
                </h3>

                <div className={styles.passwordField}>
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Enter new temporary password"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className={styles.generateButton}
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className={styles.resetButton}
                    disabled={!resetPassword || isLoading}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Groups */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <Shield size={16} />
                  Group Membership
                </h3>

                <div className={styles.groupsList}>
                  {groups.map(group => {
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
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
